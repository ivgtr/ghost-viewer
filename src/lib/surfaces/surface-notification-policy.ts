import type { SurfaceDiagnostic, SurfaceNotification, SurfaceNotificationStage } from "@/types";

interface CreateNotificationOptions {
	level: SurfaceNotification["level"];
	code: string;
	message: string;
	shellName: string | null;
	scopeId: number | null;
	surfaceId: number | null;
	stage: SurfaceNotificationStage;
	fatal: boolean;
	details?: Record<string, string | number | boolean | null> | null;
}

interface BuildUnresolvedNotificationOptions {
	shellName: string;
	scopeId: number;
	surfaceId: number;
	keepPrevious: boolean;
	rootCauses: SurfaceNotification[];
}

export function createSurfaceNotification(options: CreateNotificationOptions): SurfaceNotification {
	return {
		level: options.level,
		code: options.code,
		message: options.message,
		shellName: options.shellName,
		scopeId: options.scopeId,
		surfaceId: options.surfaceId,
		stage: options.stage,
		fatal: options.fatal,
		details: options.details ?? null,
	};
}

export function diagnosticsToSurfaceNotifications(
	diagnostics: SurfaceDiagnostic[],
): SurfaceNotification[] {
	return diagnostics.map((diagnostic) =>
		createSurfaceNotification({
			level: diagnostic.level,
			code: diagnostic.code,
			message: diagnostic.message,
			shellName: diagnostic.shellName,
			scopeId: null,
			surfaceId: null,
			stage: "store",
			fatal: false,
			details: {
				path: diagnostic.path,
			},
		}),
	);
}

export function deduplicateSurfaceNotifications(
	notifications: SurfaceNotification[],
): SurfaceNotification[] {
	const seen = new Set<string>();
	const deduplicated: SurfaceNotification[] = [];
	for (const notification of notifications) {
		const key = [
			notification.level,
			notification.code,
			notification.stage,
			notification.fatal ? "1" : "0",
			notification.shellName ?? "",
			notification.scopeId ?? "",
			notification.surfaceId ?? "",
			notification.message,
			notification.details ? JSON.stringify(notification.details) : "",
		].join(":");
		if (seen.has(key)) {
			continue;
		}
		seen.add(key);
		deduplicated.push(notification);
	}
	return deduplicated;
}

export function countAlertNotifications(notifications: SurfaceNotification[]): number {
	return notifications.filter(
		(notification) => notification.level === "warning" || notification.level === "error",
	).length;
}

export function splitNotificationLevels(notifications: SurfaceNotification[]): {
	alerts: SurfaceNotification[];
	infos: SurfaceNotification[];
} {
	const alerts: SurfaceNotification[] = [];
	const infos: SurfaceNotification[] = [];
	for (const notification of notifications) {
		if (notification.level === "info") {
			infos.push(notification);
			continue;
		}
		alerts.push(notification);
	}
	return {
		alerts,
		infos,
	};
}

export function buildUnresolvedNotifications(
	options: BuildUnresolvedNotificationOptions,
): SurfaceNotification[] {
	const summary = createSurfaceNotification({
		level: "warning",
		code: "SURFACE_IMAGE_UNRESOLVED",
		message: options.keepPrevious
			? `s[${options.surfaceId}] の画像を解決できないため直前の表示を維持しました`
			: `s[${options.surfaceId}] の画像を解決できませんでした`,
		shellName: options.shellName,
		scopeId: options.scopeId,
		surfaceId: options.surfaceId,
		stage: "store",
		fatal: true,
	});

	const rootCauses = options.rootCauses.filter((notification) => notification.fatal);
	if (rootCauses.length > 0) {
		return [summary, ...rootCauses];
	}

	return [
		summary,
		createSurfaceNotification({
			level: "warning",
			code: "SURFACE_RESOLUTION_TRACE_EMPTY",
			message: "解決失敗の詳細トレースを取得できませんでした",
			shellName: options.shellName,
			scopeId: options.scopeId,
			surfaceId: options.surfaceId,
			stage: "store",
			fatal: true,
		}),
	];
}
