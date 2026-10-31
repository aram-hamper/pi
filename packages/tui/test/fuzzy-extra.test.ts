// Edge-case tests for fuzzy matching functions

import assert from "node:assert";
import { describe, it } from "node:test";
import { fuzzyFilter, fuzzyMatch } from "../src/fuzzy.ts";

describe("fuzzyMatch edge cases", () => {
	it("empty query matches empty text", () => {
		const result = fuzzyMatch("", "");
		assert.strictEqual(result.matches, true);
		assert.strictEqual(result.score, 0);
	});

	it("empty text does not match non-empty query", () => {
		const result = fuzzyMatch("a", "");
		assert.strictEqual(result.matches, false);
	});

	it("single character query matches single character text", () => {
		assert.strictEqual(fuzzyMatch("a", "a").matches, true);
		assert.strictEqual(fuzzyMatch("a", "b").matches, false);
	});

	it("query equal to text has very good score", () => {
		const exact = fuzzyMatch("hello", "hello");
		const partial = fuzzyMatch("hello", "hello world");
		assert.ok(exact.score < partial.score, "exact match should score better than partial");
	});

	it("query longer than text never matches", () => {
		assert.strictEqual(fuzzyMatch("abcdef", "abc").matches, false);
	});

	it("all characters present but not in order does not match", () => {
		assert.strictEqual(fuzzyMatch("ba", "ab").matches, false);
	});

	it("query with repeated characters matches correctly", () => {
		assert.strictEqual(fuzzyMatch("aa", "aa").matches, true);
		assert.strictEqual(fuzzyMatch("aa", "a").matches, false);
		assert.strictEqual(fuzzyMatch("aa", "xax").matches, false);
		assert.strictEqual(fuzzyMatch("aa", "xaax").matches, true);
	});

	it("word boundary at start of string rewards match", () => {
		const atStart = fuzzyMatch("h", "hello");
		const notAtStart = fuzzyMatch("h", "xhello");
		assert.ok(atStart.score < notAtStart.score, "match at start should score better");
	});

	it("word boundary after separator rewards match", () => {
		const atBoundary = fuzzyMatch("b", "foo-bar");
		const notAtBoundary = fuzzyMatch("b", "foobar");
		assert.ok(atBoundary.score < notAtBoundary.score, "match at word boundary should score better");
	});

	it("handles special regex characters in query", () => {
		// These should not throw
		assert.doesNotThrow(() => fuzzyMatch("(test)", "test"));
		assert.doesNotThrow(() => fuzzyMatch("[abc]", "abc"));
		assert.doesNotThrow(() => fuzzyMatch("a.b", "axb"));
	});

	it("numeric-alpha swap: '52codex' matches 'gpt-5.2-codex'", () => {
		const result = fuzzyMatch("52codex", "gpt-5.2-codex");
		assert.strictEqual(result.matches, true);
	});

	it("alpha-numeric swap: 'codex52' matches 'gpt-5.2-codex'", () => {
		const result = fuzzyMatch("codex52", "gpt-5.2-codex");
		assert.strictEqual(result.matches, true);
	});

	it("swap only applies when primary match fails", () => {
		// "ab12" matches "ab12" directly, no swap needed
		const direct = fuzzyMatch("ab12", "ab12");
		assert.strictEqual(direct.matches, true);
	});

	it("score is a number (not NaN or Infinity)", () => {
		const result = fuzzyMatch("test", "testing");
		assert.ok(Number.isFinite(result.score));
	});

	it("Unicode query matches Unicode text", () => {
		assert.strictEqual(fuzzyMatch("日本", "日本語").matches, true);
		assert.strictEqual(fuzzyMatch("語日", "日本語").matches, false);
	});
});

describe("fuzzyFilter edge cases", () => {
	it("empty items returns empty array", () => {
		const result = fuzzyFilter([], "query", (x: string) => x);
		assert.deepStrictEqual(result, []);
	});

	it("whitespace-only query returns all items", () => {
		const items = ["a", "b", "c"];
		assert.deepStrictEqual(fuzzyFilter(items, "   ", (x: string) => x), items);
	});

	it("query with only slashes returns all items", () => {
		const items = ["a", "b"];
		assert.deepStrictEqual(fuzzyFilter(items, "///", (x: string) => x), items);
	});

	it("multi-token query: all tokens must match", () => {
		const items = ["foo bar", "foo baz", "qux bar"];
		const result = fuzzyFilter(items, "foo bar", (x: string) => x);
		assert.ok(result.includes("foo bar"));
		assert.ok(!result.includes("foo baz"));
		assert.ok(!result.includes("qux bar"));
	});

	it("slash-separated tokens: all must match", () => {
		const items = ["openai/gpt-4", "anthropic/claude", "openai/gpt-3"];
		const result = fuzzyFilter(items, "openai/gpt", (x: string) => x);
		assert.ok(result.includes("openai/gpt-4"));
		assert.ok(result.includes("openai/gpt-3"));
		assert.ok(!result.includes("anthropic/claude"));
	});

	it("preserves original item references", () => {
		const items = [{ id: 1, name: "foo" }, { id: 2, name: "bar" }];
		const result = fuzzyFilter(items, "foo", (item) => item.name);
		assert.strictEqual(result[0], items[0]);
	});

	it("sorts by score ascending (best first)", () => {
		const items = ["foobar", "foo", "f_o_o"];
		const result = fuzzyFilter(items, "foo", (x: string) => x);
		// "foo" is exact match, should be first
		assert.strictEqual(result[0], "foo");
	});

	it("no items match returns empty array", () => {
		const items = ["apple", "banana", "cherry"];
		const result = fuzzyFilter(items, "xyz", (x: string) => x);
		assert.deepStrictEqual(result, []);
	});

	it("single item that matches", () => {
		const result = fuzzyFilter(["hello"], "hlo", (x: string) => x);
		assert.deepStrictEqual(result, ["hello"]);
	});

	it("single item that does not match", () => {
		const result = fuzzyFilter(["hello"], "xyz", (x: string) => x);
		assert.deepStrictEqual(result, []);
	});

	it("getText function is called for each item", () => {
		const calls: number[] = [];
		const items = [1, 2, 3];
		fuzzyFilter(items, "a", (item: number) => {
			calls.push(item);
			return "a";
		});
		assert.deepStrictEqual(calls.sort(), [1, 2, 3]);
	});
});
