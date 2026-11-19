import test from "node:test";
import assert from "node:assert/strict";
import posthtml from "@11ty/posthtml";
import matchHelper from "posthtml-match-helper";
import matchSelector from "../index.js";

const FIXTURE = `<!doctype html>
<html lang="en-US">
<head>
<link rel="stylesheet" href="a.css">
<link rel="preload" href="b.woff2">
<link rel="alternate stylesheet" href="c.css">
<style>body {}</style>
<style data-bundle="default">p {}</style>
<script>1</script>
<script src="x.js" data-bundle></script>
</head>
<body>
<main id="main" class="a b c">
<h1>One</h1>
<h2 id="two">Two</h2>
<h3 id="">Three</h3>
<h4 class="b a">Four</h4>
<h5 class="c">Five</h5>
<h6 data-x="foo">Six</h6>
<p id="p" data-x="bar">Text</p>
<a href="https://example.com/doc.pdf" lang="en">Link</a>
<a href="/local" lang="english">Link</a>
</main>
</body>
</html>`;

async function matches(matcher) {
  let found = [];
  await posthtml([tree => {
    tree.match(matcher, node => {
      found.push(`${node.tag}${JSON.stringify(node.attrs || {})}`);
      return node;
    });
  }]).process(FIXTURE);
  return found;
}

async function matchesHtml(matcher, html) {
  let found = 0;
  await posthtml([tree => {
    tree.match(matcher, node => {
      found++;
      return node;
    });
  }]).process(html);
  return found;
}

// Selectors in use by @11ty/eleventy and @11ty/eleventy-plugin-bundle.
const IN_USE = [
  "[id],h1,h2,h3,h4,h5,h6",
  "script",
  "style,link[rel=\"stylesheet\"]",
  "[data-bundle]",
];

for(let selector of IN_USE) {
  test(`Parity (output and matches): ${selector}`, async () => {
    assert.deepEqual(matchSelector(selector), matchHelper(selector));
    assert.deepEqual(await matches(matchSelector(selector)), await matches(matchHelper(selector)));
  });
}

const BEHAVIOR = [
  "#main",
  "main#main",
  "h4.a.b",
  ".c",
  "[rel~=stylesheet]",
  "[lang|=en]",
  "a[href^=https]",
  "a[href$=pdf]",
  "a[href*='example']",
  "[data-x!=foo]",
  "link[rel='stylesheet'][href]",
  ["script", "style"],
];

for(let selector of BEHAVIOR) {
  test(`Parity (matches): ${selector}`, async () => {
    let expected = await matches(matchHelper(selector));
    assert.ok(expected.length > 0);
    assert.deepEqual(await matches(matchSelector(selector)), expected);
  });
}

test("Attribute values are literal", async () => {
  let matcher = matchSelector("[data-x=a.b]");
  assert.equal(matcher.attrs["data-x"], "a.b");
  assert.equal(await matchesHtml(matcher, `<p data-x="aXb"></p><p data-x="a.b"></p>`), 1);

  for(let op of ["~=", "|=", "^=", "$=", "*="]) {
    let m = matchSelector(`[data-x${op}"a.b"]`);
    assert.equal(m.attrs["data-x"].test("aXb"), false, op);
    assert.equal(m.attrs["data-x"].test("a.b"), true, op);
  }

  assert.equal(matchSelector("[data-x!='a.b']").attrs["data-x"].test("aXb"), true);
  assert.equal(matchSelector("[data-x!='a.b']").attrs["data-x"].test("1a.b2"), false);
});

test("Regex metacharacters in values do not throw", async () => {
  assert.doesNotThrow(() => matchSelector(`[x="("]`));
  assert.equal(await matchesHtml(matchSelector(`[x="("]`), `<p x="("></p><p x="()"></p>`), 1);
  assert.equal(await matchesHtml(matchSelector(`[x*="(["]`), `<p x="a(["></p>`), 1);
  assert.equal(await matchesHtml(matchSelector(`[x='a"b']`), `<p x='a"b'></p>`), 1);
});

test("Operator and class matchers are RegExp instances for posthtml", () => {
  for(let selector of [".a.b", "[x~=a]", "[x|=a]", "[x^=a]", "[x$=a]", "[x*=a]", "[x!=a]"]) {
    let [value] = Object.values(matchSelector(selector).attrs);
    assert.ok(value instanceof RegExp, selector);
    assert.throws(() => value.exec("a"), { message: /only support `test\(\)`/ }, selector);
    assert.throws(() => "a".match(value), { message: /only support `test\(\)`/ }, selector);
    assert.throws(() => "a".replace(value, ""), { message: /only support `test\(\)`/ }, selector);
    assert.throws(() => "a".split(value), { message: /only support `test\(\)`/ }, selector);
  }
});

test("10-class compound selector compiles fast", async () => {
  let classes = Array.from({ length: 10 }, (_, i) => `c${i}`);
  let start = performance.now();
  let matcher = matchSelector(`div.${classes.join(".")}`);
  assert.ok(performance.now() - start < 50);

  let html = `<div class="${[...classes].reverse().join(" ")} extra"></div><div class="${classes.slice(1).join(" ")}"></div>`;
  assert.equal(await matchesHtml(matcher, html), 1);
});

test("Class matching does not depend on order", async () => {
  let matcher = matchSelector(".a.b");
  assert.equal(await matchesHtml(matcher, `<p class="a b"></p>`), 1);
  assert.equal(await matchesHtml(matcher, `<p class="b a"></p>`), 1);
  assert.equal(await matchesHtml(matcher, `<p class="b\n x\ta"></p>`), 1);
  assert.equal(await matchesHtml(matcher, `<p class="ab"></p>`), 0);
  assert.equal(await matchesHtml(matcher, `<p class="a-b b-a"></p>`), 0);
  assert.equal(await matchesHtml(matcher, `<p class="a"></p>`), 0);
});

test("Unsupported syntax throws", () => {
  for(let selector of ["*", "div *", "", " ", "a,", ",a", "div p", "ul > li", "a:hover", "a::before", "[x=a i]", "[x=\"a]", "#a#b", ".a[class=b]", "[x][x=y]"]) {
    assert.throws(() => matchSelector(selector), { message: /^Unsupported selector/ }, JSON.stringify(selector));
  }
});

test("Whitespace around commas and inside brackets", () => {
  assert.deepEqual(matchSelector(" h1 , h2 "), [{ tag: "h1" }, { tag: "h2" }]);
  assert.deepEqual(matchSelector("[ rel = 'a,b' ]"), { attrs: { rel: "a,b" } });
});

test("Non-string matchers pass through", () => {
  let matcher = { tag: "p" };
  assert.equal(matchSelector(matcher), matcher);
  assert.deepEqual(matchSelector(["h1", matcher]), [{ tag: "h1" }, matcher]);
});
