import { DropZone } from "@/components/file-tree/DropZone";
import { Group, Panel, Separator } from "react-resizable-panels";

function ResizeHandle() {
	return (
		<Separator className="w-1.5 bg-zinc-700 transition-colors hover:bg-zinc-500 active:bg-zinc-400" />
	);
}

function PanelPlaceholder({ label }: { label: string }) {
	return <div className="flex h-full items-center justify-center text-zinc-500">{label}</div>;
}

export function Layout() {
	return (
		<Group orientation="horizontal" className="h-full">
			<Panel defaultSize="20%" minSize="10%">
				<DropZone />
			</Panel>
			<ResizeHandle />
			<Panel defaultSize="50%" minSize="20%">
				<PanelPlaceholder label="Script Viewer" />
			</Panel>
			<ResizeHandle />
			<Panel defaultSize="30%" minSize="15%">
				<PanelPlaceholder label="Branch Viewer" />
			</Panel>
		</Group>
	);
}
