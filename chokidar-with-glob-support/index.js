const path = require("node:path");
const chokidar = require("chokidar");
const WatchTargets = require("./src/WatchTargets.js");

// chokidar 6 watcher with chokidar 3 glob support for watch targets and `ignored`
class FSWatcher extends chokidar.FSWatcher {
  #targets;

  constructor(options = {}) {
    let { disableGlobbing, nocase, ...chokidarOptions } = options;
    let targets = new WatchTargets(options);
    super({
      ...chokidarOptions,
      // chokidar joins watch targets with `cwd`, so a relative `cwd` would report paths relative to `process.cwd()` instead
      cwd: chokidarOptions.cwd ? path.resolve(chokidarOptions.cwd) : chokidarOptions.cwd,
      ignored: (filePath, stats) => targets.isIgnored(filePath, stats),
    });
    this.#targets = targets;
  }

  get watchTargets() {
    return this.#targets;
  }

  add(paths) {
    return super.add(this.#targets.add(paths));
  }

  unwatch(paths) {
    return super.unwatch(this.#targets.remove(paths));
  }
}

function watch(paths, options = {}) {
  let watcher = new FSWatcher(options);
  watcher.add(paths);
  return watcher;
}

module.exports = { watch, FSWatcher, WatchTargets };
