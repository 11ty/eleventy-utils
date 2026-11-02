const test = require("node:test");
const assert = require("node:assert");
const lodash = require("../");

test("get", () => {
	assert.equal(lodash.get({ mine: 1 }, "mine"), 1);
});

test("set", () => {
	let obj = { mine: 1 };
	lodash.set(obj, "mine", 2);
	assert.equal(obj.mine, 2);
});

test("chunk", () => {
	// taken from the docs https://lodash.com/docs/4.17.15#chunk
	assert.deepEqual(lodash.chunk(["a", "b", "c", "d"], 2), [["a", "b"], ["c", "d"]]);
});
