
const { base64UrlSafe } = require("./Url.js");
const { isBuffer } = require("./Buffer.js");

function toBase64(bytes) {
	let str = Array.from(bytes, (b) => String.fromCodePoint(b)).join("");

	// `btoa` Node 16+
	return btoa(str);
}

// Thanks https://evanhahn.com/the-best-way-to-concatenate-uint8arrays/ (Public domain)
function mergeUint8Array(...arrays) {
  let totalLength = arrays.reduce(
    (total, uint8array) => total + uint8array.byteLength,
    0
  );

  let result = new Uint8Array(totalLength);
  let offset = 0;
  arrays.forEach((uint8array) => {
    result.set(uint8array, offset);
    offset += uint8array.byteLength;
  });

  return result;
}

async function digestHash(...content) {
	let encoder = new TextEncoder();
	let input = mergeUint8Array(...content.map(c => {
		if(isBuffer(c)) {
			return c;
		}
		return encoder.encode(c);
	}));

	// `crypto` is Node 20+
	return crypto.subtle.digest("SHA-256", input);
}

// same output as node:crypto above (though now async).
async function createHash(...content) {
	if(typeof globalThis.crypto === "undefined") {
		// Backwards compat with Node Crypto, since WebCrypto (crypto global) is Node 20+
		const { createHash } = require("./CreateHash-Node.js");
		return createHash(...content);
	}

	return digestHash(...content).then(hashBuffer => {
		return base64UrlSafe(toBase64(new Uint8Array(hashBuffer)));
	});
}

async function createHashHex(...content) {
	if(typeof globalThis.crypto === "undefined") {
		// Backwards compat with Node Crypto, since WebCrypto (crypto global) is Node 20+
		const { createHashHex } = require("./CreateHash-Node.js");
		return createHashHex(...content);
	}

	return digestHash(...content).then(hashBuffer => {
  	return Array.from(new Uint8Array(hashBuffer))
	    .map((b) => b.toString(16).padStart(2, "0"))
	    .join("");
	});
}

module.exports = { createHash, createHashHex };