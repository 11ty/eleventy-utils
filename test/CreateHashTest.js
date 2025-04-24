const assert = require("node:assert/strict")
const test = require("node:test");

const createHash = require("../src/CreateHash.js");

test("Basic usage", async (t) => {
	const emptyHash = await createHash("");
	assert.equal(emptyHash, "47DEQpj8HBSa-_TImW-5JCeuQeRkm5NMpJWZG3hSuFU");
	assert.equal(emptyHash.includes("/"), false);
	assert.equal(emptyHash.includes("+"), false);
	assert.equal(emptyHash.includes("="), false);

	assert.equal(await createHash("This is a test"), "x74e2QL7jdTUiZfGRS9dflCfvNvigIsWvPTtzkwH0U4");
});