import "@testing-library/jest-dom/vitest";

global.ResizeObserver = class ResizeObserver {
	observe() {}
	unobserve() {}
	disconnect() {}
};

if (!URL.createObjectURL) {
	Object.defineProperty(URL, "createObjectURL", {
		configurable: true,
		value: () => "blob:mock-url",
	});
}

if (!URL.revokeObjectURL) {
	Object.defineProperty(URL, "revokeObjectURL", {
		configurable: true,
		value: () => undefined,
	});
}
