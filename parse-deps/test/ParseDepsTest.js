import assert from "node:assert/strict";
import test from "node:test";
import { mkdtempSync, writeFileSync, utimesSync, rmSync } from "node:fs";
import path from "node:path";
import { DepGraph } from "dependency-graph";

import { find, findGraph, clearCache } from "../main.js";

const STUBS = "./parse-deps/stubs";

test("Nonexistent", async t => {
	assert.deepStrictEqual(await find(`${STUBS}/thisdoesnotexist.js`), []);
});

test("simple.js", async t => {
	assert.deepStrictEqual(await find(`${STUBS}/simple.js`), [`${STUBS}/simple2.js`]);
});

test("parent.js", async t => {
	assert.deepStrictEqual((await find(`${STUBS}/parent/parent.js`)).sort(), [
		`${STUBS}/parent/child1.js`,
		`${STUBS}/parent/child2.js`,
		`${STUBS}/parent/grandchild.js`,
		`${STUBS}/parent/greatgrandchild.js`,
	]);

	assert.deepStrictEqual((await find(`${STUBS}/parent/child1.js`)).sort(), [
		`${STUBS}/parent/grandchild.js`,
		`${STUBS}/parent/greatgrandchild.js`,
	]);

	assert.deepStrictEqual(await find(`${STUBS}/parent/grandchild.js`), [
		`${STUBS}/parent/greatgrandchild.js`,
	]);

	assert.deepStrictEqual(await find(`${STUBS}/parent/greatgrandchild.js`), []);
});

test("circular", async t => {
	assert.deepStrictEqual((await find(`${STUBS}/circular/circle-a.js`)).sort(), [
		`${STUBS}/circular/circle-b.js`,
		`${STUBS}/circular/circle-c.js`,
	]);
});

test("another circular", async t => {
	assert.deepStrictEqual((await find(`${STUBS}/circular2/circle-a.js`)).sort(), [
		`${STUBS}/circular2/circle-b.js`,
		`${STUBS}/circular2/circle-c.js`,
	]);
});

test("dot dot (dependency is up a directory)", async t => {
	assert.deepStrictEqual(await find(`${STUBS}/dotdot/dotdot.js`), [`${STUBS}/simple2.js`]);
});

test("only node_modules", async t => {
	assert.deepStrictEqual((await find(`${STUBS}/uses_node_modules.js`, { nodeModuleNames: "only" })).sort(), [
		"@sindresorhus/is",
		"lodash",
	]);
});

test("both files and node_modules", async t => {
	assert.deepStrictEqual((await find(`${STUBS}/uses_node_modules.js`, { nodeModuleNames: "include" })).sort(), [
		`${STUBS}/parent/child1.js`,
		`${STUBS}/parent/grandchild.js`,
		`${STUBS}/parent/greatgrandchild.js`,
		"@sindresorhus/is",
		"lodash",
	]);
});

test("ESM imports CommonJS", async t => {
	assert.deepStrictEqual(await find(`${STUBS}/module.mjs`), [
		`${STUBS}/uses_node_modules.js`,
		`${STUBS}/parent/child1.js`,
		`${STUBS}/parent/grandchild.js`,
		`${STUBS}/parent/greatgrandchild.js`,
	]);
});

test("require(esm) chain", async t => {
	assert.deepStrictEqual(await find(`${STUBS}/mixed/root.mjs`), [
		`${STUBS}/mixed/entry.cjs`,
		`${STUBS}/mixed/esm-a.mjs`,
		`${STUBS}/mixed/esm-b.mjs`,
		`${STUBS}/mixed/leaf.cjs`,
		`${STUBS}/mixed/leaf2.cjs`,
	]);
});

test("createRequire in ESM", async t => {
	assert.deepStrictEqual(await find(`${STUBS}/mixed/create-require.mjs`), [`${STUBS}/mixed/leaf2.cjs`]);
});

test("CommonJS with top-level return", async t => {
	assert.deepStrictEqual(await find(`${STUBS}/mixed/top-level-return.cjs`), [`${STUBS}/mixed/leaf2.cjs`]);
});

test("export from", async t => {
	assert.deepStrictEqual(await find(`${STUBS}/mixed/export-from.mjs`), [
		`${STUBS}/mixed/esm-b.mjs`,
		`${STUBS}/mixed/esm-a.mjs`,
		`${STUBS}/mixed/leaf.cjs`,
		`${STUBS}/mixed/leaf2.cjs`,
	]);
});

