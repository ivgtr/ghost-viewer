import type {
	SurfaceAnimationIntervalMode,
	SurfaceAnimationPattern,
	SurfaceAnimationPatternMethod,
	SurfaceIntervalSpec,
} from "@/types";
import { parseNullableInteger, parseNullableNumber } from "./surfaces-parser-utils";

export interface ParsedAnimationPatch {
	id: number;
	interval: SurfaceIntervalSpec | null;
	hasInterval: boolean;
	patterns: SurfaceAnimationPattern[];
}

interface MutableAnimationPatch {
	id: number;
	interval: SurfaceIntervalSpec | null;
	hasInterval: boolean;
	patternsByIndex: Map<number, SurfaceAnimationPattern>;
}

interface ParsedAnimationIntervalLine {
	animationId: number;
	interval: SurfaceIntervalSpec;
}

interface ParsedAnimationPatternLine {
	animationId: number;
	pattern: SurfaceAnimationPattern;
}

const ANIMATION_INTERVAL_MODES: SurfaceAnimationIntervalMode[] = [
	"bind",
	"runonce",
	"random",
	"periodic",
	"always",
	"never",
	"talk",
	"yen-e",
];

const DIALECT_INTERVAL_TOKENS = new Set(["sometimes"]);

const ANIMATION_PATTERN_METHODS: SurfaceAnimationPatternMethod[] = [
	"base",
	"overlay",
	"add",
	"replace",
	"interpolate",
	"asis",
	"move",
	"reduce",
	"stop",
	"start",
	"alternativestart",
	"alternativestop",
	"insert",
];

export function parseAnimationIntervalLine(line: string): ParsedAnimationIntervalLine | null {
	const match = line.match(/^animation(\d+)\.interval\s*,\s*(.+)$/i);
	if (!match) {
		return null;
	}

	const animationId = Number(match[1]);
	const intervalRaw = match[2]?.trim();
	if (!Number.isInteger(animationId) || !intervalRaw) {
		return null;
	}

	return {
		animationId,
		interval: parseIntervalSpec(intervalRaw),
	};
}

function parseIntervalSpec(raw: string): SurfaceIntervalSpec {
	const tokens = raw
		.split(",")
		.map((token) => token.trim())
		.filter((token) => token.length > 0);
	const first = tokens[0]?.toLowerCase() ?? "";
	const candidates = first.split("+");
	const mode =
		ANIMATION_INTERVAL_MODES.find((candidate) => candidates.includes(candidate)) ?? "unknown";
	const isDialect =
		mode === "unknown" && candidates.some((candidate) => DIALECT_INTERVAL_TOKENS.has(candidate));
	const args = tokens
		.slice(1)
		.map((token) => Number(token))
		.filter((value) => Number.isFinite(value));

	return {
		raw,
		mode,
		args,
		runtimeMeta: {
			raw,
			normalizedMode: mode,
			isDialect,
			args: [...args],
		},
	};
}

export function parseAnimationPatternLine(line: string): ParsedAnimationPatternLine | null {
	const match = line.match(/^animation(\d+)\.pattern(\d+)\s*,\s*(.+)$/i);
	if (!match) {
		return null;
	}

	const animationId = Number(match[1]);
	const patternIndex = Number(match[2]);
	const payload = match[3]?.trim() ?? "";
	if (!Number.isInteger(animationId) || !Number.isInteger(patternIndex) || payload === "") {
		return null;
	}

	const fields = payload.split(",").map((field) => field.trim());
	const patternFields = normalizePatternFields(fields);
	const rawMethod = patternFields.rawMethod;
	const method = normalizePatternMethod(rawMethod);
	const surfaceRef = parseNullableInteger(patternFields.surfaceRef);
	const wait = parseNullableNumber(patternFields.wait);
	const x = parseNullableNumber(patternFields.x) ?? 0;
	const y = parseNullableNumber(patternFields.y) ?? 0;
	const optionals = patternFields.optionals
		.map((field) => Number(field))
		.filter((value) => Number.isFinite(value));

	return {
		animationId,
		pattern: {
			index: patternIndex,
			method,
			rawMethod,
			surfaceRef,
			wait,
			x,
			y,
			optionals,
		},
	};
}

function normalizePatternFields(fields: string[]): {
	rawMethod: string;
	surfaceRef: string | undefined;
	wait: string | undefined;
	x: string | undefined;
	y: string | undefined;
	optionals: string[];
} {
	const first = fields[0] ?? "";
	const normalizedMethod = normalizePatternMethod(first);
	if (normalizedMethod !== "unknown" || first.toLowerCase() === "bind") {
		return {
			rawMethod: first,
			surfaceRef: fields[1],
			wait: fields[2],
			x: fields[3],
			y: fields[4],
			optionals: fields.slice(5),
		};
	}

	if (/^-?\d+$/.test(first)) {
		return {
			rawMethod: "overlay",
			surfaceRef: first,
			wait: fields[1],
			x: fields[2],
			y: fields[3],
			optionals: fields.slice(4),
		};
	}

	return {
		rawMethod: first,
		surfaceRef: fields[1],
		wait: fields[2],
		x: fields[3],
		y: fields[4],
		optionals: fields.slice(5),
	};
}

function normalizePatternMethod(value: string): SurfaceAnimationPatternMethod {
	const normalized = value.toLowerCase();
	if (normalized === "bind") {
		return "overlay";
	}
	return ANIMATION_PATTERN_METHODS.includes(normalized as SurfaceAnimationPatternMethod)
		? (normalized as SurfaceAnimationPatternMethod)
		: "unknown";
}

export function ensureAnimationPatch(
	animationsById: Map<number, MutableAnimationPatch>,
	animationId: number,
): MutableAnimationPatch {
	const existing = animationsById.get(animationId);
	if (existing) {
		return existing;
	}
	const created: MutableAnimationPatch = {
		id: animationId,
		interval: null,
		hasInterval: false,
		patternsByIndex: new Map(),
	};
	animationsById.set(animationId, created);
	return created;
}

export function toAnimationPatch(animation: MutableAnimationPatch): ParsedAnimationPatch {
	return {
		id: animation.id,
		interval: animation.interval,
		hasInterval: animation.hasInterval,
		patterns: [...animation.patternsByIndex.values()].sort((a, b) => a.index - b.index),
	};
}
