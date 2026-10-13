const assert = require("node:assert/strict")
const test = require("node:test");

const { base64UrlSafe } = require("../src/Url.js");

test("base64UrlSafe", (t) => {
	assert.equal(base64UrlSafe(), "");
	assert.equal(base64UrlSafe(""), "");
	assert.equal(base64UrlSafe("abc123"), "abc123");
	assert.equal(base64UrlSafe("a+b/c=="), "a-b_c");
	assert.equal(base64UrlSafe("++//=="), "--__");
	assert.equal(base64UrlSafe("47DEQpj8HBSa+/TImW+5JCeuQeRkm5NMpJWZG3hSuFU="), "47DEQpj8HBSa-_TImW-5JCeuQeRkm5NMpJWZG3hSuFU");
});
