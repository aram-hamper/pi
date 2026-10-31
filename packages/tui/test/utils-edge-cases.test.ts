// Edge-case tests for utils.ts functions

import assert from "node:assert";
import { describe, it } from "node:test";
import {
	getOsc8LinkAtColumn,
	replaceControlCharacters,
	sliceByColumn,
	stripTerminalSequences,
	truncateToWidth,
	visibleWidth,
	wrapTextWithAnsi,
} from "../src/utils.ts";

describe("visibleWidth edge cases", () => {
	it("empty string is 0", () => {
		assert.strictEqual(visibleWidth(""), 0);
	});

	it("plain ASCII", () => {
		assert.strictEqual(visibleWidth("hello"), 5);
	});

	it("tab counts as 3 columns", () => {
		assert.strictEqual(visibleWidth("\t"), 3);
		assert.strictEqual(visibleWidth("a\tb"), 5);
	});

	it("CJK characters are 2 columns each", () => {
		assert.strictEqual(visibleWidth("日"), 2);
		assert.strictEqual(visibleWidth("日本語"), 6);
	});

	it("emoji is 2 columns", () => {
		assert.strictEqual(visibleWidth("🎉"), 2);
	});

	it("ANSI SGR codes are zero-width", () => {
		assert.strictEqual(visibleWidth("\x1b[31mhello\x1b[0m"), 5);
		assert.strictEqual(visibleWidth("\x1b[1;4;31mtext\x1b[0m"), 4);
	});

	it("OSC 8 hyperlink codes are zero-width", () => {
		assert.strictEqual(visibleWidth("\x1b]8;;https://example.com\x07link\x1b]8;;\x07"), 4);
		assert.strictEqual(visibleWidth("\x1b]8;;https://example.com\x1b\\link\x1b]8;;\x1b\\"), 4);
	});

	it("APC sequences are zero-width", () => {
		assert.strictEqual(visibleWidth("\x1b_pi:c\x07"), 0);
		assert.strictEqual(visibleWidth("a\x1b_pi:c\x07b"), 2);
	});

	it("mixed ASCII and CJK", () => {
		// "ab" = 2, "日" = 2, "cd" = 2 → total 6
		assert.strictEqual(visibleWidth("ab日cd"), 6);
	});

	it("string with only ANSI codes is 0", () => {
		assert.strictEqual(visibleWidth("\x1b[31m\x1b[0m"), 0);
	});

	it("256-color ANSI codes are zero-width", () => {
		assert.strictEqual(visibleWidth("\x1b[38;5;240mtext\x1b[39m"), 4);
	});

	it("truecolor ANSI codes are zero-width", () => {
		assert.strictEqual(visibleWidth("\x1b[38;2;255;0;0mtext\x1b[39m"), 4);
	});

	it("combining characters do not add width", () => {
		// 'a' + combining grave accent = 1 column
		assert.strictEqual(visibleWidth("a\u0300"), 1);
	});

	it("regional indicator pairs are 2 columns", () => {
		// 🇨🇳 = flag emoji = 2 columns
		assert.strictEqual(visibleWidth("🇨🇳"), 2);
	});
});

describe("stripTerminalSequences edge cases", () => {
	it("empty string returns empty string", () => {
		assert.strictEqual(stripTerminalSequences(""), "");
	});

	it("plain text is unchanged", () => {
		assert.strictEqual(stripTerminalSequences("hello world"), "hello world");
	});

	it("removes 256-color sequences", () => {
		assert.strictEqual(stripTerminalSequences("\x1b[38;5;240mtext\x1b[39m"), "text");
	});

	it("removes truecolor sequences", () => {
		assert.strictEqual(stripTerminalSequences("\x1b[38;2;255;0;0mtext\x1b[39m"), "text");
	});

	it("removes cursor movement sequences", () => {
		assert.strictEqual(stripTerminalSequences("\x1b[2Ghello"), "hello");
		assert.strictEqual(stripTerminalSequences("\x1b[1Khello"), "hello");
	});

	it("removes APC sequences", () => {
		assert.strictEqual(stripTerminalSequences("\x1b_pi:c\x07text"), "text");
	});

	it("handles multiple sequences in sequence", () => {
		assert.strictEqual(stripTerminalSequences("\x1b[31m\x1b[1mhello\x1b[22m\x1b[39m"), "hello");
	});

	it("preserves non-ASCII text", () => {
		assert.strictEqual(stripTerminalSequences("\x1b[31m日本語\x1b[0m"), "日本語");
	});

	it("lone ESC is preserved (not a valid sequence)", () => {
		// A lone ESC with no following bracket is not a recognized sequence
		const result = stripTerminalSequences("a\x1bb");
		// The lone ESC is not a CSI/OSC/APC sequence, so it passes through
		assert.ok(result.includes("a"));
		assert.ok(result.includes("b"));
	});
});

