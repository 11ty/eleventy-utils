# @11ty/posthtml

A modern, ESM-only HTML processor compatible with [posthtml](https://github.com/posthtml/posthtml) plugins. It bundles its own [htmlparser2](https://github.com/fb55/htmlparser2) parser and renderer, so it has one dependency and a single copy of `entities`.

Derived from `posthtml@0.16.7`, `posthtml-parser@0.13.0` and `posthtml-render@3.0.0` (all MIT, see [LICENSE](./LICENSE)).

```js
import posthtml, { parse, render, walk, match } from "@11ty/posthtml";

let { html, tree, messages } = await posthtml()
	.use((tree) => tree.match({ tag: "img" }, (node) => node))
	.process(input, { recognizeNoValueAttribute: true, closingSingleTag: "closeAs" });
```

- Plugins receive a tree with `walk`, `match`, `parser`, `render`, `options`, `messages` and `source`, and may return a new tree, nothing, or a Promise of either.
- `process()` always returns a Promise. Pass `skipParse: true` to process an existing tree.
- Options go to the parser, plugins (`tree.options`) and renderer, as in posthtml.
- `parse(html, options)` and `render(tree, options)` are exported for use without a processor.

See [CHANGELOG.md](./CHANGELOG.md) for differences from posthtml.

Requires Node 22.15 or newer.
