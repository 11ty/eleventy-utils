import { Parser } from "htmlparser2";

const DEFAULT_OPTIONS = {
	lowerCaseTags: false,
	lowerCaseAttributeNames: false,
	decodeEntities: false,
};

const DEFAULT_DIRECTIVES = [{ name: "!doctype", start: "<", end: ">" }];

function isDirective(directive, name) {
	if (directive.name instanceof RegExp) {
		return new RegExp(directive.name.source, "i").test(name);
	}
	return name === directive.name;
}

export function parse(html, options = {}) {
	let stack = [];
	let results = [];
	let noValueAttributes = {};
	let directives = DEFAULT_DIRECTIVES.concat(options.directives ?? []);
	let htmlParser;

	let append = (child) => {
		let parent = stack.at(-1);
		if (parent === undefined) {
			results.push(child);
		} else {
			(parent.content ??= []).push(child);
		}
	};

	function onprocessinginstruction(name, data) {
		// htmlparser2 excludes the closing question mark from XML instructions.
		if (options.xmlMode && html[htmlParser.endIndex] === "?" && html[htmlParser.endIndex + 1] === ">") {
			data += "?";
		}

		name = name.toLowerCase();
		for (let directive of directives) {
			if (isDirective(directive, name)) {
				append(directive.start + data + directive.end);
				if (stack.length === 0) return;
			}
		}
	}

	function oncomment(data) {
		// In HTML mode, htmlparser2 reports processing instructions and non-doctype declarations as bogus comments.
		let start = htmlParser.startIndex;
		let isInstruction = html.startsWith("<?", start);
		let isDeclaration = html.startsWith("<!", start) && !html.startsWith("<!--", start) && !html.startsWith("<![CDATA[", start);

		if (isInstruction || isDeclaration) {
			let instruction = isDeclaration ? `!${data}` : data;
			onprocessinginstruction(instruction.split(/[\s/]/, 1)[0], instruction);
			return;
		}

		append(`<!--${data}-->`);
	}

	function onattribute(name, value, quote) {
		// `quote` is `undefined` only when the attribute has no value.
		if (quote === undefined) {
			noValueAttributes[name] = true;
		}
	}

	function onopentag(tag, attrs) {
		let node = { tag: options.lowerCaseTags ? tag.toLowerCase() : tag };

		let keys = Object.keys(attrs);
		if (keys.length > 0) {
			node.attrs = {};
			for (let key of keys) {
				node.attrs[key] =
					options.recognizeNoValueAttribute && noValueAttributes[key] ? true : String(attrs[key]).replaceAll("&quot;", '"');
			}
		}

		// `onopentag` fires after all of this tag’s attributes.
		noValueAttributes = {};
		stack.push(node);
	}

	function onclosetag() {
		let node = stack.pop();
		if (node) {
			append(node);
		}
	}

	function ontext(text) {
		// htmlparser2 can split one text run across several callbacks.
		let siblings = stack.at(-1)?.content;
		let last = siblings?.at(-1);
		if (typeof last === "string" && !last.startsWith("<!--")) {
			siblings[siblings.length - 1] = last + text;
			return;
		}

		append(text);
	}

	htmlParser = new Parser(
		{ onprocessinginstruction, oncomment, onattribute, onopentag, onclosetag, ontext },
		{ ...DEFAULT_OPTIONS, ...options },
	);
	htmlParser.write(html);
	htmlParser.end();

	return results;
}
