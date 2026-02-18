import type {
	SurfaceAlignmentMode,
	SurfacePositionResolved,
	SurfacePositionValueSource,
} from "@/types";

interface ResolveSurfacePositionOptions {
	scopeId: number;
	shellDescriptProperties: Record<string, string>;
	ghostDescriptProperties: Record<string, string>;
	fallbackCenterX: number;
	fallbackBottomY: number;
}

interface ResolveAlignmentOptions {
	shellDescriptProperties: Record<string, string>;
	ghostDescriptProperties: Record<string, string>;
}

interface ResolvedAxisValue {
	value: number | null;
	key: string | null;
	source: SurfacePositionValueSource;
}

export interface SurfaceAlignmentResolved {
	mode: SurfaceAlignmentMode;
	defaultLeft: number;
	defaultTop: number;
}

export function resolveSurfacePosition(
	options: ResolveSurfacePositionOptions,
): SurfacePositionResolved {
	const x = resolveScopeAxisValue(
		options.scopeId,
		"x",
		options.shellDescriptProperties,
		options.ghostDescriptProperties,
	);
	const y = resolveScopeAxisValue(
		options.scopeId,
		"y",
		options.shellDescriptProperties,
		options.ghostDescriptProperties,
	);

	return {
		scopeId: options.scopeId,
		centerX: x.value ?? options.fallbackCenterX,
		bottomY: y.value ?? options.fallbackBottomY,
		xKey: x.key,
		yKey: y.key,
		xSource: x.value === null ? "fallback" : x.source,
		ySource: y.value === null ? "fallback" : y.source,
		isFallback: x.value === null || y.value === null,
	};
}

export function resolveSurfaceAlignment(
	options: ResolveAlignmentOptions,
): SurfaceAlignmentResolved {
	const alignmentRaw = resolveSharedTextValue(
		"alignmenttodesktop",
		options.shellDescriptProperties,
		options.ghostDescriptProperties,
	);
	const mode = normalizeAlignmentMode(alignmentRaw);
	if (mode !== "free") {
		return {
			mode,
			defaultLeft: 0,
			defaultTop: 0,
		};
	}

	const defaultLeft = resolveSharedNumberValue(
		"defaultleft",
		options.shellDescriptProperties,
		options.ghostDescriptProperties,
	);
	const defaultTop = resolveSharedNumberValue(
		"defaulttop",
		options.shellDescriptProperties,
		options.ghostDescriptProperties,
	);
	return {
		mode,
		defaultLeft,
		defaultTop,
	};
}

function resolveScopeAxisValue(
	scopeId: number,
	axis: "x" | "y",
	shellDescriptProperties: Record<string, string>,
	ghostDescriptProperties: Record<string, string>,
): ResolvedAxisValue {
	const keys = resolveScopeAxisKeys(scopeId, axis);
	for (const key of keys) {
		const shellValue = parseNumeric(shellDescriptProperties[key]);
		if (shellValue !== null) {
			return {
				value: shellValue,
				key,
				source: "shell",
			};
		}
		const ghostValue = parseNumeric(ghostDescriptProperties[key]);
		if (ghostValue !== null) {
			return {
				value: ghostValue,
				key,
				source: "ghost",
			};
		}
	}
	return {
		value: null,
		key: null,
		source: "fallback",
	};
}

function resolveScopeAxisKeys(scopeId: number, axis: "x" | "y"): string[] {
	if (scopeId === 0) {
		return [`sakura.default${axis}`, `char0.default${axis}`, `default${axis}`];
	}
	if (scopeId === 1) {
		return [`kero.default${axis}`, `char1.default${axis}`, `default${axis}`];
	}
	return [`char${scopeId}.default${axis}`, `default${axis}`];
}

function resolveSharedTextValue(
	key: string,
	shellDescriptProperties: Record<string, string>,
	ghostDescriptProperties: Record<string, string>,
): string | null {
	const shellValue = shellDescriptProperties[key];
	if (shellValue !== undefined && shellValue.trim() !== "") {
		return shellValue.trim();
	}
	const ghostValue = ghostDescriptProperties[key];
	if (ghostValue !== undefined && ghostValue.trim() !== "") {
		return ghostValue.trim();
	}
	return null;
}

function resolveSharedNumberValue(
	key: string,
	shellDescriptProperties: Record<string, string>,
	ghostDescriptProperties: Record<string, string>,
): number {
	const fromShell = parseNumeric(shellDescriptProperties[key]);
	if (fromShell !== null) {
		return fromShell;
	}
	const fromGhost = parseNumeric(ghostDescriptProperties[key]);
	if (fromGhost !== null) {
		return fromGhost;
	}
	return 0;
}

function normalizeAlignmentMode(value: string | null): SurfaceAlignmentMode {
	if (value === null) {
		return "none";
	}
	return value.toLowerCase() === "free" ? "free" : "none";
}

function parseNumeric(value: string | undefined): number | null {
	if (value === undefined) {
		return null;
	}
	const parsed = Number(value.trim());
	if (!Number.isFinite(parsed)) {
		return null;
	}
	return parsed;
}
