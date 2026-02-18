import {
	buildUnresolvedNotifications,
	countAlertNotifications,
	createSurfaceNotification,
	deduplicateSurfaceNotifications,
	splitNotificationLevels,
} from "@/lib/surfaces/surface-notification-policy";
import { describe, expect, it } from "vitest";

describe("surface-notification-policy", () => {
	it("unresolved では summary + fatal root-cause を返す", () => {
		const notifications = buildUnresolvedNotifications({
			shellName: "master",
			scopeId: 0,
			surfaceId: 5,
			keepPrevious: true,
			rootCauses: [
				createSurfaceNotification({
					level: "warning",
					code: "SURFACE_PATH_CANDIDATE_MISS",
					message: "path miss",
					shellName: "master",
					scopeId: 0,
					surfaceId: 5,
					stage: "path",
					fatal: true,
					details: { candidates: "a,b" },
				}),
			],
		});

		expect(notifications[0]?.code).toBe("SURFACE_IMAGE_UNRESOLVED");
		expect(
			notifications.some((notification) => notification.code === "SURFACE_PATH_CANDIDATE_MISS"),
		).toBe(true);
	});

	it("root-cause 不在時は trace-empty 通知を追加する", () => {
		const notifications = buildUnresolvedNotifications({
			shellName: "master",
			scopeId: 1,
			surfaceId: 11,
			keepPrevious: false,
			rootCauses: [],
		});

		expect(notifications.map((notification) => notification.code)).toEqual([
			"SURFACE_IMAGE_UNRESOLVED",
			"SURFACE_RESOLUTION_TRACE_EMPTY",
		]);
	});

	it("alert件数は warning/error のみを数える", () => {
		const notifications = [
			createSurfaceNotification({
				level: "info",
				code: "I",
				message: "info",
				shellName: null,
				scopeId: null,
				surfaceId: null,
				stage: "store",
				fatal: false,
			}),
			createSurfaceNotification({
				level: "warning",
				code: "W",
				message: "warn",
				shellName: null,
				scopeId: null,
				surfaceId: null,
				stage: "store",
				fatal: false,
			}),
			createSurfaceNotification({
				level: "error",
				code: "E",
				message: "error",
				shellName: null,
				scopeId: null,
				surfaceId: null,
				stage: "store",
				fatal: true,
			}),
		];

		expect(countAlertNotifications(notifications)).toBe(2);
		expect(splitNotificationLevels(notifications).infos).toHaveLength(1);
	});

	it("通知は details を含めて重複排除する", () => {
		const source = createSurfaceNotification({
			level: "warning",
			code: "SURFACE_PATH_CANDIDATE_MISS",
			message: "path miss",
			shellName: "master",
			scopeId: 0,
			surfaceId: 5,
			stage: "path",
			fatal: true,
			details: { candidates: "a,b" },
		});
		const deduped = deduplicateSurfaceNotifications([source, source]);
		expect(deduped).toHaveLength(1);
	});
});
