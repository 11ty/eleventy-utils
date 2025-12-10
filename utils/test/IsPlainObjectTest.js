const assert = require("node:assert/strict")
const test = require("node:test");
const { isPlainObject } = require("../");


test("isPlainObject", (t) => {
  assert.equal(isPlainObject(null), false);
  assert.equal(isPlainObject(undefined), false);
  assert.equal(isPlainObject(1), false);
  assert.equal(isPlainObject(true), false);
  assert.equal(isPlainObject(false), false);
  assert.equal(isPlainObject("string"), false);
  assert.equal(isPlainObject([]), false);
  assert.equal(isPlainObject(Symbol("a")), false);
  assert.equal(
    isPlainObject(function () {}),
    false
  );
});

// https://github.com/lodash/lodash/blob/ddfd9b11a0126db2302cb70ec9973b66baec0975/test/test.js#L11447
// Notably, did not include the test for DOM Elements.
test("Test from lodash.itPlainObject", (t) => {
  assert.equal(isPlainObject({}), true);
  assert.equal(isPlainObject({ a: 1 }), true);

  function Foo(a) {
    this.a = 1;
  }

  assert.equal(isPlainObject({ constructor: Foo }), true);
  assert.equal(isPlainObject([1, 2, 3]), false);
  assert.equal(isPlainObject(new Foo(1)), false);
});

test("Test from lodash.itPlainObject: should return `true` for objects with a `[[Prototype]]` of `null`", (t) => {
  let obj = Object.create(null);
  assert.equal(isPlainObject(obj), true);

  obj.constructor = Object.prototype.constructor;
  assert.equal(isPlainObject(obj), true);
});

test("Test from lodash.itPlainObject: should return `true` for objects with a `valueOf` property", (t) => {
  assert.equal(isPlainObject({ valueOf: 0 }), true);
});

test("Test from lodash.itPlainObject: should return `true` for objects with a writable `Symbol.toStringTag` property", (t) => {
  let obj = {};
  obj[Symbol.toStringTag] = "X";

  assert.equal(isPlainObject(obj), true);
});

test("Test from lodash.itPlainObject: should return `false` for objects with a custom `[[Prototype]]`", (t) => {
  let obj = Object.create({ a: 1 });
  assert.equal(isPlainObject(obj), false);
});

test("Test from lodash.itPlainObject (modified): should return `false` for non-Object objects", (t) => {
  assert.equal(isPlainObject(arguments), true); // WARNING: lodash was false
  assert.equal(isPlainObject(Error), false);
  assert.equal(isPlainObject(Math), true); // WARNING: lodash was false
});

test("Test from lodash.itPlainObject: should return `false` for non-objects", (t) => {
  assert.equal(isPlainObject(true), false);
  assert.equal(isPlainObject("a"), false);
  assert.equal(isPlainObject(Symbol("a")), false);
});

test("Test from lodash.itPlainObject (modified): should return `true` for objects with a read-only `Symbol.toStringTag` property", (t) => {
  var object = {};
  Object.defineProperty(object, Symbol.toStringTag, {
    configurable: true,
    enumerable: false,
    writable: false,
    value: "X",
  });

  assert.equal(isPlainObject(object), true); // WARNING: lodash was false
});
