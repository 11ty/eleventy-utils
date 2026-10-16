import { EventEmitter } from "node:events";
import type { Stats } from "node:fs";
import type { ChokidarOptions, FSWatcher as ChokidarFSWatcher, FSWatcherEventMap } from "chokidar";

export type { FSWatcherEventMap } from "chokidar";

export type IgnoredMatcher = string | RegExp | ((filePath: string, stats?: Stats) => boolean);

export type WatchOptions = Omit<ChokidarOptions, "ignored"> & {
	/** Globs, paths (including their contents), RegExps, and functions. */
	ignored?: IgnoredMatcher | IgnoredMatcher[];
	/** Treats all entries as literal paths. */
	disableGlobbing?: boolean;
	/** Matches globs, paths, and `ignored` case-insensitively. */
	nocase?: boolean;
	/** `false` opts out of the recursive `fs.watch` watcher on macOS. */
	useFsEvents?: boolean;
};

export declare class WatchTargets {
	constructor(options?: Pick<WatchOptions, "cwd" | "ignored" | "disableGlobbing" | "nocase">);
	addIgnored(ignored?: IgnoredMatcher | IgnoredMatcher[]): void;
	/** Returns the paths to pass to chokidar. */
	add(entries?: string | string[]): string[];
	/** Returns the paths to pass to chokidar `unwatch`. */
	remove(entries?: string | string[]): string[];
	isWatched(filePath: string): boolean;
	isUserIgnored(filePath: string, stats?: Stats): boolean;
	isIgnored(filePath: string, stats?: Stats): boolean;
}

export declare class FSWatcher extends ChokidarFSWatcher {
	constructor(options?: WatchOptions);
	get watchTargets(): WatchTargets;
	add(paths: string | string[]): this;
	unwatch(paths: string | string[]): this;
}

/** A chokidar-compatible watcher using one recursive `fs.watch` per folder. */
export declare class RecursiveWatcher extends EventEmitter<FSWatcherEventMap> {
	constructor(options?: WatchOptions);
	closed: boolean;
	options: WatchOptions;
	get watchTargets(): WatchTargets;
	add(paths: string | string[]): this;
	unwatch(paths: string | string[]): this;
	getWatched(): Record<string, string[]>;
	close(): Promise<void>;
}

export type Watcher = FSWatcher | RecursiveWatcher;

export declare function watch(paths: string | string[], options?: WatchOptions): Watcher;
