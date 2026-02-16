import type { FileKind } from "@/types";
import type { ReactNode } from "react";

interface FileTreeIconProps {
	kind: "directory";
	expanded: boolean;
}

interface FileIconProps {
	kind: "file";
	fileKind: FileKind;
}

type Props = FileTreeIconProps | FileIconProps;

const iconClass = "w-4 h-4 shrink-0";

function FolderOpenIcon() {
	return (
		<svg
			aria-hidden="true"
			viewBox="0 0 20 20"
			fill="currentColor"
			className={`${iconClass} text-yellow-500`}
		>
			<path d="M2 6a2 2 0 012-4h4l2 2h6a2 2 0 012 2v1H2V6z" />
			<path d="M2 8h16l-2 8H4L2 8z" />
		</svg>
	);
}

function FolderClosedIcon() {
	return (
		<svg
			aria-hidden="true"
			viewBox="0 0 20 20"
			fill="currentColor"
			className={`${iconClass} text-yellow-400`}
		>
			<path d="M2 6a2 2 0 012-4h4l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
		</svg>
	);
}

function DictionaryIcon() {
	return (
		<svg
			aria-hidden="true"
			viewBox="0 0 20 20"
			fill="currentColor"
			className={`${iconClass} text-purple-400`}
		>
			<path d="M4 2a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2V4a2 2 0 00-2-2H4zm2 3h8v2H6V5zm0 4h8v2H6V9zm0 4h5v2H6v-2z" />
		</svg>
	);
}

function TextIcon() {
	return (
		<svg
			aria-hidden="true"
			viewBox="0 0 20 20"
			fill="currentColor"
			className={`${iconClass} text-zinc-400`}
		>
			<path d="M4 2a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2V4a2 2 0 00-2-2H4zm2 3h8v2H6V5zm0 4h8v2H6V9zm0 4h5v2H6v-2z" />
		</svg>
	);
}

function ImageIcon() {
	return (
		<svg
			aria-hidden="true"
			viewBox="0 0 20 20"
			fill="currentColor"
			className={`${iconClass} text-blue-400`}
		>
			<path d="M2 4a2 2 0 012-2h12a2 2 0 012 2v12a2 2 0 01-2 2H4a2 2 0 01-2-2V4zm4 4a2 2 0 100-4 2 2 0 000 4zm10 4l-4-4-6 6h10v-2z" />
		</svg>
	);
}

function DllIcon() {
	return (
		<svg
			aria-hidden="true"
			viewBox="0 0 20 20"
			fill="currentColor"
			className={`${iconClass} text-orange-400`}
		>
			<path d="M4 2a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2V4a2 2 0 00-2-2H4zm3 5a1 1 0 112 0v6a1 1 0 11-2 0V7zm4 0a1 1 0 112 0v6a1 1 0 11-2 0V7z" />
		</svg>
	);
}

function OtherIcon() {
	return (
		<svg
			aria-hidden="true"
			viewBox="0 0 20 20"
			fill="currentColor"
			className={`${iconClass} text-zinc-500`}
		>
			<path d="M4 2a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2V4a2 2 0 00-2-2H4z" />
		</svg>
	);
}

const fileKindIcons: Record<FileKind, () => ReactNode> = {
	dictionary: DictionaryIcon,
	text: TextIcon,
	image: ImageIcon,
	dll: DllIcon,
	other: OtherIcon,
};

export function FileTreeIcon(props: Props) {
	if (props.kind === "directory") {
		return props.expanded ? <FolderOpenIcon /> : <FolderClosedIcon />;
	}
	const Icon = fileKindIcons[props.fileKind];
	return <Icon />;
}
