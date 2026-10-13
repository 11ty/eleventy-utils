const assert = require("node:assert/strict")
const test = require("node:test");

const { Buffer: { isBuffer } } = require("../");

test("isBuffer", (t) => {
	assert.equal(isBuffer(Buffer.from("abc")), true);
	assert.equal(isBuffer(Buffer.alloc(0)), true);

	assert.equal(isBuffer(new Uint8Array([1, 2, 3])), false);
	assert.equal(isBuffer("abc"), false);
	assert.equal(isBuffer([1, 2, 3]), false);
	assert.equal(isBuffer({}), false);
	assert.equal(isBuffer(null), false);
	assert.equal(isBuffer(undefined), false);
});

test("isBuffer without a Buffer global (non-Node)", (t) => {
	let NodeBuffer = globalThis.Buffer;
	let buffer = NodeBuffer.from("abc");
	globalThis.Buffer = undefined;

	try {
		assert.equal(isBuffer(new Uint8Array([1, 2, 3])), true);
		assert.equal(isBuffer(buffer), true);
		assert.equal(isBuffer("abc"), false);
		assert.equal(isBuffer([1, 2, 3]), false);
		assert.equal(isBuffer(null), false);
	} finally {
		globalThis.Buffer = NodeBuffer;
	}
});
