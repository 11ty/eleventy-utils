# `@11ty/dependency-tree`

Returns an unordered array of local paths to dependencies of a JavaScript file, following ES module `import` and CommonJS `require()` in any combination (including `require(esm)`).

* See also: [`@11ty/dependency-tree-typescript`](https://github.com/11ty/eleventy-utils/tree/main/parse-deps-typescript) for the TypeScript version.

This is used by Eleventy to find dependencies of a JavaScript file to watch for changes to re-run Eleventy’s build.

## Installation

```
npm install --save-dev @11ty/dependency-tree
```

## Features

* Reads files without executing them.
* Finds `import`, `export … from`, `import()` and `require()` (including `createRequire`) with string specifiers.
* Ignores Node’s built-ins (e.g. `path`) and, by default, `node_modules` packages.
* Handles circular dependencies.
* Returns an empty array if the file does not exist.

## Usage

```js
// my-file.js

// if my-local-dependency.js has dependencies, it will include those too
import "./my-local-dependency.js";
require("./my-other-dependency.cjs");

// ignored, is a built-in
import path from "path";
```

```js
const { find } = require("@11ty/dependency-tree");

await find("./my-file.js");
// returns ["./my-local-dependency.js", "./my-other-dependency.cjs"]
```

Return a [dependency-graph](https://github.com/jriecken/dependency-graph) instance:

```js
const { findGraph } = require("@11ty/dependency-tree");

(await findGraph("./my-file.js")).overallOrder();
// returns ["./my-local-dependency.js", "./my-other-dependency.cjs", "./my-file.js"]
```

### `nodeModuleNames`

* `"exclude"` (default): `node_modules` package names are excluded.
* `"include"`: package names are included alongside local files.
* `"only"`: only package names are returned.

```js
await find("./my-file.js", { nodeModuleNames: "only" });
// returns ["@11ty/eleventy"]
```

### `preprocess` and `parserOverride`

```js
const { find } = require("@11ty/dependency-tree");

await find("./my-file.js", {
  // Transform file contents before parsing
  preprocess: (content, { filePath }) => content,
  // Use an acorn-compatible parser
  parserOverride: Parser.extend(somePlugin()),
  // Options passed to the parser
  parseOptions: {},
});
```
