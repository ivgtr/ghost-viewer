import { useEffect, useMemo, useRef, useState } from "react";
import { readPngMetadata } from "@/lib/surfaces/png-metadata";
import { buildSurfaceSetLayout } from "@/lib/surfaces/surface-set-layout";
import { useFileContentStore } from "@/stores/file-content-store";
import { useSurfaceStore } from "@/stores/surface-store";
import type { ShellSurfaceCatalog, SurfaceCharacterPlacement, SurfaceNotification } from "@/types";

interface SurfaceRenderInfo {
	scopeId: number;
	surfaceId: number | null;
	imageUrl: string | null;
	fileName: string | null;
	pngPath: string | null;
	width: number;
	height: number;
	metadataInvalid: boolean;
}

const FALLBACK_IMAGE_WIDTH = 240;
const FALLBACK_IMAGE_HEIGHT = 360;

export function GhostViewerPanel() {
	const catalog = useSurfaceStore((state) => state.catalog);
	const selectedShellName = useSurfaceStore((state) => state.selectedShellName);
	const currentSurfaceByScope = useSurfaceStore((state) => state.currentSurfaceByScope);
	const focusedScope = useSurfaceStore((state) => state.focusedScope);
	const notifications = useSurfaceStore((state) => state.notifications);
	const descriptProperties = useSurfaceStore((state) => state.descriptProperties);
	const selectShell = useSurfaceStore((state) => state.selectShell);
	const setFocusedScope = useSurfaceStore((state) => state.setFocusedScope);
	const fileContents = useFileContentStore((state) => state.fileContents);

	const [isNotificationOpen, setNotificationOpen] = useState(false);
	const panelRef = useRef<HTMLDivElement>(null);
	const notificationButtonRef = useRef<HTMLButtonElement>(null);
	const notificationOverlayRef = useRef<HTMLDivElement>(null);
	const stageRef = useRef<HTMLDivElement>(null);
	const stageSize = useElementSize(stageRef);

	const selectedShell = useMemo(
		() => catalog.find((entry) => entry.shellName === selectedShellName) ?? null,
		[catalog, selectedShellName],
	);
	const scope0SurfaceId = currentSurfaceByScope.get(0) ?? null;
	const scope1SurfaceId = currentSurfaceByScope.get(1) ?? null;

	const scope0Buffer = useMemo(
		() => resolveSurfacePngBuffer(selectedShell, scope0SurfaceId, fileContents),
		[selectedShell, scope0SurfaceId, fileContents],
	);
	const scope1Buffer = useMemo(
		() => resolveSurfacePngBuffer(selectedShell, scope1SurfaceId, fileContents),
		[selectedShell, scope1SurfaceId, fileContents],
	);
	const scope0ImageUrl = useObjectUrl(scope0Buffer);
	const scope1ImageUrl = useObjectUrl(scope1Buffer);

	const scopeRenderInfos = useMemo(
		() => [
			resolveSurfaceRenderInfo(0, scope0SurfaceId, selectedShell, scope0Buffer, scope0ImageUrl),
			resolveSurfaceRenderInfo(1, scope1SurfaceId, selectedShell, scope1Buffer, scope1ImageUrl),
		],
		[
			scope0Buffer,
			scope0ImageUrl,
			scope0SurfaceId,
			scope1Buffer,
			scope1ImageUrl,
			scope1SurfaceId,
			selectedShell,
		],
	);

	const metadataNotifications = useMemo(
		() => buildMetadataNotifications(scopeRenderInfos, selectedShellName),
		[scopeRenderInfos, selectedShellName],
	);
	const visibleNotifications = useMemo(
		() => [...notifications, ...metadataNotifications],
		[notifications, metadataNotifications],
	);
	const placementByScope = useMemo(() => {
		const layout = buildSurfaceSetLayout({
			viewportWidth: stageSize.width,
			viewportHeight: stageSize.height,
			descriptProperties,
			characters: scopeRenderInfos,
		});
		return new Map(layout.placements.map((placement) => [placement.scopeId, placement]));
	}, [descriptProperties, scopeRenderInfos, stageSize.height, stageSize.width]);
	const hasRenderableImage = scopeRenderInfos.some(
		(scopeRenderInfo) => scopeRenderInfo.imageUrl !== null,
	);

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
					aria-label={`通知 (${visibleNotifications.length})`}
					className="relative rounded border border-zinc-600 bg-zinc-800 p-1.5 text-zinc-300 transition-colors hover:border-zinc-500 hover:text-zinc-100"
				>
					<BellIcon />
					<span className="absolute -right-1.5 -top-1.5 rounded-full bg-emerald-500 px-1.5 py-0 text-[10px] font-semibold text-zinc-950">
						{visibleNotifications.length}
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
						onChange={(event) => selectShell(event.target.value || null)}
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
					{hasRenderableImage ? null : (
						<div className="flex h-full items-center justify-center text-xs text-zinc-500">
							画像なし
						</div>
					)}
					{scopeRenderInfos.map((scopeRenderInfo) => {
						const placement = placementByScope.get(scopeRenderInfo.scopeId);
						if (!placement || scopeRenderInfo.imageUrl === null) {
							return null;
						}
						return (
							<SurfaceLayer
								key={scopeRenderInfo.scopeId}
								placement={placement}
								imageUrl={scopeRenderInfo.imageUrl}
								isFocused={focusedScope === scopeRenderInfo.scopeId}
								onFocus={() => setFocusedScope(scopeRenderInfo.scopeId)}
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
					{visibleNotifications.length === 0 ? (
						<p className="text-xs text-zinc-500">通知はありません</p>
					) : (
						<ul className="max-h-64 space-y-2 overflow-auto">
							{visibleNotifications.map((notification, index) => (
								<li
									key={`${notification.code}-${index}`}
									className="rounded border border-zinc-700 bg-zinc-800/80 p-2 text-xs text-zinc-300"
								>
									<p className="font-medium">{notification.code}</p>
									<p>{notification.message}</p>
								</li>
							))}
						</ul>
					)}
				</div>
			) : null}
		</div>
	);
}

interface SurfaceLayerProps {
	placement: SurfaceCharacterPlacement;
	imageUrl: string;
	isFocused: boolean;
	onFocus: () => void;
}

function SurfaceLayer({ placement, imageUrl, isFocused, onFocus }: SurfaceLayerProps) {
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
					{placement.fileName ?? "unknown.png"}
				</span>
			) : null}
			<img
				src={imageUrl}
				alt={`surface ${placement.scopeId}`}
				className="pointer-events-none h-full w-full object-contain"
			/>
		</button>
	);
}

