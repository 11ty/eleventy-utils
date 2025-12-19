import assert from "node:assert/strict";
import test from "node:test";

import { find, findGraph } from "../index.js";
import { DepGraph } from "dependency-graph";

function getNodeMajorVersion() {
	let [major] = process.version.split(".");
	if(major.startsWith("v")) {
		major = major.slice(1);
	}
	return parseInt(major, 10);
}

const TEST_OPTIONS = { skip: getNodeMajorVersion() < 22 };

test("Empty", TEST_OPTIONS, async t => {
	assert.deepStrictEqual(await find("./parse-deps-typescript/stubs/empty.ts"), []);
});

test("Doesn’t exist", TEST_OPTIONS, async t => {
	assert.deepStrictEqual(await find("./parse-deps-typescript/stubs/THIS_FILE_DOES_NOT_EXIST.ts"), []);
});

test("Simple", TEST_OPTIONS, async t => {
	assert.deepStrictEqual(await find("./parse-deps-typescript/stubs/file.ts"), ["./parse-deps-typescript/stubs/imported-secondary.ts"]);
});

test("With JS dep", TEST_OPTIONS, async t => {
	assert.deepStrictEqual(await find("./parse-deps-typescript/stubs/has-js.ts"), [
		"./parse-deps-typescript/stubs/js-child.js",
		"./parse-deps-typescript/stubs/nested.ts",
		"./parse-deps-typescript/stubs/imported.ts",
		"./parse-deps-typescript/stubs/imported-secondary.ts"
	]);
});

test("With Typescript content", TEST_OPTIONS, async t => {
	assert.deepStrictEqual(await find("./parse-deps-typescript/stubs/typescript.ts"), [
		"./parse-deps-typescript/stubs/file.ts",
		"./parse-deps-typescript/stubs/imported-secondary.ts"
	]);
});

test("Nested two deep", TEST_OPTIONS, async t => {
	assert.deepStrictEqual(await find("./parse-deps-typescript/stubs/nested.ts"), ["./parse-deps-typescript/stubs/imported.ts", "./parse-deps-typescript/stubs/imported-secondary.ts"]);
});

test("Nested three deep", TEST_OPTIONS, async t => {
	assert.deepStrictEqual(await find("./parse-deps-typescript/stubs/nested-grandchild.ts"), ["./parse-deps-typescript/stubs/nested.ts", "./parse-deps-typescript/stubs/imported.ts", "./parse-deps-typescript/stubs/imported-secondary.ts"]);
});

test("Circular", TEST_OPTIONS, async t => {
	assert.deepStrictEqual(await find("./parse-deps-typescript/stubs/circular-parent.ts"), ["./parse-deps-typescript/stubs/circular-child.ts"]);
});

test("Circular Self Reference", TEST_OPTIONS, async t => {
	assert.deepStrictEqual(await find("./parse-deps-typescript/stubs/circular-self.ts"), ["./parse-deps-typescript/stubs/empty.ts"]);
});

test("Import Attributes, issue #2", TEST_OPTIONS, async t => {
	assert.deepStrictEqual(await find("./parse-deps-typescript/stubs/import-attributes.ts"), ["./parse-deps-typescript/stubs/imported.json"]);
});

test("findGraph", TEST_OPTIONS, async t => {
	let g = await findGraph("./parse-deps-typescript/stubs/nested-grandchild.ts");
	assert.deepStrictEqual(g.dependenciesOf("./parse-deps-typescript/stubs/imported-secondary.ts"), []);
	assert.deepStrictEqual(g.dependenciesOf("./parse-deps-typescript/stubs/imported.ts"), [
		"./parse-deps-typescript/stubs/imported-secondary.ts",
	]);
	assert.deepStrictEqual(g.dependenciesOf("./parse-deps-typescript/stubs/nested.ts"), [
		"./parse-deps-typescript/stubs/imported-secondary.ts",
		"./parse-deps-typescript/stubs/imported.ts",
	]);
	assert.deepStrictEqual(g.dependenciesOf("./parse-deps-typescript/stubs/nested-grandchild.ts"), [
		"./parse-deps-typescript/stubs/imported-secondary.ts",
		"./parse-deps-typescript/stubs/imported.ts",
		"./parse-deps-typescript/stubs/nested.ts",
	]);

	assert.deepStrictEqual(g.dependantsOf("./parse-deps-typescript/stubs/nested-grandchild.ts"), []);
	assert.deepStrictEqual(g.dependantsOf("./parse-deps-typescript/stubs/nested.ts"), [
		"./parse-deps-typescript/stubs/nested-grandchild.ts",
	]);
	assert.deepStrictEqual(g.dependantsOf("./parse-deps-typescript/stubs/imported.ts"), [
		"./parse-deps-typescript/stubs/nested-grandchild.ts",
		"./parse-deps-typescript/stubs/nested.ts",
	]);
	assert.deepStrictEqual(g.dependantsOf("./parse-deps-typescript/stubs/imported-secondary.ts"), [
		"./parse-deps-typescript/stubs/nested-grandchild.ts",
		"./parse-deps-typescript/stubs/nested.ts",
		"./parse-deps-typescript/stubs/imported.ts",
	]);

	assert.deepStrictEqual(g.overallOrder(), [
		"./parse-deps-typescript/stubs/imported-secondary.ts",
		"./parse-deps-typescript/stubs/imported.ts",
		"./parse-deps-typescript/stubs/nested.ts",
		"./parse-deps-typescript/stubs/nested-grandchild.ts",
	]);
});

test("findGraph on nonexistent", TEST_OPTIONS, async t => {
	let g = await findGraph("./parse-deps-typescript/stubs/does-not-exist.ts");
	assert.strictEqual(g instanceof DepGraph, true);
});