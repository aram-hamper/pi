// Edge-case tests for word navigation functions

import assert from "node:assert";
import { describe, it } from "node:test";
import { findWordBackward, findWordForward } from "../src/word-navigation.ts";

describe("findWordBackward edge cases", () => {
	it("empty string returns 0", () => {
		assert.strictEqual(findWordBackward("", 0), 0);
	});

	it("cursor past end of string clamps to word boundary", () => {
		const text = "hello";
		// cursor at length is valid
		assert.strictEqual(findWordBackward(text, text.length), 0);
	});

	it("single character word", () => {
		assert.strictEqual(findWordBackward("a", 1), 0);
	});

	it("only whitespace: skips all whitespace to 0", () => {
		assert.strictEqual(findWordBackward("   ", 3), 0);
	});

	it("word followed by trailing spaces", () => {
		// cursor at end of "hello   "
		assert.strictEqual(findWordBackward("hello   ", 8), 0);
	});

	it("multiple words: stops at word boundary", () => {
		const text = "one two three";
		assert.strictEqual(findWordBackward(text, 13), 8); // "three" -> before "three"
		assert.strictEqual(findWordBackward(text, 8), 4); // "two " -> before "two"
		assert.strictEqual(findWordBackward(text, 4), 0); // "one " -> start
	});

	it("hyphenated word: stops at hyphen boundary", () => {
		const text = "foo-bar";
		// "bar" is word-like, stops before it
		assert.strictEqual(findWordBackward(text, 7), 4);
		// "-" is punctuation
		assert.strictEqual(findWordBackward(text, 4), 3);
		// "foo" is word-like
		assert.strictEqual(findWordBackward(text, 3), 0);
	});

	it("mixed punctuation and words", () => {
		const text = "a.b";
		assert.strictEqual(findWordBackward(text, 3), 2); // "b"
		assert.strictEqual(findWordBackward(text, 2), 1); // "."
		assert.strictEqual(findWordBackward(text, 1), 0); // "a"
	});

	it("Unicode: emoji treated as word-like segment", () => {
		const text = "hello 🎉";
		const pos = findWordBackward(text, text.length);
		// Should skip the emoji and land before it
		assert.ok(pos < text.length);
		assert.ok(pos >= 0);
	});

	it("cursor at 0 always returns 0", () => {
		assert.strictEqual(findWordBackward("anything", 0), 0);
		assert.strictEqual(findWordBackward("", 0), 0);
	});
});

describe("findWordForward edge cases", () => {
	it("empty string returns 0", () => {
		assert.strictEqual(findWordForward("", 0), 0);
	});

	it("cursor at end returns end", () => {
		const text = "hello";
		assert.strictEqual(findWordForward(text, text.length), text.length);
	});

	it("single character word", () => {
		assert.strictEqual(findWordForward("a", 0), 1);
	});

	it("only whitespace: skips all whitespace to end", () => {
		assert.strictEqual(findWordForward("   ", 0), 3);
	});

	it("leading spaces then word", () => {
		// Skips leading whitespace, then stops at end of word
		assert.strictEqual(findWordForward("   hello", 0), 8);
	});

	it("multiple words: stops at word boundary", () => {
		const text = "one two three";
		assert.strictEqual(findWordForward(text, 0), 3); // "one"
		assert.strictEqual(findWordForward(text, 3), 7); // " two"
		assert.strictEqual(findWordForward(text, 7), 13); // " three"
	});

	it("hyphenated word: stops at hyphen boundary", () => {
		const text = "foo-bar";
		assert.strictEqual(findWordForward(text, 0), 3); // "foo"
		assert.strictEqual(findWordForward(text, 3), 4); // "-"
		assert.strictEqual(findWordForward(text, 4), 7); // "bar"
	});

	it("mixed punctuation and words", () => {
		const text = "a.b";
		assert.strictEqual(findWordForward(text, 0), 1); // "a"
		assert.strictEqual(findWordForward(text, 1), 2); // "."
		assert.strictEqual(findWordForward(text, 2), 3); // "b"
	});

	it("Unicode: emoji treated as word-like segment", () => {
		const text = "🎉 world";
		const pos = findWordForward(text, 0);
		// Should skip the emoji and land after it
		assert.ok(pos > 0);
		assert.ok(pos <= text.length);
	});

	it("cursor past end returns end", () => {
		const text = "hello";
		assert.strictEqual(findWordForward(text, 100), text.length);
	});
});

describe("findWordBackward and findWordForward symmetry", () => {
	it("forward then backward returns to original position for simple words", () => {
		const text = "hello world";
		const start = 0;
		const fwd = findWordForward(text, start);
		const back = findWordBackward(text, fwd);
		assert.strictEqual(back, start);
	});

	it("backward then forward returns to original position for simple words", () => {
		const text = "hello world";
		const start = 11;
		const back = findWordBackward(text, start);
		const fwd = findWordForward(text, back);
		assert.strictEqual(fwd, start);
	});
});
