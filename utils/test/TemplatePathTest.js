const assert = require("node:assert/strict")
const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");

const { TemplatePath } = require("../index.js");

test("getDir", (t) => {
  assert.equal(TemplatePath.getDir("README.md"), ".");
  assert.equal(TemplatePath.getDir("test/stubs/config.js"), "test/stubs");
  assert.equal(TemplatePath.getDir("./test/stubs/config.js"), "./test/stubs");
  assert.equal(TemplatePath.getDir("test/stubs/*.md"), "test/stubs");
  assert.equal(TemplatePath.getDir("test/stubs/**"), "test/stubs");
  assert.equal(TemplatePath.getDir("test/stubs/!(multiple.md)"), "test/stubs");
});

test("getDirFromFilePath", (t) => {
  assert.equal(TemplatePath.getDirFromFilePath("test/stubs/*.md"), "test/stubs");
  assert.equal(TemplatePath.getDirFromFilePath("test/stubs/!(x.md)"), "test/stubs");
});

test("getLastPathSegment", (t) => {
  assert.equal(TemplatePath.getLastPathSegment("./testing/hello"), "hello");
  assert.equal(TemplatePath.getLastPathSegment("./testing"), "testing");
  assert.equal(TemplatePath.getLastPathSegment("./testing/"), "testing");
  assert.equal(TemplatePath.getLastPathSegment("testing/"), "testing");
  assert.equal(TemplatePath.getLastPathSegment("testing"), "testing");
});

test("getAllDirs", (t) => {
  assert.deepEqual(TemplatePath.getAllDirs("."), ["."]);
  assert.deepEqual(TemplatePath.getAllDirs("./"), ["."]);
  assert.deepEqual(TemplatePath.getAllDirs("./testing"), ["./testing"]);
  assert.deepEqual(TemplatePath.getAllDirs("./testing/"), ["./testing"]);
  assert.deepEqual(TemplatePath.getAllDirs("testing/"), ["testing"]);
  assert.deepEqual(TemplatePath.getAllDirs("testing"), ["testing"]);

  assert.deepEqual(TemplatePath.getAllDirs("./testing/hello"), [
    "./testing/hello",
    "./testing",
  ]);

  assert.deepEqual(TemplatePath.getAllDirs("./src/collections/posts"), [
    "./src/collections/posts",
    "./src/collections",
    "./src",
  ]);

  assert.deepEqual(
    TemplatePath.getAllDirs("./src/site/content/en/paths/performanceAudits"),
    [
      "./src/site/content/en/paths/performanceAudits",
      "./src/site/content/en/paths",
      "./src/site/content/en",
      "./src/site/content",
      "./src/site",
      "./src",
    ]
  );

  assert.deepEqual(TemplatePath.getAllDirs("./src/_site/src"), [
    "./src/_site/src",
    "./src/_site",
    "./src",
  ]);

  assert.deepEqual(TemplatePath.getAllDirs("./src/_site/src/src/src"), [
    "./src/_site/src/src/src",
    "./src/_site/src/src",
    "./src/_site/src",
    "./src/_site",
    "./src",
  ]);
});

test("normalize", async (t) => {
  assert.equal(TemplatePath.normalize(""), ".");
  assert.equal(TemplatePath.normalize("."), ".");
  assert.equal(TemplatePath.normalize("/"), "/");
  assert.equal(TemplatePath.normalize("/testing"), "/testing");
  assert.equal(TemplatePath.normalize("/testing/"), "/testing");

  // v0.4.0 changed from `./` to `.`
  // normalize removes trailing slashes so it should probably be `.`
  assert.equal(TemplatePath.normalize("./"), ".");
  assert.equal(TemplatePath.normalize("./testing"), "testing");

  assert.equal(TemplatePath.normalize("../"), "..");
  assert.equal(TemplatePath.normalize("../testing"), "../testing");

  assert.equal(TemplatePath.normalize("./testing/hello"), "testing/hello");
  assert.equal(TemplatePath.normalize("./testing/hello/"), "testing/hello");

  assert.equal(TemplatePath.normalize(".htaccess"), ".htaccess");
});

test("join", async (t) => {
  assert.equal(TemplatePath.join("src", "_includes"), "src/_includes");
  assert.equal(TemplatePath.join("src", "_includes/"), "src/_includes");
  assert.equal(TemplatePath.join("src", "/_includes"), "src/_includes");
  assert.equal(TemplatePath.join("src", "./_includes"), "src/_includes");
  assert.equal(TemplatePath.join("src", "//_includes"), "src/_includes");

  assert.equal(TemplatePath.join("./src", "_includes"), "src/_includes");
  assert.equal(TemplatePath.join("./src", "_includes/"), "src/_includes");
  assert.equal(TemplatePath.join("./src", "/_includes"), "src/_includes");
  assert.equal(TemplatePath.join("./src", "./_includes"), "src/_includes");
  assert.equal(TemplatePath.join("./src", "//_includes"), "src/_includes");

  assert.equal(TemplatePath.join("src", "test", "..", "_includes"), "src/_includes");
});

