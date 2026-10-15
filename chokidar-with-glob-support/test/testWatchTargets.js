const test = require("node:test");
const assert = require("node:assert/strict");
// chokidar 5 is ESM-only and needs `require(esm)` (Node 20.19+)
if(!process.features.require_module) {
  test("Requires Node 20.19 or newer", { skip: true });
  return;
}
const path = require("node:path");
const { WatchTargets } = require("../");

const file = { isDirectory: () => false, isFile: () => true };
const dir = { isDirectory: () => true, isFile: () => false };

test("Maps globs to base directories", (t) => {
  let targets = new WatchTargets();
  assert.deepEqual(targets.add(["./src/**/*.css", "*.js", "public", "!**/*.tmp"]), ["src", ".", "public"]);
});

test("Accepts a single string", (t) => {
  let targets = new WatchTargets();
  assert.deepEqual(targets.add("src/*.css"), ["src"]);
});

test("Matching", (t) => {
  let targets = new WatchTargets();
  targets.add(["./src/**/*.{css,js}", "public/", "!**/*.tmp"]);

  assert.equal(targets.isWatched("src/a/b.css"), true);
  assert.equal(targets.isWatched("src\\a\\b.js"), true);
  assert.equal(targets.isWatched("src/.hidden/b.css"), true);
  assert.equal(targets.isWatched("src/a/b.html"), false);
  assert.equal(targets.isWatched("public/index.html"), true);
  assert.equal(targets.isWatched("publicity/index.html"), false);
  assert.equal(targets.isWatched("public/index.tmp"), false);
});

test("Matches absolute paths against relative globs", (t) => {
  let targets = new WatchTargets();
  targets.add(["src/**/*.css"]);

  assert.equal(targets.isWatched(path.resolve("src/a/b.css")), true);
  assert.equal(targets.isWatched(path.resolve("src/a/b.js")), false);
  assert.equal(targets.isIgnored(path.resolve("src/a"), dir), false);
});

test("Ignores non-matching files", (t) => {
  let targets = new WatchTargets({ ignored: ["**/node_modules/**", ".git"] });
  targets.add(["src/**/*.css"]);

  assert.equal(targets.isIgnored("src/a", dir), false);
  assert.equal(targets.isIgnored("src/a/b.css", file), false);
  assert.equal(targets.isIgnored("src/a/b.html", file), true);
  assert.equal(targets.isIgnored("src/node_modules/a.css", file), true);
  assert.equal(targets.isIgnored(".git", dir), true);
  assert.equal(targets.isIgnored(".git/objects", dir), true);
  assert.equal(targets.isIgnored("src/.git", dir), false);
});

test("Ignored RegExps and functions", (t) => {
  let targets = new WatchTargets({ ignored: [/\.tmp$/, (filePath, stats) => stats?.isFile() && filePath.endsWith(".bak")] });
  targets.add(["src"]);

  assert.equal(targets.isIgnored("src/a.tmp", file), true);
  assert.equal(targets.isIgnored("src/a.bak", file), true);
  assert.equal(targets.isIgnored("src/a.css", file), false);
});

test("Skips directories that cannot match", (t) => {
  let targets = new WatchTargets();
  targets.add(["*.css", "{src,lib}/*.js", "docs/**/*.md", "public/assets"]);

  assert.equal(targets.isIgnored(".", dir), false);
  assert.equal(targets.isIgnored("other", dir), true);
  assert.equal(targets.isIgnored("src", dir), false);
  assert.equal(targets.isIgnored("src/deep", dir), true);
  assert.equal(targets.isIgnored("docs/a/b", dir), false);
  assert.equal(targets.isIgnored("public", dir), false);
  assert.equal(targets.isIgnored("public/assets/img", dir), false);
});

test("Traverses all directories for globs with slashes inside groups", (t) => {
  let targets = new WatchTargets();
  targets.add(["{a,b/c}/*.txt"]);

  assert.equal(targets.isIgnored("b/c", dir), false);
  assert.equal(targets.isIgnored("other", dir), false);
});

