# @11ty/posthtml-match-selector

A zero-dependency drop-in for the default export of `posthtml-match-helper`, turning CSS selectors into posthtml `tree.match` matchers.

```js
const matchSelector = require("@11ty/posthtml-match-selector");
// or: import matchSelector from "@11ty/posthtml-match-selector";

tree.match(matchSelector("style,link[rel=\"stylesheet\"]"), node => node);
```

- Supports tag, `#id`, compound `.class`, `[attr]`, `[attr=value]` (quotes optional), `~= |= ^= $= *=` and `!=` (value does not contain).
- Operators and classes match with string comparisons, not RegExps built from selector values, so `[data-x=a.b]` does not match `aXb` and class order does not matter.
- These matchers subclass `RegExp` with a custom `test()` because posthtml only accepts strings, booleans and `instanceof RegExp`.
- `*`, combinators, pseudo-classes and other unsupported syntax throw an `Error`.

Requires Node 22.22 or newer.
