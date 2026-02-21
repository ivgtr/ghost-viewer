import type {
	SurfaceDiagnostic,
	SurfaceNotification,
	SurfaceNotificationStage,
	SurfaceSyncReason,
} from "@/types";

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

/**
 * 全属性を結合したキーで完全一致の重複を排除する。
 * UI 層でのマージ（ストア通知 + ビットマップ通知）と、ストア内の appendSyncNotifications で使用。
 */
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

interface AppendSyncNotificationsOptions {
	baseNotifications: SurfaceNotification[];
	nextNotifications: SurfaceNotification[];
	reason: SurfaceSyncReason;
}

/**
 * サーフェス同期時の通知マージ。manual 時は全結合+完全重複排除、
 * auto 時は同じ (code, scopeId, surfaceId) の古い通知を新しいもので置換する。
 */
export function appendSyncNotifications(
	options: AppendSyncNotificationsOptions,
): SurfaceNotification[] {
	if (options.nextNotifications.length === 0) {
		return options.baseNotifications;
	}
	if (options.reason === "manual") {
		return deduplicateSurfaceNotifications([
			...options.baseNotifications,
			...options.nextNotifications,
		]);
	}
	const syncKeys = new Set(
		options.nextNotifications.map(
			(notification) =>
				`${notification.code}:${notification.scopeId ?? "null"}:${notification.surfaceId ?? "null"}`,
		),
	);
	const preservedNotifications = options.baseNotifications.filter((notification) => {
		if (notification.scopeId === null) {
			return true;
		}
		return !syncKeys.has(
			`${notification.code}:${notification.scopeId ?? "null"}:${notification.surfaceId ?? "null"}`,
		);
	});
	return deduplicateSurfaceNotifications([...preservedNotifications, ...options.nextNotifications]);
}
