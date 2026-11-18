export interface Matcher {
	tag?: string;
	attrs?: Record<string, string | boolean | RegExp>;
}

declare function matchSelector(selector: string): Matcher | Matcher[];
declare function matchSelector(selector: string[]): Matcher[];

export = matchSelector;
