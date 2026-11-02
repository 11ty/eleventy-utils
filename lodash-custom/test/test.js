const test = require("node:test");
const assert = require("node:assert");
const { get, set, chunk } = require("../");

test("get", () => {
	assert.equal(get({ mine: 1 }, "mine"), 1);
});

test("get deep paths", () => {
	let obj = { a: { b: [{ c: 3 }] }, "x.y": 1, q: { "it's": 2 } };
	assert.equal(get(obj, "a.b[0].c"), 3);
	assert.equal(get(obj, "a.b.0.c"), 3);
	assert.equal(get(obj, "a['b'][0][\"c\"]"), 3);
	assert.equal(get(obj, ["a", "b", 0, "c"]), 3);
	assert.equal(get(obj, "x.y"), 1);
	assert.equal(get(obj, "q['it\\'s']"), 2);
});

test("get default value", () => {
	assert.equal(get({ a: null }, "a.b", "def"), "def");
	assert.equal(get(null, "a", "def"), "def");
	assert.equal(get({ a: 1 }, [], "def"), "def");
	assert.equal(get({ a: null }, "a", "def"), null);
});

test("set", () => {
	let obj = { mine: 1 };
	set(obj, "mine", 2);
	assert.equal(obj.mine, 2);
});

test("set creates arrays for index keys", () => {
	assert.deepEqual(set({}, "a[0].b", 1), { a: [{ b: 1 }] });
	assert.deepEqual(set({}, "a.1", 1), { a: [, 1] });
	assert.deepEqual(set({}, "a.01", 1), { a: { "01": 1 } });
});

test("set returns non-objects untouched", () => {
	assert.equal(set(null, "a", 1), null);
	assert.equal(set(5, "a", 1), 5);
});

test("set prototype pollution", () => {
	set({}, "__proto__.polluted", true);
	set({}, "constructor.prototype.polluted", true);
	assert.equal({}.polluted, undefined);
});

test("chunk", () => {
	// taken from the docs https://lodash.com/docs/4.17.15#chunk
	assert.deepEqual(chunk(["a", "b", "c", "d"], 2), [["a", "b"], ["c", "d"]]);
	assert.deepEqual(chunk(["a", "b", "c", "d"], 3), [["a", "b", "c"], ["d"]]);
});

test("chunk sizes", () => {
	assert.deepEqual(chunk([1, 2]), [[1], [2]]);
	assert.deepEqual(chunk([1, 2, 3], 2.9), [[1, 2], [3]]);
	assert.deepEqual(chunk([1, 2], 0), []);
	assert.deepEqual(chunk([1, 2], Infinity), [[1, 2]]);
	assert.deepEqual(chunk(null, 2), []);
});
