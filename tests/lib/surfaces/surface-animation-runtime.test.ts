import { createSurfaceAnimationRuntime } from "@/lib/surfaces/surface-animation-runtime";
import type { SurfaceAnimationRuntimePlan } from "@/types";
import { describe, expect, it } from "vitest";

describe("createSurfaceAnimationRuntime", () => {
	it("bind/always は1巡後に停止する", () => {
		let now = 0;
		const runtime = createSurfaceAnimationRuntime(createRuntimePlan("bind"), {
			clock: { now: () => now },
		});

		expect(runtime.start().layers[1]?.sourcePath).toBe("shell/master/a.png");
		now += 50;
		expect(runtime.tick().layers[1]?.sourcePath).toBe("shell/master/b.png");
		now += 50;
		const snapshot = runtime.tick();
		expect(snapshot.activeTrackIds).toEqual([]);
		expect(runtime.isRunning()).toBe(false);
	});

	it("runonce は1巡後に停止する", () => {
		let now = 0;
		const runtime = createSurfaceAnimationRuntime(createRuntimePlan("runonce"), {
			clock: { now: () => now },
		});

		runtime.start();
		now += 50;
		runtime.tick();
		now += 50;
		const snapshot = runtime.tick();
		expect(snapshot.activeTrackIds).toEqual([]);
	});

	it("sometimes は1回だけ判定して発火すれば1巡後に停止する", () => {
		let now = 0;
		const runtime = createSurfaceAnimationRuntime(createRuntimePlan("sometimes"), {
			clock: { now: () => now },
			rng: () => 0.2,
		});

		expect(runtime.start().layers).toHaveLength(1);
		now += 3000;
		expect(runtime.tick().layers[1]?.sourcePath).toBe("shell/master/a.png");
		now += 50;
		runtime.tick();
		now += 50;
		const endSnapshot = runtime.tick();
		expect(endSnapshot.activeTrackIds).toEqual([]);
		expect(runtime.isRunning()).toBe(false);
	});

	it("stop 後は tick しても進行しない", () => {
		let now = 0;
		const runtime = createSurfaceAnimationRuntime(createRuntimePlan("always"), {
			clock: { now: () => now },
		});

		runtime.start();
		runtime.stop();
		now += 1000;
		const snapshot = runtime.tick();
		expect(snapshot.layers[1]?.sourcePath).toBe("shell/master/a.png");
	});

	it("wait=0 のフレームでも無限ループせず停止できる", () => {
		let now = 0;
		const runtime = createSurfaceAnimationRuntime(createRuntimePlan("always", 0), {
			clock: { now: () => now },
		});

		expect(runtime.start().layers.length).toBeGreaterThan(1);
		now += 1;
		runtime.tick();
		now += 1;
		runtime.tick();
		expect(runtime.isRunning()).toBe(false);
	});
});

function createRuntimePlan(
	mode: "bind" | "always" | "runonce" | "sometimes",
	waitMs = 50,
): SurfaceAnimationRuntimePlan {
	return {
		surfaceId: 5,
		shellName: "master",
		baseLayers: [
			{
				sourcePath: "shell/master/base.png",
				alphaMaskPath: null,
				x: 0,
				y: 0,
				width: 100,
				height: 100,
			},
		],
		tracks: [
			{
				id: 1,
				mode,
				loop: false,
				triggerEveryMs: mode === "sometimes" ? 3000 : null,
				triggerProbability: mode === "sometimes" ? 0.3 : null,
				frames: [
					{
						trackId: 1,
						patternIndex: 0,
						operation: "overlay",
						waitMs,
						layers: [
							{
								sourcePath: "shell/master/a.png",
								alphaMaskPath: null,
								x: 0,
								y: 0,
								width: 50,
								height: 50,
							},
						],
					},
					{
						trackId: 1,
						patternIndex: 1,
						operation: "overlay",
						waitMs,
						layers: [
							{
								sourcePath: "shell/master/b.png",
								alphaMaskPath: null,
								x: 10,
								y: 10,
								width: 50,
								height: 50,
							},
						],
					},
				],
			},
		],
		capabilities: [],
	};
}
