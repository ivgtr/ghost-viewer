import type {
	ShellSurfaceCatalog,
	SurfaceDiagnostic,
	SurfaceExtractionResult,
	SurfaceImageAsset,
} from "@/types";

interface SurfaceImageCandidate {
	pngPath: string | null;
	pnaPath: string | null;
}

const SURFACE_IMAGE_PATTERN = /^shell\/([^/]+)\/surface(-?\d+)\.(png|pna)$/i;

export function extractSurfaceAssets(
	fileContents: Map<string, ArrayBuffer>,
): SurfaceExtractionResult {
	const diagnostics: SurfaceDiagnostic[] = [];
	const candidatesByShell = collectSurfaceCandidates(fileContents);
	const shellNames = [...candidatesByShell.keys()].sort((a, b) => a.localeCompare(b));
	const shells: ShellSurfaceCatalog[] = [];

	for (const shellName of shellNames) {
		const candidates = candidatesByShell.get(shellName);
		if (!candidates) {
			continue;
		}
		const assets = normalizeAssets(shellName, candidates, diagnostics);
		if (assets.length > 0) {
			shells.push({ shellName, assets });
		}
	}

	if (shells.length === 0) {
		diagnostics.push({
			level: "warning",
			code: "SURFACE_NOT_FOUND",
			message: "surface 画像が見つかりません",
			shellName: null,
			path: null,
		});
	}

	return {
		shells,
		initialShellName: resolveInitialShellName(shells),
		diagnostics,
	};
}

function collectSurfaceCandidates(
	fileContents: Map<string, ArrayBuffer>,
): Map<string, Map<number, SurfaceImageCandidate>> {
	const candidatesByShell = new Map<string, Map<number, SurfaceImageCandidate>>();

	for (const filePath of fileContents.keys()) {
		const match = SURFACE_IMAGE_PATTERN.exec(filePath);
		if (!match) {
			continue;
		}

		const shellName = match[1];
		const surfaceId = Number(match[2]);
		const extension = match[3]?.toLowerCase();
		if (shellName === undefined || !Number.isInteger(surfaceId) || extension === undefined) {
			continue;
		}

		let candidates = candidatesByShell.get(shellName);
		if (!candidates) {
			candidates = new Map<number, SurfaceImageCandidate>();
			candidatesByShell.set(shellName, candidates);
		}

		const candidate = candidates.get(surfaceId) ?? { pngPath: null, pnaPath: null };
		if (extension === "png") {
			candidate.pngPath = filePath;
		} else {
			candidate.pnaPath = filePath;
		}
		candidates.set(surfaceId, candidate);
	}

	return candidatesByShell;
}

function normalizeAssets(
	shellName: string,
	candidates: Map<number, SurfaceImageCandidate>,
	diagnostics: SurfaceDiagnostic[],
): SurfaceImageAsset[] {
	const ids = [...candidates.keys()].sort((a, b) => a - b);
	const assets: SurfaceImageAsset[] = [];

	for (const id of ids) {
		const candidate = candidates.get(id);
		if (!candidate) {
			continue;
		}
		if (candidate.pngPath === null) {
			diagnostics.push({
				level: "warning",
				code: "SURFACE_PNA_WITHOUT_PNG",
				message: `surface${id}.pna は対応する PNG が存在しないため無視されます`,
				shellName,
				path: candidate.pnaPath,
			});
			continue;
		}
		assets.push({
			id,
			shellName,
			pngPath: candidate.pngPath,
			pnaPath: candidate.pnaPath,
		});
	}

	return assets;
}

function resolveInitialShellName(shells: ShellSurfaceCatalog[]): string | null {
	if (shells.length === 0) {
		return null;
	}
	const hasMaster = shells.some((shell) => shell.shellName === "master");
	if (hasMaster) {
		return "master";
	}
	return shells[0]?.shellName ?? null;
}
