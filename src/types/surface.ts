export interface SurfaceImageAsset {
	id: number;
	shellName: string;
	pngPath: string;
	pnaPath: string | null;
}

export interface ShellSurfaceCatalog {
	shellName: string;
	assets: SurfaceImageAsset[];
}

export interface SurfaceDiagnostic {
	level: "warning" | "error";
	code: string;
	message: string;
	shellName: string | null;
	path: string | null;
}

export interface SurfaceExtractionResult {
	shells: ShellSurfaceCatalog[];
	initialShellName: string | null;
	diagnostics: SurfaceDiagnostic[];
}

export interface SurfaceDefinitionFile {
	shellName: string;
	path: string;
	text: string;
	kind: "surfaces" | "alias";
}

export type SurfaceDefinitionFilesByShell = Map<string, SurfaceDefinitionFile[]>;

export interface SurfaceDefinitionLoadResult {
	filesByShell: SurfaceDefinitionFilesByShell;
	diagnostics: SurfaceDiagnostic[];
}

export interface SurfaceElement {
	id: number;
	kind: string;
	path: string;
	x: number;
	y: number;
}

export type SurfaceAnimationIntervalMode =
	| "bind"
	| "runonce"
	| "random"
	| "periodic"
	| "always"
	| "never"
	| "talk"
	| "yen-e"
	| "unknown";

export interface SurfaceIntervalSpec {
	raw: string;
	mode: SurfaceAnimationIntervalMode;
	args: number[];
	runtimeMeta: SurfaceIntervalRuntimeMeta;
}

export interface SurfaceIntervalRuntimeMeta {
	raw: string;
	normalizedMode: SurfaceAnimationIntervalMode;
	isDialect: boolean;
	args: number[];
}

export type SurfaceAnimationPatternMethod =
	| "base"
	| "overlay"
	| "add"
	| "replace"
	| "interpolate"
	| "asis"
	| "move"
	| "reduce"
	| "stop"
	| "start"
	| "alternativestart"
	| "alternativestop"
	| "insert"
	| "unknown";

export interface SurfaceAnimationPattern {
	index: number;
	method: SurfaceAnimationPatternMethod;
	rawMethod: string;
	surfaceRef: number | null;
	wait: number | null;
	x: number;
	y: number;
	optionals: number[];
}

export interface SurfaceAnimation {
	id: number;
	interval: SurfaceIntervalSpec | null;
	patterns: SurfaceAnimationPattern[];
}

export interface SurfaceRegion {
	id: number;
	kind: "collision" | "collisionex" | "point";
	name: string | null;
	shape: string | null;
	values: number[];
	raw: string;
}

export interface SurfaceDefinition {
	id: number;
	elements: SurfaceElement[];
	animations: SurfaceAnimation[];
	regions: SurfaceRegion[];
}

export type SurfaceDefinitionsByShell = Map<string, Map<number, SurfaceDefinition>>;

export type SurfaceAliasKey = number | string;

export type SurfaceAliasByScope = Map<SurfaceAliasKey, number[]>;

export type SurfaceAliasMap = Map<number, SurfaceAliasByScope>;

export type SurfaceAliasMapByShell = Map<string, SurfaceAliasMap>;

export interface SurfaceParseResult {
	definitionsByShell: SurfaceDefinitionsByShell;
	aliasMapByShell: SurfaceAliasMapByShell;
	diagnostics: SurfaceDiagnostic[];
}

export interface SurfaceResolverContext {
	aliasMap: SurfaceAliasMap;
	rng?: () => number;
}

export interface SurfaceNotification {
	level: "info" | "warning" | "error";
	code: string;
	message: string;
	shellName: string | null;
	scopeId: number | null;
	surfaceId: number | null;
	stage: SurfaceNotificationStage;
	fatal: boolean;
	details: Record<string, string | number | boolean | null> | null;
}

export type SurfaceSyncReason = "auto" | "manual";

export interface SurfaceInitializeInput {
	catalog: ShellSurfaceCatalog[];
	initialShellName: string | null;
	definitionsByShell: SurfaceDefinitionsByShell;
	aliasMapByShell: SurfaceAliasMapByShell;
	diagnostics: SurfaceDiagnostic[];
	ghostDescriptProperties: Record<string, string>;
	rng?: () => number;
}

export type SurfaceAlignmentMode = "none" | "free";

export type SurfacePositionValueSource = "shell" | "ghost" | "fallback";

