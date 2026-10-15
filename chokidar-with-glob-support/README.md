# @11ty/chokidar-with-glob-support

A drop-in for `chokidar@3` built on `chokidar@4`, restoring glob support for watch targets and `ignored`.

```js
const chokidar = require("@11ty/chokidar-with-glob-support");
// or: import chokidar from "@11ty/chokidar-with-glob-support";

chokidar.watch(["src/**/*.css", "!src/vendor/**"], {
  ignored: ["**/node_modules/**", ".git"],
}).on("change", path => console.log(path));
```

- Globs and `!negations` in `watch()`, `add()`, and `unwatch()` (matched with `picomatch`, `dot: true`).
- `ignored` accepts globs, paths (including their contents), RegExps, and functions.
- Relative globs resolve against `cwd`; `disableGlobbing: true` treats all entries as literal paths.
- Directories that cannot contain matches are not traversed.
- On macOS, `watch()` uses one recursive `fs.watch` (FSEvents) per folder instead of a file descriptor per file; opt out with `useFsEvents: false`, `usePolling`, or `depth`.

Requires Node 18 or newer.
