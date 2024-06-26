"use strict";
// above is required for Object.freeze to fail correctly.

const isPlainObject = require("./IsPlainObject.js");

const OVERRIDE_PREFIX = "override:";

function cleanKey(key, prefix) {
	if (prefix && key.startsWith(prefix)) {
		return key.slice(prefix.length);
	}
	return key;
}

function getMergedItem(target, source, prefixes = {}) {
	let { override } = prefixes;

	// Shortcut for frozen source (if target does not exist)
	if (!target && isPlainObject(source) && Object.isFrozen(source)) {
		return source;
	}

	let sourcePlainObjectShortcut;
	if (!target && isPlainObject(source)) {
		// deep copy objects to avoid sharing and to effect key renaming
		target = {};
		sourcePlainObjectShortcut = true;
	}

	if (Array.isArray(target) && Array.isArray(source)) {
		return target.concat(source);
	} else if (isPlainObject(target)) {
		if (sourcePlainObjectShortcut || isPlainObject(source)) {
			for (let key in source) {
				let overrideKey = cleanKey(key, override);

				// An error happens here if the target is frozen
				target[overrideKey] = getMergedItem(target[key], source[key], prefixes);
			}
		}
		return target;
	}
	// number, string, class instance, etc
	return source;
}

// The same as Merge but without override prefixes
function DeepCopy(targetObject, ...sources) {
	for (let source of sources) {
		if (!source) {
			continue;
		}

		targetObject = getMergedItem(targetObject, source);
	}
	return targetObject;
}

function Merge(target, ...sources) {
	// Remove override prefixes from root target.
	if (isPlainObject(target)) {
		for (let key in target) {
			if (key.indexOf(OVERRIDE_PREFIX) === 0) {
				target[key.slice(OVERRIDE_PREFIX.length)] = target[key];
				delete target[key];
			}
		}
	}

	for (let source of sources) {
		if (!source) {
			continue;
		}

		target = getMergedItem(target, source, {
			override: OVERRIDE_PREFIX,
		});
	}

	return target;
}

module.exports = Merge;
module.exports.DeepCopy = DeepCopy;
