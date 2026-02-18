import { createSurfaceNotification } from "@/lib/surfaces/surface-notification-policy";
import { readPngMetadata } from "@/lib/surfaces/png-metadata";
import { resolvePnaMaskPath } from "@/lib/surfaces/pna-mask";
import { resolveImagePath, type SurfaceSourceIndex } from "@/lib/surfaces/surface-source-index";
import type {
	ShellSurfaceCatalog,
	SurfaceDefinition,
	SurfaceDefinitionsByShell,
	SurfaceNotification,
	SurfaceRenderLayer,
	SurfaceStaticEvaluationResult,
} from "@/types";

interface EvaluateSurfaceStaticOptions {
	shellName: string;
	surfaceId: number;
	catalog: ShellSurfaceCatalog[];
	definitionsByShell: SurfaceDefinitionsByShell;
	fileContents: Map<string, ArrayBuffer>;
	sourceIndex: SurfaceSourceIndex;
}

const FALLBACK_IMAGE_WIDTH = 240;
const FALLBACK_IMAGE_HEIGHT = 360;

export function evaluateSurfaceStatic(
	options: EvaluateSurfaceStaticOptions,
): SurfaceStaticEvaluationResult {
	const definitions = options.definitionsByShell.get(options.shellName) ?? new Map();
	const definition = definitions.get(options.surfaceId) ?? null;
	if (!definition || definition.elements.length === 0) {
		return resolveAssetLayer(options);
	}
	return resolveDefinitionElements(options, definition);
}

function resolveDefinitionElements(
	options: EvaluateSurfaceStaticOptions,
	definition: SurfaceDefinition,
): SurfaceStaticEvaluationResult {
	const layers: SurfaceRenderLayer[] = [];
	const diagnostics: SurfaceNotification[] = [];
	for (const element of [...definition.elements].sort((left, right) => left.id - right.id)) {
		const pathResolution = resolveImagePath({
			requestedPath: element.path,
			shellName: options.shellName,
			index: options.sourceIndex,
		});
		if (!pathResolution.ok || !pathResolution.resolvedPath) {
			diagnostics.push(
				createSurfaceNotification({
					level: "warning",
					code: "SURFACE_PATH_CANDIDATE_MISS",
					message: `element画像を解決できませんでした: ${element.path}`,
					shellName: options.shellName,
					scopeId: null,
					surfaceId: options.surfaceId,
					stage: "path",
					fatal: true,
					details: {
						requestedPath: element.path,
						candidates: pathResolution.attemptedCandidates.join(", "),
					},
				}),
			);
			continue;
		}

		const resolvedPath = pathResolution.resolvedPath;
		const buffer = options.fileContents.get(resolvedPath);
		const metadata = buffer ? readPngMetadata(buffer) : null;
		if (!buffer || !metadata) {
			diagnostics.push(
				createSurfaceNotification({
					level: "warning",
					code: "SURFACE_STATIC_LAYER_INVALID",
					message: `element画像のPNGメタ情報を解決できませんでした: ${resolvedPath}`,
					shellName: options.shellName,
					scopeId: null,
					surfaceId: options.surfaceId,
					stage: "static-eval",
					fatal: true,
				}),
			);
			continue;
		}

		const mask = resolvePnaMaskPath({
			shellName: options.shellName,
			surfaceId: options.surfaceId,
			sourcePath: resolvedPath,
			explicitPnaPath: null,
			sourceIndex: options.sourceIndex,
			fileContents: options.fileContents,
		});
		diagnostics.push(...mask.notifications);
		layers.push({
			sourcePath: resolvedPath,
			alphaMaskPath: mask.alphaMaskPath,
			x: element.x,
			y: element.y,
			width: metadata.width,
			height: metadata.height,
		});
	}

	if (layers.length > 0) {
		return {
			layers,
			diagnostics,
		};
	}

	const fallback = resolveAssetLayer(options);
	return {
		layers: fallback.layers,
		diagnostics: [...diagnostics, ...fallback.diagnostics],
	};
}

function resolveAssetLayer(options: EvaluateSurfaceStaticOptions): SurfaceStaticEvaluationResult {
	const shellCatalog = options.catalog.find((entry) => entry.shellName === options.shellName);
	const asset = shellCatalog?.assets.find((entry) => entry.id === options.surfaceId);
	if (!asset) {
		return {
			layers: [],
			diagnostics: [],
		};
	}

	const pathResolution = resolveImagePath({
		requestedPath: asset.pngPath,
		shellName: options.shellName,
		index: options.sourceIndex,
	});
	if (!pathResolution.ok || !pathResolution.resolvedPath) {
		return {
			layers: [],
			diagnostics: [
				createSurfaceNotification({
					level: "warning",
					code: "SURFACE_PATH_CANDIDATE_MISS",
					message: `surface画像を解決できませんでした: ${asset.pngPath}`,
					shellName: options.shellName,
					scopeId: null,
					surfaceId: options.surfaceId,
					stage: "path",
					fatal: true,
					details: {
						requestedPath: asset.pngPath,
						candidates: pathResolution.attemptedCandidates.join(", "),
					},
				}),
			],
		};
	}

	const resolvedPath = pathResolution.resolvedPath;
	const diagnostics: SurfaceNotification[] = [];
	const buffer = options.fileContents.get(resolvedPath);
	const metadata = buffer ? readPngMetadata(buffer) : null;
	if (!buffer || !metadata) {
		diagnostics.push(
			createSurfaceNotification({
				level: "warning",
				code: "SURFACE_STATIC_LAYER_INVALID",
				message: `surface画像のPNGメタ情報を解決できませんでした: ${resolvedPath}`,
				shellName: options.shellName,
				scopeId: null,
				surfaceId: options.surfaceId,
				stage: "static-eval",
				fatal: true,
			}),
		);
	}

	const mask = resolvePnaMaskPath({
		shellName: options.shellName,
		surfaceId: options.surfaceId,
		sourcePath: resolvedPath,
		explicitPnaPath: asset.pnaPath,
		sourceIndex: options.sourceIndex,
		fileContents: options.fileContents,
	});
	diagnostics.push(...mask.notifications);

	return {
		layers: [
			{
				sourcePath: resolvedPath,
				alphaMaskPath: mask.alphaMaskPath,
				x: 0,
				y: 0,
				width: metadata?.width ?? FALLBACK_IMAGE_WIDTH,
				height: metadata?.height ?? FALLBACK_IMAGE_HEIGHT,
			},
		],
		diagnostics,
	};
}
