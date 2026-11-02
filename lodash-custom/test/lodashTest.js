// Ported from lodash v4 test/test.js <https://github.com/lodash/lodash>, MIT license.
const test = require("node:test");
const assert = require("node:assert");
const { get, set, chunk } = require("../");

const falsey = [, null, undefined, false, 0, NaN, ""];
const empties = [[], {}].concat(falsey.slice(1));
const complexPath = 'a[-1.23]["[\\"b\\"]"].c[\'[\\\'d\\\']\'][\ne\n][f].g';
const complexPathArray = ["a", "-1.23", '["b"]', "c", "['d']", "\ne\n", "f", "g"];

test("chunk", async (t) => {
	let array = [0, 1, 2, 3, 4, 5];

	await t.test("should return chunked arrays", () => {
		assert.deepStrictEqual(chunk(array, 3), [[0, 1, 2], [3, 4, 5]]);
	});

	await t.test("should return the last chunk as remaining elements", () => {
		assert.deepStrictEqual(chunk(array, 4), [[0, 1, 2, 3], [4, 5]]);
	});

	await t.test("should treat falsey `size` values, except `undefined`, as `0`", () => {
		let expected = falsey.map(value => value === undefined ? [[0], [1], [2], [3], [4], [5]] : []);
		let actual = falsey.map((size, index) => index ? chunk(array, size) : chunk(array));
		assert.deepStrictEqual(actual, expected);
	});

	await t.test("should ensure the minimum `size` is `0`", () => {
		let values = falsey.filter(value => value !== undefined).concat(-1, -Infinity);
		assert.deepStrictEqual(values.map(n => chunk(array, n)), values.map(() => []));
	});

	await t.test("should coerce `size` to an integer", () => {
		assert.deepStrictEqual(chunk(array, array.length / 4), [[0], [1], [2], [3], [4], [5]]);
	});

	await t.test("should work as an iteratee for methods like `_.map`", () => {
		assert.deepStrictEqual([[1, 2], [3, 4]].map(chunk), [[[1], [2]], [[3], [4]]]);
	});

	await t.test("should return an empty array when input is empty", () => {
		assert.deepStrictEqual(chunk([], 3), []);
	});
});

test("get", async (t) => {
	await t.test("should get string keyed property values", () => {
		for(let path of ["a", ["a"]]) {
			assert.strictEqual(get({ a: 1 }, path), 1);
		}
	});

	await t.test("should preserve the sign of `0`", () => {
		let object = { "-0": "a", "0": "b" };
		let actual = [-0, Object(-0), 0, Object(0)].map(key => get(object, key));
		assert.deepStrictEqual(actual, ["a", "a", "b", "b"]);
	});

	await t.test("should get symbol keyed property values", () => {
		let symbol = Symbol("a");
		assert.strictEqual(get({ [symbol]: 1 }, symbol), 1);
	});

	await t.test("should get deep property values", () => {
		for(let path of ["a.b", ["a", "b"]]) {
			assert.strictEqual(get({ a: { b: 2 } }, path), 2);
		}
	});

	await t.test("should get a key over a path", () => {
		for(let path of ["a.b", ["a.b"]]) {
			assert.strictEqual(get({ "a.b": 1, a: { b: 2 } }, path), 1);
		}
	});

	await t.test("should not coerce array paths to strings", () => {
		assert.strictEqual(get({ "a,b,c": 3, a: { b: { c: 4 } } }, ["a", "b", "c"]), 4);
	});

	await t.test("should not ignore empty brackets", () => {
		assert.strictEqual(get({ a: { "": 1 } }, "a[]"), 1);
	});

	await t.test("should handle empty paths", () => {
		for(let [empty, emptyKey] of [["", ""], [[], [""]]]) {
			assert.strictEqual(get({}, empty), undefined);
			assert.strictEqual(get({ "": 3 }, emptyKey), 3);
		}
	});

	await t.test("should handle complex paths", () => {
		let object = { a: { "-1.23": { '["b"]': { c: { "['d']": { "\ne\n": { f: { g: 8 } } } } } } } };
		for(let path of [complexPath, complexPathArray]) {
			assert.strictEqual(get(object, path), 8);
		}
	});

	await t.test("should return `undefined` when `object` is nullish", () => {
		for(let path of ["constructor", ["constructor"]]) {
			assert.strictEqual(get(null, path), undefined);
			assert.strictEqual(get(undefined, path), undefined);
		}
	});

	await t.test("should return `undefined` for deep paths when `object` is nullish", () => {
		for(let path of ["constructor.prototype.valueOf", ["constructor", "prototype", "valueOf"]]) {
			assert.deepStrictEqual([null, undefined].map(value => get(value, path)), [undefined, undefined]);
		}
	});

	await t.test("should return `undefined` if parts of `path` are missing", () => {
		for(let path of ["a[1].b.c", ["a", "1", "b", "c"]]) {
			assert.strictEqual(get({ a: [, null] }, path), undefined);
		}
	});

	await t.test("should be able to return `null` values", () => {
		for(let path of ["a.b", ["a", "b"]]) {
			assert.strictEqual(get({ a: { b: null } }, path), null);
		}
	});

	await t.test("should follow `path` over non-plain objects", () => {
		for(let path of ["a.b", ["a", "b"]]) {
			Number.prototype.a = { b: 2 };
			try {
				assert.strictEqual(get(0, path), 2);
			} finally {
				delete Number.prototype.a;
			}
		}
	});

	await t.test("should return the default value for `undefined` values", () => {
		let values = empties.concat(true, new Date(), 1, /x/, "a");
		for(let path of ["a.b", ["a", "b"]]) {
			let actual = values.map(value => [get({ a: {} }, path, value), get(null, path, value)]);
			assert.deepStrictEqual(actual, values.map(value => [value, value]));
		}
	});

	await t.test("should return the default value when `path` is empty", () => {
		assert.strictEqual(get({}, [], "a"), "a");
	});
});

