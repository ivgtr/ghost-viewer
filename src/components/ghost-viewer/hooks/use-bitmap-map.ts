import { useEffect, useMemo, useRef, useState } from "react";
import { createSurfaceNotification } from "@/lib/surfaces/surface-notification-policy";
import type { SurfaceNotification, SurfaceVisualModel } from "@/types";

interface ScopeVisualState {
	scopeId: number;
	surfaceId: number | null;
	model: SurfaceVisualModel | null;
}

export function collectImagePaths(scopeVisuals: ScopeVisualState[]): string[] {
	const paths = new Set<string>();
	for (const scopeVisual of scopeVisuals) {
		for (const layer of scopeVisual.model?.layers ?? []) {
			paths.add(layer.path);
			if (layer.alphaMaskPath) {
				paths.add(layer.alphaMaskPath);
			}
		}
	}
	return [...paths].sort((a, b) => a.localeCompare(b));
}

export function useBitmapMap(
	imagePaths: string[],
	fileContents: Map<string, ArrayBuffer>,
): {
	bitmapByPath: Map<string, ImageBitmap>;
	notifications: SurfaceNotification[];
} {
	const [bitmapByPath, setBitmapByPath] = useState<Map<string, ImageBitmap>>(new Map());
	const [notifications, setNotifications] = useState<SurfaceNotification[]>([]);
	const cacheRef = useRef<{
		fileContents: Map<string, ArrayBuffer> | null;
		bitmapByPath: Map<string, ImageBitmap>;
	}>({
		fileContents: null,
		bitmapByPath: new Map(),
	});
	const imagePathKey = useMemo(() => imagePaths.join("\n"), [imagePaths]);

	useEffect(() => {
		let cancelled = false;
		const cache = cacheRef.current;
		if (cache.fileContents !== fileContents) {
			for (const bitmap of cache.bitmapByPath.values()) {
				bitmap.close();
			}
			cache.bitmapByPath = new Map();
			cache.fileContents = fileContents;
		}

		const targetPaths = imagePathKey === "" ? [] : imagePathKey.split("\n");
		if (targetPaths.length === 0) {
			setBitmapByPath(new Map());
			setNotifications([]);
			return () => {
				cancelled = true;
			};
		}
		if (typeof createImageBitmap !== "function") {
			setBitmapByPath(new Map());
			setNotifications([]);
			return () => {
				cancelled = true;
			};
		}

		void (async () => {
			const nextNotifications: SurfaceNotification[] = [];
			for (const path of targetPaths) {
				if (cache.bitmapByPath.has(path)) {
					continue;
				}
				const buffer = fileContents.get(path);
				if (!buffer) {
					nextNotifications.push(
						createSurfaceNotification({
							level: "warning",
							code: "SURFACE_IMAGE_BUFFER_MISSING",
							message: `画像バッファを解決できませんでした: ${path}`,
							shellName: null,
							scopeId: null,
							surfaceId: null,
							stage: "store",
							fatal: true,
							details: {
								candidate: path,
							},
						}),
					);
					continue;
				}
				try {
					const bitmap = await createImageBitmap(new Blob([buffer], { type: "image/png" }));
					cache.bitmapByPath.set(path, bitmap);
					if (cancelled) {
						break;
					}
				} catch {
					nextNotifications.push(
						createSurfaceNotification({
							level: "warning",
							code: "SURFACE_IMAGE_DECODE_FAILED",
							message: `画像デコードに失敗しました: ${path}`,
							shellName: null,
							scopeId: null,
							surfaceId: null,
							stage: "store",
							fatal: true,
							details: {
								candidate: path,
							},
						}),
					);
				}
			}
			if (cancelled) {
				return;
			}
			const nextBitmapByPath = new Map<string, ImageBitmap>();
			for (const path of targetPaths) {
				const bitmap = cache.bitmapByPath.get(path);
				if (bitmap) {
					nextBitmapByPath.set(path, bitmap);
				}
			}
			setBitmapByPath(nextBitmapByPath);
			setNotifications(nextNotifications);
		})();

		return () => {
			cancelled = true;
		};
	}, [fileContents, imagePathKey]);

	useEffect(() => {
		return () => {
			const cache = cacheRef.current;
			for (const bitmap of cache.bitmapByPath.values()) {
				bitmap.close();
			}
			cache.bitmapByPath.clear();
			cache.fileContents = null;
		};
	}, []);

	return {
		bitmapByPath,
		notifications,
	};
}
