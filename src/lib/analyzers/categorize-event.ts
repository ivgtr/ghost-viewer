const CATEGORY_ORDER = [
	"ランダムトーク",
	"起動・終了",
	"マウス",
	"時間",
	"選択肢",
	"コミュニケート",
	"その他",
] as const;

const CATEGORY_RULES: [string, (name: string) => boolean][] = [
	["ランダムトーク", (n) => n === "aitalk" || n === "others"],
	[
		"起動・終了",
		(n) =>
			n === "OnBoot" ||
			n === "OnClose" ||
			n === "OnFirstBoot" ||
			n.startsWith("OnGhostChanged") ||
			n.startsWith("OnShellChanged") ||
			n === "OnVanished" ||
			n === "OnBbootComplete",
	],
	["マウス", (n) => n.startsWith("OnMouse")],
	["時間", (n) => n === "OnSecondChange" || n === "OnMinuteChange" || n === "OnHourChange"],
	["選択肢", (n) => n.startsWith("OnChoice") || n.startsWith("On_Choice")],
	["コミュニケート", (n) => n.startsWith("OnCommunicate")],
];

export function categorizeEvent(name: string): string {
	for (const [category, matcher] of CATEGORY_RULES) {
		if (matcher(name)) return category;
	}
	return "その他";
}

export function getCategoryOrder(): readonly string[] {
	return CATEGORY_ORDER;
}
