const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const chokidar = require("../");

function waitFor(condition, timeout = 3000) {
  return new Promise((resolve, reject) => {
    let start = Date.now();
    let interval = setInterval(() => {
      if(condition()) {
        clearInterval(interval);
        resolve();
      } else if(Date.now() - start > timeout) {
        clearInterval(interval);
        reject(new Error("Timed out"));
      }
    }, 25);
  });
}

function toUnix(filePath) {
  return filePath.split(path.sep).join("/");
}

async function watchFixture(t, paths, options = {}) {
  let dir = fs.mkdtempSync(path.join(path.relative(".", __dirname), ".watch-"));
  fs.mkdirSync(path.join(dir, "sub/node_modules"), { recursive: true });
  fs.mkdirSync(path.join(dir, "other"));

  let watcher = chokidar.watch(paths(toUnix(dir)), { ignoreInitial: true, ...options });
  t.after(async () => {
    await watcher.close();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  let events = [];
  // Only `add`: macOS can emit an extra `change` for a newly written file
  watcher.on("add", filePath => events.push(`add ${toUnix(filePath)}`));
  await watcherReady(watcher);

  return { dir, events, watcher };
}

// macOS restarts its shared FSEvents stream for new watchers, dropping events written right after `ready`
const WATCH_START_DELAY = 250;

async function watcherReady(watcher) {
  await new Promise(resolve => watcher.once("ready", resolve));
  await new Promise(resolve => setTimeout(resolve, WATCH_START_DELAY));
}

async function settle(events, count) {
  await waitFor(() => events.length >= count);
  await new Promise(resolve => setTimeout(resolve, 300));
}

test("Globs only emit matching files", async (t) => {
  let { dir, events } = await watchFixture(t, dir => [`${dir}/**/*.css`], { ignored: ["**/node_modules/**"] });

  fs.writeFileSync(path.join(dir, "index.html"), "");
  fs.writeFileSync(path.join(dir, "style.css"), "");
  fs.writeFileSync(path.join(dir, "sub/a.css"), "");
  fs.writeFileSync(path.join(dir, "sub/node_modules/b.css"), "");
  await settle(events, 2);

  assert.deepEqual(events.sort(), [`add ${toUnix(dir)}/style.css`, `add ${toUnix(dir)}/sub/a.css`]);
});

test("Negated globs and ignored globs", async (t) => {
  let { dir, events } = await watchFixture(t, dir => [`${dir}/**/*`, `!${dir}/other/**`], { ignored: ["**/*.tmp"] });

  fs.writeFileSync(path.join(dir, "a.tmp"), "");
  fs.writeFileSync(path.join(dir, "other/a.md"), "");
  fs.writeFileSync(path.join(dir, "a.md"), "");
  await settle(events, 1);

  assert.deepEqual(events, [`add ${toUnix(dir)}/a.md`]);
});

test("Globs relative to cwd emit relative paths", async (t) => {
  let dir = fs.mkdtempSync(path.join(path.relative(".", __dirname), ".watch-"));
  fs.mkdirSync(path.join(dir, "sub"));
  let watcher = chokidar.watch(["sub/*.md"], { cwd: path.resolve(dir), ignoreInitial: true, ignored: ["sub/*.tmp.md"] });
  t.after(async () => {
    await watcher.close();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  let events = [];
  watcher.on("add", filePath => events.push(toUnix(filePath)));
  await watcherReady(watcher);

  fs.writeFileSync(path.join(dir, "a.md"), "");
  fs.writeFileSync(path.join(dir, "sub/a.css"), "");
  fs.writeFileSync(path.join(dir, "sub/a.tmp.md"), "");
  fs.writeFileSync(path.join(dir, "sub/a.md"), "");
  await settle(events, 1);

  assert.deepEqual(events, ["sub/a.md"]);
});

test("Adding globs later", async (t) => {
  let { dir, events, watcher } = await watchFixture(t, dir => [`${dir}/*.css`]);
  watcher.add(`${toUnix(dir)}/sub/*.md`);
  await new Promise(resolve => setTimeout(resolve, WATCH_START_DELAY));

  fs.writeFileSync(path.join(dir, "sub/a.md"), "");
  fs.writeFileSync(path.join(dir, "sub/a.css"), "");
  await settle(events, 1);

  assert.deepEqual(events, [`add ${toUnix(dir)}/sub/a.md`]);
});

test("Unwatching globs", async (t) => {
  let { dir, events, watcher } = await watchFixture(t, dir => [`${dir}/*.css`, `${dir}/*.md`]);
  watcher.unwatch(`${toUnix(dir)}/*.md`);

  fs.writeFileSync(path.join(dir, "a.md"), "");
  fs.writeFileSync(path.join(dir, "a.css"), "");
  await settle(events, 1);

  assert.deepEqual(events, [`add ${toUnix(dir)}/a.css`]);
});