test("Dynamic import() with literal, computed specifiers are ignored", async t => {
	assert.deepStrictEqual(await find(`${STUBS}/mixed/dynamic.mjs`), [
		`${STUBS}/mixed/leaf2.cjs`,
		`${STUBS}/mixed/leaf.cjs`,
	]);
});

test("Dynamic import() with a comment before the parenthesis", async t => {
	assert.deepStrictEqual(await find(`${STUBS}/mixed/import-comment.mjs`), [
		`${STUBS}/mixed/leaf.cjs`,
		`${STUBS}/mixed/leaf2.cjs`,
	]);
});

test("Dynamic import() with whitespace before the parenthesis", async t => {
	assert.deepStrictEqual(await find(`${STUBS}/mixed/import-whitespace.mjs`), [`${STUBS}/mixed/leaf2.cjs`]);
});

test("Nested require(), extensionless, JSON, built-ins", async t => {
	assert.deepStrictEqual(await find(`${STUBS}/mixed/nested-require.cjs`), [
		`${STUBS}/simple2.js`,
		`${STUBS}/parent/parent.js`,
		`${STUBS}/mixed/data.json`,
		`${STUBS}/parent/child1.js`,
		`${STUBS}/parent/child2.js`,
		`${STUBS}/parent/grandchild.js`,
		`${STUBS}/parent/greatgrandchild.js`,
	]);
});

test("nested: false skips function bodies (CommonJS)", async t => {
	assert.deepStrictEqual(await find(`${STUBS}/nested/entry.cjs`, { nested: false }), [
		`${STUBS}/nested/a.cjs`,
		`${STUBS}/nested/b.cjs`,
		`${STUBS}/nested/c.cjs`,
	]);
});

test("nested: false skips function bodies (ESM)", async t => {
	assert.deepStrictEqual(await find(`${STUBS}/nested/entry.mjs`, { nested: false }), [`${STUBS}/nested/a.cjs`]);
});

test("nested defaults to true and isn’t reused from the cache when it changes", async t => {
	let all = [
		`${STUBS}/nested/a.cjs`,
		`${STUBS}/nested/b.cjs`,
		`${STUBS}/nested/c.cjs`,
		`${STUBS}/nested/lazy-method.cjs`,
		`${STUBS}/nested/lazy-function.cjs`,
		`${STUBS}/nested/lazy-arrow.mjs`,
	];
	assert.deepStrictEqual(await find(`${STUBS}/nested/entry.cjs`), all);
	assert.deepStrictEqual((await find(`${STUBS}/nested/entry.cjs`, { nested: false })).length, 3);
	assert.deepStrictEqual(await find(`${STUBS}/nested/entry.cjs`, { nested: true }), all);
});

test("findGraph across module types", async t => {
	let g = await findGraph(`${STUBS}/mixed/root.mjs`);
	assert.ok(g instanceof DepGraph);
	assert.deepStrictEqual(g.directDependenciesOf(`${STUBS}/mixed/entry.cjs`), [`${STUBS}/mixed/esm-a.mjs`]);
	assert.deepStrictEqual(g.overallOrder(), [
		`${STUBS}/mixed/leaf2.cjs`,
		`${STUBS}/mixed/leaf.cjs`,
		`${STUBS}/mixed/esm-b.mjs`,
		`${STUBS}/mixed/esm-a.mjs`,
		`${STUBS}/mixed/entry.cjs`,
		`${STUBS}/mixed/root.mjs`,
	]);
});

test("clearCache", async t => {
	let dir = mkdtempSync(path.join("parse-deps", "stubs", "tmp-"));
	t.after(() => rmSync(dir, { recursive: true, force: true }));

	let file = path.join(dir, "file.js");
	let normalizedDir = `./${dir.split(path.sep).join("/")}`;
	let mtime = new Date("2020-01-01T00:00:00Z");
	writeFileSync(file, `require("./a.js");`);
	utimesSync(file, mtime, mtime);
	assert.deepStrictEqual(await find(file), [`${normalizedDir}/a.js`]);

	// Same size and modification time, so only clearing the cache picks up the change
	writeFileSync(file, `require("./b.js");`);
	utimesSync(file, mtime, mtime);
	assert.deepStrictEqual(await find(file), [`${normalizedDir}/a.js`]);

	clearCache(file);
	assert.deepStrictEqual(await find(file), [`${normalizedDir}/b.js`]);

	writeFileSync(file, `require("./c.js");`);
	utimesSync(file, mtime, mtime);
	clearCache();
	assert.deepStrictEqual(await find(file), [`${normalizedDir}/c.js`]);
});
