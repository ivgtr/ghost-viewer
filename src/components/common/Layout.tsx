import { ConversationCatalog } from "@/components/catalog/ConversationCatalog";
import { ConversationPreview } from "@/components/conversation-preview/ConversationPreview";
import { DropZone } from "@/components/file-tree/DropZone";
import { FileTree } from "@/components/file-tree/FileTree";
import { TextViewer } from "@/components/script-viewer/TextViewer";
import { useCatalogStore } from "@/stores/catalog-store";
import { useFileTreeStore } from "@/stores/file-tree-store";
import { Group, Panel, Separator } from "react-resizable-panels";

function ResizeHandle() {
	return (
		<Separator className="w-1.5 bg-zinc-700 transition-colors hover:bg-zinc-500 active:bg-zinc-400" />
	);
}

export function Layout() {
	const tree = useFileTreeStore((s) => s.tree);
	const selectedFunctionName = useCatalogStore((s) => s.selectedFunctionName);

	return (
		<Group orientation="horizontal" className="h-full">
			<Panel defaultSize="20%" minSize="10%">
				{tree.length === 0 ? <DropZone /> : <FileTree />}
			</Panel>
			<ResizeHandle />
			<Panel defaultSize="50%" minSize="20%">
				<ConversationCatalog />
			</Panel>
			<ResizeHandle />
			<Panel defaultSize="30%" minSize="15%">
				{selectedFunctionName !== null ? <ConversationPreview /> : <TextViewer />}
			</Panel>
		</Group>
	);
}
