const assert = require("node:assert/strict")
const test = require("node:test");
const fs = require("node:fs");

const { createHash, createHashHex, createHashSync, createHashHexSync } = require("../src/CreateHash.js");

// To test individual types together
const { NodeCryptoHash, ScriptHash, WebCryptoHash } = require("../src/HashTypes.js");

test("Basic usage", async (t) => {
	const emptyHash = await createHash("");
	assert.equal(emptyHash, "47DEQpj8HBSa-_TImW-5JCeuQeRkm5NMpJWZG3hSuFU");
	assert.equal(emptyHash.includes("/"), false);
	assert.equal(emptyHash.includes("+"), false);
	assert.equal(emptyHash.includes("="), false);

	assert.equal(await createHash("This is a test"), "x74e2QL7jdTUiZfGRS9dflCfvNvigIsWvPTtzkwH0U4");
});

test("Basic usage (sync)", async (t) => {
	const emptyHash = createHashSync("");
	assert.equal(emptyHash, "47DEQpj8HBSa-_TImW-5JCeuQeRkm5NMpJWZG3hSuFU");
	assert.equal(emptyHash.includes("/"), false);
	assert.equal(emptyHash.includes("+"), false);
	assert.equal(emptyHash.includes("="), false);

	assert.equal(createHashSync("This is a test"), "x74e2QL7jdTUiZfGRS9dflCfvNvigIsWvPTtzkwH0U4");
});

