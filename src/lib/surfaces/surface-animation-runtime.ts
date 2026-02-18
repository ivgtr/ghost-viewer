import type {
	SurfaceAnimationRuntimePlan,
	SurfaceAnimationTrack,
	SurfaceRenderLayer,
	SurfaceRuntimeSnapshot,
} from "@/types";

interface SurfaceAnimationRuntimeClock {
	now: () => number;
}

interface SurfaceAnimationRuntimeOptions {
	clock?: SurfaceAnimationRuntimeClock;
	rng?: () => number;
}

interface TrackState {
	track: SurfaceAnimationTrack;
	active: boolean;
	frameIndex: number;
	elapsedMs: number;
	triggerElapsedMs: number;
	finished: boolean;
	started: boolean;
}

interface SurfaceAnimationRuntime {
	getSnapshot: () => SurfaceRuntimeSnapshot;
	reset: () => SurfaceRuntimeSnapshot;
	tick: () => SurfaceRuntimeSnapshot;
	start: () => SurfaceRuntimeSnapshot;
	stop: () => void;
	isRunning: () => boolean;
}

const DEFAULT_CLOCK: SurfaceAnimationRuntimeClock = {
	now: () => Date.now(),
};
const MIN_FRAME_WAIT_MS = 1;
const MAX_ADVANCE_STEPS_PER_TICK = 512;

export function createSurfaceAnimationRuntime(
	plan: SurfaceAnimationRuntimePlan,
	options: SurfaceAnimationRuntimeOptions = {},
): SurfaceAnimationRuntime {
	const clock = options.clock ?? DEFAULT_CLOCK;
	const rng = options.rng ?? Math.random;
	const trackStates = plan.tracks
		.map((track) => createTrackState(track))
		.sort((left, right) => left.track.id - right.track.id);

	let running = false;
	let lastTickMs = clock.now();

	const getSnapshot = (): SurfaceRuntimeSnapshot => {
		const timestampMs = clock.now();
		return {
			surfaceId: plan.surfaceId,
			timestampMs,
			layers: composeLayers(plan.baseLayers, trackStates),
			activeTrackIds: trackStates.filter((track) => track.active).map((track) => track.track.id),
		};
	};

	const tick = (): SurfaceRuntimeSnapshot => {
		const nowMs = clock.now();
		const deltaMs = Math.max(0, nowMs - lastTickMs);
		lastTickMs = nowMs;
		if (running) {
			for (const trackState of trackStates) {
				advanceTrackState(trackState, deltaMs, rng);
			}
			if (trackStates.every((trackState) => trackState.finished)) {
				running = false;
			}
		}
		return getSnapshot();
	};

	return {
		getSnapshot,
		reset: () => {
			for (const trackState of trackStates) {
				resetTrackState(trackState);
			}
			lastTickMs = clock.now();
			return getSnapshot();
		},
		tick,
		start: () => {
			running = true;
			lastTickMs = clock.now();
			return tick();
		},
		stop: () => {
			running = false;
		},
		isRunning: () => running,
	};
}

function createTrackState(track: SurfaceAnimationTrack): TrackState {
	return {
		track,
		active: track.mode === "bind" || track.mode === "always" || track.mode === "runonce",
		frameIndex: 0,
		elapsedMs: 0,
		triggerElapsedMs: 0,
		finished: track.mode === "unsupported" || track.frames.length === 0,
		started: track.mode !== "sometimes",
	};
}

function resetTrackState(state: TrackState): void {
	state.active =
		state.track.mode === "bind" || state.track.mode === "always" || state.track.mode === "runonce";
	state.frameIndex = 0;
	state.elapsedMs = 0;
	state.triggerElapsedMs = 0;
	state.finished = state.track.mode === "unsupported" || state.track.frames.length === 0;
	state.started = state.track.mode !== "sometimes";
}

function advanceTrackState(trackState: TrackState, deltaMs: number, rng: () => number): void {
	if (trackState.track.frames.length === 0 || trackState.track.mode === "unsupported") {
		return;
	}

	if (trackState.track.mode === "sometimes" && !trackState.active) {
		if (trackState.finished || trackState.started) {
			return;
		}
		trackState.triggerElapsedMs += deltaMs;
		const triggerEveryMs = trackState.track.triggerEveryMs ?? 3000;
		if (trackState.triggerElapsedMs >= triggerEveryMs) {
			trackState.triggerElapsedMs = 0;
			trackState.started = true;
			if (normalizeRandom(rng()) < (trackState.track.triggerProbability ?? 0.3)) {
				trackState.active = true;
				trackState.frameIndex = 0;
				trackState.elapsedMs = 0;
			} else {
				trackState.finished = true;
			}
		}
		return;
	}

	if (!trackState.active || trackState.finished) {
		return;
	}

	trackState.elapsedMs += deltaMs;
	let currentFrame = trackState.track.frames[trackState.frameIndex];
	let guard = 0;
	while (currentFrame) {
		const waitMs = normalizeFrameWaitMs(currentFrame.waitMs);
		if (trackState.elapsedMs < waitMs) {
			break;
		}
		trackState.elapsedMs -= waitMs;
		trackState.frameIndex += 1;
		if (trackState.frameIndex >= trackState.track.frames.length) {
			if (trackState.track.loop) {
				trackState.frameIndex = 0;
			} else {
				trackState.frameIndex = Math.max(0, trackState.track.frames.length - 1);
				trackState.active = false;
				trackState.finished = true;
				break;
			}
		}
		currentFrame = trackState.track.frames[trackState.frameIndex];
		guard += 1;
		if (guard >= MAX_ADVANCE_STEPS_PER_TICK) {
			trackState.elapsedMs = 0;
			break;
		}
	}
}

function composeLayers(
	baseLayers: SurfaceRenderLayer[],
	trackStates: TrackState[],
): SurfaceRenderLayer[] {
	let composedLayers = baseLayers.map((layer) => ({ ...layer }));
	for (const trackState of trackStates) {
		if (!trackState.active || trackState.track.frames.length === 0) {
			continue;
		}
		const frame = trackState.track.frames[trackState.frameIndex];
		if (!frame) {
			continue;
		}
		if (frame.operation === "clear") {
			composedLayers = [];
			continue;
		}
		if (frame.operation === "replace-base") {
			composedLayers = frame.layers.map((layer) => ({ ...layer }));
			continue;
		}
		composedLayers = [...composedLayers, ...frame.layers.map((layer) => ({ ...layer }))];
	}
	return composedLayers;
}

function normalizeRandom(value: number): number {
	if (!Number.isFinite(value)) {
		return 0;
	}
	if (value < 0) {
		return 0;
	}
	if (value >= 1) {
		return 0.9999999999999999;
	}
	return value;
}

function normalizeFrameWaitMs(waitMs: number): number {
	if (!Number.isFinite(waitMs)) {
		return MIN_FRAME_WAIT_MS;
	}
	return Math.max(MIN_FRAME_WAIT_MS, waitMs);
}
