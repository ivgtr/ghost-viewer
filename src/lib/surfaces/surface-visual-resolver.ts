import { createSurfaceNotification } from "@/lib/surfaces/surface-notification-policy";
import { createSurfaceAnimationRuntime } from "@/lib/surfaces/surface-animation-runtime";
import { resolvePnaMaskPath } from "@/lib/surfaces/pna-mask";
import { readPngMetadata } from "@/lib/surfaces/png-metadata";
import { buildSurfaceSourceIndex, resolveImagePath } from "@/lib/surfaces/surface-source-index";
import { evaluateSurfaceStatic } from "@/lib/surfaces/surface-static-evaluator";
import { buildVisualModelFromRenderLayers } from "@/lib/surfaces/surface-visual-model";
import type {
	ShellSurfaceCatalog,
	SurfaceAnimation,
	SurfaceAnimationFrame,
	SurfaceAnimationRuntimePlan,
	SurfaceAnimationTrack,
	SurfaceDefinition,
	SurfaceDefinitionsByShell,
	SurfaceNotification,
	SurfaceRenderLayer,
	SurfaceResolutionTrace,
	SurfaceRuntimeCapability,
	SurfaceVisualModel,
	SurfaceVisualResolveResult,
} from "@/types";

interface ResolveSurfaceVisualOptions {
	shellName: string;
	surfaceId: number;
	catalog: ShellSurfaceCatalog[];
	definitionsByShell: SurfaceDefinitionsByShell;
	fileContents: Map<string, ArrayBuffer>;
}

interface ResolveVisualModelResult {
	model: SurfaceVisualModel | null;
	notifications: SurfaceNotification[];
}

const FALLBACK_IMAGE_WIDTH = 240;
const FALLBACK_IMAGE_HEIGHT = 360;

export function resolveSurfaceVisual(
	options: ResolveSurfaceVisualOptions,
): SurfaceVisualResolveResult {
	const sourceIndex = buildSurfaceSourceIndex(options.fileContents);
	const trace: SurfaceResolutionTrace = {
		surfaceId: options.surfaceId,
		steps: [],
		notifications: [],
	};

	const definitionResult = resolveDefinitionModel(options, sourceIndex, trace);
	if (definitionResult.model !== null) {
		return {
			ok: true,
			model: definitionResult.model,
			notifications: definitionResult.notifications,
			trace: {
				...trace,
				notifications: [...trace.notifications, ...definitionResult.notifications],
			},
			runtimePlan: definitionResult.runtimePlan,
		};
	}

	const directResult = resolveDirectAssetModel(options, sourceIndex, trace);
	if (directResult.model !== null) {
		return {
			ok: true,
			model: directResult.model,
			notifications: directResult.notifications,
			trace: {
				...trace,
				notifications: [...trace.notifications, ...directResult.notifications],
			},
			runtimePlan: null,
		};
	}

	const notifications = [...definitionResult.notifications, ...directResult.notifications];
	return {
		ok: false,
		model: null,
		notifications,
		trace: {
			...trace,
			notifications: [...trace.notifications, ...notifications],
		},
		runtimePlan: null,
	};
}

