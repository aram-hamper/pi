// Tests for utility functions not covered by other test files

import assert from "node:assert";
import { describe, it } from "node:test";
import {
	getOsc8LinkAtColumn,
	replaceControlCharacters,
	sliceByColumn,
	stripTerminalSequences,
	visibleWidth,
} from "../src/utils.ts";

describe("replaceControlCharacters", () => {
	it("replaces C0 control characters with a space", () => {
		assert.strictEqual(replaceControlCharacters("hello\nworld"), "hello world");
		assert.strictEqual(replaceControlCharacters("a\x00b"), "a b");
		assert.strictEqual(replaceControlCharacters("a\x1bb"), "a b");
		assert.strictEqual(replaceControlCharacters("a\x07b"), "a b");
	});

	it("replaces C1 control characters with a space", () => {
		assert.strictEqual(replaceControlCharacters("a\x9bb"), "a b");
		assert.strictEqual(replaceControlCharacters("a\x80b"), "a b");
	});

	it("collapses consecutive control characters into one space", () => {
		assert.strictEqual(replaceControlCharacters("a\n\r\tb"), "a b");
	});

	it("leaves printable ASCII unchanged", () => {
		assert.strictEqual(replaceControlCharacters("hello world!"), "hello world!");
	});

	it("leaves non-ASCII printable characters unchanged", () => {
		assert.strictEqual(replaceControlCharacters("日本語"), "日本語");
	});
});

describe("stripTerminalSequences", () => {
	it("removes CSI SGR sequences", () => {
		assert.strictEqual(stripTerminalSequences("\x1b[31mred\x1b[0m"), "red");
	});

	it("removes multiple SGR sequences in one string", () => {
		assert.strictEqual(
			stripTerminalSequences("\x1b[1m\x1b[4mhello\x1b[24m\x1b[22m world"),
			"hello world",
		);
	});

	it("removes OSC 8 hyperlink sequences", () => {
		assert.strictEqual(
			stripTerminalSequences("\x1b]8;;https://example.com\x07link\x1b]8;;\x07"),
			"link",
		);
	});

	it("removes OSC 8 with ST terminator", () => {
		assert.strictEqual(
			stripTerminalSequences("\x1b]8;;https://example.com\x1b\\link\x1b]8;;\x1b\\"),
			"link",
		);
	});

	it("removes APC sequences like CURSOR_MARKER", () => {
		assert.strictEqual(stripTerminalSequences("\x1b_pi:c\x07text"), "text");
	});

	it("leaves plain text unchanged", () => {
		assert.strictEqual(stripTerminalSequences("hello world"), "hello world");
	});

	it("handles empty string", () => {
		assert.strictEqual(stripTerminalSequences(""), "");
	});

	it("handles a string with no escape sequences", () => {
		assert.strictEqual(stripTerminalSequences("abc 123"), "abc 123");
	});
});

