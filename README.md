<p align="center"><img src="https://www.11ty.dev/img/logo-github.png" alt="eleventy Logo"></p>

# 11ty Ecosystem Utilities

- [`@11ty/eleventy-utils` in `utils/`](./utils/)
- [`@11ty/node-version-check` in `node-version-check/`](./node-version-check/)
- [`@11ty/dependency-tree` in `parse-deps/`](./parse-deps/)

## Consolidated Packages

- Both [`@11ty/dependency-tree-esm`](https://www.npmjs.com/package/@11ty/dependency-tree-esm) and [`@11ty/dependency-tree-typescript`](https://www.npmjs.com/package/@11ty/dependency-tree-typescript) are now merged into one package (`@11ty/dependency-tree@5`).

## Tests

```
npm run test
```

- We use the native NodeJS [test runner](https://nodejs.org/api/test.html#test-runner) and ([assertions](https://nodejs.org/api/assert.html#assert))
