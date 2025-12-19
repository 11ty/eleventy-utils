const assert = require("node:assert/strict");
const test = require("node:test");
const suite = test.suite;

const { find, findGraph } = require("../main.js");
const { DepGraph } = require("dependency-graph");

suite("Parse Dependencies (ESM)", () => {
	test("Empty", async t => {
		assert.deepStrictEqual(await find("./parse-deps-esm/stubs/empty.js"), []);
	});
	
	test("Doesn’t exist", async t => {
		assert.deepStrictEqual(await find("./parse-deps-esm/stubs/THIS_FILE_DOES_NOT_EXIST.js"), []);
	});
	
	test("Simple", async t => {
		assert.deepStrictEqual(await find("./parse-deps-esm/stubs/file.js"), ["./parse-deps-esm/stubs/imported-secondary.js"]);
	});
	
	test("Nested two deep", async t => {
		assert.deepStrictEqual(await find("./parse-deps-esm/stubs/nested.js"), ["./parse-deps-esm/stubs/imported.js", "./parse-deps-esm/stubs/imported-secondary.js"]);
	});
	
	test("Nested three deep", async t => {
		assert.deepStrictEqual(await find("./parse-deps-esm/stubs/nested-grandchild.js"), ["./parse-deps-esm/stubs/nested.js", "./parse-deps-esm/stubs/imported.js", "./parse-deps-esm/stubs/imported-secondary.js"]);
	});
	
	test("Circular", async t => {
		assert.deepStrictEqual(await find("./parse-deps-esm/stubs/circular-parent.js"), ["./parse-deps-esm/stubs/circular-child.js"]);
	});
	
	test("Circular Self Reference", async t => {
		assert.deepStrictEqual(await find("./parse-deps-esm/stubs/circular-self.js"), ["./parse-deps-esm/stubs/empty.js"]);
	});
	
	// https://github.com/11ty/eleventy-dependency-tree-esm/issues/2
	test("Import Attributes, issue #2", async t => {
		assert.deepStrictEqual(await find("./parse-deps-esm/stubs/import-attributes.js"), ["./parse-deps-esm/stubs/imported.json"]);
	});
	
	test("findGraph", async t => {
		let g = await findGraph("./parse-deps-esm/stubs/nested-grandchild.js");
		assert.deepStrictEqual(g.dependenciesOf("./parse-deps-esm/stubs/imported-secondary.js"), []);
		assert.deepStrictEqual(g.dependenciesOf("./parse-deps-esm/stubs/imported.js"), [
			"./parse-deps-esm/stubs/imported-secondary.js",
		]);
		assert.deepStrictEqual(g.dependenciesOf("./parse-deps-esm/stubs/nested.js"), [
			"./parse-deps-esm/stubs/imported-secondary.js",
			"./parse-deps-esm/stubs/imported.js",
		]);
		assert.deepStrictEqual(g.dependenciesOf("./parse-deps-esm/stubs/nested-grandchild.js"), [
			"./parse-deps-esm/stubs/imported-secondary.js",
			"./parse-deps-esm/stubs/imported.js",
			"./parse-deps-esm/stubs/nested.js",
		]);
	
		assert.deepStrictEqual(g.dependantsOf("./parse-deps-esm/stubs/nested-grandchild.js"), []);
		assert.deepStrictEqual(g.dependantsOf("./parse-deps-esm/stubs/nested.js"), [
			"./parse-deps-esm/stubs/nested-grandchild.js",
		]);
		assert.deepStrictEqual(g.dependantsOf("./parse-deps-esm/stubs/imported.js"), [
			"./parse-deps-esm/stubs/nested-grandchild.js",
			"./parse-deps-esm/stubs/nested.js",
		]);
		assert.deepStrictEqual(g.dependantsOf("./parse-deps-esm/stubs/imported-secondary.js"), [
			"./parse-deps-esm/stubs/nested-grandchild.js",
			"./parse-deps-esm/stubs/nested.js",
			"./parse-deps-esm/stubs/imported.js",
		]);
	
		assert.deepStrictEqual(g.overallOrder(), [
			"./parse-deps-esm/stubs/imported-secondary.js",
			"./parse-deps-esm/stubs/imported.js",
			"./parse-deps-esm/stubs/nested.js",
			"./parse-deps-esm/stubs/nested-grandchild.js",
		]);
	});
	
	test("findGraph on nonexistent", async t => {
		let g = await findGraph("./parse-deps-esm/stubs/does-not-exist.js");
		assert.ok(g instanceof DepGraph);
	});
})