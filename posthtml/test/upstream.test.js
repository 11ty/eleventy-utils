// Ported from posthtml@0.16.7’s mocha suite.
import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import posthtml, { parse, render, walk, match } from "../index.js";

const fixture = (name) => readFileSync(new URL(`./fixtures/${name}`, import.meta.url), "utf8");

async function html(input, plugins = [], options = {}) {
	return (await posthtml([].concat(plugins)).process(input, options)).html;
}

describe("API", () => {
	it("chaining", async () => {
		let result = await html("<a></a><a></a><a></a>", (tree) => {
			tree
				.walk((node) => node)
				.walk((node) => node)
				.match({ tag: "a" }, () => ({ tag: "b" }))
				.match({ tag: "b" }, () => ({ tag: "c" }));
		});
		assert.equal(result, "<c></c><c></c><c></c>");
	});

	it("walk", async () => {
		let num = 0;
		let result = await html('<div class="cls"><header class="test"><div class="cls test">Text</div></header></div>', (tree) => {
			tree.walk((node) => {
				num++;
				let classes = node.attrs && node.attrs.class.split(" ");
				if (classes && classes.includes("test")) {
					node.attrs = { ...node.attrs, id: `index${num}` };
				}
				return node;
			});
		});
		assert.equal(result, '<div class="cls"><header class="test" id="index2"><div class="cls test" id="index3">Text</div></header></div>');
	});

	describe("match", () => {
		const input = "<div><header><div>Text</div></header></div>";

		it("Wrap node", async () => {
			let result = await html(input, (tree) => {
				tree.match({ tag: "header" }, (node) => ({ tag: "span", content: node }));
			});
			assert.equal(result, "<div><span><header><div>Text</div></header></span></div>");
		});

		it("Object", async () => {
			let num = 0;
			let result = await html(input, (tree) => {
				tree.match({ tag: "div" }, (node) => {
					num++;
					node.attrs = { ...node.attrs, id: `index${num}` };
					return node;
				});
				return tree;
			});
			assert.equal(result, '<div id="index1"><header><div id="index2">Text</div></header></div>');
		});

		it("String", async () => {
			let result = await html(input, (tree) => {
				tree.match("Text", () => "Other text");
			});
			assert.equal(result, "<div><header><div>Other text</div></header></div>");
		});

		it("Array", async () => {
			let result = await html(input, (tree) => {
				tree.match([{ tag: "div" }, { tag: "header" }], (node) => {
					node.tag = "span";
					return node;
				});
			});
			assert.equal(result, "<span><span><span>Text</span></span></span>");
		});

		it("Array with multiple matches", async () => {
			let classes = [/a/, /b/].map((name) => ({ attrs: { class: name } }));
			let result = await html('<div class="a b">0</div>', (tree) => {
				tree.match(classes, (node) => {
					node.content++;
					return node;
				});
			});
			assert.equal(result, '<div class="a b">1</div>');
		});

		it("Content", async () => {
			let result = await html(input, (tree) => {
				tree.match({ content: ["Text"] }, (node) => {
					node.content = ["Other text"];
					return node;
				});
			});
			assert.equal(result, "<div><header><div>Other text</div></header></div>");
		});

		it("RegExp String", async () => {
			let result = await html("<div><!-- replace this --><header><div>Text</div></header></div>", (tree) => {
				tree.match(/<!--.*-->/g, () => "RegExp cool!");
			});
			assert.equal(result, "<div>RegExp cool!<header><div>Text</div></header></div>");
		});

		it("RegExp Object", async () => {
			let result = await html('<div><header style="color: red  border: 3px solid #000"><div>Text</div></header></div>', (tree) => {
				tree.match({ attrs: { style: /border.+solid/gi } }, (node) => {
					node.attrs.style = node.attrs.style.replace("color: red  ", "");
					return node;
				});
			});
			assert.equal(result, '<div><header style="border: 3px solid #000"><div>Text</div></header></div>');
		});

		it("Boolean true", async () => {
			let result = await html(input, (tree) => {
				tree.match({ content: true }, (node) => {
					if (node.tag === "header") {
						node.content = ["Other text"];
					}
					return node;
				});
			});
			assert.equal(result, "<div><header>Other text</header></div>");
		});

		it("Boolean true with boolean attrs", async () => {
			let result = await html("<ol reversed></ol>", (tree) => {
				tree.match({ attrs: { reversed: true } }, (node) => {
					delete node.attrs.reversed;
					return node;
				});
			});
			assert.equal(result, "<ol></ol>");
		});

		it("Boolean true with 0 value", async () => {
			let result = await html('<input type="number" value="1">', [
				(tree) => {
					tree.match({ tag: "input" }, (node) => {
						node.attrs.value--;
						return node;
					});
				},
				(tree) => {
					tree.match({ attrs: { value: true } }, (node) => {
						node.attrs.class = "matched";
						return node;
					});
				},
			]);
			assert.equal(result, '<input type="number" value="0" class="matched">');
		});

		it("Boolean false", async () => {
			let result = await html("<div><img><section><div></div></section></div>", (tree) => {
				tree.match({ content: false }, () => "");
			});
			assert.equal(result, "<div><section></section></div>");
		});
	});

	describe("import API", () => {
		it("walk", () => {
			let tree = ["test", { tag: "a", content: ["find"] }, { tag: "a" }];
			walk(tree, () => "a");
			assert.deepEqual(tree, ["a", "a", "a"]);
		});

		it("match", () => {
			let tree = [{ tag: "a", content: ["find"] }, { tag: "a" }];
			match(tree, { tag: "a", content: true }, () => "a");
			assert.deepEqual(tree, ["a", { tag: "a" }]);
		});

		it("tree.match can be borrowed with call", async () => {
			let result = await html("<picture><img></picture><img>", (tree) => {
				let borrowed = tree.match;
				tree.match({ tag: "picture" }, (picture) => {
					borrowed.call(picture, { tag: "img" }, (img) => {
						img.attrs = { class: "inside" };
						return img;
					});
					return picture;
				});
			});
			assert.equal(result, '<picture><img class="inside"></picture><img>');
		});
	});
});

