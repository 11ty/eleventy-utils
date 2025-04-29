// This file can be removed when Node 20+ is the baseline (see CreateHash.js)
const { base64UrlSafe } = require("./Url.js");

function digestHash(...content) {
	const { createHash } = require("node:crypto");

	let hash = createHash("sha256");

	for(let c of content) {
		hash.update(c);
	}

	return hash;
}

function createHash(...content) {
	// Note that Node does include a `digest("base64url")` that is supposedly Node 14+ but curiously failed on Stackblitz’s Node 16.
	let base64 = digestHash(...content).digest("base64");
	return base64UrlSafe(base64);
}

function createHashHex(...content) {
	return digestHash(...content).digest("hex");
}

module.exports = { createHash, createHashHex }