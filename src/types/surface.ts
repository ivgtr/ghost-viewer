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

export interface SurfaceDefinition {
	id: number;
	elements: SurfaceElement[];
}

export type SurfaceDefinitionsByShell = Map<string, Map<number, SurfaceDefinition>>;

export type SurfaceAliasMap = Map<number, Map<number, number[]>>;

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
	level: "warning" | "error";
	code: string;
	message: string;
	shellName: string | null;
	scopeId: number | null;
	surfaceId: number | null;
}

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
