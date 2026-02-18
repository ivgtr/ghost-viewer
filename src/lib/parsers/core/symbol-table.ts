import type { SourceLocation } from "./ast";

type SymbolKind = "function" | "variable" | "parameter" | "macro" | "event";

type ScopeType = "global" | "function" | "block";

interface SymbolInfo {
	name: string;
	kind: SymbolKind;
	scope: ScopeInfo;
	defLoc?: SourceLocation;
	refLocs: SourceLocation[];
}

interface ScopeInfo {
	id: string;
	parent: ScopeInfo | null;
	children: ScopeInfo[];
	symbols: Map<string, SymbolInfo>;
	type: ScopeType;
}

let scopeIdCounter = 0;

function generateScopeId(): string {
	return `scope_${scopeIdCounter++}`;
}

function resetScopeIdCounter(): void {
	scopeIdCounter = 0;
}

class SymbolTable {
	private _current: ScopeInfo;
	private _global: ScopeInfo;

	constructor() {
		this._global = {
			id: generateScopeId(),
			parent: null,
			children: [],
			symbols: new Map(),
			type: "global",
		};
		this._current = this._global;
	}

	get current(): ScopeInfo {
		return this._current;
	}

	get global(): ScopeInfo {
		return this._global;
	}

	enterScope(type: ScopeType): ScopeInfo {
		const newScope: ScopeInfo = {
			id: generateScopeId(),
			parent: this._current,
			children: [],
			symbols: new Map(),
			type,
		};
		this._current.children.push(newScope);
		this._current = newScope;
		return newScope;
	}

	exitScope(): ScopeInfo | null {
		if (this._current.parent === null) {
			return null;
		}
		const exited = this._current;
		this._current = this._current.parent;
		return exited;
	}

	declare(symbol: SymbolInfo): void {
		this._current.symbols.set(symbol.name, symbol);
	}

	resolve(name: string): SymbolInfo | null {
		let scope: ScopeInfo | null = this._current;
		while (scope !== null) {
			const symbol = scope.symbols.get(name);
			if (symbol) return symbol;
			scope = scope.parent;
		}
		return null;
	}

	resolveLocal(name: string): SymbolInfo | null {
		return this._current.symbols.get(name) ?? null;
	}

	resolveInScope(name: string, scope: ScopeInfo): SymbolInfo | null {
		let current: ScopeInfo | null = scope;
		while (current !== null) {
			const symbol = current.symbols.get(name);
			if (symbol) return symbol;
			current = current.parent;
		}
		return null;
	}

	addReference(symbol: SymbolInfo, loc: SourceLocation): void {
		symbol.refLocs.push(loc);
	}
}

export type { SymbolKind, ScopeType, SymbolInfo, ScopeInfo };

export { SymbolTable, resetScopeIdCounter };
