import { useEffect, useState, type RefObject } from "react";

export function useElementSize(ref: RefObject<HTMLDivElement | null>): {
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