describe("replaceControlCharacters edge cases", () => {
	it("empty string returns empty string", () => {
		assert.strictEqual(replaceControlCharacters(""), "");
	});

	it("replaces tab with space", () => {
		assert.strictEqual(replaceControlCharacters("\t"), " ");
	});

	it("replaces null byte with space", () => {
		assert.strictEqual(replaceControlCharacters("\x00"), " ");
	});

	it("replaces DEL with space", () => {
		assert.strictEqual(replaceControlCharacters("\x7f"), " ");
	});

	it("replaces C1 control characters with space", () => {
		assert.strictEqual(replaceControlCharacters("\x80"), " ");
		assert.strictEqual(replaceControlCharacters("\x9f"), " ");
	});

	it("collapses multiple consecutive control chars to one space", () => {
		assert.strictEqual(replaceControlCharacters("\x00\x01\x02"), " ");
		assert.strictEqual(replaceControlCharacters("\n\r\t"), " ");
	});

	it("preserves printable ASCII", () => {
		assert.strictEqual(replaceControlCharacters("Hello, World!"), "Hello, World!");
	});

	it("preserves Unicode text", () => {
		assert.strictEqual(replaceControlCharacters("日本語"), "日本語");
	});

	it("replaces control chars between printable chars", () => {
		assert.strictEqual(replaceControlCharacters("a\x00b"), "a b");
		assert.strictEqual(replaceControlCharacters("a\nb"), "a b");
	});
});

describe("sliceByColumn edge cases", () => {
	it("empty string returns empty string", () => {
		assert.strictEqual(sliceByColumn("", 0, 5), "");
	});

	it("zero length returns empty string", () => {
		assert.strictEqual(sliceByColumn("hello", 0, 0), "");
	});

	it("negative length returns empty string", () => {
		assert.strictEqual(sliceByColumn("hello", 0, -1), "");
	});

	it("start beyond string length returns empty string", () => {
		assert.strictEqual(sliceByColumn("hello", 100, 5), "");
	});

	it("slices plain ASCII correctly", () => {
		assert.strictEqual(sliceByColumn("hello world", 0, 5), "hello");
		assert.strictEqual(sliceByColumn("hello world", 6, 5), "world");
	});

	it("slices CJK wide characters by column", () => {
		// Each CJK char = 2 columns
		assert.strictEqual(sliceByColumn("日本語", 0, 2), "日");
		assert.strictEqual(sliceByColumn("日本語", 0, 4), "日本");
		assert.strictEqual(sliceByColumn("日本語", 2, 2), "本");
	});

	it("strict mode excludes wide char that would extend past boundary", () => {
		// "日" is 2 columns; requesting 1 column in strict mode should exclude it
		const result = sliceByColumn("日本語", 0, 1, true);
		assert.strictEqual(visibleWidth(result), 0);
	});

	it("preserves ANSI codes within the slice", () => {
		const result = sliceByColumn("\x1b[31mhello\x1b[0m", 0, 5);
		assert.ok(result.includes("hello"));
		assert.ok(result.includes("\x1b[31m"));
	});

	it("re-opens active ANSI style when slice starts after the code", () => {
		// Red style starts before the slice point
		const result = sliceByColumn("\x1b[31mhello world\x1b[0m", 6, 5);
		assert.ok(result.includes("world"));
		assert.ok(result.includes("\x1b[31m"), "should re-open red style");
	});

	it("handles tab characters (3 columns each)", () => {
		const result = sliceByColumn("a\tb", 0, 4);
		assert.ok(result.includes("a"));
		assert.ok(result.includes("\t"));
	});

	it("result visible width matches requested length for ASCII", () => {
		const result = sliceByColumn("abcdefghij", 2, 5);
		assert.strictEqual(visibleWidth(result), 5);
	});
});

