async function load() {
	await import("./leaf2.cjs");
	await import(`./leaf.cjs`);
}
let name = "./esm-a.mjs";
import(name);
require(name);
