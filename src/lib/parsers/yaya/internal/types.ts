interface Factor {
	text: string;
	line: number;
}

interface BodyToken {
	text: string;
	line: number;
}

interface ClassifiedFunction {
	name: string;
	returnType?: string;
	bodyTokens: BodyToken[];
	line: number;
	endLine: number;
}

interface ClassifiedProgram {
	functions: ClassifiedFunction[];
	separators: number;
}

interface NormalizedFunction {
	name: string;
	returnType?: string;
	bodyTokens: BodyToken[];
	line: number;
	endLine: number;
}

interface NormalizedProgram {
	functions: NormalizedFunction[];
	separators: number;
}

export type {
	ClassifiedFunction,
	ClassifiedProgram,
	BodyToken,
	Factor,
	NormalizedFunction,
	NormalizedProgram,
};
