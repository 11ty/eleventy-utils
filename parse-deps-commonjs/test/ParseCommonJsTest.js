const assert = require("node:assert/strict");
const test = require("node:test");
const { TemplatePath } = require("@11ty/eleventy-utils");
const DependencyTree = require("../main.js");
const { getPackagesByType } = DependencyTree;
const semver = require("semver");
const { version } = require("node:process");

test("Nonexistent", t => {
	assert.throws(() => {
		DependencyTree("./parse-deps-commonjs/stubs/thisdoesnotexist.js");
	});
});

test("Allow not Found", t => {
	assert.deepStrictEqual(DependencyTree("./parse-deps-commonjs/stubs/thisdoesnotexist.js", { allowNotFound: true }), []);
});

test("Not require()’d before calling", t => {
	DependencyTree("./parse-deps-commonjs/stubs/parent/parent.js");
});

test("simple.js", t => {
	assert.deepStrictEqual(DependencyTree("./parse-deps-commonjs/stubs/simple.js"), ["./parse-deps-commonjs/stubs/simple2.js"]);
});

test("parent.js", t => {
	assert.deepStrictEqual(DependencyTree("./parse-deps-commonjs/stubs/parent/parent.js").sort(), [
		"./parse-deps-commonjs/stubs/parent/child1.js",
		"./parse-deps-commonjs/stubs/parent/child2.js",
		"./parse-deps-commonjs/stubs/parent/grandchild.js",
		"./parse-deps-commonjs/stubs/parent/greatgrandchild.js"
	]);

	assert.deepStrictEqual(DependencyTree("./parse-deps-commonjs/stubs/parent/child1.js").sort(), [
		"./parse-deps-commonjs/stubs/parent/grandchild.js",
		"./parse-deps-commonjs/stubs/parent/greatgrandchild.js"
	]);

	assert.deepStrictEqual(DependencyTree("./parse-deps-commonjs/stubs/parent/child2.js").sort(), [
		"./parse-deps-commonjs/stubs/parent/grandchild.js",
		"./parse-deps-commonjs/stubs/parent/greatgrandchild.js"
	]);

	assert.deepStrictEqual(DependencyTree("./parse-deps-commonjs/stubs/parent/grandchild.js"), [
		"./parse-deps-commonjs/stubs/parent/greatgrandchild.js"
	]);

	assert.deepStrictEqual(DependencyTree("./parse-deps-commonjs/stubs/parent/greatgrandchild.js"), []);
});

test("circular", t => {
	assert.deepStrictEqual(DependencyTree("./parse-deps-commonjs/stubs/circular/circle-a.js").sort(), [
		"./parse-deps-commonjs/stubs/circular/circle-b.js",
		"./parse-deps-commonjs/stubs/circular/circle-c.js"
	]);
});

test("another circular", t => {
	assert.deepStrictEqual(DependencyTree("./parse-deps-commonjs/stubs/circular2/circle-a.js").sort(), [
		"./parse-deps-commonjs/stubs/circular2/circle-b.js",
		"./parse-deps-commonjs/stubs/circular2/circle-c.js"
	]);
});

test("dot dot (dependency is up a directory)", t => {
	assert.deepStrictEqual(DependencyTree("./parse-deps-commonjs/stubs/dotdot/dotdot.js").sort(), [
		"./parse-deps-commonjs/stubs/simple2.js"
	]);
});

test("only node_modules", t => {
	assert.deepStrictEqual(DependencyTree("./parse-deps-commonjs/stubs/uses_node_modules.js", {
		nodeModuleNamesOnly: true
	}).sort(), [
		"@sindresorhus/is",
		"lodash",
	]);
});

test("getNodeModuleName", t => {
	let p1 = TemplatePath.normalizeOperatingSystemFilePath("./eleventy-dependency-tree/node_modules/lodash/lodash.js");
	assert.equal(DependencyTree.getNodeModuleName(p1), "lodash");

	let p2 = TemplatePath.normalizeOperatingSystemFilePath("./eleventy-dependency-tree/node_modules/@sindresorhus/is/dist/index.js");
	assert.equal(DependencyTree.getNodeModuleName(p2), "@sindresorhus/is");
});

test("both files and node_modules", t => {
	assert.deepStrictEqual(DependencyTree("./parse-deps-commonjs/stubs/uses_node_modules.js", {
		nodeModuleNames: "include"
	}).sort(), [
		"./parse-deps-commonjs/stubs/parent/child1.js",
		"./parse-deps-commonjs/stubs/parent/grandchild.js",
		"./parse-deps-commonjs/stubs/parent/greatgrandchild.js",
		"@sindresorhus/is",
		"lodash",
	]);
});

test("require(esm) targets module", { skip: !(semver.gte(version, "22.13.0") || semver.gte(version, "20.19.0")) }, t => {
	assert.deepStrictEqual(getPackagesByType("./parse-deps-commonjs/stubs/module.mjs"), {
		commonjs: [],
		esm: [
			"./parse-deps-commonjs/stubs/module.mjs",
		],
	});
});

test("TypeScript .ts", { skip: !semver.gte(version, "22.6.0") }, t => {
	assert.deepStrictEqual(DependencyTree("./parse-deps-commonjs/stubs/typescript.ts"), [
		"./parse-deps-commonjs/stubs/simple2.js",
		"./parse-deps-commonjs/stubs/empty.ts",
	]);
});

test("TypeScript .cts", { skip: !semver.gte(version, "22.6.0") }, t => {
	assert.deepStrictEqual(DependencyTree("./parse-deps-commonjs/stubs/typescript.cts"), [
		"./parse-deps-commonjs/stubs/simple2.js",
		"./parse-deps-commonjs/stubs/empty.ts",
	]);
});
