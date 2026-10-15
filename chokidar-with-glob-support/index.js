const chokidar = require("chokidar");
const WatchTargets = require("./src/WatchTargets.js");
const RecursiveWatcher = require("./src/RecursiveWatcher.js");

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

function isPolling(options) {
  let env = process.env.CHOKIDAR_USEPOLLING?.toLowerCase();
  if(env !== undefined) {
    return env !== "false" && env !== "0" && Boolean(env);
  }
  return Boolean(options.usePolling);
}

// On macOS, recursive `fs.watch` uses one FSEvents stream instead of a file descriptor per watched file
function useRecursiveWatcher(options) {
  return process.platform === "darwin" && options.useFsEvents !== false && options.depth === undefined && !isPolling(options);
}

function watch(paths, options = {}) {
  let watcher = useRecursiveWatcher(options) ? new RecursiveWatcher(options) : new FSWatcher(options);
  watcher.add(paths);
  return watcher;
}

module.exports = { watch, FSWatcher, RecursiveWatcher, WatchTargets };
