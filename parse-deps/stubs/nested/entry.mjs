await import("./a.cjs");
export async function later() {
	await import("./lazy-function.cjs");
}
export class Thing {
	async load() {
		await import("./lazy-method.cjs");
	}
}
