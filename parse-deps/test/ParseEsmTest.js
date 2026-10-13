const assert = require("node:assert/strict");
const test = require("node:test");

const { find, findGraph } = require("../main.js");
const { DepGraph } = require("dependency-graph");

test("Empty", async t => {
	assert.deepStrictEqual(await find("./parse-deps/stubs/esm/empty.js"), []);
});

test("Doesn’t exist", async t => {
	assert.deepStrictEqual(await find("./parse-deps/stubs/esm/THIS_FILE_DOES_NOT_EXIST.js"), []);
});

test("Simple", async t => {
	assert.deepStrictEqual(await find("./parse-deps/stubs/esm/file.js"), ["./parse-deps/stubs/esm/imported-secondary.js"]);
});

test("Nested two deep", async t => {
	assert.deepStrictEqual(await find("./parse-deps/stubs/esm/nested.js"), ["./parse-deps/stubs/esm/imported.js", "./parse-deps/stubs/esm/imported-secondary.js"]);
});

test("Nested three deep", async t => {
	assert.deepStrictEqual(await find("./parse-deps/stubs/esm/nested-grandchild.js"), ["./parse-deps/stubs/esm/nested.js", "./parse-deps/stubs/esm/imported.js", "./parse-deps/stubs/esm/imported-secondary.js"]);
});

test("Circular", async t => {
	assert.deepStrictEqual(await find("./parse-deps/stubs/esm/circular-parent.js"), ["./parse-deps/stubs/esm/circular-child.js"]);
});

test("Circular Self Reference", async t => {
	assert.deepStrictEqual(await find("./parse-deps/stubs/esm/circular-self.js"), ["./parse-deps/stubs/esm/empty.js"]);
});

// https://github.com/11ty/eleventy-dependency-tree-esm/issues/2
test("Import Attributes, issue #2", async t => {
	assert.deepStrictEqual(await find("./parse-deps/stubs/esm/import-attributes.js"), ["./parse-deps/stubs/esm/imported.json"]);
});

test("findGraph", async t => {
	let g = await findGraph("./parse-deps/stubs/esm/nested-grandchild.js");
	assert.deepStrictEqual(g.dependenciesOf("./parse-deps/stubs/esm/imported-secondary.js"), []);
	assert.deepStrictEqual(g.dependenciesOf("./parse-deps/stubs/esm/imported.js"), [
		"./parse-deps/stubs/esm/imported-secondary.js",
	]);
	assert.deepStrictEqual(g.dependenciesOf("./parse-deps/stubs/esm/nested.js"), [
		"./parse-deps/stubs/esm/imported-secondary.js",
		"./parse-deps/stubs/esm/imported.js",
	]);
	assert.deepStrictEqual(g.dependenciesOf("./parse-deps/stubs/esm/nested-grandchild.js"), [
		"./parse-deps/stubs/esm/imported-secondary.js",
		"./parse-deps/stubs/esm/imported.js",
		"./parse-deps/stubs/esm/nested.js",
	]);

	assert.deepStrictEqual(g.dependantsOf("./parse-deps/stubs/esm/nested-grandchild.js"), []);
	assert.deepStrictEqual(g.dependantsOf("./parse-deps/stubs/esm/nested.js"), [
		"./parse-deps/stubs/esm/nested-grandchild.js",
	]);
	assert.deepStrictEqual(g.dependantsOf("./parse-deps/stubs/esm/imported.js"), [
		"./parse-deps/stubs/esm/nested-grandchild.js",
		"./parse-deps/stubs/esm/nested.js",
	]);
	assert.deepStrictEqual(g.dependantsOf("./parse-deps/stubs/esm/imported-secondary.js"), [
		"./parse-deps/stubs/esm/nested-grandchild.js",
		"./parse-deps/stubs/esm/nested.js",
		"./parse-deps/stubs/esm/imported.js",
	]);

	assert.deepStrictEqual(g.overallOrder(), [
		"./parse-deps/stubs/esm/imported-secondary.js",
		"./parse-deps/stubs/esm/imported.js",
		"./parse-deps/stubs/esm/nested.js",
		"./parse-deps/stubs/esm/nested-grandchild.js",
	]);
});

test("findGraph on nonexistent", async t => {
	let g = await findGraph("./parse-deps/stubs/esm/does-not-exist.js");
	assert.ok(g instanceof DepGraph);
});

test("CommonJS", async t => {
	let results = await find("./parse-deps/stubs/esm/targets-cjs.js", {
		// TODO this could probably parse CommonJS too?
		// parseOptions: {
		// 	sourceType: "commonjs",
		// }
	});

	assert.deepStrictEqual(results, [
		"./parse-deps/stubs/esm/commonjs.cjs",
		"./parse-deps/stubs/esm/empty.js",
	]);
});
