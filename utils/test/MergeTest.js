"use strict";
// above is required for Object.freeze to fail correctly.

const assert = require("node:assert/strict")
const test = require("node:test");
const suite = test.suite;

const Merge = require("../src/Merge.js");
const { DeepCopy } = Merge;

suite("Merge", () => {
  test("Shallow Merge", (t) => {
    assert.deepEqual(Merge({}, {}), {});
    assert.deepEqual(Merge({ a: 1 }, { a: 2 }), { a: 2 });
    assert.deepEqual(Merge({ a: 1 }, { a: 2 }, undefined), { a: 2 });
    assert.deepEqual(Merge({ a: 1 }, { a: 2 }, { a: 3 }), { a: 3 });
  
    assert.deepEqual(Merge({ a: 1 }, { b: 1 }), { a: 1, b: 1 });
    assert.deepEqual(Merge({ a: 1 }, { b: 1 }, { c: 1 }), { a: 1, b: 1, c: 1 });
  
    assert.deepEqual(Merge({ a: [1] }, { a: [2] }), { a: [1, 2] });
  });
  
  test("Doesn’t need to return", (t) => {
    var b = { a: 2 };
    Merge(b, { a: 1 });
    assert.deepEqual(b, { a: 1 });
  });
  
  test("Invalid", (t) => {
    assert.deepEqual(Merge({}, 1), {});
    assert.deepEqual(Merge({}, [1]), {});
    assert.deepEqual(Merge({}, "string"), {});
  });
  
  test("Merge arrays", (t) => {
    assert.deepEqual(Merge([1],[2, 3]), [1,2,3]);
  });
  
  test("Non-Object target", (t) => {
    assert.deepEqual(Merge(1, { a: 1 }), { a: 1 });
    assert.deepEqual(Merge([1], { a: 1 }), { a: 1 });
    assert.deepEqual(Merge("string", { a: 1 }), { a: 1 });
  });
  
  test("Deep", (t) => {
    assert.deepEqual(Merge({ a: { b: 1 } }, { a: { c: 1 } }), { a: { b: 1, c: 1 } });
    assert.deepEqual(Merge({ a: { b: 1 } }, { a: { c: 1 } }, undefined), {
      a: { b: 1, c: 1 },
    });
  });
  
  test("Deep, override: prefix", (t) => {
    assert.deepEqual(Merge({ a: { b: [1, 2] } }, { a: { b: [3, 4] } }), {
      a: { b: [1, 2, 3, 4] },
    });
    assert.deepEqual(Merge({ a: [1] }, { a: [2] }), { a: [1, 2] });
    assert.deepEqual(Merge({ a: [1] }, { "override:a": [2] }), { a: [2] });
    assert.deepEqual(Merge({ a: { b: [1, 2] } }, { a: { "override:b": [3, 4] } }), {
      a: { b: [3, 4] },
    });
  });
  
  test("Deep, override: prefix at root", (t) => {
    assert.deepEqual(Merge({ "override:a": [1] }, { a: [2] }), { a: [1, 2] });
  });
  
  test("Deep, override: prefix at other placements", (t) => {
    assert.deepEqual(
      Merge(
        {
          a: {
            a: [1],
          },
        },
        {
          a: {
            a: [2],
          },
        }
      ),
      {
        a: {
          a: [1, 2],
        },
      }
    );
  
    assert.deepEqual(
      Merge(
        {
          a: {
            a: [1],
          },
        },
        {
          a: {
            "override:a": [2],
          },
        }
      ),
      {
        a: {
          a: [2],
        },
      }
    );
  
    assert.deepEqual(
      Merge(
        {
          "override:a": {
            a: [1],
          },
        },
        {
          a: {
            a: [2],
          },
        }
      ),
      {
        a: {
          a: [1, 2],
        },
      }
    );
  
    assert.deepEqual(
      Merge(
        {
          a: {
            a: [1],
            b: [1],
          },
        },
        {
          "override:a": {
            a: [2],
          },
        }
      ),
      {
        a: {
          a: [2],
        },
      }
    );
  
    assert.deepEqual(
      Merge(
        {
          a: {
            a: {
              a: [1],
            },
          },
        },
        {
          a: {
            "override:a": {
              a: [2],
            },
          },
        }
      ),
      {
        a: {
          a: {
            a: [2],
          },
        },
      }
    );
  });
  
  test("Edge case from #2470", (t) => {
    assert.deepEqual(
      Merge(
        {
          a: {
            b: {
              c: [1],
            },
          },
        },
        {
          a: {
            "override:override:b": {
              c: [2],
            },
          },
        }
      ),
      {
        a: {
          b: {
            c: [1],
          },
          "override:b": {
            c: [2],
          },
        },
      }
    );
  });
  
  test.skip("Edge case from #2684 (multiple conflicting override: props)", (t) => {
    assert.deepEqual(
      Merge(
        {
          a: {
            "override:b": {
              c: [1],
            },
          },
        },
        {
          a: {
            "override:b": {
              c: [2],
            },
          },
        }
      ),
      {
        a: {
          b: {
            c: [2],
          },
        },
      }
    );
  });
  
  test("Deep, override: empty", (t) => {
    assert.deepEqual(Merge({}, { a: { b: [3, 4] } }), { a: { b: [3, 4] } });
    assert.deepEqual(Merge({}, { a: [2] }), { a: [2] });
    assert.deepEqual(Merge({}, { "override:a": [2] }), { a: [2] });
    assert.deepEqual(Merge({}, { a: { "override:b": [3, 4] } }), { a: { b: [3, 4] } });
  });
  
  test("DeepCopy", (t) => {
    assert.deepEqual(DeepCopy({}, { a: { b: [3, 4] } }), { a: { b: [3, 4] } });
    assert.deepEqual(DeepCopy({}, { a: [2] }), { a: [2] });
    assert.deepEqual(DeepCopy({}, { a: [2] }, undefined), { a: [2] });
    assert.deepEqual(DeepCopy({}, undefined, { a: [2] }), { a: [2] });
    assert.deepEqual(DeepCopy({}, { "override:a": [2] }), { "override:a": [2] });
    assert.deepEqual(DeepCopy({}, { a: { "override:b": [3, 4] } }), {
      a: { "override:b": [3, 4] },
    });
  });
  
  test("String does not overrides parent key with object", (t) => {
    assert.deepEqual(Merge({
      eleventy: {
        key1: "a"
      }
    }, {
      // this is ignored
      eleventy: "string"
    }), {
      eleventy: {
        key1: "a"
      }
    });
  });
  
  test("Merge with frozen target object fails", () => {
    try {
      Merge({
        eleventy: Object.freeze({
          key1: "a"
        })
      }, {
        eleventy: {
          key2: "b"
        }
      });
  
      // fail on purpose
      assert.equal(true, false);
    } catch(e) {
      assert.equal(true, true);
    }
  });
  
  test("Merge with frozen source object (1 level deep) succeeds", (t) => {
    assert.deepEqual(Merge({
    }, {
      eleventy: Object.freeze({
        key2: "b"
      })
    }), {
      eleventy: {
        key2: "b",
      }
    });
  });
  
  
  test("Merge with frozen source object (1 level deep, mixed) succeeds", (t) => {
    assert.deepEqual(Merge({
      eleventy: {
        key1: "a"
      }
    }, {
      eleventy: Object.freeze({
        key2: "b"
      })
    }), {
      eleventy: {
        key1: "a",
        key2: "b",
      }
    });
  });
  
  test("Merge with frozen array source succeeds", (t) => {
    assert.deepEqual(Merge({
    }, {
      arr: Object.freeze([1, 2, 3])
    }), {
      arr: [1,2,3]
    });
  });
  
  test("Merge with frozen array target fails", (t) => {
    try {
      Merge({
        arr: Object.freeze([1, 2, 3])
      }, {
        arr: [4,5,6]
      });
  
      // fail on purpose
      assert.equal(true, false);
    } catch(e) {
      assert.equal(true, true);
    }
  });
})