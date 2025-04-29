const assert = require("node:assert/strict")
const test = require("node:test");
const fs = require("node:fs");

const { createHash, createHashHex } = require("../src/CreateHash.js");
const { createHash: createHashNodeCrypto, createHashHex: createHashNodeCryptoHex } = require("../src/CreateHash-Node.js");

test("Basic usage", async (t) => {
	const emptyHash = await createHash("");
	assert.equal(emptyHash, "47DEQpj8HBSa-_TImW-5JCeuQeRkm5NMpJWZG3hSuFU");
	assert.equal(emptyHash.includes("/"), false);
	assert.equal(emptyHash.includes("+"), false);
	assert.equal(emptyHash.includes("="), false);

	assert.equal(await createHash("This is a test"), "x74e2QL7jdTUiZfGRS9dflCfvNvigIsWvPTtzkwH0U4");
});

test("Basic usage (hex)", async (t) => {
	const emptyHash = await createHashHex("");
	assert.equal(emptyHash, "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
	assert.equal(emptyHash.includes("/"), false);
	assert.equal(emptyHash.includes("+"), false);
	assert.equal(emptyHash.includes("="), false);

	assert.equal(await createHashHex("This is a test"), "c7be1ed902fb8dd4d48997c6452f5d7e509fbcdbe2808b16bcf4edce4c07d14e");
});

test("Multiple calls", async (t) => {
	assert.equal(await createHash(), createHashNodeCrypto());
	assert.equal(await createHash(""), createHashNodeCrypto(""));
	assert.equal(await createHash("a", "b"), createHashNodeCrypto("a", "b"));
	assert.equal(await createHash("a", "b", "c"), createHashNodeCrypto("a", "b", "c"));
	assert.equal(await createHash("abcdef", "def"), createHashNodeCrypto("abcdef", "def"));
});

test("Multiple calls (hex)", async (t) => {
	assert.equal(await createHashHex(), createHashNodeCryptoHex());
	assert.equal(await createHashHex(""), createHashNodeCryptoHex(""));
	assert.equal(await createHashHex("a", "b"), createHashNodeCryptoHex("a", "b"));
	assert.equal(await createHashHex("a", "b", "c"), createHashNodeCryptoHex("a", "b", "c"));
	assert.equal(await createHashHex("abcdef", "def"), createHashNodeCryptoHex("abcdef", "def"));
});

test("Multiple calls, Buffer", async (t) => {
	let buffer = fs.readFileSync("./test/stubs/sample.png");
	assert.equal(await createHash(buffer, "def"), createHashNodeCrypto(buffer, "def"));
});

test("Multiple calls, Buffer (hex)", async (t) => {
	let buffer = fs.readFileSync("./test/stubs/sample.png");
	assert.equal(await createHashHex(buffer, "def"), createHashNodeCryptoHex(buffer, "def"));
});