interface UseDismissOverlayOptions {
	isOpen: boolean;
	onClose: () => void;
	panelRef: React.RefObject<HTMLDivElement | null>;
	notificationButtonRef: React.RefObject<HTMLButtonElement | null>;
	notificationOverlayRef: React.RefObject<HTMLDivElement | null>;
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

function resolveSurfacePngBuffer(
	shellCatalog: ShellSurfaceCatalog | null,
	surfaceId: number | null,
	fileContents: Map<string, ArrayBuffer>,
): ArrayBuffer | null {
	if (shellCatalog === null || surfaceId === null) {
		return null;
	}
	const asset = shellCatalog.assets.find((entry) => entry.id === surfaceId);
	if (!asset) {
		return null;
	}
	return fileContents.get(asset.pngPath) ?? null;
}

function resolveSurfaceRenderInfo(
	scopeId: number,
	surfaceId: number | null,
	shellCatalog: ShellSurfaceCatalog | null,
	pngBuffer: ArrayBuffer | null,
	imageUrl: string | null,
): SurfaceRenderInfo {
	if (shellCatalog === null || surfaceId === null) {
		return {
			scopeId,
			surfaceId,
			imageUrl,
			fileName: null,
			pngPath: null,
			width: 0,
			height: 0,
			metadataInvalid: false,
		};
	}

	const asset = shellCatalog.assets.find((entry) => entry.id === surfaceId);
	if (!asset || pngBuffer === null || imageUrl === null) {
		return {
			scopeId,
			surfaceId,
			imageUrl,
			fileName: asset ? toFileName(asset.pngPath) : null,
			pngPath: asset?.pngPath ?? null,
			width: 0,
			height: 0,
			metadataInvalid: false,
		};
	}

	const metadata = readPngMetadata(pngBuffer);
	if (metadata) {
		return {
			scopeId,
			surfaceId,
			imageUrl,
			fileName: toFileName(asset.pngPath),
			pngPath: asset.pngPath,
			width: metadata.width,
			height: metadata.height,
			metadataInvalid: false,
		};
	}

	return {
		scopeId,
		surfaceId,
		imageUrl,
		fileName: toFileName(asset.pngPath),
		pngPath: asset.pngPath,
		width: FALLBACK_IMAGE_WIDTH,
		height: FALLBACK_IMAGE_HEIGHT,
		metadataInvalid: true,
	};
}

function buildMetadataNotifications(
	scopeRenderInfos: SurfaceRenderInfo[],
	shellName: string | null,
): SurfaceNotification[] {
	const metadataNotifications: SurfaceNotification[] = [];
	for (const scopeRenderInfo of scopeRenderInfos) {
		if (!scopeRenderInfo.metadataInvalid) {
			continue;
		}
		metadataNotifications.push({
			level: "warning",
			code: "SURFACE_PNG_METADATA_INVALID",
			message: `PNGメタ情報を解決できないためフォールバックサイズで表示します: ${scopeRenderInfo.fileName ?? "unknown.png"}`,
			shellName,
			scopeId: scopeRenderInfo.scopeId,
			surfaceId: scopeRenderInfo.surfaceId,
		});
	}
	return metadataNotifications;
}

function toFileName(path: string): string {
	const segments = path.split("/");
	return segments[segments.length - 1] ?? path;
}

function useObjectUrl(buffer: ArrayBuffer | null): string | null {
	const [url, setUrl] = useState<string | null>(null);
	const currentUrlRef = useRef<string | null>(null);

	useEffect(() => {
		if (buffer === null) {
			return;
		}

		const objectUrl = URL.createObjectURL(new Blob([buffer], { type: "image/png" }));
		const previousUrl = currentUrlRef.current;
		if (previousUrl) {
			URL.revokeObjectURL(previousUrl);
		}
		currentUrlRef.current = objectUrl;
		setUrl(objectUrl);
	}, [buffer]);

	useEffect(() => {
		return () => {
			const currentUrl = currentUrlRef.current;
			if (currentUrl) {
				URL.revokeObjectURL(currentUrl);
			}
			currentUrlRef.current = null;
		};
	}, []);

	return url;
}

function useElementSize(ref: React.RefObject<HTMLDivElement | null>): {
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