describe("sliceByColumn", () => {
	it("slices ASCII text from the start", () => {
		assert.strictEqual(sliceByColumn("hello world", 0, 5), "hello");
	});

	it("slices ASCII text from a mid-string offset", () => {
		assert.strictEqual(sliceByColumn("hello world", 6, 5), "world");
		assert.strictEqual(sliceByColumn("hello", 2, 3), "llo");
	});

	it("returns the full string when length exceeds remaining columns", () => {
		assert.strictEqual(sliceByColumn("hello", 0, 100), "hello");
	});

	it("returns empty string when start is beyond the string", () => {
		assert.strictEqual(sliceByColumn("hello", 10, 5), "");
	});

	it("returns empty string for zero-length slice", () => {
		assert.strictEqual(sliceByColumn("hello", 0, 0), "");
	});

	it("slices CJK wide characters by column count", () => {
		// Each CJK char is 2 columns; 4 columns = 2 chars
		assert.strictEqual(sliceByColumn("日本語", 0, 4), "日本");
		// Start at column 2 (after '日'), take 2 columns = '本'
		assert.strictEqual(sliceByColumn("日本語", 2, 2), "本");
		// Start at column 2, take 4 columns = '本語'
		assert.strictEqual(sliceByColumn("日本語", 2, 4), "本語");
	});

	it("re-opens active ANSI style at the slice start", () => {
		// Slice starts inside a red-styled region; the style should be re-opened
		const result = sliceByColumn("\x1b[31mhello\x1b[0m world", 0, 5);
		assert.ok(result.includes("hello"), "should contain the text");
		assert.ok(result.includes("\x1b[31m"), "should include the fg color code");
	});

	it("carries active ANSI style across a slice that starts after the code", () => {
		// The reset \x1b[0m closes the red; 'world' is unstyled
		const result = sliceByColumn("\x1b[31mhello\x1b[0m world", 6, 5);
		assert.ok(result.includes("world"), "should contain the text");
	});

	it("result visible width matches the requested length for ASCII", () => {
		const result = sliceByColumn("abcdefghij", 2, 5);
		assert.strictEqual(visibleWidth(result), 5);
	});

	it("result visible width matches the requested length for CJK in strict mode", () => {
		// 3 CJK chars = 6 columns; slice 4 columns = 2 chars = 4 columns
		const result = sliceByColumn("日本語", 0, 4, true);
		assert.ok(visibleWidth(result) <= 4);
	});
});

describe("getOsc8LinkAtColumn", () => {
	it("returns the URL when the column is inside a hyperlink", () => {
		const url = "https://example.com";
		const line = `\x1b]8;;${url}\x1b\\link text\x1b]8;;\x1b\\`;
		// 'link text' starts at column 0; check column 2 (inside 'nk')
		assert.strictEqual(getOsc8LinkAtColumn(line, 2), url);
	});

	it("returns the URL at the first column of the hyperlink text", () => {
		const url = "https://example.com";
		const line = `\x1b]8;;${url}\x1b\\link\x1b]8;;\x1b\\`;
		assert.strictEqual(getOsc8LinkAtColumn(line, 0), url);
	});

	it("returns the URL at the last column of the hyperlink text", () => {
		const url = "https://example.com";
		const line = `\x1b]8;;${url}\x1b\\link\x1b]8;;\x1b\\`;
		// 'link' is 4 chars; last column is 3
		assert.strictEqual(getOsc8LinkAtColumn(line, 3), url);
	});

	it("returns undefined when the column is outside any hyperlink", () => {
		const url = "https://example.com";
		const line = `before \x1b]8;;${url}\x1b\\link\x1b]8;;\x1b\\ after`;
		// 'before ' is 7 columns; 'link' is 4 columns; 'after' starts at column 11
		assert.strictEqual(getOsc8LinkAtColumn(line, 12), undefined);
	});

	it("returns undefined for plain text with no hyperlinks", () => {
		assert.strictEqual(getOsc8LinkAtColumn("hello world", 3), undefined);
	});

	it("handles BEL-terminated OSC 8 sequences", () => {
		const url = "https://example.com";
		const line = `\x1b]8;;${url}\x07link\x1b]8;;\x07`;
		assert.strictEqual(getOsc8LinkAtColumn(line, 0), url);
	});

	it("returns undefined after the closing sequence", () => {
		const url = "https://example.com";
		const line = `\x1b]8;;${url}\x1b\\link\x1b]8;;\x1b\\after`;
		// 'link' is 4 columns; 'after' starts at column 4
		assert.strictEqual(getOsc8LinkAtColumn(line, 5), undefined);
	});

	it("handles text before the hyperlink", () => {
		const url = "https://example.com";
		// 'pre ' is 4 columns, then 'link' starts at column 4
		const line = `pre \x1b]8;;${url}\x1b\\link\x1b]8;;\x1b\\`;
		assert.strictEqual(getOsc8LinkAtColumn(line, 3), undefined);
		assert.strictEqual(getOsc8LinkAtColumn(line, 4), url);
	});
});
