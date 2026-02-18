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
