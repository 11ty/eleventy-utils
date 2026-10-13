import { find as findEsm, findGraph as findGraphEsm } from "@11ty/dependency-tree";
import { Parser } from "acorn";
import { tsPlugin } from "@sveltejs/acorn-typescript";

export { mergeGraphs, clearCache } from "@11ty/dependency-tree";

// Reused across calls so @11ty/dependency-tree can cache results
const parserOverride = Parser.extend(tsPlugin());

export async function find(filePath) {
	return findEsm(filePath, {
		parserOverride,
	})
}

export async function findGraph(filePath) {
	return findGraphEsm(filePath, {
		parserOverride,
	});
}