test("normalizeUrlPath", (t) => {
  assert.equal(TemplatePath.normalizeUrlPath(""), ".");
  assert.equal(TemplatePath.normalizeUrlPath("."), ".");
  assert.equal(TemplatePath.normalizeUrlPath("./"), "./");
  assert.equal(TemplatePath.normalizeUrlPath(".."), "..");
  assert.equal(TemplatePath.normalizeUrlPath("../"), "../");

  assert.equal(TemplatePath.normalizeUrlPath("/"), "/");
  assert.equal(TemplatePath.normalizeUrlPath("//"), "/");
  assert.equal(TemplatePath.normalizeUrlPath("/../"), "/");
  assert.equal(TemplatePath.normalizeUrlPath("/test"), "/test");
  assert.equal(TemplatePath.normalizeUrlPath("/test/"), "/test/");
  assert.equal(TemplatePath.normalizeUrlPath("/test//"), "/test/");
  assert.equal(TemplatePath.normalizeUrlPath("/test/../"), "/");
  assert.equal(TemplatePath.normalizeUrlPath("/test/../../"), "/");
});

test("absolutePath", (t) => {
  assert.equal(
    TemplatePath.absolutePath(".eleventy.js").split("/").pop(),
    ".eleventy.js"
  );
  assert.equal(TemplatePath.absolutePath("/tmp/.eleventy.js"), "/tmp/.eleventy.js");
  assert.equal(
    TemplatePath.absolutePath("/var/task/", ".eleventy.js"),
    "/var/task/.eleventy.js"
  );

  assert.throws(() => {
    TemplatePath.absolutePath("/var/task/", "/var/task/.eleventy.js");
  });

  assert.throws(() => {
    TemplatePath.absolutePath("file1.js", "test/file2.js", "/tmp/.eleventy.js");
  });
});

test("absolutePath and relativePath", (t) => {
  assert.equal(
    TemplatePath.relativePath(TemplatePath.absolutePath(".eleventy.js")),
    ".eleventy.js"
  );
});

test("addLeadingDotSlash", (t) => {
  assert.equal(TemplatePath.addLeadingDotSlash("."), "./");
  assert.equal(TemplatePath.addLeadingDotSlash(".."), "../");
  assert.equal(TemplatePath.addLeadingDotSlash("./test/stubs"), "./test/stubs");
  assert.equal(TemplatePath.addLeadingDotSlash("./dist"), "./dist");
  assert.equal(TemplatePath.addLeadingDotSlash("../dist"), "../dist");
  assert.equal(TemplatePath.addLeadingDotSlash("/dist"), "/dist");
  assert.equal(TemplatePath.addLeadingDotSlash("dist"), "./dist");
  assert.equal(TemplatePath.addLeadingDotSlash(".nyc_output"), "./.nyc_output");

  // TODO How to test this on Windows? path.isAbsolute is OS dependent 😱
  // let windowsAbsolutePath = `C:\\Users\\$USER\\$PROJECT\\netlify\\functions\\serverless\\index`;
  // t.is(TemplatePath.addLeadingDotSlash(windowsAbsolutePath), windowsAbsolutePath);
});

test("addLeadingDotSlashArray", (t) => {
  assert.deepEqual(TemplatePath.addLeadingDotSlashArray(["."]), ["./"]);
  assert.deepEqual(TemplatePath.addLeadingDotSlashArray([".."]), ["../"]);
  assert.deepEqual(TemplatePath.addLeadingDotSlashArray(["./test/stubs"]), [
    "./test/stubs",
  ]);
  assert.deepEqual(TemplatePath.addLeadingDotSlashArray(["./dist"]), ["./dist"]);
  assert.deepEqual(TemplatePath.addLeadingDotSlashArray(["../dist"]), ["../dist"]);
  assert.deepEqual(TemplatePath.addLeadingDotSlashArray(["/dist"]), ["/dist"]);
  assert.deepEqual(TemplatePath.addLeadingDotSlashArray(["dist"]), ["./dist"]);
  assert.deepEqual(TemplatePath.addLeadingDotSlashArray([".nyc_output"]), [
    "./.nyc_output",
  ]);
});

