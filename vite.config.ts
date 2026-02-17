import { resolve } from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
	base: "/ghost-viewer/",
	plugins: [react(), tailwindcss()],
	resolve: {
		alias: {
			"@": resolve(import.meta.dirname, "src"),
		},
	},
	test: {
		include: ["tests/**/*.test.{ts,tsx}"],
		setupFiles: ["tests/setup.ts"],
		projects: [
			{
				extends: true,
				test: {
					name: "unit",
					include: ["tests/**/*.test.ts"],
					exclude: ["tests/**/*.test.tsx"],
					environment: "node",
				},
			},
			{
				extends: true,
				test: {
					name: "component",
					include: ["tests/components/**/*.test.tsx"],
					environment: "jsdom",
					setupFiles: ["tests/setup.ts"],
				},
			},
		],
	},
});
