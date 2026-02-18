import { createSurfaceNotification } from "@/lib/surfaces/surface-notification-policy";
import {
	buildSurfaceSourceIndex,
	resolveImagePath,
	type SurfaceSourceIndex,
} from "@/lib/surfaces/surface-source-index";
import { readPngMetadata } from "@/lib/surfaces/png-metadata";
import type { SurfaceNotification } from "@/types";

interface ResolvePnaMaskOptions {
	shellName: string;
	surfaceId: number;
	sourcePath: string;
	explicitPnaPath: string | null;
	sourceIndex: SurfaceSourceIndex;
	fileContents: Map<string, ArrayBuffer>;
}

export { buildSurfaceSourceIndex as buildSurfacePathIndex };

export type SurfacePathIndex = SurfaceSourceIndex;

export function resolvePathFromIndex(path: string, pathIndex: SurfacePathIndex): string | null {
	const resolution = resolveImagePath({
		requestedPath: path,
		shellName: inferShellName(path),
		index: pathIndex,
	});
	return resolution.resolvedPath;
}

export function resolvePnaMaskPath(options: ResolvePnaMaskOptions): {
	alphaMaskPath: string | null;
	notifications: SurfaceNotification[];
} {
	const notifications: SurfaceNotification[] = [];
	if (!/\.png$/i.test(options.sourcePath)) {
		return { alphaMaskPath: null, notifications };
	}

	const pngPath =
		resolveImagePath({
			requestedPath: options.sourcePath,
			shellName: options.shellName,
			index: options.sourceIndex,
		}).resolvedPath ?? options.sourcePath;
	const pnaCandidate =
		options.explicitPnaPath ?? pngPath.replace(/\.png$/i, ".pna").replace(/\\/g, "/");
	const pnaPath = resolveImagePath({
		requestedPath: pnaCandidate,
		shellName: options.shellName,
		index: options.sourceIndex,
		defaultExtension: ".pna",
	}).resolvedPath;
	if (!pnaPath) {
		return { alphaMaskPath: null, notifications };
	}

	const pngBuffer = options.fileContents.get(pngPath);
	const pnaBuffer = options.fileContents.get(pnaPath);
	if (!pngBuffer || !pnaBuffer) {
		return { alphaMaskPath: null, notifications };
	}

	const pngMetadata = readPngMetadata(pngBuffer);
	const pnaMetadata = readPngMetadata(pnaBuffer);
	if (!pngMetadata || !pnaMetadata) {
		notifications.push(
			createSurfaceNotification({
				level: "warning",
				code: "SURFACE_PNA_MASK_INVALID",
				message: `PNAマスクのPNG形式を解決できませんでした: ${pnaPath}`,
				shellName: options.shellName,
				scopeId: null,
				surfaceId: options.surfaceId,
				stage: "pna",
				fatal: false,
				details: {
					alphaMaskPath: pnaPath,
				},
			}),
		);
		return { alphaMaskPath: null, notifications };
	}
	if (pngMetadata.width !== pnaMetadata.width || pngMetadata.height !== pnaMetadata.height) {
		notifications.push(
			createSurfaceNotification({
				level: "warning",
				code: "SURFACE_PNA_DIMENSION_MISMATCH",
				message: `PNAマスクのサイズが一致しません: ${pnaPath}`,
				shellName: options.shellName,
				scopeId: null,
				surfaceId: options.surfaceId,
				stage: "pna",
				fatal: false,
				details: {
					alphaMaskPath: pnaPath,
					pngWidth: pngMetadata.width,
					pngHeight: pngMetadata.height,
					pnaWidth: pnaMetadata.width,
					pnaHeight: pnaMetadata.height,
				},
			}),
		);
		return { alphaMaskPath: null, notifications };
	}

	return {
		alphaMaskPath: pnaPath,
		notifications,
	};
}

function inferShellName(path: string): string {
	const normalized = path.replace(/\\/g, "/").replace(/^\.?\//, "");
	const match = normalized.match(/^shell\/([^/]+)\//i);
	return match?.[1] ?? "master";
}
