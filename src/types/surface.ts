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
	descriptProperties: Record<string, string>;
	rng?: () => number;
}