describe("truncateToWidth edge cases", () => {
	it("empty string with pad returns spaces", () => {
		const result = truncateToWidth("", 5, "...", true);
		assert.strictEqual(result, "     ");
	});

	it("empty string without pad returns empty string", () => {
		assert.strictEqual(truncateToWidth("", 5), "");
	});

	it("maxWidth 0 returns empty string", () => {
		assert.strictEqual(truncateToWidth("hello", 0), "");
	});

	it("text shorter than maxWidth is returned as-is", () => {
		assert.strictEqual(truncateToWidth("hi", 10), "hi");
	});

	it("text shorter than maxWidth with pad is padded", () => {
		const result = truncateToWidth("hi", 5, "...", true);
		assert.strictEqual(result, "hi   ");
		assert.strictEqual(visibleWidth(result), 5);
	});

	it("text exactly at maxWidth is returned as-is", () => {
		assert.strictEqual(truncateToWidth("hello", 5), "hello");
	});

	it("text longer than maxWidth is truncated with ellipsis", () => {
		const result = truncateToWidth("hello world", 8);
		assert.ok(result.includes("..."), "should contain ellipsis");
		assert.ok(visibleWidth(result) <= 8);
	});

	it("custom ellipsis is used", () => {
		const result = truncateToWidth("hello world", 8, "…");
		assert.ok(result.includes("…"), "should contain custom ellipsis");
		assert.ok(visibleWidth(result) <= 8);
	});

	it("empty ellipsis truncates without indicator", () => {
		const result = truncateToWidth("hello world", 5, "");
		// truncateToWidth may add a reset sequence; check visible width and content
		assert.ok(visibleWidth(result) <= 5);
		assert.ok(result.startsWith("hello"));
	});

	it("CJK text is truncated at column boundary", () => {
		// "日本語" = 6 columns; truncate to 4 = "日本" + "..."
		const result = truncateToWidth("日本語", 5);
		assert.ok(visibleWidth(result) <= 5);
	});

	it("ANSI-styled text is truncated correctly", () => {
		const styled = "\x1b[31mhello world\x1b[0m";
		const result = truncateToWidth(styled, 8);
		assert.ok(visibleWidth(result) <= 8);
	});

	it("pad fills to exactly maxWidth", () => {
		const result = truncateToWidth("hi", 10, "...", true);
		assert.strictEqual(visibleWidth(result), 10);
	});

	it("ellipsis wider than maxWidth: text fits without truncation", () => {
		// ellipsis "....." is 5 chars, maxWidth is 3; text "ab" fits in 3
		const result = truncateToWidth("ab", 3, ".....");
		assert.strictEqual(result, "ab");
	});
});

describe("wrapTextWithAnsi edge cases", () => {
	it("empty string returns single empty line", () => {
		assert.deepStrictEqual(wrapTextWithAnsi("", 80), [""]);
	});

	it("text shorter than width returns single line", () => {
		assert.deepStrictEqual(wrapTextWithAnsi("hello", 80), ["hello"]);
	});

	it("text exactly at width returns single line", () => {
		assert.deepStrictEqual(wrapTextWithAnsi("hello", 5), ["hello"]);
	});

	it("wraps at word boundary", () => {
		const lines = wrapTextWithAnsi("hello world", 5);
		assert.strictEqual(lines.length, 2);
		assert.strictEqual(lines[0], "hello");
		assert.strictEqual(lines[1], "world");
	});

	it("breaks long word that exceeds width", () => {
		const lines = wrapTextWithAnsi("abcdefghij", 4);
		for (const line of lines) {
			assert.ok(visibleWidth(line) <= 4, `line "${line}" exceeds width`);
		}
	});

	it("handles multiple newlines", () => {
		const lines = wrapTextWithAnsi("a\n\nb", 80);
		assert.strictEqual(lines.length, 3);
		assert.strictEqual(lines[0], "a");
		assert.strictEqual(lines[1], "");
		assert.strictEqual(lines[2], "b");
	});

	it("preserves ANSI color across line breaks", () => {
		const lines = wrapTextWithAnsi("\x1b[31mhello world\x1b[0m", 5);
		assert.ok(lines.length >= 2);
		// Second line should start with the red color
		assert.ok(lines[1]?.startsWith("\x1b[31m"), "continuation line should reopen color");
	});

	it("trailing whitespace is trimmed from each line", () => {
		const lines = wrapTextWithAnsi("hello   world", 5);
		for (const line of lines) {
			assert.ok(!line.endsWith(" "), `line "${line}" has trailing space`);
		}
	});

	it("width 1 wraps each character to its own line", () => {
		const lines = wrapTextWithAnsi("abc", 1);
		assert.strictEqual(lines.length, 3);
		assert.deepStrictEqual(lines, ["a", "b", "c"]);
	});

	it("CJK characters wrap at column boundary", () => {
		// Each CJK char = 2 columns; width 4 = 2 chars per line
		const lines = wrapTextWithAnsi("日本語中", 4);
		for (const line of lines) {
			assert.ok(visibleWidth(line) <= 4, `line "${line}" exceeds width`);
		}
	});
});

