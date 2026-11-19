import { parse } from "./src/parser.js";
import { render, QUOTE_STYLE } from "./src/render.js";
import { walk, match } from "./src/api.js";

export { parse, render, walk, match, QUOTE_STYLE };

// `this`-based so plugins can borrow them, e.g. `tree.match.call(node, …)`.
const TREE_METHODS = {
	walk(cb) {
		return walk(this, cb);
	},
	match(expression, cb) {
		return match(this, expression, cb);
	},
};

function attachApi(tree, api) {
	if (tree && typeof tree === "object") {
		for (let [name, value] of Object.entries(api)) {
			Object.defineProperty(tree, name, { value, writable: true, configurable: true });
		}
	}
}

class PostHTML {
	constructor(plugins = []) {
		this.plugins = [].concat(plugins);
	}

	use(...plugins) {
		this.plugins.push(...plugins);
		return this;
	}

	async process(input, options = {}) {
		let messages = [];
		let tree = [].concat(options.skipParse ? input || [] : parse(input, options));
		let api = { ...TREE_METHODS, parser: parse, render, options, messages, source: input };

		for (let plugin of this.plugins) {
			attachApi(tree, api);
			let result = await plugin(tree);
			if (result) {
				tree = options.skipParse ? result : [].concat(result);
			}
		}
		attachApi(tree, api);

		return {
			get html() {
				return render(tree, options);
			},
			tree,
			messages,
		};
	}
}

export default function posthtml(plugins) {
	return new PostHTML(plugins);
}
