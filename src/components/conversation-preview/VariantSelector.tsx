import type { ChangeEvent } from "react";

const TAB_THRESHOLD = 6;

interface VariantSelectorProps {
	count: number;
	selected: number;
	onChange: (index: number) => void;
}

function variantIndices(count: number): number[] {
	return Array.from({ length: count }, (_, i) => i);
}

export function VariantSelector({ count, selected, onChange }: VariantSelectorProps) {
	if (count <= 1) return null;

	const indices = variantIndices(count);

	if (count <= TAB_THRESHOLD) {
		return (
			<div className="flex gap-1">
				{indices.map((i) => (
					<button
						key={`variant-${i}`}
						type="button"
						onClick={() => onChange(i)}
						className={`rounded px-2 py-0.5 text-xs ${
							i === selected
								? "bg-zinc-500 text-zinc-100"
								: "bg-zinc-700 text-zinc-400 hover:bg-zinc-600"
						}`}
					>
						#{i + 1}
					</button>
				))}
			</div>
		);
	}

	const handleChange = (e: ChangeEvent<HTMLSelectElement>) => {
		onChange(Number(e.target.value));
	};

	return (
		<select
			className="rounded border border-zinc-600 bg-zinc-800 px-2 py-0.5 text-xs text-zinc-200"
			value={selected}
			onChange={handleChange}
		>
			{indices.map((i) => (
				<option key={`variant-${i}`} value={i}>
					バリアント #{i + 1}
				</option>
			))}
		</select>
	);
}