test("Relative globs and ignores use cwd", (t) => {
  let cwd = path.resolve("site");
  let targets = new WatchTargets({ cwd, ignored: ["_site/**"] });
  targets.add(["src/*.md"]);

  assert.equal(targets.isWatched(path.join(cwd, "src/a.md")), true);
  assert.equal(targets.isWatched("src/a.md"), true);
  assert.equal(targets.isWatched(path.resolve("src/a.md")), false);
  assert.equal(targets.isIgnored(path.join(cwd, "_site/a.html"), file), true);
  assert.equal(targets.isIgnored(path.join(cwd, "src"), dir), false);
  assert.equal(targets.isIgnored(path.join(cwd, "other"), dir), true);
});

test("Removing globs and paths", (t) => {
  let targets = new WatchTargets();
  targets.add(["src/*.css", "public"]);

  assert.deepEqual(targets.remove(["src/*.css", "public"]), ["public"]);
  assert.equal(targets.isWatched("src/a.css"), false);
  assert.equal(targets.isWatched("public/a.css"), false);
});

test("disableGlobbing treats globs as literal paths", (t) => {
  let targets = new WatchTargets({ disableGlobbing: true, ignored: ["[a].txt"] });

  assert.deepEqual(targets.add(["src/[id].md"]), ["src/[id].md"]);
  assert.equal(targets.isWatched("src/[id].md"), true);
  assert.equal(targets.isWatched("src/i.md"), false);
  assert.equal(targets.isIgnored("[a].txt", file), true);
});

test("Normalizes Windows paths", (t) => {
  let targets = new WatchTargets();
  assert.deepEqual(targets.add([".\\src\\**\\*.css", "C:\\site\\*.js", "public\\", "!src\\deep\\**"]), ["src", "C:/site", "public"]);

  assert.equal(targets.isWatched("src\\a\\b.css"), true);
  assert.equal(targets.isWatched("src\\deep\\b.css"), false);
  assert.equal(targets.isWatched("C:\\site\\a.js"), true);
  assert.equal(targets.isWatched("C:\\site\\a.css"), false);
  assert.equal(targets.isWatched("public\\index.html"), true);
  assert.equal(targets.isIgnored("C:\\site", dir), false);
  assert.equal(targets.isIgnored("C:\\site\\sub", dir), true);
  assert.equal(targets.isIgnored("src\\a", dir), false);
});

test("Network paths follow platform normalization", (t) => {
  let targets = new WatchTargets();

  assert.deepEqual(targets.add(["\\\\server\\share\\*.md"]), [path.sep === "\\" ? "//server/share" : "/server/share"]);
  assert.equal(targets.isWatched("\\\\server\\share\\a.md"), true);
});

test("nocase matches globs and paths case-insensitively", (t) => {
  for(let nocase of [false, true]) {
    let targets = new WatchTargets({ nocase });
    targets.add(["src/**/*.CSS", "Public"]);

    assert.equal(targets.isWatched("src/a/b.CSS"), true);
    assert.equal(targets.isWatched("src/a/b.css"), nocase);
    assert.equal(targets.isWatched("SRC/a/b.CSS"), nocase);
    assert.equal(targets.isWatched("Public/a.html"), true);
    assert.equal(targets.isWatched("public/a.html"), nocase);
  }
});

test("nocase negations", (t) => {
  for(let nocase of [false, true]) {
    let targets = new WatchTargets({ nocase });
    targets.add(["src/**/*.md", "!src/Drafts/**"]);

    assert.equal(targets.isWatched("src/Drafts/a.md"), false);
    assert.equal(targets.isWatched("src/drafts/a.md"), !nocase);
  }
});

test("nocase ignored globs and paths", (t) => {
  for(let nocase of [false, true]) {
    let targets = new WatchTargets({ nocase, ignored: ["**/*.TMP", "Vendor"] });
    targets.add(["src", "vendor"]);

    assert.equal(targets.isIgnored("src/a.TMP", file), true);
    assert.equal(targets.isIgnored("src/a.tmp", file), nocase);
    assert.equal(targets.isIgnored("Vendor/a.js", file), true);
    assert.equal(targets.isIgnored("vendor/a.js", file), nocase);
  }
});

test("nocase directory traversal", (t) => {
  for(let nocase of [false, true]) {
    let targets = new WatchTargets({ nocase });
    targets.add(["Docs/*/*.md", "Public/assets"]);

    assert.equal(targets.isIgnored("Docs/a", dir), false);
    assert.equal(targets.isIgnored("docs/a", dir), !nocase);
    assert.equal(targets.isIgnored("public", dir), !nocase);
    assert.equal(targets.isIgnored("public/assets/img", dir), !nocase);
  }
});
