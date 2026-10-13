# `@11ty/dependency-tree`

Returns an unordered array of local paths to dependencies of a JavaScript or TypeScript file, following ES module `import` and CommonJS `require()` in any combination (including `require(esm)`).

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
* Parses `.ts`, `.mts` and `.cts` files with [`@sveltejs/acorn-typescript`](https://www.npmjs.com/package/@sveltejs/acorn-typescript).
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
import { find } from "@11ty/dependency-tree";

await find("./my-file.js");
// returns ["./my-local-dependency.js", "./my-other-dependency.cjs"]
```

Return a [dependency-graph](https://github.com/jriecken/dependency-graph) instance:

```js
import { findGraph } from "@11ty/dependency-tree";

(await findGraph("./my-file.js")).overallOrder();
// returns ["./my-local-dependency.js", "./my-other-dependency.cjs", "./my-file.js"]
```

### `clearCache`

Results for each file are cached until the file changes.

```js
import { clearCache } from "@11ty/dependency-tree";

// Remove one file (e.g. after it was deleted)
clearCache("./my-file.js");

// Remove everything
clearCache();
```

### `nested`

`require()` and `import()` inside function bodies are included by default, use `nested: false` to only find dependencies loaded when the module runs.

```js
// my-file.js
require("./my-local-dependency.js");

function later() {
  return import("./my-lazy-dependency.js");
}
```

```js
await find("./my-file.js");
// returns ["./my-local-dependency.js", "./my-lazy-dependency.js"]

await find("./my-file.js", { nested: false });
// returns ["./my-local-dependency.js"]
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
import { find } from "@11ty/dependency-tree";

await find("./my-file.js", {
  // Transform file contents before parsing
  preprocess: (content, { filePath }) => content,
  // Use an acorn-compatible parser
  parserOverride: Parser.extend(somePlugin()),
  // Options passed to the parser
  parseOptions: {},
});
```