test("Basic usage (hex)", async (t) => {
	const emptyHash = await createHashHex("");
	assert.equal(emptyHash, "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
	assert.equal(emptyHash.includes("/"), false);
	assert.equal(emptyHash.includes("+"), false);
	assert.equal(emptyHash.includes("="), false);

	assert.equal(await createHashHex("This is a test"), "c7be1ed902fb8dd4d48997c6452f5d7e509fbcdbe2808b16bcf4edce4c07d14e");
});

test("Basic usage (sync, hex)", async (t) => {
	const emptyHash = createHashHexSync("");
	assert.equal(emptyHash, "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
	assert.equal(emptyHash.includes("/"), false);
	assert.equal(emptyHash.includes("+"), false);
	assert.equal(emptyHash.includes("="), false);

	assert.equal(createHashHexSync("This is a test"), "c7be1ed902fb8dd4d48997c6452f5d7e509fbcdbe2808b16bcf4edce4c07d14e");
});

// Skip these explicit tests since WebCrypto API is not available
if(typeof globalThis.crypto !== "undefined") {
	test("Multiple calls give the same output (WebCrypto <-> Node)", async (t) => {
		assert.equal(await WebCryptoHash.toBase64Url(), NodeCryptoHash.toBase64Url());
		assert.equal(await WebCryptoHash.toBase64Url(""), NodeCryptoHash.toBase64Url(""));
		assert.equal(await WebCryptoHash.toBase64Url("a", "b"), NodeCryptoHash.toBase64Url("a", "b"));
		assert.equal(await WebCryptoHash.toBase64Url("a", "b", "c"), NodeCryptoHash.toBase64Url("a", "b", "c"));
		assert.equal(await WebCryptoHash.toBase64Url("abcdef", "def"), NodeCryptoHash.toBase64Url("abcdef", "def"));
	});

	test("Multiple calls give the same output (WebCrypto <-> Node; hex)", async (t) => {
		assert.equal(await WebCryptoHash.toHex(), NodeCryptoHash.toHex());
		assert.equal(await WebCryptoHash.toHex(""), NodeCryptoHash.toHex(""));
		assert.equal(await WebCryptoHash.toHex("a", "b"), NodeCryptoHash.toHex("a", "b"));
		assert.equal(await WebCryptoHash.toHex("a", "b", "c"), NodeCryptoHash.toHex("a", "b", "c"));
		assert.equal(await WebCryptoHash.toHex("abcdef", "def"), NodeCryptoHash.toHex("abcdef", "def"));
	});

	test("Multiple calls give the same output, Buffer  (WebCrypto <-> Node)", async (t) => {
		let buffer = fs.readFileSync("./utils/test/stubs/sample.png");
		assert.equal(await WebCryptoHash.toBase64Url(buffer, "def"), NodeCryptoHash.toBase64Url(buffer, "def"));
	});

	test("Multiple calls give the same output, Buffer  (WebCrypto <-> Node; hex)", async (t) => {
		let buffer = fs.readFileSync("./utils/test/stubs/sample.png");
		assert.equal(await WebCryptoHash.toHex(buffer, "def"), NodeCryptoHash.toHex(buffer, "def"));
	});

	test("Multiple calls give the same output (WebCrypto <-> Script)", async (t) => {
		assert.equal(await WebCryptoHash.toBase64Url(), ScriptHash.toBase64Url());
		assert.equal(await WebCryptoHash.toBase64Url(""), ScriptHash.toBase64Url(""));
		assert.equal(await WebCryptoHash.toBase64Url("a", "b"), ScriptHash.toBase64Url("a", "b"));
		assert.equal(await WebCryptoHash.toBase64Url("a", "b", "c"), ScriptHash.toBase64Url("a", "b", "c"));
		assert.equal(await WebCryptoHash.toBase64Url("abcdef", "def"), ScriptHash.toBase64Url("abcdef", "def"));
	});

	test("Multiple calls give the same output (WebCrypto <-> Script; hex)", async (t) => {
		assert.equal(await WebCryptoHash.toHex(), ScriptHash.toHex());
		assert.equal(await WebCryptoHash.toHex(""), ScriptHash.toHex(""));
		assert.equal(await WebCryptoHash.toHex("a", "b"), ScriptHash.toHex("a", "b"));
		assert.equal(await WebCryptoHash.toHex("a", "b", "c"), ScriptHash.toHex("a", "b", "c"));
		assert.equal(await WebCryptoHash.toHex("abcdef", "def"), ScriptHash.toHex("abcdef", "def"));
	});

	test("Multiple calls give the same output, Buffer  (WebCrypto <-> Script)", async (t) => {
		let buffer = fs.readFileSync("./utils/test/stubs/sample.png");
		assert.equal(await WebCryptoHash.toBase64Url(buffer, "def"), ScriptHash.toBase64Url(buffer, "def"));
	});

	test("Multiple calls give the same output, Buffer  (WebCrypto <-> Script; hex)", async (t) => {
		let buffer = fs.readFileSync("./utils/test/stubs/sample.png");
		assert.equal(await WebCryptoHash.toHex(buffer, "def"), ScriptHash.toHex(buffer, "def"));
	});
}

test("Multiple calls give the same output (Node <-> Script)", async (t) => {
	assert.equal(NodeCryptoHash.toBase64Url(), ScriptHash.toBase64Url());
	assert.equal(NodeCryptoHash.toBase64Url(""), ScriptHash.toBase64Url(""));
	assert.equal(NodeCryptoHash.toBase64Url("a", "b"), ScriptHash.toBase64Url("a", "b"));
	assert.equal(NodeCryptoHash.toBase64Url("a", "b", "c"), ScriptHash.toBase64Url("a", "b", "c"));
	assert.equal(NodeCryptoHash.toBase64Url("abcdef", "def"), ScriptHash.toBase64Url("abcdef", "def"));
});

test("Multiple calls give the same output (Node <-> Script; hex)", async (t) => {
	assert.equal(NodeCryptoHash.toHex(), ScriptHash.toHex());
	assert.equal(NodeCryptoHash.toHex(""), ScriptHash.toHex(""));
	assert.equal(NodeCryptoHash.toHex("a", "b"), ScriptHash.toHex("a", "b"));
	assert.equal(NodeCryptoHash.toHex("a", "b", "c"), ScriptHash.toHex("a", "b", "c"));
	assert.equal(NodeCryptoHash.toHex("abcdef", "def"), ScriptHash.toHex("abcdef", "def"));
});

test("Multiple calls give the same output, Buffer  (Node <-> Script)", async (t) => {
	let buffer = fs.readFileSync("./utils/test/stubs/sample.png");
	assert.equal(NodeCryptoHash.toBase64Url(buffer, "def"), ScriptHash.toBase64Url(buffer, "def"));
});

test("Multiple calls give the same output, Buffer  (Node <-> Script; hex)", async (t) => {
	let buffer = fs.readFileSync("./utils/test/stubs/sample.png");
	assert.equal(NodeCryptoHash.toHex(buffer, "def"), ScriptHash.toHex(buffer, "def"));
});