const assert = require("node:assert/strict")
const test = require("node:test");

const { Hash, NodeCryptoHash, ScriptHash, WebCryptoHash } = require("../src/HashTypes.js");

const HAS_WEBCRYPTO = typeof globalThis.crypto !== "undefined";

// SHA-256 of "abc"
const ABC_HEX = "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad";
const ABC_BASE64URL = "ungWv48Bz-pBQUDeXa4iI7ADYaOWF3qctBD_YfIAFa0";

test("Hash.create and Hash.createSync", (t) => {
	assert.equal(Hash.create(), HAS_WEBCRYPTO ? WebCryptoHash : NodeCryptoHash);
	assert.equal(Hash.createSync(), NodeCryptoHash);
});

test("Hash.toBase64", (t) => {
	assert.equal(Hash.toBase64(new Uint8Array([])), "");
	assert.equal(Hash.toBase64(new Uint8Array([104, 105])), "aGk=");
	assert.equal(Hash.toBase64(new Uint8Array([251, 255])), "+/8=");
});

test("Hash.mergeUint8Array", (t) => {
	assert.deepEqual(Hash.mergeUint8Array(), new Uint8Array([]));
	assert.deepEqual(Hash.mergeUint8Array(new Uint8Array([1, 2])), new Uint8Array([1, 2]));
	assert.deepEqual(
		Hash.mergeUint8Array(new Uint8Array([1, 2]), new Uint8Array([]), new Uint8Array([3])),
		new Uint8Array([1, 2, 3])
	);
});

test("Hash.bufferToHex and Hash.bufferToBase64Url", (t) => {
	let bytes = new Uint8Array([0, 15, 251, 255]);
	assert.equal(Hash.bufferToHex(bytes), "000ffbff");
	assert.equal(Hash.bufferToHex(bytes.buffer), "000ffbff");
	assert.equal(Hash.bufferToBase64Url(bytes), "AA_7_w");
	assert.equal(Hash.bufferToBase64Url(bytes.buffer), "AA_7_w");
});

test("NodeCryptoHash known values", (t) => {
	assert.equal(NodeCryptoHash.toHex("abc"), ABC_HEX);
	assert.equal(NodeCryptoHash.toHex("a", "bc"), ABC_HEX);
	assert.equal(NodeCryptoHash.toHexSync("abc"), ABC_HEX);
	assert.equal(NodeCryptoHash.toBase64Url("abc"), ABC_BASE64URL);
	assert.equal(NodeCryptoHash.toBase64UrlSync("abc"), ABC_BASE64URL);
});

test("ScriptHash known values", (t) => {
	assert.equal(ScriptHash.toHex("abc"), ABC_HEX);
	assert.equal(ScriptHash.toHex("a", "bc"), ABC_HEX);
	assert.equal(ScriptHash.toHexSync("abc"), ABC_HEX);
	assert.equal(ScriptHash.toBase64Url("abc"), ABC_BASE64URL);
	assert.equal(ScriptHash.toBase64UrlSync("abc"), ABC_BASE64URL);
});

test("WebCryptoHash known values", { skip: !HAS_WEBCRYPTO }, async (t) => {
	assert.equal(await WebCryptoHash.toHex("abc"), ABC_HEX);
	assert.equal(await WebCryptoHash.toHex("a", "bc"), ABC_HEX);
	assert.equal(await WebCryptoHash.toBase64Url("abc"), ABC_BASE64URL);
});

test("Uint8Array content is hashed as bytes", async (t) => {
	let bytes = new Uint8Array([97, 98, 99]); // "abc"
	assert.equal(NodeCryptoHash.toHex(bytes), ABC_HEX);
	assert.equal(ScriptHash.toHex(bytes), ABC_HEX);
	if(HAS_WEBCRYPTO) {
		assert.equal(await WebCryptoHash.toHex(bytes), ABC_HEX);
		assert.equal(await WebCryptoHash.toHex(bytes.subarray(0, 1), "bc"), ABC_HEX);
	}
});

test("WebCryptoHash has no synchronous methods", (t) => {
	assert.throws(() => WebCryptoHash.toHexSync("abc"), /Synchronous methods are not available/);
	assert.throws(() => WebCryptoHash.toBase64UrlSync("abc"), /Synchronous methods are not available/);
});