describe("getOsc8LinkAtColumn edge cases", () => {
	it("empty string returns undefined", () => {
		assert.strictEqual(getOsc8LinkAtColumn("", 0), undefined);
	});

	it("column beyond string length returns undefined", () => {
		const line = "\x1b]8;;https://example.com\x1b\\link\x1b]8;;\x1b\\";
		assert.strictEqual(getOsc8LinkAtColumn(line, 100), undefined);
	});

	it("column 0 in plain text returns undefined", () => {
		assert.strictEqual(getOsc8LinkAtColumn("hello", 0), undefined);
	});

	it("returns URL for column inside hyperlink", () => {
		const url = "https://example.com";
		const line = `\x1b]8;;${url}\x1b\\link\x1b]8;;\x1b\\`;
		assert.strictEqual(getOsc8LinkAtColumn(line, 0), url);
		assert.strictEqual(getOsc8LinkAtColumn(line, 1), url);
		assert.strictEqual(getOsc8LinkAtColumn(line, 3), url);
	});

	it("returns undefined after closing sequence", () => {
		const url = "https://example.com";
		const line = `\x1b]8;;${url}\x1b\\link\x1b]8;;\x1b\\after`;
		// "link" is 4 columns; "after" starts at column 4
		assert.strictEqual(getOsc8LinkAtColumn(line, 4), undefined);
	});

	it("handles multiple hyperlinks in one line", () => {
		const url1 = "https://first.com";
		const url2 = "https://second.com";
		const line = `\x1b]8;;${url1}\x1b\\ab\x1b]8;;\x1b\\ \x1b]8;;${url2}\x1b\\cd\x1b]8;;\x1b\\`;
		// "ab" at cols 0-1, space at col 2, "cd" at cols 3-4
		assert.strictEqual(getOsc8LinkAtColumn(line, 0), url1);
		assert.strictEqual(getOsc8LinkAtColumn(line, 1), url1);
		assert.strictEqual(getOsc8LinkAtColumn(line, 2), undefined);
		assert.strictEqual(getOsc8LinkAtColumn(line, 3), url2);
		assert.strictEqual(getOsc8LinkAtColumn(line, 4), url2);
	});

	it("handles BEL-terminated hyperlinks", () => {
		const url = "https://example.com";
		const line = `\x1b]8;;${url}\x07link\x1b]8;;\x07`;
		assert.strictEqual(getOsc8LinkAtColumn(line, 0), url);
	});

	it("handles hyperlink with params", () => {
		const url = "https://example.com";
		const line = `\x1b]8;id=1;${url}\x1b\\link\x1b]8;;\x1b\\`;
		assert.strictEqual(getOsc8LinkAtColumn(line, 0), url);
	});

	it("CJK characters in hyperlink text", () => {
		const url = "https://example.com";
		// "日" = 2 columns
		const line = `\x1b]8;;${url}\x1b\\日\x1b]8;;\x1b\\`;
		assert.strictEqual(getOsc8LinkAtColumn(line, 0), url);
		assert.strictEqual(getOsc8LinkAtColumn(line, 1), url);
		assert.strictEqual(getOsc8LinkAtColumn(line, 2), undefined);
	});
});