function resolveDefinitionModel(
	options: ResolveSurfaceVisualOptions,
	sourceIndex: ReturnType<typeof buildSurfaceSourceIndex>,
	trace: SurfaceResolutionTrace,
): ResolveVisualModelResult & { runtimePlan: SurfaceAnimationRuntimePlan | null } {
	const definitions = options.definitionsByShell.get(options.shellName);
	const definition = definitions?.get(options.surfaceId) ?? null;
	if (!definition) {
		trace.steps.push({
			stage: "definition",
			ok: false,
			details: `surface ${options.surfaceId} のdefinitionがありません`,
			fatal: false,
		});
		return {
			model: null,
			notifications: [],
			runtimePlan: null,
		};
	}

	trace.steps.push({
		stage: "definition",
		ok: true,
		details: `surface ${options.surfaceId} のdefinitionを検出しました`,
		fatal: false,
	});

	const baseResult = evaluateSurfaceStatic({
		shellName: options.shellName,
		surfaceId: options.surfaceId,
		catalog: options.catalog,
		definitionsByShell: options.definitionsByShell,
		fileContents: options.fileContents,
		sourceIndex,
	});
	const runtimePlanResult = buildRuntimePlan({
		shellName: options.shellName,
		surfaceId: options.surfaceId,
		definition,
		baseLayers: baseResult.layers,
		catalog: options.catalog,
		definitionsByShell: options.definitionsByShell,
		fileContents: options.fileContents,
		sourceIndex,
	});
	const notifications = [...baseResult.diagnostics, ...runtimePlanResult.notifications];
	trace.notifications.push(...notifications);
	const runtimeSeedLayers =
		baseResult.layers.length > 0
			? baseResult.layers
			: buildRuntimeSeedLayers(runtimePlanResult.runtimePlan);

	if (runtimeSeedLayers.length === 0) {
		trace.steps.push({
			stage: "static-eval",
			ok: false,
			details: "definitionは存在しますが描画可能な初期レイヤーがありません",
			fatal: true,
		});
		return {
			model: null,
			notifications,
			runtimePlan: runtimePlanResult.runtimePlan,
		};
	}

	trace.steps.push({
		stage: "static-eval",
		ok: true,
		details:
			baseResult.layers.length > 0
				? `base layer ${baseResult.layers.length}件を解決しました`
				: `runtime初期フレームから ${runtimeSeedLayers.length}件を解決しました`,
		fatal: false,
	});

	const model = buildVisualModelFromRenderLayers({
		surfaceId: options.surfaceId,
		layers: runtimeSeedLayers,
		fileName: `surface${String(options.surfaceId).padStart(4, "0")}.composite`,
	});
	return {
		model,
		notifications,
		runtimePlan: runtimePlanResult.runtimePlan,
	};
}

