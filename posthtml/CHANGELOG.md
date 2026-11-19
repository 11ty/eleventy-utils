# Changelog

## v1.0.0

First release, a posthtml-compatible rewrite of `posthtml@0.16.7` with a built-in parser (htmlparser2 12, replacing `posthtml-parser@0.11` and htmlparser2 7) and renderer (replacing `posthtml-render@3`). Installs a single `entities@8` (11ty/buildawesome#4154).

Parser changes from htmlparser2 12, all matching the HTML spec:

- `<textarea>`, `<iframe>`, `<xmp>`, `<noembed>` and `<plaintext>` content is raw text: `<textarea><b></textarea>` no longer gains a `</b>`.
- `<h1><h2>x</h2></h1>` parses as sibling headings and renders as `<h1></h1><h2>x</h2>`.
- A nested `<form>` start tag is ignored: `<form><form></form>` renders as `<form></form>`.

Breaking changes from posthtml:

- ESM only, with a default `posthtml` export and named `parse`, `render`, `walk`, `match` and `QUOTE_STYLE` exports. Requires Node 22.15+.
- Removed sync mode (`sync: true`), callback plugins (`(tree, done)`), and the `parser`/`render` process options.
- `process()` always returns a Promise, and a parse error rejects instead of throwing.
- JSON-looking attribute values are escaped like other values (`data-x="{&quot;a&quot;:1}"`). Set `singleQuoteJsonAttributes: true` for the old `data-x='{"a":1}'`.
- Tree API properties are non-enumerable, and the processor’s `plugins`, `version` and `name` are no longer copied onto the tree.
- `messages` are collected per `process()` call instead of accumulating on the processor.
- The renderer no longer rewrites `node.content` into arrays.
- Render options now apply when the last plugin returns a new root.
- `singleTags` RegExps add to the void elements instead of replacing them.
- An invalid `closeAs` value renders as `default` instead of the text `undefined`.
- Explicit `undefined` render options use their defaults.
- Removed `sourceLocations`.
