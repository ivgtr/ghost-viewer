import type { SurfaceRegion } from "@/types";
import { hashPointKey, unquote } from "./surfaces-parser-utils";

interface ParsedRegionLine {
	region: SurfaceRegion;
}

export function parseRegionLine(line: string): ParsedRegionLine | null {
	const match = line.match(/^(collisionex|collision|point)(\d+)\s*,\s*(.+)$/i);
	if (!match) {
		return null;
	}

	const kindToken = match[1]?.toLowerCase();
	const idText = match[2];
	const payload = match[3]?.trim() ?? "";
	if (!kindToken || !idText || payload === "") {
		return null;
	}

	const id = Number(idText);
	if (!Number.isInteger(id)) {
		return null;
	}

	const kind = kindToken as "collision" | "collisionex" | "point";
	const fields = payload.split(",").map((field) => field.trim());
	let name: string | null = null;
	let shape: string | null = null;
	let values: number[] = [];

	if (kind === "point") {
		name = fields[0] && fields[0].length > 0 ? unquote(fields[0]) : null;
		shape = fields[1] && fields[1].length > 0 ? unquote(fields[1]) : null;
		values = fields
			.slice(2)
			.map((field) => Number(field))
			.filter((value) => Number.isFinite(value));
	} else {
		const numericPrefix = fields.slice(0, 4).map((field) => Number(field));
		if (numericPrefix.every((value) => Number.isFinite(value))) {
			values = numericPrefix;
			name = fields[4] && fields[4].length > 0 ? unquote(fields[4]) : null;
		} else {
			name = fields[0] && fields[0].length > 0 ? unquote(fields[0]) : null;
			shape = fields[1] && fields[1].length > 0 ? unquote(fields[1]) : null;
			values = fields
				.slice(2)
				.map((field) => Number(field))
				.filter((value) => Number.isFinite(value));
		}
	}

	return {
		region: {
			id,
			kind,
			name,
			shape,
			values,
			raw: line,
		},
	};
}

export function parsePointPropertyLine(line: string): ParsedRegionLine | null {
	const match = line.match(/^point\.([^,\s]+)\s*,\s*(.+)$/i);
	if (!match) {
		return null;
	}

	const key = unquote(match[1] ?? "")
		.trim()
		.toLowerCase();
	const payload = match[2]?.trim() ?? "";
	if (key === "" || payload === "") {
		return null;
	}

	const values = payload
		.split(",")
		.map((value) => Number(value.trim()))
		.filter((value) => Number.isFinite(value));
	if (values.length === 0) {
		return null;
	}

	return {
		region: {
			id: hashPointKey(key),
			kind: "point",
			name: key,
			shape: null,
			values,
			raw: line,
		},
	};
}
