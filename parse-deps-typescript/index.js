import { find as findEsm, findGraph as findGraphEsm } from "@11ty/dependency-tree";
import { Parser } from "acorn";
import { tsPlugin } from "@sveltejs/acorn-typescript";

export { mergeGraphs } from "@11ty/dependency-tree";

export async function find(filePath) {
	return findEsm(filePath, {
		parserOverride: Parser.extend(tsPlugin()),
	})
}

export async function findGraph(filePath) {
	return findGraphEsm(filePath, {
		parserOverride: Parser.extend(tsPlugin()),
	});
}