test("set", async (t) => {
	let oldValue = 1;
	let value = 2;

	await t.test("should set property values", () => {
		for(let path of ["a", ["a"]]) {
			let object = { a: oldValue };
			assert.strictEqual(set(object, path, value), object);
			assert.strictEqual(object.a, value);
		}
	});

	await t.test("should preserve the sign of `0`", () => {
		let actual = [-0, Object(-0), 0, Object(0)].map(key => {
			let object = { "-0": "a", "0": "b" };
			set(object, key, value);
			return object[Object.is(key.valueOf(), -0) ? "-0" : "0"];
		});
		assert.deepStrictEqual(actual, [value, value, value, value]);
	});

	await t.test("should set deep property values", () => {
		for(let path of ["a.b", ["a", "b"]]) {
			let object = { a: { b: oldValue } };
			assert.strictEqual(set(object, path, value), object);
			assert.strictEqual(object.a.b, value);
		}
	});

	await t.test("should set a key over a path", () => {
		for(let path of ["a.b", ["a.b"]]) {
			let object = { "a.b": oldValue };
			assert.strictEqual(set(object, path, value), object);
			assert.deepStrictEqual(object, { "a.b": value });
		}
	});

	await t.test("should not coerce array paths to strings", () => {
		let object = { "a,b,c": 1, a: { b: { c: 1 } } };
		set(object, ["a", "b", "c"], value);
		assert.strictEqual(object.a.b.c, value);
	});

	await t.test("should not ignore empty brackets", () => {
		let object = {};
		set(object, "a[]", value);
		assert.deepStrictEqual(object, { a: { "": value } });
	});

	await t.test("should handle empty paths", () => {
		[["", ""], [[], [""]]].forEach(([empty, emptyKey], index) => {
			let object = {};
			set(object, empty, value);
			assert.deepStrictEqual(object, index ? {} : { "": value });
			set(object, emptyKey, value);
			assert.deepStrictEqual(object, { "": value });
		});
	});

	await t.test("should handle complex paths", () => {
		let object = { a: { "1.23": { '["b"]': { c: { "['d']": { "\ne\n": { f: { g: oldValue } } } } } } } };
		for(let path of [complexPath, complexPathArray]) {
			set(object, path, value);
			assert.strictEqual(object.a[-1.23]['["b"]'].c["['d']"]["\ne\n"].f.g, value);
			object.a[-1.23]['["b"]'].c["['d']"]["\ne\n"].f.g = oldValue;
		}
	});

	await t.test("should create parts of `path` that are missing", () => {
		let object = {};
		for(let path of ["a[1].b.c", ["a", "1", "b", "c"]]) {
			let actual = set(object, path, value);
			assert.strictEqual(actual, object);
			assert.deepStrictEqual(actual, { a: [, { b: { c: value } }] });
			assert.ok(!("0" in object.a));
			delete object.a;
		}
	});

	await t.test("should not error when `object` is nullish", () => {
		let actual = [null, undefined].map(object => [set(object, "a.b", value), set(object, ["a", "b"], value)]);
		assert.deepStrictEqual(actual, [[null, null], [undefined, undefined]]);
	});

	await t.test("should overwrite primitives in the path", () => {
		for(let path of ["a.b", ["a", "b"]]) {
			let object = { a: "" };
			set(object, path, value);
			assert.deepStrictEqual(object, { a: { b: 2 } });
		}
	});

	await t.test("should not create an array for missing non-index property names that start with numbers", () => {
		let object = {};
		set(object, ["1a", "2b", "3c"], value);
		assert.deepStrictEqual(object, { "1a": { "2b": { "3c": value } } });
	});

	await t.test("should not assign values that are the same as their destinations", () => {
		for(let value of ["a", ["a"], { a: 1 }, NaN]) {
			let object = {};
			let pass = true;
			Object.defineProperty(object, "a", {
				configurable: true,
				enumerable: true,
				get: () => value,
				set: () => { pass = false; },
			});
			set(object, "a", value);
			assert.ok(pass);
		}
	});
});
