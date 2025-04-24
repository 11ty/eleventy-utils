// WebCrypto (crypto global) not available in Node 18.
function createHashNodeCrypto(content) {
	// require only when necessary
	const { createHash } = require("node:crypto");

	let hash = createHash("sha256");
	hash.update(content);

	// Note that Node does include a `digest("base64url")` that is supposedly Node 14+ but curiously failed on Stackblitz’s Node 16.
	let base64 = hash.digest("base64");
	return urlSafe(base64);
}

function urlSafe(hashString = "") {
	return hashString.replace(/[=\+\/]/g, function(match) {
		if(match === "=") {
			return "";
		}
		if(match === "+") {
			return "-";
		}
		return "_";
	});
}

function toBase64(bytes) {
	let str = Array.from(bytes, (b) => String.fromCodePoint(b)).join("");
	// `btoa` is Node 16+
	return btoa(str);
}

// same output as node:crypto above (though now async).
module.exports = async function createHash(content) {
	if(typeof globalThis.crypto === "undefined") {
		// Backwards compat with Node Crypto, since WebCrypto (crypto global) is Node 20+
		return createHashNodeCrypto(content);
	}

	let encoder = new TextEncoder();
	let data = encoder.encode(content);

	// `crypto` is Node 20+
	return crypto.subtle.digest("SHA-256", data).then(hashBuffer => {
		return urlSafe(toBase64(new Uint8Array(hashBuffer)));
	});
}