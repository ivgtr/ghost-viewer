const EMPTY_EVENT_LABEL = "（無名イベント）";

export function isEventSelected(name: string | null): name is string {
	return name !== null;
}

export function isEmptyEventName(name: string): boolean {
	return name.trim().length === 0;
}

export function toEventDisplayName(name: string): string {
	if (isEmptyEventName(name)) {
		return EMPTY_EVENT_LABEL;
	}
	return name;
}
