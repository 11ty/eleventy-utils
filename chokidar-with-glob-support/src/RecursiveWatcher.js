const fs = require("node:fs");
const fsp = require("node:fs/promises");
const path = require("node:path");
const { EventEmitter } = require("node:events");
const WatchTargets = require("./WatchTargets.js");

const DEFAULT_AWAIT_WRITE_FINISH = { stabilityThreshold: 2000, pollInterval: 100 };

// Whether absolute path `child` is `parent` or inside of it
function isWithin(child, parent) {
  let relative = path.relative(parent, child);
  return relative === "" || relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
}

function hasChanged(prev, stats) {
  return prev.mtimeMs !== stats.mtimeMs || prev.size !== stats.size || prev.ino !== stats.ino;
}

// A chokidar-compatible watcher using one recursive `fs.watch` per folder (FSEvents on macOS, no file descriptor per file)
module.exports = class RecursiveWatcher extends EventEmitter {
  #targets;
  #roots = [];
  #watchers = new Map();
  #entries = new Map();
  #checks = new Map();
  #pendingUnlinks = new Map();
  #pendingWrites = new Map();
  #ready;
  closed = false;

  constructor(options = {}) {
    super();
    let { awaitWriteFinish: awf } = options;
    this.options = {
      persistent: true,
      ignoreInitial: false,
      ignorePermissionErrors: false,
      followSymlinks: true,
      atomic: true,
      ...options,
      awaitWriteFinish: awf === true ? DEFAULT_AWAIT_WRITE_FINISH : typeof awf === "object" ? { ...DEFAULT_AWAIT_WRITE_FINISH, ...awf } : false,
    };
    this.#targets = new WatchTargets(options);
  }

  get watchTargets() {
    return this.#targets;
  }

  add(paths) {
    let { cwd } = this.options;
    let roots = this.#targets.add(paths).map(input => {
      let abs = path.resolve(cwd || ".", input);
      return { input: cwd ? abs : input, abs };
    });
    this.#roots.push(...roots);

    let scans = roots.map(async root => {
      await this.#watchNearestFolder(root.abs);
      let stats = await this.#stat(root.abs);
      if(stats) {
        await this.#addEntry(root.abs, stats, true);
      }
    });
    let done = Promise.all(scans).catch(error => this.#handleError(error));
    if(!this.#ready) {
      this.#ready = done.then(() => process.nextTick(() => !this.closed && this.emit("ready")));
    }
    return this;
  }

  unwatch(paths) {
    let removed = this.#targets.remove(paths).map(p => path.resolve(this.options.cwd || ".", p));
    this.#roots = this.#roots.filter(root => !removed.includes(root.abs));
    for(let abs of this.#entries.keys()) {
      if(!this.#getRoot(abs)) {
        this.#entries.delete(abs);
      }
    }
    return this;
  }

  getWatched() {
    let watched = {};
    for(let [abs, stats] of this.#entries) {
      let display = this.#toDisplayPath(abs);
      let dir = path.dirname(display);
      (watched[dir] ||= []).push(path.basename(display));
      if(stats.isDirectory()) {
        watched[display] ||= [];
      }
    }
    return watched;
  }

  async close() {
    this.closed = true;
    for(let { watcher } of this.#watchers.values()) {
      watcher.close();
    }
    for(let timer of this.#pendingUnlinks.values()) {
      clearTimeout(timer);
    }
    for(let { timer } of this.#pendingWrites.values()) {
      clearTimeout(timer);
    }
    this.#watchers.clear();
    this.#entries.clear();
    this.#pendingUnlinks.clear();
    this.#pendingWrites.clear();
    this.removeAllListeners();
  }

  // Watches the folder (or its closest existing ancestor), FSEvents reports changes to missing descendants once created
  async #watchNearestFolder(abs) {
    let dir = abs;
    let stats = await this.#stat(dir);
    while(!stats?.isDirectory() && path.dirname(dir) !== dir) {
      dir = path.dirname(dir);
      stats = await this.#stat(dir);
    }
    this.#watchFolder(dir);
  }

  // Events for `dir` are reported as if they happened in `mountedAt` (differs for symlinked folders)
  #watchFolder(dir, mountedAt = dir) {
    if(this.closed) {
      return;
    }
    for(let [key, entry] of this.#watchers) {
      if(entry.mountedAt === mountedAt && isWithin(dir, key)) {
        return;
      }
    }
    // Only plain (unmounted) watchers can be merged into a parent folder watcher
    for(let [key, entry] of this.#watchers) {
      if(entry.mountedAt === key && mountedAt === dir && isWithin(key, dir)) {
        entry.watcher.close();
        this.#watchers.delete(key);
      }
    }

    try {
      let watcher = fs.watch(dir, { recursive: true, persistent: this.options.persistent }, (eventType, filename) => {
        if(filename) {
          this.#onEvent(path.join(mountedAt, filename));
        }
      });
      watcher.on("error", error => this.#handleError(error));
      this.#watchers.set(dir, { watcher, mountedAt });
    } catch(error) {
      this.#handleError(error);
    }
  }

  #unwatchMountedFolder(mountedAt) {
    for(let [key, entry] of this.#watchers) {
      if(entry.mountedAt === mountedAt && key !== mountedAt) {
        entry.watcher.close();
        this.#watchers.delete(key);
      }
    }
  }

  #getRoot(abs) {
    return this.#roots.find(root => isWithin(abs, root.abs));
  }

  // The path given to `ignored`: absolute with `cwd`, otherwise joined to the watched path like chokidar
  #toWatchPath(abs) {
    let root = this.#getRoot(abs);
    if(!root || this.options.cwd) {
      return abs;
    }
    return path.join(root.input, path.relative(root.abs, abs));
  }

  #toDisplayPath(abs) {
    let { cwd } = this.options;
    return cwd ? path.relative(cwd, abs) : this.#toWatchPath(abs);
  }

  async #stat(abs) {
    try {
      return await (this.options.followSymlinks ? fsp.stat(abs) : fsp.lstat(abs));
    } catch(error) {
      this.#handleError(error);
    }
  }

  #isIgnored(abs, stats) {
    return this.#targets.isIgnored(this.#toWatchPath(abs), stats);
  }

  // Serializes checks per path, re-checking once if more events arrive meanwhile
  #onEvent(abs) {
    if(this.closed) {
      return;
    }
    if(this.#checks.has(abs)) {
      this.#checks.set(abs, true);
      return;
    }
    this.#checks.set(abs, false);
    this.#check(abs).catch(error => this.#handleError(error)).finally(() => {
      let again = this.#checks.get(abs);
      this.#checks.delete(abs);
      if(again) {
        this.#onEvent(abs);
      }
    });
  }

  async #check(abs) {
    let root = this.#getRoot(abs);
    // Skip paths in folders that were never traversed (e.g. ignored `node_modules`)
    if(!root || abs !== root.abs && !this.#entries.get(path.dirname(abs))?.isDirectory()) {
      return;
    }

    let stats = await this.#stat(abs);
    if(this.closed) {
      return;
    }
    let prev = this.#entries.get(abs);
    if(!stats) {
      if(prev) {
        this.#remove(abs);
      }
      return;
    }
    if(this.#isIgnored(abs, stats)) {
      if(prev) {
        this.#remove(abs, { silent: true });
      }
      return;
    }
    if(prev && prev.isDirectory() !== stats.isDirectory()) {
      this.#remove(abs);
      prev = undefined;
    }

    if(!prev) {
      await this.#addEntry(abs, stats, false);
    } else if(stats.isDirectory()) {
      this.#entries.set(abs, stats);
      await this.#reconcile(abs);
    } else if(hasChanged(prev, stats)) {
      this.#entries.set(abs, stats);
      this.#emitWrite("change", abs, stats);
    }
  }

  async #addEntry(abs, stats, initial) {
    if(this.closed) {
      return;
    }
    if(!this.#entries.has(abs)) {
      if(this.#isIgnored(abs, stats)) {
        return;
      }
      let symlinkTarget = stats.isDirectory() ? await this.#getSymlinkTarget(abs) : undefined;
      // Skip symlink cycles, and paths added by a concurrent check
      if(symlinkTarget === false || this.closed || this.#entries.has(abs)) {
        return;
      }
      this.#entries.set(abs, stats);
      if(stats.isDirectory()) {
        this.#emitEvent("addDir", abs, stats, initial);
        if(symlinkTarget) {
          // FSEvents does not report changes inside symlinked folders, so watch their targets too
          this.#watchFolder(symlinkTarget, abs);
        }
      } else if(this.#pendingUnlinks.has(abs)) {
        // Atomic writes: a quick unlink and add is a change
        clearTimeout(this.#pendingUnlinks.get(abs));
        this.#pendingUnlinks.delete(abs);
        this.#emitWrite("change", abs, stats);
      } else {
        this.#emitWrite("add", abs, stats, initial);
      }
    }
    if(stats.isDirectory()) {
      await this.#reconcile(abs, initial);
    }
  }

  // Adds and removes the children of a folder to match the file system
  async #reconcile(dir, initial = false) {
    let names;
    try {
      names = await fsp.readdir(dir);
    } catch(error) {
      this.#handleError(error);
      return;
    }
    let children = new Set(names.map(name => path.join(dir, name)));
    for(let abs of this.#entries.keys()) {
      if(path.dirname(abs) === dir && !children.has(abs)) {
        this.#remove(abs);
      }
    }
    await Promise.all(Array.from(children, async abs => {
      if(this.#entries.has(abs) && !this.#entries.get(abs).isDirectory()) {
        return;
      }
      let stats = await this.#stat(abs);
      if(stats) {
        await this.#addEntry(abs, stats, initial);
      }
    }));
  }

  // The real path of a followed folder symlink, false for links to an ancestor folder
  async #getSymlinkTarget(abs) {
    try {
      if(!this.options.followSymlinks || !(await fsp.lstat(abs)).isSymbolicLink()) {
        return;
      }
      let target = await fsp.realpath(abs);
      return isWithin(await fsp.realpath(path.dirname(abs)), target) ? false : target;
    } catch(error) {
      this.#handleError(error);
      return false;
    }
  }

  #remove(abs, { silent = false } = {}) {
    let stats = this.#entries.get(abs);
    if(!stats) {
      return;
    }
    this.#entries.delete(abs);
    if(stats.isDirectory()) {
      for(let child of Array.from(this.#entries.keys())) {
        if(path.dirname(child) === abs) {
          this.#remove(child, { silent });
        }
      }
      this.#unwatchMountedFolder(abs);
      if(!silent) {
        this.#emitEvent("unlinkDir", abs);
      }
      return;
    }

    let pendingWrite = this.#pendingWrites.get(abs);
    if(pendingWrite) {
      clearTimeout(pendingWrite.timer);
      this.#pendingWrites.delete(abs);
      // The file was never reported, so do not report its removal
      if(pendingWrite.event === "add") {
        return;
      }
    }
    if(silent) {
      return;
    }

    let { atomic } = this.options;
    if(atomic) {
      clearTimeout(this.#pendingUnlinks.get(abs));
      this.#pendingUnlinks.set(abs, setTimeout(() => {
        this.#pendingUnlinks.delete(abs);
        this.#emitEvent("unlink", abs);
      }, typeof atomic === "number" ? atomic : 100));
    } else {
      this.#emitEvent("unlink", abs);
    }
  }

  // `add` and `change`, waiting for writes to finish with `awaitWriteFinish`
  #emitWrite(event, abs, stats, initial = false) {
    let { awaitWriteFinish: awf } = this.options;
    if(!awf || initial) {
      this.#emitEvent(event, abs, stats, initial);
      return;
    }
    if(this.#pendingWrites.has(abs)) {
      return;
    }

    let pending = { event, stats, lastChange: Date.now() };
    let poll = async () => {
      let current = await this.#stat(abs);
      if(this.closed || this.#pendingWrites.get(abs) !== pending) {
        return;
      }
      if(!current) {
        this.#pendingWrites.delete(abs);
        return;
      }
      if(hasChanged(pending.stats, current)) {
        pending.stats = current;
        pending.lastChange = Date.now();
      }
      if(Date.now() - pending.lastChange >= awf.stabilityThreshold) {
        this.#pendingWrites.delete(abs);
        this.#emitEvent(pending.event, abs, current);
      } else {
        pending.timer = setTimeout(poll, awf.pollInterval);
      }
    };
    pending.timer = setTimeout(poll, awf.pollInterval);
    this.#pendingWrites.set(abs, pending);
  }

  #emitEvent(event, abs, stats, initial = false) {
    if(this.closed || initial && this.options.ignoreInitial) {
      return;
    }
    let displayPath = this.#toDisplayPath(abs);
    let args = stats ? [displayPath, stats] : [displayPath];
    this.emit(event, ...args);
    this.emit("all", event, ...args);
  }

  // Same filtering as chokidar
  #handleError(error) {
    let code = error?.code;
    if(this.closed || code === "ENOENT" || code === "ENOTDIR") {
      return;
    }
    if(this.options.ignorePermissionErrors && (code === "EPERM" || code === "EACCES")) {
      return;
    }
    this.emit("error", error);
  }
}
