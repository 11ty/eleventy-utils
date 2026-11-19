import { describe, it } from "node:test";
import assert from "node:assert/strict";

import posthtml, { parse, render } from "../index.js";

const BUILD_AWESOME_OPTIONS = { xmlMode: false, recognizeNoValueAttribute: true, closingSingleTag: "closeAs" };

describe("Parser", () => {
	it("textarea content is raw text", () => {
		assert.deepEqual(parse("<textarea><b></textarea>"), [{ tag: "textarea", content: ["<b>"] }]);
	});

	it("recognizeNoValueAttribute", () => {
		assert.deepEqual(parse('<a href download="">', { recognizeNoValueAttribute: true }), [
			{ tag: "a", attrs: { href: true, download: "" } },
		]);
		assert.deepEqual(parse("<a href>"), [{ tag: "a", attrs: { href: "" } }]);
	});

	it("keeps entities encoded", () => {
		assert.deepEqual(parse('<p title="&quot;a&amp;b&quot;">&lt;&amp;</p>'), [
			{ tag: "p", attrs: { title: '"a&amp;b"' }, content: ["&lt;&amp;"] },
		]);
	});

	it("doctype and directives inside elements", () => {
		assert.deepEqual(parse("<!DOCTYPE html><div><?php x ?></div>", { directives: [{ name: /^\?php$/, start: "<", end: ">" }] }), [
			"<!DOCTYPE html>",
			{ tag: "div", content: ["<?php x ?>"] },
		]);
	});
});

describe("Renderer", () => {
	it("does not mutate nodes", () => {
		let tree = [{ tag: "p", content: "text" }, { tag: "br" }];
		assert.equal(render(tree), "<p>text</p><br>");
		assert.deepEqual(tree, [{ tag: "p", content: "text" }, { tag: "br" }]);
	});

	it("escapes JSON-looking attribute values by default", () => {
		let tree = { tag: "div", attrs: { "data-x": '{"a":1}' } };
		assert.equal(render(tree), '<div data-x="{&quot;a&quot;:1}"></div>');
		assert.equal(render(tree, { singleQuoteJsonAttributes: true }), `<div data-x='{"a":1}'></div>`);
	});

	it("quote styles", () => {
		let tree = { tag: "img", attrs: { alt: 'say "hi"', width: 10 } };
		assert.equal(render(tree), '<img alt="say &quot;hi&quot;" width="10">');
		assert.equal(render(tree, { quoteStyle: 1 }), `<img alt='say &quot;hi&quot;' width='10'>`);
		assert.equal(render(tree, { quoteStyle: 0, replaceQuote: false }), `<img alt='say "hi"' width="10">`);
		assert.equal(render({ tag: "a", attrs: { href: "/x", title: "a b", hidden: "" } }, { quoteAllAttributes: false }), '<a href=/x title="a b" hidden></a>');
	});

	it("singleTags RegExp entries add to the void elements", () => {
		let tree = [{ tag: "br" }, { tag: "my-icon" }];
		assert.equal(render(tree, { singleTags: [/^my-/], closingSingleTag: "slash" }), "<br /><my-icon />");
	});

	it("closeAs", () => {
		let options = { closingSingleTag: "closeAs" };
		assert.equal(render([{ tag: "meta", closeAs: "slash" }, { tag: "br" }], options), "<meta /><br>");
		assert.equal(render({ tag: "br", closeAs: "nope" }, options), "<br>");
		assert.equal(render({ tag: "meta", closeAs: "slash" }), "<meta>");
	});
});

describe("Processor", () => {
	it("tree API is not enumerable", async () => {
		let { tree } = await posthtml().process("<p>a</p>");
		assert.deepEqual(Object.keys(tree), ["0"]);
		assert.equal(JSON.stringify(tree), '[{"tag":"p","content":["a"]}]');
	});

	it("messages are per process call", async () => {
		let ph = posthtml([(tree) => void tree.messages.push("hi")]);
		await ph.process("");
		let { messages } = await ph.process("");
		assert.deepEqual(messages, ["hi"]);
	});

	it("render options apply when a plugin returns a new root", async () => {
		let { html } = await posthtml([(tree) => ({ tag: "main", content: tree })]).process("<br>", { closingSingleTag: "slash" });
		assert.equal(html, "<main><br /></main>");
	});

	it("Build Awesome options round trip", async () => {
		let input = '<!doctype html><a href>x</a><input disabled><meta charset="utf-8"><textarea><b></textarea><img src="a.png" alt="">';
		let { html } = await posthtml([
			(tree) =>
				tree.match({ tag: "meta" }, (node) => {
					node.closeAs = "slash";
					return node;
				}),
		]).process(input, BUILD_AWESOME_OPTIONS);
		assert.equal(html, '<!doctype html><a href>x</a><input disabled><meta charset="utf-8" /><textarea><b></textarea><img src="a.png" alt="">');
	});
});
