import { Group, Panel, Separator } from "react-resizable-panels";

import { ConversationCatalog } from "@/components/catalog/ConversationCatalog";
import { ConversationPreview } from "@/components/conversation-preview/ConversationPreview";
import { DropZone } from "@/components/file-tree/DropZone";
import { FileTree } from "@/components/file-tree/FileTree";
import { GhostViewerPanel } from "@/components/ghost-viewer/GhostViewerPanel";
import { CodeViewerPanel } from "@/components/script-viewer/CodeViewerPanel";
import { useCatalogStore } from "@/stores/catalog-store";
import { useFileTreeStore } from "@/stores/file-tree-store";
import { useLayoutStore } from "@/stores/layout-store";
import { useViewStore } from "@/stores/view-store";

function ResizeHandle() {
	return (
		<Separator className="w-1.5 bg-zinc-700 transition-colors hover:bg-zinc-500 active:bg-zinc-400" />
	);
}

export function Layout() {
	const tree = useFileTreeStore((s) => s.tree);
	const selectedFunctionName = useCatalogStore((s) => s.selectedFunctionName);
	const activeRightPane = useViewStore((s) => s.activeRightPane);
	const panelSizes = useLayoutStore((s) => s.panelSizes);
	const contentByLane = useLayoutStore((s) => s.contentByLane);
	const shouldShowConversation =
		activeRightPane === "conversation" && selectedFunctionName !== null;

	const leftContent =
		contentByLane.left === "fileTreeOrDropZone" ? (
			tree.length === 0 ? (
				<DropZone />
			) : (
				<FileTree />
			)
		) : null;
	const centerContent =
		contentByLane.center === "conversationCatalog" ? <ConversationCatalog /> : null;
	const rightTopContent =
		contentByLane.rightTop === "rightTopSwitcher" ? (
			shouldShowConversation ? (
				<ConversationPreview />
			) : (
				<CodeViewerPanel />
			)
		) : null;
	const rightBottomContent =
		contentByLane.rightBottom === "ghostViewer" ? <GhostViewerPanel /> : null;

	return (
		<Group orientation="horizontal" className="h-full">
			<Panel defaultSize={panelSizes.left} minSize={10}>
				{leftContent}
			</Panel>
			<ResizeHandle />
			<Panel defaultSize={panelSizes.center} minSize={20}>
				{centerContent}
			</Panel>
			<ResizeHandle />
			<Panel defaultSize={panelSizes.right} minSize={15}>
				<Group orientation="vertical" className="h-full">
					<Panel defaultSize={panelSizes.rightTop} minSize={10}>
						{rightTopContent}
					</Panel>
					<ResizeHandle />
					<Panel defaultSize={panelSizes.rightBottom} minSize={10}>
						{rightBottomContent}
					</Panel>
				</Group>
			</Panel>
		</Group>
	);
}
