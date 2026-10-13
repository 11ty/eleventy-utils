import path from "node:path";
import { readFileSync, statSync, realpathSync } from "node:fs";
import { createRequire, isBuiltin } from "node:module";
import { fileURLToPath } from "node:url";

import * as acorn from "acorn";
import normalizePath from "normalize-path";
import { TemplatePath } from "@11ty/eleventy-utils";
import { DepGraph } from "dependency-graph";

const TYPESCRIPT_EXTENSIONS = [".ts", ".mts", ".cts"];

const FUNCTION_TYPES = ["FunctionDeclaration", "FunctionExpression", "ArrowFunctionExpression"];

// Dependencies are only read and followed when they have one of these extensions
const JAVASCRIPT_EXTENSIONS = [".js", ".cjs", ".mjs", ...TYPESCRIPT_EXTENSIONS];

// Relative, absolute, or file: URL specifier (not a package name)
// https://nodejs.org/docs/latest/api/esm.html#terminology
function isPathSpecifier(specifier) {
	// Change \\ to / on Windows
	let normalized = normalizePath(specifier);
	return normalized === "." || normalized === ".." || normalized.startsWith("./") || normalized.startsWith("../") || normalized.startsWith("file:") || path.isAbsolute(specifier);
}

function getPackageName(specifier) {
	let [first, second] = specifier.split("/");
	return first.startsWith("@") ? `${first}/${second}` : first;
}

function normalizeOptions(options) {
	if(options instanceof Set) {
		options = {
			alreadyParsedSet: options,
		};
	}

	if(!options.alreadyParsedSet) {
		options.alreadyParsedSet = new Set();
	}

	if(!options.nodeModuleNames) {
		options.nodeModuleNames = "exclude"; // also "include" or "only"
	}

	// Find require() and import() inside function bodies
	if(options.nested === undefined) {
		options.nested = true;
	}

	return options;
}

// Direct dependencies of each file, reused until the file or the parsing options change
const cache = new Map();

// Clears one file (e.g. after a deletion) or everything
function clearCache(filePath) {
	if(filePath) {
		cache.delete(path.resolve(filePath));
	} else {
		cache.clear();
	}
}

function getFileStats(filePath) {
	let stats = statSync(filePath, { throwIfNoEntry: false });
	return stats?.isFile() ? stats : undefined;
}

function normalizeFilePath(filePath) {
	return TemplatePath.standardizeFilePath(path.relative(".", filePath));
}

// ESM specifiers are exact paths
function resolveImport(filePath, specifier) {
	if(specifier.startsWith("file:")) {
		return normalizeFilePath(fileURLToPath(specifier));
	}

	let { dir } = path.parse(filePath);
	return normalizeFilePath(path.resolve(dir, specifier));
}

// CommonJS specifiers can omit extensions or point to a directory
function resolveRequire(filePath, specifier) {
	try {
		return normalizeFilePath(createRequire(path.resolve(filePath)).resolve(specifier));
	} catch(e) {
		return resolveImport(filePath, specifier);
	}
}

function getImportAttributeType(attributes = []) {
	for(let node of attributes) {
		if(node.type === "ImportAttribute" && node.key.type === "Identifier" && node.key.name === "type") {
			return node.value.value;
		}
	}
}

function getStaticString(node) {
	if(node?.type === "Literal" && typeof node.value === "string") {
		return node.value;
	}
	if(node?.type === "TemplateLiteral" && node.expressions.length === 0) {
		return node.quasis[0].value.cooked;
	}
}

function walk(node, callback, skipFunctions) {
	if(Array.isArray(node)) {
		for(let child of node) {
			walk(child, callback, skipFunctions);
		}
		return;
	}
	if(!node || typeof node.type !== "string" || skipFunctions && FUNCTION_TYPES.includes(node.type)) {
		return;
	}

	callback(node);

	for(let key in node) {
		if(node[key] && typeof node[key] === "object") {
			walk(node[key], callback, skipFunctions);
		}
	}
}

