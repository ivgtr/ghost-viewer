import { decodeWithAutoDetection } from "@/lib/encoding/detect";
import type { GhostMeta } from "@/types";

export function parseDescript(text: string): Record<string, string> {
	const properties: Record<string, string> = {};

	for (const line of text.split(/\r?\n/)) {
		const trimmed = line.trim();
		if (trimmed === "" || trimmed.startsWith("//")) {
			continue;
		}

		const commaIndex = trimmed.indexOf(",");
		if (commaIndex === -1) {
			continue;
		}

		const key = trimmed.slice(0, commaIndex).trim();
		if (key === "") {
			continue;
		}

		const value = trimmed.slice(commaIndex + 1).trim();
		properties[key] = value;
	}

	return properties;
}

export function buildGhostMeta(properties: Record<string, string>): GhostMeta {
	return {
		name: properties.name ?? "",
		author: properties.craftmanw ?? properties.craftman ?? "",
		sakuraName: properties["sakura.name"] ?? "",
		keroName: properties["kero.name"] ?? "",
		properties,
	};
}

export function parseDescriptFromBuffer(buffer: ArrayBuffer): GhostMeta {
	const { text } = decodeWithAutoDetection(buffer);
	const properties = parseDescript(text);
	return buildGhostMeta(properties);
}