function resolveDirectAssetModel(
	options: ResolveSurfaceVisualOptions,
	sourceIndex: ReturnType<typeof buildSurfaceSourceIndex>,
	trace: SurfaceResolutionTrace,
): ResolveVisualModelResult {
	const shellCatalog = options.catalog.find((entry) => entry.shellName === options.shellName);
	if (!shellCatalog) {
		trace.steps.push({
			stage: "direct-asset",
			ok: false,
			details: `shell catalogがありません: ${options.shellName}`,
			fatal: false,
		});
		return {
			model: null,
			notifications: [],
		};
	}

	const asset = shellCatalog.assets.find((entry) => entry.id === options.surfaceId);
	if (!asset) {
		trace.steps.push({
			stage: "direct-asset",
			ok: false,
			details: `surface ${options.surfaceId} のdirect assetがありません`,
			fatal: false,
		});
		return {
			model: null,
			notifications: [],
		};
	}

	const pathResolution = resolveImagePath({
		requestedPath: asset.pngPath,
		shellName: options.shellName,
		index: sourceIndex,
	});
	if (!pathResolution.ok || !pathResolution.resolvedPath) {
		const notification = createSurfaceNotification({
			level: "warning",
			code: "SURFACE_PATH_CANDIDATE_MISS",
			message: `画像パスを解決できませんでした: ${asset.pngPath}`,
			shellName: options.shellName,
			scopeId: null,
			surfaceId: options.surfaceId,
			stage: "path",
			fatal: true,
			details: {
				requestedPath: asset.pngPath,
				candidates: pathResolution.attemptedCandidates.join(", "),
			},
		});
		trace.steps.push({
			stage: "path",
			ok: false,
			details: `direct assetのパス解決に失敗しました: ${asset.pngPath}`,
			fatal: true,
		});
		trace.notifications.push(notification);
		return {
			model: null,
			notifications: [notification],
		};
	}

	trace.steps.push({
		stage: "path",
		ok: true,
		details: `direct assetを解決しました: ${pathResolution.resolvedPath}`,
		fatal: false,
	});

	const resolvedPath = pathResolution.resolvedPath;
	const notifications: SurfaceNotification[] = [];
	const buffer = options.fileContents.get(resolvedPath);
	if (!buffer) {
		const notification = createSurfaceNotification({
			level: "warning",
			code: "SURFACE_ASSET_BUFFER_MISSING",
			message: `surface画像バッファを解決できませんでした: ${resolvedPath}`,
			shellName: options.shellName,
			scopeId: null,
			surfaceId: options.surfaceId,
			stage: "direct-asset",
			fatal: true,
		});
		trace.steps.push({
			stage: "direct-asset",
			ok: false,
			details: notification.message,
			fatal: true,
		});
		trace.notifications.push(notification);
		return {
			model: null,
			notifications: [notification],
		};
	}

	const metadata = readPngMetadata(buffer);
	if (metadata === null) {
		notifications.push(
			createSurfaceNotification({
				level: "warning",
				code: "SURFACE_PNG_METADATA_INVALID",
				message: `PNGメタ情報を解決できないためフォールバックサイズで表示します: ${resolvedPath}`,
				shellName: options.shellName,
				scopeId: null,
				surfaceId: options.surfaceId,
				stage: "direct-asset",
				fatal: false,
			}),
		);
	}

	const mask = resolvePnaMaskPath({
		shellName: options.shellName,
		surfaceId: options.surfaceId,
		sourcePath: resolvedPath,
		explicitPnaPath: asset.pnaPath,
		sourceIndex,
		fileContents: options.fileContents,
	});
	trace.steps.push({
		stage: "pna",
		ok: true,
		details: mask.alphaMaskPath
			? `PNAマスクを適用しました: ${mask.alphaMaskPath}`
			: "PNAマスクは適用されませんでした",
		fatal: false,
	});
	notifications.push(...mask.notifications);
	trace.notifications.push(...notifications);

	const width = metadata?.width ?? FALLBACK_IMAGE_WIDTH;
	const height = metadata?.height ?? FALLBACK_IMAGE_HEIGHT;
	return {
		model: {
			surfaceId: options.surfaceId,
			fileName: toFileName(resolvedPath),
			mode: "asset",
			width,
			height,
			layers: [
				{
					path: resolvedPath,
					alphaMaskPath: mask.alphaMaskPath,
					x: 0,
					y: 0,
					width,
					height,
					imageUrl: resolvedPath,
					alphaMaskUrl: null,
				},
			],
		},
		notifications,
	};
}

function buildRuntimePlan(options: {
	shellName: string;
	surfaceId: number;
	definition: SurfaceDefinition;
	baseLayers: SurfaceRenderLayer[];
	catalog: ShellSurfaceCatalog[];
	definitionsByShell: SurfaceDefinitionsByShell;
	fileContents: Map<string, ArrayBuffer>;
	sourceIndex: ReturnType<typeof buildSurfaceSourceIndex>;
}): { runtimePlan: SurfaceAnimationRuntimePlan | null; notifications: SurfaceNotification[] } {
	if (options.definition.animations.length === 0) {
		return {
			runtimePlan: null,
			notifications: [],
		};
	}

	const notifications: SurfaceNotification[] = [];
	const tracks: SurfaceAnimationTrack[] = [];
	const capabilities: SurfaceRuntimeCapability[] = [];
	for (const animation of [...options.definition.animations].sort(
		(left, right) => left.id - right.id,
	)) {
		const mode = resolveRuntimeMode(animation);
		if (mode.mode === "unsupported") {
			capabilities.push({
				code: "SURFACE_RUNTIME_INTERVAL_UNSUPPORTED",
				message: `interval=${animation.interval?.raw ?? "unknown"} は実時間再生対象外です`,
				supported: false,
				mode: animation.interval?.raw ?? "unknown",
			});
			notifications.push(
				createSurfaceNotification({
					level: "info",
					code: "SURFACE_RUNTIME_INTERVAL_UNSUPPORTED",
					message: `interval=${animation.interval?.raw ?? "unknown"} は実時間再生対象外です`,
					shellName: options.shellName,
					scopeId: null,
					surfaceId: options.surfaceId,
					stage: "runtime-eval",
					fatal: false,
				}),
			);
			continue;
		}

		const frames = buildRuntimeFrames(options, animation, notifications);
		if (frames.length === 0) {
			continue;
		}
		tracks.push({
			id: animation.id,
			mode: mode.mode,
			loop: mode.loop,
			triggerEveryMs: mode.triggerEveryMs,
			triggerProbability: mode.triggerProbability,
			frames,
		});
	}

	return {
		runtimePlan: {
			surfaceId: options.surfaceId,
			shellName: options.shellName,
			baseLayers: options.baseLayers.map((layer) => ({ ...layer })),
			tracks,
			capabilities,
		},
		notifications,
	};
}

