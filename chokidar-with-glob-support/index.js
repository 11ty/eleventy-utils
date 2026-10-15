const chokidar = require("chokidar");
const WatchTargets = require("./src/WatchTargets.js");

// chokidar 4 watcher with chokidar 3 glob support for watch targets and `ignored`
class FSWatcher extends chokidar.FSWatcher {
  #targets;

  constructor(options = {}) {
    let { disableGlobbing, ...chokidarOptions } = options;
    let targets = new WatchTargets(options);
    super({
      ...chokidarOptions,
      ignored: (filePath, stats) => targets.isIgnored(filePath, stats),
    });
    this.#targets = targets;
  }

  get watchTargets() {
    return this.#targets;
  }

  add(paths, ...internal) {
    // chokidar calls `add` internally with extra arguments and literal paths
    if(internal.length > 0) {
      return super.add(paths, ...internal);
    }
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