describe("Round trips", () => {
	for (let input of [
		"<div></div>",
		'<div class="block1">text</div>',
		'<div class="block1 block2">text</div>',
		'<div class="button"><div class="button__text">Text</div></div>',
		"text",
		fixture("comments.html"),
		fixture("doctype.html"),
	]) {
		it(JSON.stringify(input.slice(0, 40)), async () => {
			assert.equal(await html(input), input);
		});
	}

	it("parse => render", () => {
		let input = fixture("parser.html");
		assert.equal(render(parse(input)), input);
	});
});

describe("Core methods", () => {
	it("tree has plugin API", async () => {
		await posthtml()
			.use((tree) => {
				for (let name of ["walk", "match", "parser", "render", "options", "messages", "source"]) {
					assert.ok(name in tree, name);
				}
			})
			.process("<div></div>");
	});

	it("tree.parser", async () => {
		let result = await html("<import>", (tree) => {
			tree.match({ tag: "import" }, (node) => {
				node.tag = false;
				node.content = tree.parser("<div>import</div>");
				return node;
			});
			return tree;
		});
		assert.equal(result, "<div>import</div>");
	});

	it("tree.render", async () => {
		let result = await html("\n<div>1</div>\n\t<div>2</div>\n", (tree) => {
			let other = ["\n", { tag: "div", content: ["1"] }, "\n\t", { tag: "div", content: ["2"] }, "\n"];
			return tree.parser(tree.render(other).replace(/[\n|\t]/g, ""));
		});
		assert.equal(result, "<div>1</div><div>2</div>");
	});
});

describe("Messages", () => {
	it("exposes messages via result.messages", async () => {
		let result = await posthtml()
			.use((tree) => {
				tree.messages.push({ type: "dependency", file: "./path/to/1.html", from: tree.options.from });
				return tree;
			})
			.use((tree) => {
				tree.messages.push({ type: "dependency", file: "./path/to/2.html", from: tree.options.from });
				return tree;
			})
			.use((tree) => ({ tag: "new-root", content: tree }))
			.process('<div class="messages">Messages</div>');

		assert.equal(result.html, '<new-root><div class="messages">Messages</div></new-root>');
		assert.deepEqual(result.messages, [
			{ type: "dependency", file: "./path/to/1.html", from: undefined },
			{ type: "dependency", file: "./path/to/2.html", from: undefined },
		]);
	});
});

describe("Options", () => {
	const input = '<div class="button"><rect /><div class="button__text">Text</div></div>';

	it("singleTags and closingSingleTag", async () => {
		assert.equal(await html(input, [], { singleTags: ["rect"], closingSingleTag: "slash" }), input);
	});

	it("skipParse with a number", async () => {
		assert.equal(await html(123456789, [], { skipParse: true }), "123456789");
	});

	it("skipParse with a string", async () => {
		assert.equal(await html("123456789", [], { skipParse: true }), "123456789");
	});

	it("skipParse with a string and plugin", async () => {
		let result = await html("123456789", (tree) => {
			tree.walk((node) => node);
			return tree;
		}, { skipParse: true });
		assert.equal(result, "123456789");
	});

	it("skipParse with a tree", async () => {
		let tree = [
			{
				tag: "div",
				attrs: { class: "button" },
				content: [{ tag: "rect" }, { attrs: { class: "button__text" }, content: ["Text"] }],
			},
		];
		assert.equal(await html(tree, [], { singleTags: ["rect"], closingSingleTag: "slash", skipParse: true }), input);
	});

	it("skipParse with an empty tree", async () => {
		let result = await posthtml()
			.use((tree) => {
				tree.walk((node) => node);
				tree.match(/(.+)/, (node) => node);
				tree.messages.push({ type: "warning", message: "tree is empty" });
				return tree;
			})
			.process(null, { skipParse: true });
		assert.equal(result.html, "");
	});

	const directives = [{ name: "?php", start: "<", end: ">" }];

	it("directive ?php", async () => {
		let php = '<?php echo "Hello word"; ?>';
		assert.equal(await html(php, [], { directives }), php);
	});

	it("directive ?php with multi html", async () => {
		let php = `<!doctype><html><body><?php echo "Hello word"; ?></body></html>`;
		assert.equal(await html(php, [], { directives }), php);
	});
});