function buildRuntimeFrames(
	options: {
		shellName: string;
		surfaceId: number;
		catalog: ShellSurfaceCatalog[];
		definitionsByShell: SurfaceDefinitionsByShell;
		fileContents: Map<string, ArrayBuffer>;
		sourceIndex: ReturnType<typeof buildSurfaceSourceIndex>;
	},
	animation: SurfaceAnimation,
	notifications: SurfaceNotification[],
): SurfaceAnimationFrame[] {
	const frames: SurfaceAnimationFrame[] = [];
	const patterns = [...animation.patterns].sort((left, right) => left.index - right.index);
	for (const pattern of patterns) {
		const rawMethod = (pattern.rawMethod ?? pattern.method ?? "unknown").trim().toLowerCase();
		const normalizedMethod = rawMethod === "bind" ? "overlay" : pattern.method;
		if (rawMethod === "bind") {
			notifications.push(
				createSurfaceNotification({
					level: "info",
					code: "SURFACE_STATIC_ANIMATION_METHOD_DIALECT",
					message: "animation pattern method 'bind' を overlay として処理しました",
					shellName: options.shellName,
					scopeId: null,
					surfaceId: options.surfaceId,
					stage: "runtime-eval",
					fatal: false,
					details: {
						trackId: animation.id,
						patternIndex: pattern.index,
					},
				}),
			);
		}

		if (
			normalizedMethod === "start" ||
			normalizedMethod === "stop" ||
			normalizedMethod === "alternativestart" ||
			normalizedMethod === "alternativestop"
		) {
			continue;
		}

		if (normalizedMethod === "unknown") {
			notifications.push(
				createSurfaceNotification({
					level: "warning",
					code: "SURFACE_STATIC_ANIMATION_METHOD_UNKNOWN",
					message: `未対応のanimation pattern methodを検出しました: ${rawMethod || "unknown"}`,
					shellName: options.shellName,
					scopeId: null,
					surfaceId: options.surfaceId,
					stage: "runtime-eval",
					fatal: false,
					details: {
						trackId: animation.id,
						patternIndex: pattern.index,
						rawMethod: rawMethod || "unknown",
					},
				}),
			);
			continue;
		}

		if (
			normalizedMethod === "move" ||
			normalizedMethod === "reduce" ||
			normalizedMethod === "insert"
		) {
			notifications.push(
				createSurfaceNotification({
					level: "info",
					code: "SURFACE_RUNTIME_METHOD_UNSUPPORTED",
					message: `animation method=${normalizedMethod} は実時間再生対象外です`,
					shellName: options.shellName,
					scopeId: null,
					surfaceId: options.surfaceId,
					stage: "runtime-eval",
					fatal: false,
					details: {
						trackId: animation.id,
						patternIndex: pattern.index,
					},
				}),
			);
			continue;
		}

		const waitMs =
			pattern.wait !== null && Number.isFinite(pattern.wait) ? Math.max(1, pattern.wait) : 50;
		if (pattern.surfaceRef === -1) {
			frames.push({
				trackId: animation.id,
				patternIndex: pattern.index,
				operation: "clear",
				waitMs,
				layers: [],
			});
			continue;
		}
		if (pattern.surfaceRef === null) {
			notifications.push(
				createSurfaceNotification({
					level: "warning",
					code: "SURFACE_STATIC_PATTERN_INVALID",
					message: "surfaceRef が不正なためpatternを適用できませんでした",
					shellName: options.shellName,
					scopeId: null,
					surfaceId: options.surfaceId,
					stage: "runtime-eval",
					fatal: false,
					details: {
						trackId: animation.id,
						patternIndex: pattern.index,
					},
				}),
			);
			continue;
		}

		const referenced = evaluateSurfaceStatic({
			shellName: options.shellName,
			surfaceId: pattern.surfaceRef,
			catalog: options.catalog,
			definitionsByShell: options.definitionsByShell,
			fileContents: options.fileContents,
			sourceIndex: options.sourceIndex,
		});
		notifications.push(...referenced.diagnostics);
		if (referenced.layers.length === 0) {
			notifications.push(
				createSurfaceNotification({
					level: "warning",
					code: "SURFACE_STATIC_PATTERN_SURFACE_UNRESOLVED",
					message: `patternの参照surfaceを解決できませんでした: ${pattern.surfaceRef}`,
					shellName: options.shellName,
					scopeId: null,
					surfaceId: options.surfaceId,
					stage: "runtime-eval",
					fatal: true,
					details: {
						trackId: animation.id,
						patternIndex: pattern.index,
						referencedSurfaceId: pattern.surfaceRef,
					},
				}),
			);
			continue;
		}

		const layers = referenced.layers.map((layer) => ({
			...layer,
			x: layer.x + pattern.x,
			y: layer.y + pattern.y,
		}));
		frames.push({
			trackId: animation.id,
			patternIndex: pattern.index,
			operation: normalizedMethod === "base" ? "replace-base" : "overlay",
			waitMs,
			layers,
		});
	}

	return frames;
}

