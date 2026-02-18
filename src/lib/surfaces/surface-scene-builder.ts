import {
	resolveSurfaceAlignment,
	resolveSurfacePosition,
} from "@/lib/surfaces/surface-position-resolver";
import type { SurfaceScene } from "@/types";

interface SurfaceSceneCharacterInput {
	scopeId: number;
	surfaceId: number | null;
	fileName: string | null;
	width: number;
	height: number;
}

interface BuildSurfaceSceneOptions {
	characters: SurfaceSceneCharacterInput[];
	shellDescriptProperties: Record<string, string>;
	ghostDescriptProperties: Record<string, string>;
	gap?: number;
}

const DEFAULT_GAP = 24;
const SAKURA_SCOPE_ID = 0;
const KERO_SCOPE_ID = 1;

export function buildSurfaceScene(options: BuildSurfaceSceneOptions): SurfaceScene {
	const gap = normalizeNonNegative(options.gap, DEFAULT_GAP);
	const characters = options.characters
		.filter((character) => character.width > 0 && character.height > 0)
		.sort((a, b) => a.scopeId - b.scopeId);

	const characterByScope = new Map<number, SurfaceSceneCharacterInput>();
	for (const character of characters) {
		characterByScope.set(character.scopeId, character);
	}

	const sakura = characterByScope.get(SAKURA_SCOPE_ID);
	const kero = characterByScope.get(KERO_SCOPE_ID);

	const fallbackCenterXByScope = new Map<number, number>();
	const fallbackBottomYByScope = new Map<number, number>();
	if (kero) {
		fallbackCenterXByScope.set(KERO_SCOPE_ID, kero.width / 2);
		fallbackBottomYByScope.set(KERO_SCOPE_ID, 0);
	}
	if (sakura) {
		const baseLeft = kero ? kero.width + gap : 0;
		fallbackCenterXByScope.set(SAKURA_SCOPE_ID, baseLeft + sakura.width / 2);
		fallbackBottomYByScope.set(SAKURA_SCOPE_ID, 0);
	}

	const nodes = characters.map((character) => {
		const fallbackCenterX = fallbackCenterXByScope.get(character.scopeId) ?? character.width / 2;
		const fallbackBottomY = fallbackBottomYByScope.get(character.scopeId) ?? 0;
		const position = resolveSurfacePosition({
			scopeId: character.scopeId,
			shellDescriptProperties: options.shellDescriptProperties,
			ghostDescriptProperties: options.ghostDescriptProperties,
			fallbackCenterX,
			fallbackBottomY,
		});

		return {
			scopeId: character.scopeId,
			surfaceId: character.surfaceId,
			fileName: character.fileName,
			width: character.width,
			height: character.height,
			worldLeft: position.centerX - character.width / 2,
			worldBottom: position.bottomY,
			position,
		};
	});

	const alignment = resolveSurfaceAlignment({
		shellDescriptProperties: options.shellDescriptProperties,
		ghostDescriptProperties: options.ghostDescriptProperties,
	});

	return {
		nodes,
		alignmentMode: alignment.mode,
		defaultLeft: alignment.defaultLeft,
		defaultTop: alignment.defaultTop,
	};
}

function normalizeNonNegative(value: number | undefined, fallback: number): number {
	if (value === undefined || !Number.isFinite(value) || value < 0) {
		return fallback;
	}
	return value;
}
