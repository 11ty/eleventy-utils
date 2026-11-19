const VOID_ELEMENTS = [
	"area",
	"base",
	"br",
	"col",
	"command",
	"embed",
	"hr",
	"img",
	"input",
	"keygen",
	"link",
	"menuitem",
	"meta",
	"param",
	"source",
	"track",
	"wbr",
];

const UNQUOTABLE = /[\t\n\f\r "'`=<>]/;

export const QUOTE_STYLE = {
	SMART: 0,
	SINGLE: 1,
	DOUBLE: 2,
};

// The `is-json` heuristic upstream posthtml-render used, kept for `singleQuoteJsonAttributes`.
function looksLikeJson(value) {
	value = value.replace(/\s/g, "");
	if (/^\{.*\}$/.test(value)) {
		return /".*?":/.test(value);
	}
	if (/^\[.*\]$/.test(value)) {
		return looksLikeJson(value.slice(1, -1).replace(/},{/g, "}\n{").split("\n").at(-1));
	}
	return false;
}

function quote(name, value, style) {
	if (style === QUOTE_STYLE.SINGLE || (style !== QUOTE_STYLE.DOUBLE && String(value).includes('"'))) {
		return ` ${name}='${value}'`;
	}
	return ` ${name}="${value}"`;
}

export function render(tree, options = {}) {
	let {
		singleTags = [],
		closingSingleTag,
		quoteAllAttributes = true,
		replaceQuote = true,
		quoteStyle = QUOTE_STYLE.DOUBLE,
		singleQuoteJsonAttributes = false,
	} = options;

	let voidNames = new Set(VOID_ELEMENTS);
	let voidPatterns = [];
	for (let entry of singleTags) {
		if (entry instanceof RegExp) {
			voidPatterns.push(entry);
		} else {
			voidNames.add(String(entry).toLowerCase());
		}
	}

	let isVoid = (tag) => voidNames.has(tag.toLowerCase()) || voidPatterns.some((pattern) => pattern.test(tag));

	function renderAttrs(attrs) {
		let out = "";
		for (let [name, value] of Object.entries(attrs)) {
			if (value === true) {
				out += ` ${name}`;
			} else if (typeof value === "number") {
				out += quote(name, value, quoteStyle);
			} else if (typeof value === "string") {
				if (singleQuoteJsonAttributes && looksLikeJson(value)) {
					out += ` ${name}='${value}'`;
				} else if (quoteAllAttributes || UNQUOTABLE.test(value)) {
					out += quote(name, replaceQuote ? value.replaceAll('"', "&quot;") : value, quoteStyle);
				} else if (value === "") {
					out += ` ${name}`;
				} else {
					out += ` ${name}=${value}`;
				}
			}
		}
		return out;
	}

	function renderNode(node) {
		if (node === false || node == null || Number.isNaN(node)) {
			return "";
		}
		if (Array.isArray(node)) {
			return node.map(renderNode).join("");
		}
		if (typeof node === "string" || typeof node === "number") {
			return String(node);
		}
		if (typeof node !== "object") {
			return "";
		}

		let content = renderNode(node.content || []);
		if (node.tag === false) {
			return content;
		}

		let tag = typeof node.tag === "string" ? node.tag : "div";
		let open = `<${tag}${node.attrs ? renderAttrs(node.attrs) : ""}`;
		let endings = { tag: `></${tag}>`, slash: " />", default: ">" };
		let closeAs = closingSingleTag === "closeAs" && Object.hasOwn(endings, node.closeAs) ? node.closeAs : undefined;

		if (isVoid(tag)) {
			let ending = closeAs ?? (closingSingleTag === "tag" || closingSingleTag === "slash" ? closingSingleTag : "default");
			return open + endings[ending] + content;
		}
		if (closeAs) {
			return open + endings[closeAs] + content;
		}
		return `${open}>${content}</${tag}>`;
	}

	return renderNode(tree);
}
