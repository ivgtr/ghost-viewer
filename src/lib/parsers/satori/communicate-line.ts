export function stripCommunicatePrefix(line: string): string {
	if (!line.startsWith("→")) {
		return line;
	}
	return line.slice(1);
}

export function normalizeSatoriBodyLine(line: string): string {
	return stripCommunicatePrefix(line);
}
