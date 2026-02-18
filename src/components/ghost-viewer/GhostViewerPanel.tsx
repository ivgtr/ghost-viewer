import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { applyAlphaMask, applyColorKeyTransparency } from "@/lib/surfaces/canvas-alpha";
import { buildSurfaceScene } from "@/lib/surfaces/surface-scene-builder";
import { buildSurfaceSetLayout } from "@/lib/surfaces/surface-set-layout";
import {
	countAlertNotifications,
	createSurfaceNotification,
	splitNotificationLevels,
} from "@/lib/surfaces/surface-notification-policy";
import { useFileContentStore } from "@/stores/file-content-store";
import { useSurfaceStore } from "@/stores/surface-store";
import type { SurfaceCharacterPlacement, SurfaceNotification, SurfaceVisualModel } from "@/types";

interface UseDismissOverlayOptions {
	isOpen: boolean;
	onClose: () => void;
	panelRef: RefObject<HTMLDivElement | null>;
	notificationButtonRef: RefObject<HTMLButtonElement | null>;
	notificationOverlayRef: RefObject<HTMLDivElement | null>;
}

interface ScopeVisualState {
	scopeId: number;
	surfaceId: number | null;
	model: SurfaceVisualModel | null;
}

interface SurfaceLayerProps {
	placement: SurfaceCharacterPlacement;
	model: SurfaceVisualModel;
	isFocused: boolean;
	onFocus: () => void;
}

