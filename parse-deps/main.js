const path = require("node:path");
const { readFileSync, statSync } = require("node:fs");
const { createRequire, isBuiltin } = require("node:module");
const { fileURLToPath } = require("node:url");

const acorn = require("acorn");
const normalizePath = require("normalize-path");
const { TemplatePath } = require("@11ty/eleventy-utils");
const { DepGraph } = require("dependency-graph");

const TYPESCRIPT_EXTENSIONS = [".ts", ".mts", ".cts"];

// require()’d files with these extensions have no dependencies
const NO_RECURSE_EXTENSIONS = [".json", ".node"];

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

function walk(node, callback) {
	if(Array.isArray(node)) {
		for(let child of node) {
			walk(child, callback);
		}
		return;
	}
	if(!node || typeof node.type !== "string") {
		return;
	}

	callback(node);

	for(let key in node) {
		if(node[key] && typeof node[key] === "object") {
			walk(node[key], callback);
		}
	}
}

let typeScriptParser;
function getTypeScriptParser() {
	// ESM-only package
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
			if(recurse && !NO_RECURSE_EXTENSIONS.includes(path.extname(resolved))) {
				sourcesToRecurse.add(resolved);
			}
		} else if(!specifier.startsWith("#") && !isBuiltin(specifier)) {
			packages.add(getPackageName(specifier));
		}
	}

	walk(parse(contents, await getParser(filePath, options), options).body, node => {
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
	});

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
	if(entry && entry.cwd === process.cwd() && entry.mtimeMs === stats.mtimeMs && entry.size === stats.size && entry.parserOverride === options.parserOverride && entry.preprocess === options.preprocess && entry.parseOptionsKey === parseOptionsKey) {
		return entry.result;
	}

	let result = await getSources(filePath, readFileSync(filePath, "utf8"), options);
	cache.set(key, {
		cwd: process.cwd(),
		mtimeMs: stats.mtimeMs,
		size: stats.size,
		parserOverride: options.parserOverride,
		preprocess: options.preprocess,
		parseOptionsKey,
		result,
	});
	return result;
}

async function collect(filePath, options, results) {
	// Unfortunately we need to read the entire file, require() can be anywhere 🫠
	let normalized = normalizeFilePath(filePath);
	let stats = getFileStats(filePath);
	if(options.alreadyParsedSet.has(normalized) || !stats) {
		return;
	}
	options.alreadyParsedSet.add(normalized);

	let { sources, sourcesToRecurse, packages } = await getSourcesCached(filePath, stats, options);
	for(let source of sources) {
		results.sources.add(source);
	}
	for(let name of packages) {
		results.packages.add(name);
	}

	// Recurse for nested deps
	for(let source of sourcesToRecurse) {
		await collect(source, options, results);
	}
}

// second argument used to be `alreadyParsedSet = new Set()`, keep that backwards compat
async function find(filePath, options = {}) {
	options = normalizeOptions(options);

	let results = {
		sources: new Set(),
		packages: new Set(),
	};
	await collect(filePath, options, results);
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

// second argument used to be `alreadyParsedSet = new Set()`, keep that backwards compat
async function findGraph(filePath, options = {}) {
	options = normalizeOptions(options);

	let graph = new DepGraph();
	let normalized = normalizeFilePath(filePath);
	graph.addNode(filePath);

	let stats = getFileStats(filePath);
	if(options.alreadyParsedSet.has(normalized) || !stats) {
		return graph;
	}
	options.alreadyParsedSet.add(normalized);

	let { sources, sourcesToRecurse, packages } = await getSourcesCached(filePath, stats, options);
	let dependencies = options.nodeModuleNames === "exclude" ? sources : [...sources, ...packages];
	for(let source of dependencies) {
		if(!graph.hasNode(source)) {
			graph.addNode(source);
		}
		graph.addDependency(normalized, source);
	}

	// Recurse for nested deps
	for(let source of sourcesToRecurse) {
		let recursedGraph = await findGraph(source, options);
		mergeGraphs(graph, recursedGraph);
	}

	return graph;
}

module.exports = {
	find,
	findGraph,
	mergeGraphs,
	clearCache,
};
