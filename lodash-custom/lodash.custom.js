/**
 * Reduced `get`, `set`, and `chunk` from Lodash <https://lodash.com/>
 * Copyright OpenJS Foundation and other contributors <https://openjsf.org/>
 * Released under MIT license <https://lodash.com/license>
 */
const reIsDeepProp = /\.|\[(?:[^[\]]*|(["'])(?:(?!\1)[^\\]|\\.)*?\1)\]/;
const reIsPlainProp = /^\w*$/;
const rePropName = /[^.[\]]+|\[(?:(-?\d+(?:\.\d+)?)|(["'])((?:(?!\2)[^\\]|\\.)*?)\2)\]|(?=(?:\.|\[\])(?:\.|\[\]|$))/g;
const reEscapeChar = /\\(\\)?/g;
const reIsUint = /^(?:0|[1-9]\d*)$/;

const MAX_CACHE_SIZE = 500;
const pathCache = new Map();

function stringToPath(string) {
	let cached = pathCache.get(string);
	if(cached) {
		return cached;
	}

	let result = [];
	if(string.charCodeAt(0) === 46 /* . */) {
		result.push("");
	}
	string.replace(rePropName, (match, number, quote, subString) => {
		result.push(quote ? subString.replace(reEscapeChar, "$1") : (number || match));
	});

	if(pathCache.size === MAX_CACHE_SIZE) {
		pathCache.clear();
	}
	pathCache.set(string, result);
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
	return Object.is(value, -0) ? "-0" : String(value);
}

function isIndex(value) {
	let type = typeof value;
	return (type === "number" || (type === "string" && reIsUint.test(value))) &&
		value > -1 && value % 1 === 0 && value < Number.MAX_SAFE_INTEGER;
}

function isObject(value) {
	let type = typeof value;
	return value != null && (type === "object" || type === "function");
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

		let newValue = value;
		if(index !== lastIndex) {
			let objValue = nested[key];
			newValue = isObject(objValue) ? objValue : (isIndex(path[index + 1]) ? [] : {});
		}
		nested[key] = newValue;
		nested = nested[key];
	}
	return object;
}

function chunk(array, size) {
	size = size === undefined ? 1 : Math.max(Math.trunc(Number(size)) || 0, 0);
	let length = array == null ? 0 : array.length;
	if(!length || size < 1) {
		return [];
	}

	let result = [];
	for(let index = 0; index < length; index += size) {
		result.push(Array.prototype.slice.call(array, index, index + size));
	}
	return result;
}

module.exports = { get, set, chunk };