export function GhostViewerPanel() {
	const catalog = useSurfaceStore((state) => state.catalog);
	const selectedShellName = useSurfaceStore((state) => state.selectedShellName);
	const currentSurfaceByScope = useSurfaceStore((state) => state.currentSurfaceByScope);
	const visualByScope = useSurfaceStore((state) => state.visualByScope);
	const focusedScope = useSurfaceStore((state) => state.focusedScope);
	const notifications = useSurfaceStore((state) => state.notifications);
	const ghostDescriptProperties = useSurfaceStore((state) => state.ghostDescriptProperties);
	const shellDescriptCacheByName = useSurfaceStore((state) => state.shellDescriptCacheByName);
	const selectShell = useSurfaceStore((state) => state.selectShell);
	const ensureShellDescriptLoaded = useSurfaceStore((state) => state.ensureShellDescriptLoaded);
	const setFocusedScope = useSurfaceStore((state) => state.setFocusedScope);
	const fileContents = useFileContentStore((state) => state.fileContents);

	const [isNotificationOpen, setNotificationOpen] = useState(false);
	const [isInfoExpanded, setInfoExpanded] = useState(false);
	const panelRef = useRef<HTMLDivElement>(null);
	const notificationButtonRef = useRef<HTMLButtonElement>(null);
	const notificationOverlayRef = useRef<HTMLDivElement>(null);
	const stageRef = useRef<HTMLDivElement>(null);
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const stageSize = useElementSize(stageRef);

	useEffect(() => {
		ensureShellDescriptLoaded(selectedShellName);
	}, [ensureShellDescriptLoaded, selectedShellName]);

	const selectedShell = useMemo(
		() => catalog.find((entry) => entry.shellName === selectedShellName) ?? null,
		[catalog, selectedShellName],
	);
	const shellDescriptProperties = useMemo(() => {
		if (selectedShellName === null) {
			return {};
		}
		return shellDescriptCacheByName[selectedShellName] ?? {};
	}, [selectedShellName, shellDescriptCacheByName]);

	const scopeVisuals = useMemo(
		() =>
			[0, 1].map((scopeId) => ({
				scopeId,
				surfaceId: currentSurfaceByScope.get(scopeId) ?? null,
				model: visualByScope.get(scopeId) ?? null,
			})),
		[currentSurfaceByScope, visualByScope],
	);
	const imagePaths = useMemo(() => collectImagePaths(scopeVisuals), [scopeVisuals]);
	const { bitmapByPath, notifications: bitmapNotifications } = useBitmapMap(
		imagePaths,
		fileContents,
	);
	const visibleScopeVisuals = useMemo(
		() => scopeVisuals.filter((scopeVisual) => scopeVisual.model !== null),
		[scopeVisuals],
	);
	const mergedNotifications = useMemo(
		() => deduplicateNotifications([...notifications, ...bitmapNotifications]),
		[bitmapNotifications, notifications],
	);
	const notificationGroups = useMemo(
		() => splitNotificationLevels(mergedNotifications),
		[mergedNotifications],
	);
	const alertCount = useMemo(
		() => countAlertNotifications(notificationGroups.alerts),
		[notificationGroups.alerts],
	);

	const scene = useMemo(
		() =>
			buildSurfaceScene({
				characters: visibleScopeVisuals.map((scopeVisual) => ({
					scopeId: scopeVisual.scopeId,
					surfaceId: scopeVisual.model?.surfaceId ?? null,
					fileName: scopeVisual.model?.fileName ?? null,
					width: scopeVisual.model?.width ?? 0,
					height: scopeVisual.model?.height ?? 0,
				})),
				shellDescriptProperties,
				ghostDescriptProperties,
			}),
		[ghostDescriptProperties, shellDescriptProperties, visibleScopeVisuals],
	);
	const placementByScope = useMemo(() => {
		const layout = buildSurfaceSetLayout({
			viewportWidth: stageSize.width,
			viewportHeight: stageSize.height,
			scene,
		});
		return new Map(layout.placements.map((placement) => [placement.scopeId, placement]));
	}, [scene, stageSize.height, stageSize.width]);
	const hasRenderableImage = visibleScopeVisuals.length > 0;

	useEffect(() => {
		if (bitmapByPath.size === 0) {
			return;
		}
		const canvas = canvasRef.current;
		if (!canvas) {
			return;
		}
		const context = canvas.getContext("2d");
		if (!context) {
			return;
		}

		const width = Math.max(1, Math.floor(stageSize.width));
		const height = Math.max(1, Math.floor(stageSize.height));
		const dpr = window.devicePixelRatio || 1;
		canvas.width = Math.max(1, Math.floor(width * dpr));
		canvas.height = Math.max(1, Math.floor(height * dpr));
		canvas.style.width = `${width}px`;
		canvas.style.height = `${height}px`;
		context.setTransform(dpr, 0, 0, dpr, 0, 0);
		context.clearRect(0, 0, width, height);

		const layerCanvas = createScratchCanvas(1, 1);
		const maskCanvas = createScratchCanvas(1, 1);
		const layerContext = layerCanvas.getContext("2d");
		const maskContext = maskCanvas.getContext("2d");
		if (!layerContext || !maskContext) {
			return;
		}

		for (const scopeVisual of visibleScopeVisuals) {
			if (!scopeVisual.model) {
				continue;
			}
			const placement = placementByScope.get(scopeVisual.scopeId);
			if (!placement) {
				continue;
			}
			const scaleX =
				scopeVisual.model.width > 0 ? placement.screenWidth / scopeVisual.model.width : 1;
			const scaleY =
				scopeVisual.model.height > 0 ? placement.screenHeight / scopeVisual.model.height : 1;

			for (const layer of scopeVisual.model.layers) {
				const source = bitmapByPath.get(layer.path);
				if (!source) {
					continue;
				}
				const drawX = placement.screenX + layer.x * scaleX;
				const drawY = placement.screenY + layer.y * scaleY;
				const drawWidth = Math.max(1, layer.width * scaleX);
				const drawHeight = Math.max(1, layer.height * scaleY);
				const mask = layer.alphaMaskPath ? (bitmapByPath.get(layer.alphaMaskPath) ?? null) : null;
				drawCanvasLayer({
					context,
					layerContext,
					maskContext,
					layerCanvas,
					maskCanvas,
					source,
					mask,
					drawX,
					drawY,
					drawWidth,
					drawHeight,
				});
			}
		}
	}, [bitmapByPath, placementByScope, stageSize.height, stageSize.width, visibleScopeVisuals]);

	useDismissOverlay({
		isOpen: isNotificationOpen,
		onClose: () => setNotificationOpen(false),
		panelRef,
		notificationButtonRef,
		notificationOverlayRef,
	});

	return (
		<div ref={panelRef} className="relative flex h-full min-h-0 flex-col overflow-hidden">
			<div className="flex items-start justify-between border-b border-zinc-700 px-4 py-2">
				<div>
					<p className="text-sm font-medium text-zinc-200">ゴーストビューアー</p>
					<p className="text-xs text-zinc-400">
						{selectedShell
							? `shell: ${selectedShell.shellName} / surface: ${selectedShell.assets.length}`
							: "利用可能なサーフェスがありません"}
					</p>
				</div>
				<button
					ref={notificationButtonRef}
					type="button"
					onClick={() => setNotificationOpen((previous) => !previous)}
					aria-label={`通知 (${alertCount})`}
					className="relative rounded border border-zinc-600 bg-zinc-800 p-1.5 text-zinc-300 transition-colors hover:border-zinc-500 hover:text-zinc-100"
				>
					<BellIcon />
					<span className="absolute -right-1.5 -top-1.5 rounded-full bg-emerald-500 px-1.5 py-0 text-[10px] font-semibold text-zinc-950">
						{alertCount}
					</span>
				</button>
			</div>

			{catalog.length > 1 ? (
				<div className="border-b border-zinc-700 px-4 py-2">
					<label htmlFor="shell-select" className="mr-2 text-xs text-zinc-400">
						shell
					</label>
					<select
						id="shell-select"
						value={selectedShellName ?? ""}
						onChange={(event) => {
							const shellName = event.target.value || null;
							selectShell(shellName);
							ensureShellDescriptLoaded(shellName);
						}}
						className="rounded border border-zinc-600 bg-zinc-800 px-2 py-1 text-xs text-zinc-200"
					>
						{catalog.map((shell) => (
							<option key={shell.shellName} value={shell.shellName}>
								{shell.shellName}
							</option>
						))}
					</select>
				</div>
			) : null}

			<div className="min-h-0 flex-1 p-3">
				<div
					ref={stageRef}
					data-testid="surface-stage"
					className="relative h-full w-full overflow-hidden rounded border border-zinc-700 bg-zinc-900/70"
				>
					<canvas
						ref={canvasRef}
						data-testid="surface-canvas"
						className="absolute inset-0 h-full w-full"
					/>
					{hasRenderableImage ? null : (
						<div className="absolute inset-0 flex items-center justify-center text-xs text-zinc-500">
							画像なし
						</div>
					)}
					{visibleScopeVisuals.map((scopeVisual) => {
						if (scopeVisual.model === null) {
							return null;
						}
						const placement = placementByScope.get(scopeVisual.scopeId);
						if (!placement) {
							return null;
						}
						return (
							<SurfaceLayer
								key={scopeVisual.scopeId}
								placement={placement}
								model={scopeVisual.model}
								isFocused={focusedScope === scopeVisual.scopeId}
								onFocus={() => setFocusedScope(scopeVisual.scopeId)}
							/>
						);
					})}
				</div>
			</div>

			{isNotificationOpen ? (
				<div
					ref={notificationOverlayRef}
					data-testid="surface-notification-overlay"
					className="absolute right-3 top-12 z-20 w-[min(92%,420px)] rounded border border-zinc-700 bg-zinc-900/95 p-3 shadow-xl"
				>
					<p className="mb-2 text-xs font-medium text-zinc-200">通知</p>
					{notificationGroups.alerts.length === 0 && notificationGroups.infos.length === 0 ? (
						<p className="text-xs text-zinc-500">通知はありません</p>
					) : (
						<div className="max-h-64 space-y-2 overflow-auto">
							<NotificationList notifications={notificationGroups.alerts} />
							{notificationGroups.infos.length > 0 ? (
								<div className="rounded border border-zinc-700 bg-zinc-800/60 p-2">
									<button
										type="button"
										className="w-full text-left text-[11px] text-zinc-300 hover:text-zinc-100"
										onClick={() => setInfoExpanded((previous) => !previous)}
									>
										{isInfoExpanded
											? "info を隠す"
											: `info を表示 (${notificationGroups.infos.length})`}
									</button>
									{isInfoExpanded ? (
										<div className="mt-2">
											<NotificationList notifications={notificationGroups.infos} />
										</div>
									) : null}
								</div>
							) : null}
						</div>
					)}
				</div>
			) : null}
		</div>
	);
}

