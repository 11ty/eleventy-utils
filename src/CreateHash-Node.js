const { createHash } = require("node:crypto");
const { base64UrlSafe } = require("./Url.js");

// This can be removed when Node 20+ is the baseline (see CreateHash.js)
module.exports = function createHashNodeCrypto(...content) {
	let hash = createHash("sha256");

	for(let c of content) {
		hash.update(c);
	}

	// Note that Node does include a `digest("base64url")` that is supposedly Node 14+ but curiously failed on Stackblitz’s Node 16.
	let base64 = hash.digest("base64");
	return base64UrlSafe(base64);
}