describe("Source", () => {
	it("source is not mutated", async () => {
		let input = '<div class="source">source</div>';
		let result = await posthtml()
			.use((tree) =>
				tree.walk((node) => {
					if (node.attrs) delete node.attrs.class;
					return node;
				}),
			)
			.process(input);
		assert.equal(result.tree.source, input);
		assert.equal(result.html, "<div>source</div>");
	});
});

describe("Plugins", () => {
	const input = '<div class="button"><div class="button__text">Text</div></div>';
	let tree;

	beforeEach(() => {
		tree = [
			{
				tag: "div",
				attrs: { class: "button" },
				content: [{ tag: "div", attrs: { class: "button__text" }, content: ["Text"] }],
			},
		];
	});

	it("posthtml([plugins])", async () => {
		assert.equal(await html(input, (json) => json), input);
	});

	it("posthtml(plugin)", async () => {
		assert.equal((await posthtml((json) => json).process(input)).html, input);
	});

	it("returns the original tree for resultless plugins", async () => {
		let result = await posthtml([() => {}]).process(tree, { skipParse: true });
		assert.deepEqual(result.tree, tree);
	});

	it("skipParse with plugins", async () => {
		let result = await posthtml([(json) => json]).process(tree, { skipParse: true });
		assert.deepEqual(result.tree, tree);
		assert.equal(result.html, input);
	});

	it(".use(plugin)", async () => {
		let result = await posthtml()
			.use((json) => json)
			.use(() => {})
			.process(input);
		assert.equal(result.html, input);
	});

	it(".use() keeps the plugins array", () => {
		let ph = posthtml().use(() => {}, () => {});
		let plugins = ph.plugins;
		ph.use(() => {}, () => {});
		assert.equal(ph.plugins, plugins);
		assert.equal(ph.plugins.length, 4);
	});

	it("flows results through sync and async plugins", async () => {
		let result = await posthtml()
			.use(() => ({ x: "1" }))
			.use(async ({ x }) => ({ x: `${x}2` }))
			.use(({ x }) => Promise.resolve({ x: `${x}3` }))
			.use(({ x }) => new Promise((resolve) => setImmediate(resolve, { x: `${x}4` })))
			.use(({ x }) => ({ x: `${x}5` }))
			.process(tree, { skipParse: true });
		assert.equal(result.tree.x, "12345");
	});

	it("flows the same object through sync and async plugins", async () => {
		let result = await posthtml()
			.use((json) => {
				json.x = "1";
			})
			.use(async (json) => {
				json.x += "2";
			})
			.use((json) => {
				json.x += "3";
				return Promise.resolve();
			})
			.use((json) => new Promise((resolve) => setTimeout(() => {
				json.x += "4";
				resolve();
			}, 5)))
			.use((json) => {
				json.x += "5";
			})
			.process(tree, { skipParse: true });
		assert.equal(result.tree.x, "12345");
	});

	it("rejects on plugin throws", async () => {
		let ph = posthtml().use(() => {
			throw new Error("FooBar");
		});
		await assert.rejects(ph.process(tree, { skipParse: true }), /FooBar/);
	});

	it("passes other rejects", async () => {
		let ph = posthtml().use(() => Promise.reject(new Error("FooBar")));
		await assert.rejects(ph.process(tree, { skipParse: true }), /FooBar/);
	});

	it("has the plugin API after returning a new root", async () => {
		await posthtml()
			.use((tree) => Promise.resolve({ tag: "new-root", content: tree }))
			.use((tree) => {
				assert.equal(typeof tree.walk, "function");
				assert.equal(typeof tree.match, "function");
			})
			.process("<div></div>");
	});

	it("plugins can modify options for the renderer", async () => {
		let result = await posthtml()
			.use(({ options }) => {
				options.singleTags = ["rect"];
				options.closingSingleTag = "slash";
			})
			.process('<div class="cls"><br><rect></div>');
		assert.equal(result.html, '<div class="cls"><br /><rect /></div>');
		assert.deepEqual(result.tree, [{ tag: "div", attrs: { class: "cls" }, content: [{ tag: "br" }, { tag: "rect" }] }]);
	});
});
