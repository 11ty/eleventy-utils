const test = require("ava");
const { IsPlainObject } = require("../");

test("isPlainObject", (t) => {
  t.is(IsPlainObject(null), false);
  t.is(IsPlainObject(undefined), false);
  t.is(IsPlainObject(1), false);
  t.is(IsPlainObject(true), false);
  t.is(IsPlainObject(false), false);
  t.is(IsPlainObject("string"), false);
  t.is(IsPlainObject([]), false);
  t.is(IsPlainObject(Symbol("a")), false);
  t.is(
    IsPlainObject(function () {}),
    false
  );
});

// https://github.com/lodash/lodash/blob/ddfd9b11a0126db2302cb70ec9973b66baec0975/test/test.js#L11447
// Notably, did not include the test for DOM Elements.
test("Test from lodash.isPlainObject", (t) => {
  t.is(IsPlainObject({}), true);
  t.is(IsPlainObject({ a: 1 }), true);

  function Foo(a) {
    this.a = 1;
  }

  t.is(IsPlainObject({ constructor: Foo }), true);
  t.is(IsPlainObject([1, 2, 3]), false);
  t.is(IsPlainObject(new Foo(1)), false);
});

test("Test from lodash.isPlainObject: should return `true` for objects with a `[[Prototype]]` of `null`", (t) => {
  let obj = Object.create(null);
  t.is(IsPlainObject(obj), true);

  obj.constructor = Object.prototype.constructor;
  t.is(IsPlainObject(obj), true);
});

test("Test from lodash.isPlainObject: should return `true` for objects with a `valueOf` property", (t) => {
  t.is(IsPlainObject({ valueOf: 0 }), true);
});

test("Test from lodash.isPlainObject: should return `true` for objects with a writable `Symbol.toStringTag` property", (t) => {
  let obj = {};
  obj[Symbol.toStringTag] = "X";

  t.is(IsPlainObject(obj), true);
});

test("Test from lodash.isPlainObject: should return `false` for objects with a custom `[[Prototype]]`", (t) => {
  let obj = Object.create({ a: 1 });
  t.is(IsPlainObject(obj), false);
});

test("Test from lodash.isPlainObject (modified): should return `false` for non-Object objects", (t) => {
  t.is(IsPlainObject(arguments), true); // WARNING: lodash was false
  t.is(IsPlainObject(Error), false);
  t.is(IsPlainObject(Math), true); // WARNING: lodash was false
});

test("Test from lodash.isPlainObject: should return `false` for non-objects", (t) => {
  t.is(IsPlainObject(true), false);
  t.is(IsPlainObject("a"), false);
  t.is(IsPlainObject(Symbol("a")), false);
});

test("Test from lodash.isPlainObject (modified): should return `true` for objects with a read-only `Symbol.toStringTag` property", (t) => {
  var object = {};
  Object.defineProperty(object, Symbol.toStringTag, {
    configurable: true,
    enumerable: false,
    writable: false,
    value: "X",
  });

  t.is(IsPlainObject(object), true); // WARNING: lodash was false
});
