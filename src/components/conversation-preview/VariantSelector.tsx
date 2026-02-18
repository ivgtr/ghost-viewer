import type { ChangeEvent } from "react";

interface VariantSelectorProps {
	count: number;
	selected: number;
	onChange: (index: number) => void;
}

function variantIndices(count: number): number[] {
	return Array.from({ length: count }, (_, i) => i);
}

export function VariantSelector({ count, selected, onChange }: VariantSelectorProps) {
	if (count <= 1) {
		return null;
	}

	const indices = variantIndices(count);
	const current = Math.max(0, Math.min(selected, count - 1));
	const isFirst = current === 0;
	const isLast = current === count - 1;
	const handleChange = (e: ChangeEvent<HTMLSelectElement>) => {
		onChange(Number(e.target.value));
	};
	const handlePrev = () => {
		if (isFirst) {
			return;
		}
		onChange(current - 1);
	};
	const handleNext = () => {
		if (isLast) {
			return;
		}
		onChange(current + 1);
	};

	return (
		<div className="flex min-w-[13rem] items-center justify-end gap-2 whitespace-nowrap">
			<button
				type="button"
				aria-label="前のバリアント"
				onClick={handlePrev}
				disabled={isFirst}
				className="rounded border border-zinc-600 bg-zinc-800 px-2 py-0.5 text-xs text-zinc-200 enabled:hover:bg-zinc-700 disabled:cursor-not-allowed disabled:border-zinc-700 disabled:text-zinc-500"
			>
				<span aria-hidden="true">◀</span>
			</button>
			<select
				aria-label="バリアントを選択"
				className="rounded border border-zinc-600 bg-zinc-800 px-2 py-0.5 text-xs text-zinc-200"
				value={current}
				onChange={handleChange}
			>
				{indices.map((i) => (
					<option key={`variant-${i}`} value={i}>
						#{i + 1}
					</option>
				))}
			</select>
			<button
				type="button"
				aria-label="次のバリアント"
				onClick={handleNext}
				disabled={isLast}
				className="rounded border border-zinc-600 bg-zinc-800 px-2 py-0.5 text-xs text-zinc-200 enabled:hover:bg-zinc-700 disabled:cursor-not-allowed disabled:border-zinc-700 disabled:text-zinc-500"
			>
				<span aria-hidden="true">▶</span>
			</button>
			<span className="text-xs text-zinc-400">{`${current + 1} / ${count}`}</span>
		</div>
	);
}