test("stripLeadingDotSlash", (t) => {
  assert.equal(TemplatePath.stripLeadingDotSlash("./test/stubs"), "test/stubs");
  assert.equal(TemplatePath.stripLeadingDotSlash("./dist"), "dist");
  assert.equal(TemplatePath.stripLeadingDotSlash("../dist"), "../dist");
  assert.equal(TemplatePath.stripLeadingDotSlash("dist"), "dist");

  assert.equal(TemplatePath.stripLeadingDotSlash(".htaccess"), ".htaccess");
});

test("startsWithSubPath", (t) => {
  assert.equal(false, TemplatePath.startsWithSubPath("./testing/hello", "./lskdjklfjz"));
  assert.equal(false, TemplatePath.startsWithSubPath("./testing/hello", "lskdjklfjz"));
  assert.equal(false, TemplatePath.startsWithSubPath("testing/hello", "./lskdjklfjz"));
  assert.equal(false, TemplatePath.startsWithSubPath("testing/hello", "lskdjklfjz"));

  assert.equal(true, TemplatePath.startsWithSubPath("./testing/hello", "./testing"));
  assert.equal(true, TemplatePath.startsWithSubPath("./testing/hello", "testing"));
  assert.equal(true, TemplatePath.startsWithSubPath("testing/hello", "./testing"));
  assert.equal(true, TemplatePath.startsWithSubPath("testing/hello", "testing"));

  assert.equal(true,
    TemplatePath.startsWithSubPath("testing/hello/subdir/test", "testing")
  );
  assert.equal(false,
    TemplatePath.startsWithSubPath("testing/hello/subdir/test", "hello"));
  assert.equal(false,
    TemplatePath.startsWithSubPath("testing/hello/subdir/test", "hello/subdir")
  );
  assert.equal(true,
    TemplatePath.startsWithSubPath(
      "testing/hello/subdir/test",
      "testing/hello/subdir"
    )
  );
  assert.equal(true,
    TemplatePath.startsWithSubPath(
      "testing/hello/subdir/test",
      "testing/hello/subdir/test"
    )
  );
});

test("stripLeadingSubPath", (t) => {
  assert.equal(
    TemplatePath.stripLeadingSubPath("./testing/hello", "./lskdjklfjz"),
    "testing/hello"
  );
  assert.equal(TemplatePath.stripLeadingSubPath("./test/stubs", "stubs"), "test/stubs");
  assert.equal(TemplatePath.stripLeadingSubPath("./test/stubs", "./test"), "stubs");
  assert.equal(TemplatePath.stripLeadingSubPath("./testing/hello", "testing"), "hello");
  assert.equal(TemplatePath.stripLeadingSubPath("testing/hello", "testing"), "hello");
  assert.equal(TemplatePath.stripLeadingSubPath("testing/hello", "./testing"), "hello");
  assert.equal(
    TemplatePath.stripLeadingSubPath("testing/hello/subdir/test", "testing"),
    "hello/subdir/test"
  );

  assert.equal(TemplatePath.stripLeadingSubPath(".htaccess", "./"), ".htaccess");
  assert.equal(TemplatePath.stripLeadingSubPath(".htaccess", "."), ".htaccess");
});

test("convertToRecursiveGlobSync", (t) => {
  assert.equal(TemplatePath.convertToRecursiveGlobSync(""), "./**");
  assert.equal(TemplatePath.convertToRecursiveGlobSync("."), "./**");
  assert.equal(TemplatePath.convertToRecursiveGlobSync("./"), "./**");
  assert.equal(
    TemplatePath.convertToRecursiveGlobSync("utils/test/stubs"),
    "./utils/test/stubs/**"
  );
  assert.equal(
    TemplatePath.convertToRecursiveGlobSync("utils/test/stubs/"),
    "./utils/test/stubs/**"
  );
  assert.equal(
    TemplatePath.convertToRecursiveGlobSync("./utils/test/stubs/"),
    "./utils/test/stubs/**"
  );
  assert.equal(
    TemplatePath.convertToRecursiveGlobSync("./utils/test/stubs/config.js"),
    "./utils/test/stubs/config.js"
  );
});

test("convertToRecursiveGlob", async (t) => {
  assert.equal(await TemplatePath.convertToRecursiveGlob(""), "./**");
  assert.equal(await TemplatePath.convertToRecursiveGlob("."), "./**");
  assert.equal(await TemplatePath.convertToRecursiveGlob("./"), "./**");
  assert.equal(
    await TemplatePath.convertToRecursiveGlob("utils/test/stubs"),
    "./utils/test/stubs/**"
  );
  assert.equal(
    await TemplatePath.convertToRecursiveGlob("utils/test/stubs/"),
    "./utils/test/stubs/**"
  );
  assert.equal(
    await TemplatePath.convertToRecursiveGlob("./utils/test/stubs/"),
    "./utils/test/stubs/**"
  );
  assert.equal(
    await TemplatePath.convertToRecursiveGlob("./utils/test/stubs/config.js"),
    "./utils/test/stubs/config.js"
  );
});

