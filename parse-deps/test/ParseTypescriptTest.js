import assert from "node:assert/strict";
import test from "node:test";

import { find, findGraph } from "../main.js";
import { DepGraph } from "dependency-graph";

test("Empty", async t => {
	assert.deepStrictEqual(await find("./parse-deps/stubs/typescript/empty.ts"), []);
});

test("Doesn’t exist", async t => {
	assert.deepStrictEqual(await find("./parse-deps/stubs/typescript/THIS_FILE_DOES_NOT_EXIST.ts"), []);
});

test("Simple", async t => {
	assert.deepStrictEqual(await find("./parse-deps/stubs/typescript/file.ts"), ["./parse-deps/stubs/typescript/imported-secondary.ts"]);
});

test("With JS dep", async t => {
	assert.deepStrictEqual(await find("./parse-deps/stubs/typescript/has-js.ts"), [
		"./parse-deps/stubs/typescript/js-child.js",
		"./parse-deps/stubs/typescript/nested.ts",
		"./parse-deps/stubs/typescript/imported.ts",
		"./parse-deps/stubs/typescript/imported-secondary.ts"
	]);
});

test("With Typescript content", async t => {
	assert.deepStrictEqual(await find("./parse-deps/stubs/typescript/typescript.ts"), [
		"./parse-deps/stubs/typescript/file.ts",
		"./parse-deps/stubs/typescript/imported-secondary.ts"
	]);
});

test("Nested two deep", async t => {
	assert.deepStrictEqual(await find("./parse-deps/stubs/typescript/nested.ts"), ["./parse-deps/stubs/typescript/imported.ts", "./parse-deps/stubs/typescript/imported-secondary.ts"]);
});

test("Nested three deep", async t => {
	assert.deepStrictEqual(await find("./parse-deps/stubs/typescript/nested-grandchild.ts"), ["./parse-deps/stubs/typescript/nested.ts", "./parse-deps/stubs/typescript/imported.ts", "./parse-deps/stubs/typescript/imported-secondary.ts"]);
});

test("Circular", async t => {
	assert.deepStrictEqual(await find("./parse-deps/stubs/typescript/circular-parent.ts"), ["./parse-deps/stubs/typescript/circular-child.ts"]);
});

test("Circular Self Reference", async t => {
	assert.deepStrictEqual(await find("./parse-deps/stubs/typescript/circular-self.ts"), ["./parse-deps/stubs/typescript/empty.ts"]);
});

test("Import Attributes, issue #2", async t => {
	assert.deepStrictEqual(await find("./parse-deps/stubs/typescript/import-attributes.ts"), ["./parse-deps/stubs/typescript/imported.json"]);
});

test("findGraph", async t => {
	let g = await findGraph("./parse-deps/stubs/typescript/nested-grandchild.ts");
	assert.deepStrictEqual(g.dependenciesOf("./parse-deps/stubs/typescript/imported-secondary.ts"), []);
	assert.deepStrictEqual(g.dependenciesOf("./parse-deps/stubs/typescript/imported.ts"), [
		"./parse-deps/stubs/typescript/imported-secondary.ts",
	]);
	assert.deepStrictEqual(g.dependenciesOf("./parse-deps/stubs/typescript/nested.ts"), [
		"./parse-deps/stubs/typescript/imported-secondary.ts",
		"./parse-deps/stubs/typescript/imported.ts",
	]);
	assert.deepStrictEqual(g.dependenciesOf("./parse-deps/stubs/typescript/nested-grandchild.ts"), [
		"./parse-deps/stubs/typescript/imported-secondary.ts",
		"./parse-deps/stubs/typescript/imported.ts",
		"./parse-deps/stubs/typescript/nested.ts",
	]);

	assert.deepStrictEqual(g.dependantsOf("./parse-deps/stubs/typescript/nested-grandchild.ts"), []);
	assert.deepStrictEqual(g.dependantsOf("./parse-deps/stubs/typescript/nested.ts"), [
		"./parse-deps/stubs/typescript/nested-grandchild.ts",
	]);
	assert.deepStrictEqual(g.dependantsOf("./parse-deps/stubs/typescript/imported.ts"), [
		"./parse-deps/stubs/typescript/nested-grandchild.ts",
		"./parse-deps/stubs/typescript/nested.ts",
	]);
	assert.deepStrictEqual(g.dependantsOf("./parse-deps/stubs/typescript/imported-secondary.ts"), [
		"./parse-deps/stubs/typescript/nested-grandchild.ts",
		"./parse-deps/stubs/typescript/nested.ts",
		"./parse-deps/stubs/typescript/imported.ts",
	]);

	assert.deepStrictEqual(g.overallOrder(), [
		"./parse-deps/stubs/typescript/imported-secondary.ts",
		"./parse-deps/stubs/typescript/imported.ts",
		"./parse-deps/stubs/typescript/nested.ts",
		"./parse-deps/stubs/typescript/nested-grandchild.ts",
	]);
});

test("findGraph on nonexistent", async t => {
	let g = await findGraph("./parse-deps/stubs/typescript/does-not-exist.ts");
	assert.strictEqual(g instanceof DepGraph, true);
});

test("CommonJS require() in .ts", async t => {
	assert.deepStrictEqual(await find("./parse-deps/stubs/typescript/commonjs/typescript.ts"), [
		"./parse-deps/stubs/typescript/commonjs/simple2.js",
		"./parse-deps/stubs/typescript/commonjs/empty.ts",
	]);
});

test("CommonJS require() in .cts", async t => {
	assert.deepStrictEqual(await find("./parse-deps/stubs/typescript/commonjs/typescript.cts"), [
		"./parse-deps/stubs/typescript/commonjs/simple2.js",
		"./parse-deps/stubs/typescript/commonjs/empty.ts",
	]);
});

test("JSX in .tsx, issue #7", async t => {
	assert.deepStrictEqual(await find("./parse-deps/stubs/typescript/tsx/component.tsx"), [
		"./parse-deps/stubs/typescript/tsx/label.ts",
		"./parse-deps/stubs/typescript/tsx/child.tsx",
	]);
});
