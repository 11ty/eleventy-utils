const assert = require("node:assert/strict")
const test = require("node:test");

const nodeVersionCheck = require("../index.js");

// Change process.version value
Object.defineProperty(process, 'version', { value: 'v10.0.0' })

// Mock process.exit and console.error
var exitCode = null
process.exit = function(code) {
  exitCode = code
}

var errorMessage = null
consoleError = console.error
console.error = function(msg) {
  errorMessage = msg
  consoleError(msg)
}

test("Compare with v1.2 success", async (t) => {
	nodeVersionCheck({
    name: 'Package name',
    engines: {
      node: '>=1.2.0'
    }
  })

  assert.equal(exitCode, null)
  assert.equal(errorMessage, null)
});

test("Compare with v10.0.1 fails", async (t) => {
	nodeVersionCheck({
    name: 'Package name',
    engines: {
      node: '>=10.0.1'
    }
  })

  assert.equal(exitCode, 1)
  assert.equal(errorMessage, 'Package name requires Node >=10.0.1, please upgrade!')
});