function resolveRuntimeMode(animation: SurfaceAnimation): {
	mode: SurfaceAnimationTrack["mode"];
	loop: boolean;
	triggerEveryMs: number | null;
	triggerProbability: number | null;
} {
	const raw = animation.interval?.raw.toLowerCase() ?? "";
	const normalizedMode =
		animation.interval?.runtimeMeta?.normalizedMode ?? animation.interval?.mode ?? "unknown";
	if (normalizedMode === "bind") {
		return { mode: "bind", loop: false, triggerEveryMs: null, triggerProbability: null };
	}
	if (normalizedMode === "always") {
		return { mode: "always", loop: false, triggerEveryMs: null, triggerProbability: null };
	}
	if (normalizedMode === "runonce") {
		return { mode: "runonce", loop: false, triggerEveryMs: null, triggerProbability: null };
	}
	if (raw.includes("sometimes") || animation.interval?.runtimeMeta?.isDialect) {
		return { mode: "sometimes", loop: false, triggerEveryMs: 3000, triggerProbability: 0.3 };
	}
	return { mode: "unsupported", loop: false, triggerEveryMs: null, triggerProbability: null };
}

function buildRuntimeSeedLayers(
	runtimePlan: SurfaceAnimationRuntimePlan | null,
): SurfaceRenderLayer[] {
	if (!runtimePlan || runtimePlan.tracks.length === 0) {
		return [];
	}
	const runtime = createSurfaceAnimationRuntime(runtimePlan, {
		clock: {
			now: () => 0,
		},
		rng: () => 0,
	});
	const snapshot = runtime.getSnapshot();
	runtime.stop();
	return snapshot.layers;
}

function toFileName(path: string): string {
	const segments = path.split("/");
	return segments[segments.length - 1] ?? path;
}