export interface SurfacePositionResolved {
	scopeId: number;
	centerX: number;
	bottomY: number;
	xKey: string | null;
	yKey: string | null;
	xSource: SurfacePositionValueSource;
	ySource: SurfacePositionValueSource;
	isFallback: boolean;
}

export interface SurfaceSceneNode {
	scopeId: number;
	surfaceId: number | null;
	fileName: string | null;
	width: number;
	height: number;
	worldLeft: number;
	worldBottom: number;
	position: SurfacePositionResolved;
}

export interface SurfaceScene {
	nodes: SurfaceSceneNode[];
	alignmentMode: SurfaceAlignmentMode;
	defaultLeft: number;
	defaultTop: number;
}

export interface SurfaceCharacterPlacement {
	scopeId: number;
	surfaceId: number | null;
	fileName: string | null;
	worldLeft: number;
	worldBottom: number;
	width: number;
	height: number;
	screenX: number;
	screenY: number;
	screenWidth: number;
	screenHeight: number;
	position: SurfacePositionResolved;
}

export interface SurfaceSetLayout {
	viewportWidth: number;
	viewportHeight: number;
	scale: number;
	offsetX: number;
	offsetY: number;
	worldMinX: number;
	worldMinY: number;
	worldMaxX: number;
	worldMaxY: number;
	worldWidth: number;
	worldHeight: number;
	placements: SurfaceCharacterPlacement[];
}

export interface SurfaceVisualLayer {
	path: string;
	alphaMaskPath: string | null;
	x: number;
	y: number;
	width: number;
	height: number;
	imageUrl: string;
	alphaMaskUrl: string | null;
}

export interface SurfaceRenderLayer {
	sourcePath: string;
	x: number;
	y: number;
	width: number;
	height: number;
	alphaMaskPath: string | null;
}

export interface SurfaceStaticEvaluationResult {
	layers: SurfaceRenderLayer[];
	diagnostics: SurfaceNotification[];
}

export interface SurfaceVisualModel {
	surfaceId: number;
	fileName: string | null;
	mode: "asset" | "composite";
	width: number;
	height: number;
	layers: SurfaceVisualLayer[];
}

export interface SurfaceVisualResolveResult {
	ok: boolean;
	model: SurfaceVisualModel | null;
	notifications: SurfaceNotification[];
	trace: SurfaceResolutionTrace;
	runtimePlan: SurfaceAnimationRuntimePlan | null;
}

export interface SurfacePathResolution {
	ok: boolean;
	resolvedPath: string | null;
	attemptedCandidates: string[];
	reason: string | null;
}

export type SurfaceResolveStage = "definition" | "path" | "static-eval" | "direct-asset" | "pna";

export interface SurfaceResolveStep {
	stage: SurfaceResolveStage;
	ok: boolean;
	details: string;
	fatal: boolean;
}

export interface SurfaceResolutionTrace {
	surfaceId: number;
	steps: SurfaceResolveStep[];
	notifications: SurfaceNotification[];
}

export type SurfaceNotificationStage =
	| "alias"
	| "path"
	| "static-eval"
	| "runtime-eval"
	| "direct-asset"
	| "pna"
	| "store";

export type SurfaceAnimationRuntimeMode =
	| "bind"
	| "always"
	| "runonce"
	| "sometimes"
	| "unsupported";

export type SurfaceAnimationFrameOperation = "overlay" | "replace-base" | "clear";

export interface SurfaceAnimationFrame {
	trackId: number;
	patternIndex: number;
	operation: SurfaceAnimationFrameOperation;
	waitMs: number;
	layers: SurfaceRenderLayer[];
}

export interface SurfaceAnimationTrack {
	id: number;
	mode: SurfaceAnimationRuntimeMode;
	loop: boolean;
	triggerEveryMs: number | null;
	triggerProbability: number | null;
	frames: SurfaceAnimationFrame[];
}

export interface SurfaceRuntimeCapability {
	code: string;
	message: string;
	supported: boolean;
	mode: string;
}

export interface SurfaceAnimationRuntimePlan {
	surfaceId: number;
	shellName: string;
	baseLayers: SurfaceRenderLayer[];
	tracks: SurfaceAnimationTrack[];
	capabilities: SurfaceRuntimeCapability[];
}

export interface SurfaceRuntimeSnapshot {
	surfaceId: number;
	timestampMs: number;
	layers: SurfaceRenderLayer[];
	activeTrackIds: number[];
}