test("getExtension", (t) => {
  assert.equal(TemplatePath.getExtension(""), "");
  assert.equal(TemplatePath.getExtension("test/stubs"), "");
  assert.equal(TemplatePath.getExtension("test/stubs.njk"), "njk");
  assert.equal(TemplatePath.getExtension("test/stubs.hbs"), "hbs");
  // Not normalized to template extension map
  assert.equal(TemplatePath.getExtension("test/stubs.11ty.js"), "js");
});

test("removeExtension", (t) => {
  assert.equal(TemplatePath.removeExtension(""), "");
  assert.equal(TemplatePath.removeExtension("", "hbs"), "");

  assert.equal(TemplatePath.removeExtension("test/stubs", "hbs"), "test/stubs");
  assert.equal(TemplatePath.removeExtension("test/stubs.njk"), "test/stubs.njk");
  assert.equal(TemplatePath.removeExtension("test/stubs.njk", "hbs"), "test/stubs.njk");
  assert.equal(TemplatePath.removeExtension("test/stubs.hbs", "hbs"), "test/stubs");

  assert.equal(TemplatePath.removeExtension("./test/stubs.njk"), "./test/stubs.njk");
  assert.equal(
    TemplatePath.removeExtension("./test/stubs.njk", "hbs"),
    "./test/stubs.njk"
  );
  assert.equal(TemplatePath.removeExtension("./test/stubs.hbs", "hbs"), "./test/stubs");

  assert.equal(TemplatePath.removeExtension("test/stubs", ".hbs"), "test/stubs");
  assert.equal(
    TemplatePath.removeExtension("test/stubs.njk", ".hbs"),
    "test/stubs.njk"
  );
  assert.equal(TemplatePath.removeExtension("test/stubs.hbs", ".hbs"), "test/stubs");
  assert.equal(
    TemplatePath.removeExtension("./test/stubs.njk", ".hbs"),
    "./test/stubs.njk"
  );
  assert.equal(
    TemplatePath.removeExtension("./test/stubs.hbs", ".hbs"),
    "./test/stubs"
  );
});

test("isDirectorySync", (t) => {
  assert.equal(TemplatePath.isDirectorySync("asdlkfjklsadjflkja"), false);
  assert.equal(TemplatePath.isDirectorySync("utils/test"), true);
  assert.equal(TemplatePath.isDirectorySync("utils/test/stubs"), true);
  assert.equal(TemplatePath.isDirectorySync("utils/test/stubs/.eleventyignore"), false);
});

test("isDirectory", async (t) => {
  assert.equal(await TemplatePath.isDirectory("asdlkfjklsadjflkja"), false);
  assert.equal(await TemplatePath.isDirectory("utils/test"), true);
  assert.equal(await TemplatePath.isDirectory("utils/test/stubs"), true);
  assert.equal(await TemplatePath.isDirectory("utils/test/stubs/.eleventyignore"), false);
});

test("exists", async (t) => {
  assert.equal(fs.existsSync("utils/asdlkfjklsadjflkja"), false);
  assert.equal(fs.existsSync("utils/test"), true);
  assert.equal(fs.existsSync("utils/test/stubs"), true);
  assert.equal(fs.existsSync("utils/test/stubs/.eleventyignore"), true);
});

test("standardize", async (t) => {
  assert.equal(TemplatePath.standardizeFilePath(""), "./");
  assert.equal(TemplatePath.standardizeFilePath("."), "./");
  assert.equal(TemplatePath.standardizeFilePath("./"), "./");
  assert.equal(TemplatePath.standardizeFilePath("/"), "/");
  assert.equal(TemplatePath.standardizeFilePath("/testing"), "/testing");
  assert.equal(TemplatePath.standardizeFilePath("/testing/"), "/testing/");

  assert.equal(TemplatePath.standardizeFilePath("./testing"), "./testing");

  assert.equal(TemplatePath.standardizeFilePath("../"), "../");
  assert.equal(TemplatePath.standardizeFilePath("../testing"), "../testing");

  assert.equal(TemplatePath.standardizeFilePath("./testing/hello"), "./testing/hello");
  assert.equal(TemplatePath.standardizeFilePath("./testing/hello/"), "./testing/hello/");

  assert.equal(TemplatePath.standardizeFilePath(".htaccess"), "./.htaccess");
  assert.equal(TemplatePath.standardizeFilePath(`${path.sep}Users${path.sep}test`), "/Users/test");
});
