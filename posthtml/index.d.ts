import type { ParserOptions } from "htmlparser2";

export type Attributes = Record<string, string | number | boolean>;

export interface Element {
	tag?: string | false;
	attrs?: Attributes;
	content?: Node | Node[];
	closeAs?: "tag" | "slash" | "default";
}

export type Node = string | number | Element | Node[];

export type Matcher = string | RegExp | boolean | { [key: string]: Matcher } | Matcher[];

export interface Directive {
	name: string | RegExp;
	start: string;
	end: string;
}

export interface ParseOptions extends ParserOptions {
	directives?: Directive[];
	recognizeNoValueAttribute?: boolean;
}

export declare const QUOTE_STYLE: { readonly SMART: 0; readonly SINGLE: 1; readonly DOUBLE: 2 };

export interface RenderOptions {
	singleTags?: Array<string | RegExp>;
	closingSingleTag?: "default" | "tag" | "slash" | "closeAs";
	quoteAllAttributes?: boolean;
	replaceQuote?: boolean;
	quoteStyle?: 0 | 1 | 2;
	singleQuoteJsonAttributes?: boolean;
}

export interface ProcessOptions extends ParseOptions, RenderOptions {
	skipParse?: boolean;
	[key: string]: unknown;
}

export type NodeCallback = (node: Node) => Node;

export interface Tree<TMessage = unknown> extends Array<Node> {
	walk(cb: NodeCallback): this;
	match(expression: Matcher, cb: NodeCallback): this;
	parser: typeof parse;
	render: typeof render;
	options: ProcessOptions;
	messages: TMessage[];
	source: unknown;
}

export type Plugin<TMessage = unknown> = (tree: Tree<TMessage>) => unknown;

export interface Result<TMessage = unknown> {
	readonly html: string;
	tree: Tree<TMessage>;
	messages: TMessage[];
}

export interface PostHTML<TMessage = unknown> {
	plugins: Plugin<TMessage>[];
	use(...plugins: Plugin<TMessage>[]): this;
	process(input: string | Node, options?: ProcessOptions): Promise<Result<TMessage>>;
}

export declare function parse(html: string, options?: ParseOptions): Node[];
export declare function render(tree?: Node, options?: RenderOptions): string;
export declare function walk<T extends Node>(tree: T, cb: NodeCallback): T;
export declare function match<T extends Node>(tree: T, expression: Matcher, cb: NodeCallback): T;

export default function posthtml<TMessage = unknown>(plugins?: Plugin<TMessage> | Plugin<TMessage>[]): PostHTML<TMessage>;
