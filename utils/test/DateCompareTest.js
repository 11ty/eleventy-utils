const assert = require("node:assert/strict")
const test = require("node:test");
const suite = test.suite;

const DateCompare = require("../src/DateCompare.js");

suite("Date Compare", () => {
	test("Basic usage empty duration is the same as infinite duration", (t) => {
		let jan1 = Date.UTC(2024,0,1);
		assert.equal(DateCompare.isTimestampWithinDuration(jan1), true);
		assert.equal(DateCompare.isTimestampWithinDuration(Date.now()), true);
		assert.equal(DateCompare.isTimestampWithinDuration(jan1, Infinity), true);
		assert.equal(DateCompare.isTimestampWithinDuration(Date.now(), Infinity), true);
	});
	
	test("Basic usage false, now", (t) => {
		assert.equal(DateCompare.isTimestampWithinDuration(Date.now(), "0s"), false);
		assert.equal(DateCompare.isTimestampWithinDuration(Date.now(), "0s", Date.now()), false);
	});
	
	test("Basic usage false, old date", (t) => {
		let jan1 = Date.UTC(2024,0,1);
		assert.equal(DateCompare.isTimestampWithinDuration(jan1, "24h"), false);
		assert.equal(DateCompare.isTimestampWithinDuration(jan1, "24h", Date.now()), false);
	});
	
	test("Basic usage true, now", (t) => {
		assert.equal(DateCompare.isTimestampWithinDuration(Date.now(), "1s"), true);
	});
	
	test("Basic usage true, old date", (t) => {
		let jan1 = Date.UTC(2024,0,1);
		let jan2 = Date.UTC(2024,0,2);
		assert.equal(DateCompare.isTimestampWithinDuration(jan1, "25h", jan2), true);
	});
	
	test("Basic usage equality is false, needs to be > not >=", (t) => {
		let jan1 = Date.UTC(2024,0,1);
		let jan2 = Date.UTC(2024,0,2);
		assert.equal(DateCompare.isTimestampWithinDuration(jan1, "24h", jan2), false);
	});
})