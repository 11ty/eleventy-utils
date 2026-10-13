"use strict";
// above is required for Object.freeze to fail correctly.

const isPlainObject = require("./IsPlainObject.js");

const OVERRIDE_PREFIX = "override:";

// Assigning this key changes an object’s prototype (prototype pollution)
const UNSAFE_KEY = "__proto__";

function cleanKey(key, prefix) {
	if (prefix && key.startsWith(prefix)) {
		return key.slice(prefix.length);
	}
	return key;
}

function getMergedItem(target, source, prefixes = {}) {
	let { override } = prefixes;
	
	let sourcePlainObjectShortcut = isPlainObject(source);
	let targetPlainObjectShortcut = false;

	if(!target) {
		// Array too
		if(Object.isFrozen(source)) {
			// Shortcut for frozen source (if target does not exist)
			return source;
		}

		if (sourcePlainObjectShortcut) {
			targetPlainObjectShortcut = true;

			// deep copy objects to avoid sharing and to effect key renaming
			target = {};
		}
	}

	if (Array.isArray(target) && Array.isArray(source)) {
		return target.concat(source);
	}

	if (targetPlainObjectShortcut || isPlainObject(target)) {
		if (sourcePlainObjectShortcut) {
			for (let key in source) {
				let overrideKey = cleanKey(key, override);
				if (overrideKey === UNSAFE_KEY) {
					continue;
				}

				// Inherited values (e.g. `constructor`) are never merged into
				let targetValue = Object.hasOwn(target, key) ? target[key] : undefined;

				// An error happens here if the target is frozen
				target[overrideKey] = getMergedItem(targetValue, source[key], prefixes);
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
				let cleanedKey = key.slice(OVERRIDE_PREFIX.length);
				if (cleanedKey !== UNSAFE_KEY) {
					target[cleanedKey] = target[key];
				}
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
