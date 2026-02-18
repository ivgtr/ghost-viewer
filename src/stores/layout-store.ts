import { createStore } from "./create-store";

export type LaneId = "left" | "center" | "rightTop" | "rightBottom";
export type LaneContentId =
	| "fileTreeOrDropZone"
	| "conversationCatalog"
	| "rightTopSwitcher"
	| "ghostViewer";

interface PanelSizes {
	left: number;
	center: number;
	right: number;
	rightTop: number;
	rightBottom: number;
}

interface LayoutState {
	panelSizes: PanelSizes;
	contentByLane: Record<LaneId, LaneContentId>;
	setMainPanelSizes: (sizes: number[]) => void;
	setRightPanelSizes: (sizes: number[]) => void;
	setLaneContent: (laneId: LaneId, contentId: LaneContentId) => void;
	reset: () => void;
}

const DEFAULT_PANEL_SIZES: PanelSizes = {
	left: 20,
	center: 50,
	right: 30,
	rightTop: 50,
	rightBottom: 50,
};

const DEFAULT_CONTENT_BY_LANE: Record<LaneId, LaneContentId> = {
	left: "fileTreeOrDropZone",
	center: "conversationCatalog",
	rightTop: "rightTopSwitcher",
	rightBottom: "ghostViewer",
};

export const useLayoutStore = createStore<LayoutState>(
	{
		panelSizes: DEFAULT_PANEL_SIZES,
		contentByLane: DEFAULT_CONTENT_BY_LANE,
	},
	(set, get) => ({
		setMainPanelSizes: (sizes) => {
			if (sizes.length !== 3) {
				return;
			}
			const [left, center, right] = sizes;
			if (left === undefined || center === undefined || right === undefined) {
				return;
			}
			set({
				panelSizes: {
					...get().panelSizes,
					left: normalizeSize(left),
					center: normalizeSize(center),
					right: normalizeSize(right),
				},
			});
		},
		setRightPanelSizes: (sizes) => {
			if (sizes.length !== 2) {
				return;
			}
			const [rightTop, rightBottom] = sizes;
			if (rightTop === undefined || rightBottom === undefined) {
				return;
			}
			set({
				panelSizes: {
					...get().panelSizes,
					rightTop: normalizeSize(rightTop),
					rightBottom: normalizeSize(rightBottom),
				},
			});
		},
		setLaneContent: (laneId, contentId) => {
			set({
				contentByLane: {
					...get().contentByLane,
					[laneId]: contentId,
				},
			});
		},
	}),
);

function normalizeSize(size: number): number {
	if (!Number.isFinite(size)) {
		return 0;
	}
	if (size < 0) {
		return 0;
	}
	return size;
}
