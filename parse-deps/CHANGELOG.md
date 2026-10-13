# Changelog

## v5.0.0

- Merged with `@11ty/dependency-tree-esm` and `@11ty/dependency-tree-typescript`: one package for ES modules, CommonJS, `require(esm)` and TypeScript.
- Files are read and parsed, not executed.
- Breaking: published as an ES module. `require()` needs Node 20.19+ or 22.12+, use `import()` on older versions.
- Results are cached per file until it changes, use `clearCache()` to clear one file or everything.
- Breaking: the default export is replaced by async `find`, `findGraph` and `mergeGraphs` exports.
- Breaking: nonexistent files return an empty array (`allowNotFound` removed).
- Breaking: removed `getPackagesByType`, `getNodeModuleName` and the `nodeModuleNamesOnly` option.
- `require()` calls built from variables are no longer found.

## v4.0.0

- Upgrade major dep `@11ty/eleventy-utils@2` with **Node 18+** minimum bump
- Adds npm provenance

## v3.0.1

- Milestone: https://github.com/11ty/eleventy-dependency-tree/milestone/1?closed=1
- Add support for `pnpm` #3
- Ignore tests for npm publish #4

## v3.0.0

- All paths returned from this utility are normalized to POSIX-format by default.