function collectImagePaths(scopeVisuals: ScopeVisualState[]): string[] {
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

function deduplicateNotifications(notifications: SurfaceNotification[]): SurfaceNotification[] {
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

function NotificationList(props: { notifications: SurfaceNotification[] }) {
	return (
		<ul className="space-y-2">
			{props.notifications.map((notification, index) => {
				const candidates = resolveCandidates(notification);
				return (
					<li
						key={`${notification.level}-${notification.code}-${index}`}
						className="rounded border border-zinc-700 bg-zinc-800/80 p-2 text-xs text-zinc-300"
					>
						<p className="font-medium">{notification.code}</p>
						<p className="text-[11px] text-zinc-400">
							stage: {notification.stage} / fatal: {notification.fatal ? "yes" : "no"}
						</p>
						<p className="text-[11px] text-zinc-400">
							scope: {notification.scopeId ?? "-"} / surface: {notification.surfaceId ?? "-"}
						</p>
						{candidates ? (
							<p className="text-[11px] text-zinc-400">candidates: {candidates}</p>
						) : null}
						<p>{notification.message}</p>
					</li>
				);
			})}
		</ul>
	);
}

function resolveCandidates(notification: SurfaceNotification): string | null {
	const detailCandidates = notification.details?.candidates;
	if (typeof detailCandidates === "string" && detailCandidates.length > 0) {
		return detailCandidates;
	}
	const detailCandidate = notification.details?.candidate;
	if (typeof detailCandidate === "string" && detailCandidate.length > 0) {
		return detailCandidate;
	}
	const match = notification.message.match(/\(candidates:\s*(.+)\)$/);
	return match?.[1] ?? null;
}

function SurfaceLayer({ placement, model, isFocused, onFocus }: SurfaceLayerProps) {
	return (
		<button
			type="button"
			data-testid={`surface-node-${placement.scopeId}`}
			aria-label={`surface scope ${placement.scopeId}`}
			onClick={onFocus}
			className={`absolute overflow-visible transition-colors ${
				isFocused
					? "border-2 border-dashed border-emerald-400"
					: "border border-transparent hover:border-zinc-500"
			}`}
			style={{
				left: `${placement.screenX}px`,
				top: `${placement.screenY}px`,
				width: `${placement.screenWidth}px`,
				height: `${placement.screenHeight}px`,
			}}
		>
			{isFocused ? (
				<span className="pointer-events-none absolute -top-6 left-0 whitespace-nowrap rounded border border-emerald-500/70 bg-zinc-900/95 px-1.5 py-0.5 text-[10px] text-emerald-200">
					{model.fileName ?? "unknown.png"}
				</span>
			) : null}
		</button>
	);
}

function useDismissOverlay(options: UseDismissOverlayOptions): void {
	const { isOpen, onClose, panelRef, notificationButtonRef, notificationOverlayRef } = options;

	useEffect(() => {
		if (!isOpen) {
			return;
		}

		const handleDocumentPointerDown = (event: PointerEvent) => {
			const target = event.target;
			if (!(target instanceof Node)) {
				return;
			}
			const inButton = notificationButtonRef.current?.contains(target) ?? false;
			const inOverlay = notificationOverlayRef.current?.contains(target) ?? false;
			const inPanel = panelRef.current?.contains(target) ?? false;
			if (!inPanel || (!inButton && !inOverlay)) {
				onClose();
			}
		};

		const handleEscape = (event: KeyboardEvent) => {
			if (event.key === "Escape") {
				onClose();
			}
		};

		document.addEventListener("pointerdown", handleDocumentPointerDown);
		document.addEventListener("keydown", handleEscape);
		return () => {
			document.removeEventListener("pointerdown", handleDocumentPointerDown);
			document.removeEventListener("keydown", handleEscape);
		};
	}, [isOpen, notificationButtonRef, notificationOverlayRef, onClose, panelRef]);
}

function useBitmapMap(
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
					if (cancelled) {
						bitmap.close();
						continue;
					}
					cache.bitmapByPath.set(path, bitmap);
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

interface DrawCanvasLayerOptions {
	context: CanvasRenderingContext2D;
	layerContext: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
	maskContext: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
	layerCanvas: OffscreenCanvas | HTMLCanvasElement;
	maskCanvas: OffscreenCanvas | HTMLCanvasElement;
	source: ImageBitmap;
	mask: ImageBitmap | null;
	drawX: number;
	drawY: number;
	drawWidth: number;
	drawHeight: number;
}

function drawCanvasLayer(options: DrawCanvasLayerOptions): void {
	const width = Math.max(1, Math.floor(options.drawWidth));
	const height = Math.max(1, Math.floor(options.drawHeight));
	options.layerCanvas.width = width;
	options.layerCanvas.height = height;
	options.layerContext.clearRect(0, 0, width, height);
	options.layerContext.drawImage(options.source, 0, 0, width, height);
	const layerImageData = options.layerContext.getImageData(0, 0, width, height);

	if (options.mask) {
		options.maskCanvas.width = width;
		options.maskCanvas.height = height;
		options.maskContext.clearRect(0, 0, width, height);
		options.maskContext.drawImage(options.mask, 0, 0, width, height);
		const maskImageData = options.maskContext.getImageData(0, 0, width, height);
		applyAlphaMask(layerImageData, maskImageData);
	} else {
		applyColorKeyTransparency(layerImageData);
	}
	options.layerContext.putImageData(layerImageData, 0, 0);

	options.context.drawImage(options.layerCanvas, options.drawX, options.drawY, width, height);
}

function createScratchCanvas(width: number, height: number): OffscreenCanvas | HTMLCanvasElement {
	if (typeof OffscreenCanvas !== "undefined") {
		return new OffscreenCanvas(width, height);
	}
	const canvas = document.createElement("canvas");
	canvas.width = width;
	canvas.height = height;
	return canvas;
}

function useElementSize(ref: RefObject<HTMLDivElement | null>): {
	width: number;
	height: number;
} {
	const [size, setSize] = useState({ width: 0, height: 0 });

	useEffect(() => {
		const element = ref.current;
		if (!element) {
			return;
		}

		const update = () => {
			const rect = element.getBoundingClientRect();
			setSize({
				width: rect.width,
				height: rect.height,
			});
		};

		update();
		const observer = new ResizeObserver(() => {
			update();
		});
		observer.observe(element);
		return () => {
			observer.disconnect();
		};
	}, [ref]);

	return size;
}

function BellIcon() {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 20 20"
			fill="currentColor"
			className="size-4"
			aria-hidden="true"
		>
			<path d="M10 2.5a4 4 0 0 0-4 4v1.29a5.5 5.5 0 0 1-1.61 3.89l-.58.58a.75.75 0 0 0 .53 1.28h11.32a.75.75 0 0 0 .53-1.28l-.58-.58A5.5 5.5 0 0 1 14 7.79V6.5a4 4 0 0 0-4-4Z" />
			<path d="M8 15.25a2 2 0 1 0 4 0H8Z" />
		</svg>
	);
}
