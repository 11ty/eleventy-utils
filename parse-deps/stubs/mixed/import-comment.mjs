export async function load() {
	await import /* lazy */ ("./leaf.cjs");
}
