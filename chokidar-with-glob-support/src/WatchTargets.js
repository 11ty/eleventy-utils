const path = require("node:path");
const picomatch = require("picomatch");

const PICOMATCH_OPTIONS = { dot: true };

// Converts to forward slashes, keeping a leading `//` for network paths
function toUnix(filePath) {
  let unix = filePath.replace(/\\/g, "/");
  return (unix.startsWith("//") ? "/" : "") + unix.replace(/\/\/+/g, "/");
}

// Same normalization as chokidar 3, without a trailing slash
function normalize(filePath) {
  let normalized = toUnix(path.normalize(toUnix(filePath)));
  return normalized.length > 1 && !normalized.endsWith(":/") ? normalized.replace(/\/+$/, "") : normalized;
}

// Whether `filePath` is `dir` or inside of it, `.` only contains relative paths inside of the cwd
function isWithin(filePath, dir) {
  if(dir === ".") {
    return !path.isAbsolute(filePath) && filePath !== ".." && !filePath.startsWith("../");
  }
  return filePath === dir || filePath.startsWith(dir.endsWith("/") ? dir : `${dir}/`);
}

// Splits a glob into path segments, null when a segment group contains a slash (e.g. `{a,b/c}`)
function splitSegments(glob) {
  let segments = [];
  let current = "";
  let depth = 0;
  for(let j = 0; j < glob.length; j++) {
    let char = glob[j];
    if(char === "\\") {
      current += char + (glob[++j] ?? "");
      continue;
    }
    if("{([".includes(char)) {
      depth++;
    } else if("})]".includes(char)) {
      depth = Math.max(0, depth - 1);
    } else if(char === "/") {
      if(depth > 0) {
        return null;
      }
      segments.push(current);
      current = "";
      continue;
    }
    current += char;
  }
  segments.push(current);

  return segments.map(segment => {
    if(segment === "**") {
      return segment;
    }
    return segment ? picomatch(segment, PICOMATCH_OPTIONS) : (s => s === "");
  });
}

// Whether a directory could contain matches for the glob segments, like chokidar 3
function mayContainMatches(segments, dirPath) {
  if(!segments) {
    return true;
  }
  let dirSegments = dirPath.split("/");
  for(let j = 0; j < dirSegments.length; j++) {
    if(segments[j] === "**") {
      return true;
    }
    if(j >= segments.length - 1 || !segments[j](dirSegments[j])) {
      return false;
    }
  }
  return true;
}

function createMatcher(glob) {
  let isMatch = picomatch(glob, PICOMATCH_OPTIONS);
  return filePath => isMatch(filePath);
}

// chokidar 4 dropped glob support: watch each glob's base directory and filter with picomatch.
module.exports = class WatchTargets {
  #cwd;
  #disableGlobbing;
  #paths = [];
  #globs = [];
  #negations = [];
  #ignoredFunctions = [];
  #ignoredMatchers = [];

  constructor({ cwd, ignored, disableGlobbing } = {}) {
    this.#cwd = path.resolve(cwd || ".");
    this.#disableGlobbing = Boolean(disableGlobbing);
    this.addIgnored(ignored);
  }

  // Both the relative (to cwd) and absolute forms of a path
  #getCandidates(filePath) {
    let normalized = normalize(filePath);
    let other = path.isAbsolute(normalized) ? path.relative(this.#cwd, normalized) : path.join(this.#cwd, normalized);
    return [normalized, normalize(other)];
  }

  #isGlob(entry) {
    return !this.#disableGlobbing && picomatch.scan(entry).isGlob;
  }

  // Same semantics as chokidar 3 `ignored`: globs, paths (including their contents), RegExps, and functions
  addIgnored(ignored = []) {
    for(let matcher of [ignored].flat()) {
      if(typeof matcher === "function") {
        this.#ignoredFunctions.push(matcher);
      } else if(matcher instanceof RegExp) {
        this.#ignoredMatchers.push(filePath => matcher.test(filePath));
      } else if(typeof matcher === "string") {
        let entry = normalize(matcher);
        this.#ignoredMatchers.push(this.#isGlob(entry) ? createMatcher(entry) : filePath => isWithin(filePath, entry));
      }
    }
  }

  // Returns the paths to pass to chokidar
  add(entries = []) {
    let paths = [];
    for(let entry of [entries].flat()) {
      entry = normalize(entry);
      let { negated, base } = picomatch.scan(entry);
      if(!this.#disableGlobbing && negated) {
        this.#negations.push(createMatcher(entry.slice(1)));
      } else if(this.#isGlob(entry)) {
        this.#globs.push({ glob: entry, isMatch: createMatcher(entry), segments: splitSegments(entry) });
        paths.push(base || ".");
      } else {
        this.#paths.push(entry);
        paths.push(entry);
      }
    }
    return paths;
  }

  // Returns the paths to pass to chokidar `unwatch`, unwatched globs are ignored like chokidar 3
  remove(entries = []) {
    let paths = [];
    for(let entry of [entries].flat()) {
      entry = normalize(entry);
      if(this.#isGlob(entry)) {
        this.#globs = this.#globs.filter(({ glob }) => glob !== entry);
        this.#ignoredMatchers.push(createMatcher(entry));
      } else {
        this.#paths = this.#paths.filter(p => p !== entry);
        paths.push(entry);
      }
    }
    return paths;
  }

  isWatched(filePath) {
    let candidates = this.#getCandidates(filePath);
    if(candidates.some(c => this.#negations.some(isMatch => isMatch(c)))) {
      return false;
    }
    return candidates.some(c => this.#paths.some(p => isWithin(c, p)) || this.#globs.some(({ isMatch }) => isMatch(c)));
  }

  isUserIgnored(filePath, stats) {
    if(this.#ignoredFunctions.some(fn => fn(filePath, stats))) {
      return true;
    }
    return this.#getCandidates(filePath).some(c => this.#ignoredMatchers.some(isMatch => isMatch(c)));
  }

  #isTraversed(dirPath) {
    return this.#getCandidates(dirPath).some(c => {
      return c === "."
        || this.#paths.some(p => isWithin(c, p) || isWithin(p, c))
        || this.#globs.some(({ segments }) => mayContainMatches(segments, c));
    });
  }

  // chokidar `ignored` callback
  isIgnored(filePath, stats) {
    if(this.isUserIgnored(filePath, stats)) {
      return true;
    }
    if(stats?.isDirectory()) {
      return !this.#isTraversed(filePath);
    }
    return Boolean(stats?.isFile()) && !this.isWatched(filePath);
  }
}
