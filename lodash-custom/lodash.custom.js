/**
 * Reduced `get`, `set`, and `chunk` from Lodash <https://lodash.com/>
 * Copyright OpenJS Foundation and other contributors <https://openjsf.org/>
 * Released under MIT license <https://lodash.com/license>
 * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
 * Copyright Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 */
const reIsDeepProp = /\.|\[(?:[^[\]]*|(["'])(?:(?!\1)[^\\]|\\.)*?\1)\]/;
const reIsPlainProp = /^\w*$/;
const rePropName = /[^.[\]]+|\[(?:(-?\d+(?:\.\d+)?)|(["'])((?:(?!\2)[^\\]|\\.)*?)\2)\]|(?=(?:\.|\[\])(?:\.|\[\]|$))/g;
const reEscapeChar = /\\(\\)?/g;
const reIsUint = /^(?:0|[1-9]\d*)$/;

const MAX_CACHE_SIZE = 500;
// Plain object (not a Map) to match lodash, since repeated `Map#clear` raised peak memory.
let pathCache = Object.create(null);
let pathCacheSize = 0;

function stringToPath(string) {
	let cached = pathCache[string];
	if(cached) {
		return cached;
	}

	let result = [];
	if(string.charCodeAt(0) === 46 /* . */) {
		result.push("");
	}
	for(let [match, number, quote, subString] of string.matchAll(rePropName)) {
		result.push(quote ? subString.replace(reEscapeChar, "$1") : (number || match));
	}

	if(pathCacheSize === MAX_CACHE_SIZE) {
		pathCache = Object.create(null);
		pathCacheSize = 0;
	}
	pathCache[string] = result;
	pathCacheSize++;
	return result;
}

function isKey(value, object) {
	let type = typeof value;
	if(value == null || type === "number" || type === "symbol" || type === "boolean") {
		return true;
	}
	return reIsPlainProp.test(value) || !reIsDeepProp.test(value) || (object != null && value in Object(object));
}

function castPath(value, object) {
	if(Array.isArray(value)) {
		return value;
	}
	return isKey(value, object) ? [value] : stringToPath(String(value));
}

function toKey(value) {
	if(typeof value === "symbol") {
		return value;
	}
	let result = String(value);
	return result === "0" && 1 / value === -Infinity ? "-0" : result;
}

function isIndex(value, length = Number.MAX_SAFE_INTEGER) {
	let type = typeof value;
	return !!length && (type === "number" || (type !== "symbol" && reIsUint.test(value))) &&
		value > -1 && value % 1 === 0 && value < length;
}

function isObject(value) {
	let type = typeof value;
	return value != null && (type === "object" || type === "function");
}

// SameValueZero
function eq(value, other) {
	return value === other || (value !== value && other !== other);
}

// Detects calls from iteratees like `array.map(chunk)`.
function isIterateeCall(value, index, object) {
	if(!isObject(object)) {
		return false;
	}
	let type = typeof index;
	let isArrayLike = typeof object !== "function" && Number.isSafeInteger(object.length) && object.length >= 0;
	if(type === "number" ? (isArrayLike && isIndex(index, object.length)) : (type === "string" && index in object)) {
		return eq(object[index], value);
	}
	return false;
}

function get(object, path, defaultValue) {
	if(object == null) {
		return defaultValue;
	}

	path = castPath(path, object);
	let index = 0;
	while(object != null && index < path.length) {
		object = object[toKey(path[index++])];
	}

	let result = index && index === path.length ? object : undefined;
	return result === undefined ? defaultValue : result;
}

function set(object, path, value) {
	if(!isObject(object)) {
		return object;
	}

	path = castPath(path, object);
	let lastIndex = path.length - 1;
	let nested = object;
	for(let index = 0; nested != null && index <= lastIndex; index++) {
		let key = toKey(path[index]);
		// Prototype pollution guard.
		if(key === "__proto__" || key === "constructor" || key === "prototype") {
			return object;
		}

		let objValue = nested[key];
		let newValue = value;
		if(index !== lastIndex) {
			newValue = isObject(objValue) ? objValue : (isIndex(path[index + 1]) ? [] : {});
		}
		if(!(Object.hasOwn(nested, key) && eq(objValue, newValue)) || (newValue === undefined && !(key in nested))) {
			nested[key] = newValue;
		}
		nested = nested[key];
	}
	return object;
}

function chunk(array, size, guard) {
	if(guard ? isIterateeCall(array, size, guard) : size === undefined) {
		size = 1;
	} else {
		size = Math.max(Math.trunc(Number(size)) || 0, 0);
	}
	let length = array == null ? 0 : array.length;
	if(!length || size < 1) {
		return [];
	}

	let result = new Array(Math.ceil(length / size));
	for(let index = 0, resIndex = 0; index < length; index += size) {
		result[resIndex++] = Array.prototype.slice.call(array, index, index + size);
	}
	return result;
}

module.exports = { get, set, chunk };