let typeScriptParser;
function getTypeScriptParser() {
	// Only loaded when a TypeScript file is found
	typeScriptParser ??= import("@sveltejs/acorn-typescript").then(({ tsPlugin }) => acorn.Parser.extend(tsPlugin()));
	return typeScriptParser;
}

async function getParser(filePath, options) {
	if(options.parserOverride) {
		return options.parserOverride;
	}
	if(TYPESCRIPT_EXTENSIONS.includes(path.extname(filePath))) {
		return getTypeScriptParser();
	}
	return acorn;
}

function parse(contents, parser, options) {
	let parseOptions = Object.assign({
		sourceType: "module",
		ecmaVersion: "latest",
	}, options.parseOptions);

	try {
		return parser.parse(contents, parseOptions);
	} catch(e) {
		if(options.parseOptions?.sourceType) {
			throw e;
		}

		// CommonJS allows syntax that is invalid in ES modules (e.g. top-level `return`)
		try {
			return parser.parse(contents, Object.assign({}, parseOptions, {
				sourceType: "script",
				allowReturnOutsideFunction: true,
			}));
		} catch {
			throw e;
		}
	}
}

async function getSources(filePath, contents, options = {}) {
	let sources = new Set();
	let sourcesToRecurse = new Set();
	let packages = new Set();
	let normalizedFilePath = normalizeFilePath(filePath);

	if(typeof options.preprocess === "function") {
		contents = options.preprocess(contents, { filePath });
		if(!contents && contents !== "") {
			throw new Error("Missing return value from the `preprocess` function option (empty string is supported).");
		}
	}

	function add(specifier, resolver, recurse) {
		if(isPathSpecifier(specifier)) {
			let resolved = resolver(filePath, specifier);
			if(resolved === normalizedFilePath) {
				return;
			}

			sources.add(resolved);
			if(recurse) {
				sourcesToRecurse.add(resolved);
			}
		} else if(!specifier.startsWith("#") && !isBuiltin(specifier)) {
			packages.add(getPackageName(specifier));
		}
	}

	let { body } = parse(contents, await getParser(filePath, options), options);
	let visit = node => {
		if(["ImportDeclaration", "ExportAllDeclaration", "ExportNamedDeclaration"].includes(node.type) && node.source) {
			// Recurse typeless (JavaScript) import types only, right now only `css` and `json` are valid but others might come later
			add(node.source.value, resolveImport, !getImportAttributeType(node.attributes));
		} else if(node.type === "ImportExpression") {
			let specifier = getStaticString(node.source);
			if(specifier !== undefined) {
				add(specifier, resolveImport, !node.options);
			}
		} else if(node.type === "CallExpression" && node.callee.type === "Identifier" && node.callee.name === "require") {
			let specifier = getStaticString(node.arguments[0]);
			if(specifier !== undefined) {
				add(specifier, resolveRequire, true);
			}
		} else if(node.type === "TSExternalModuleReference") {
			// TypeScript `import x = require("…")`
			let specifier = getStaticString(node.expression);
			if(specifier !== undefined) {
				add(specifier, resolveRequire, true);
			}
		}
	};

	// Static imports and exports are top-level only, skip the full walk unless require() or import() may be nested (comments count too)
	if(contents.includes("require") || /\bimport\s*(\(|\/[*/])/.test(contents)) {
		walk(body, visit, !options.nested);
	} else {
		body.forEach(visit);
	}

	return {
		sources,
		sourcesToRecurse,
		packages,
	};
}

async function getSourcesCached(filePath, stats, options) {
	let key = path.resolve(filePath);
	let parseOptionsKey = JSON.stringify(options.parseOptions || {});
	let entry = cache.get(key);
	if(entry && entry.cwd === process.cwd() && entry.mtimeMs === stats.mtimeMs && entry.size === stats.size && entry.parserOverride === options.parserOverride && entry.preprocess === options.preprocess && entry.nested === options.nested && entry.parseOptionsKey === parseOptionsKey) {
		return entry.result;
	}

	let result = await getSources(filePath, readFileSync(filePath, "utf8"), options);
	cache.set(key, {
		cwd: process.cwd(),
		mtimeMs: stats.mtimeMs,
		size: stats.size,
		parserOverride: options.parserOverride,
		preprocess: options.preprocess,
		nested: options.nested,
		parseOptionsKey,
		result,
	});
	return result;
}

// Optionally limited to the `root` directory (symlinks resolved)
function shouldRecurse(source, options) {
	if(!JAVASCRIPT_EXTENSIONS.includes(path.extname(source))) {
		return false;
	}
	if(!options.root) {
		return true;
	}

	try {
		let relative = path.relative(realpathSync(options.root), realpathSync(source));
		return relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
	} catch {
		return false;
	}
}

// Only the entry file throws, a dependency that can’t be read or parsed is still listed but not followed
async function getSourcesForDependency(filePath, stats, options, isEntry) {
	try {
		return await getSourcesCached(filePath, stats, options);
	} catch(e) {
		if(isEntry) {
			throw e;
		}
	}
}

async function collect(filePath, options, results, isEntry = false) {
	// Unfortunately we need to read the entire file, require() can be anywhere 🫠
	let normalized = normalizeFilePath(filePath);
	let stats = getFileStats(filePath);
	if(options.alreadyParsedSet.has(normalized) || !stats) {
		return;
	}
	options.alreadyParsedSet.add(normalized);

	let parsed = await getSourcesForDependency(filePath, stats, options, isEntry);
	if(!parsed) {
		return;
	}

	let { sources, sourcesToRecurse, packages } = parsed;
	for(let source of sources) {
		results.sources.add(source);
	}
	for(let name of packages) {
		results.packages.add(name);
	}

	// Recurse for nested deps
	for(let source of sourcesToRecurse) {
		if(shouldRecurse(source, options)) {
			await collect(source, options, results);
		}
	}
}

// second argument used to be `alreadyParsedSet = new Set()`, keep that backwards compat
async function find(filePath, options = {}) {
	options = normalizeOptions(options);

	let results = {
		sources: new Set(),
		packages: new Set(),
	};
	await collect(filePath, options, results, true);
	results.sources.delete(normalizeFilePath(filePath));

	if(options.nodeModuleNames === "only") {
		return Array.from(results.packages);
	}
	if(options.nodeModuleNames === "include") {
		return [...results.sources, ...results.packages];
	}
	return Array.from(results.sources);
}

function mergeGraphs(rootGraph, ...graphs) {
	if(!(rootGraph instanceof DepGraph)) {
		throw new Error("Incorrect type passed to mergeGraphs, expected DepGraph");
	}
	for(let g of graphs) {
		for(let node of g.overallOrder()) {
			if(!rootGraph.hasNode(node)) {
				rootGraph.addNode(node);
			}
			for(let dep of g.directDependenciesOf(node)) {
				rootGraph.addDependency(node, dep);
			}
		}
	}
}

async function collectGraph(filePath, options, isEntry = false) {
	let graph = new DepGraph();
	let normalized = normalizeFilePath(filePath);
	graph.addNode(filePath);

	let stats = getFileStats(filePath);
	if(options.alreadyParsedSet.has(normalized) || !stats) {
		return graph;
	}
	options.alreadyParsedSet.add(normalized);

	let parsed = await getSourcesForDependency(filePath, stats, options, isEntry);
	if(!parsed) {
		return graph;
	}

	let { sources, sourcesToRecurse, packages } = parsed;
	let dependencies = options.nodeModuleNames === "exclude" ? sources : [...sources, ...packages];
	for(let source of dependencies) {
		if(!graph.hasNode(source)) {
			graph.addNode(source);
		}
		graph.addDependency(normalized, source);
	}

	// Recurse for nested deps
	for(let source of sourcesToRecurse) {
		if(shouldRecurse(source, options)) {
			mergeGraphs(graph, await collectGraph(source, options));
		}
	}

	return graph;
}

// second argument used to be `alreadyParsedSet = new Set()`, keep that backwards compat
async function findGraph(filePath, options = {}) {
	return collectGraph(filePath, normalizeOptions(options), true);
}

export {
	find,
	findGraph,
	mergeGraphs,
	clearCache,
};
