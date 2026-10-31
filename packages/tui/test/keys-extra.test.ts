// Edge-case tests for keys.ts functions

import assert from "node:assert";
import { describe, it } from "node:test";
import {
	decodeKittyPrintable,
	isKeyRelease,
	isKeyRepeat,
	Key,
	matchesKey,
	parseKey,
	setKittyProtocolActive,
} from "../src/keys.ts";

describe("isKeyRelease edge cases", () => {
	it("returns false for empty string", () => {
		assert.strictEqual(isKeyRelease(""), false);
	});

	it("returns false for plain text", () => {
		assert.strictEqual(isKeyRelease("hello"), false);
	});

	it("returns false for bracketed paste content containing :3F", () => {
		// Bluetooth MAC address in paste should not be treated as release
		assert.strictEqual(isKeyRelease("\x1b[200~90:62:3F:A5\x1b[201~"), false);
	});

	it("returns true for CSI-u release event (:3u)", () => {
		assert.strictEqual(isKeyRelease("\x1b[97;1:3u"), true);
	});

	it("returns true for arrow key release (:3A)", () => {
		assert.strictEqual(isKeyRelease("\x1b[1;1:3A"), true);
	});

	it("returns true for arrow key release (:3B)", () => {
		assert.strictEqual(isKeyRelease("\x1b[1;1:3B"), true);
	});

	it("returns true for arrow key release (:3C)", () => {
		assert.strictEqual(isKeyRelease("\x1b[1;1:3C"), true);
	});

	it("returns true for arrow key release (:3D)", () => {
		assert.strictEqual(isKeyRelease("\x1b[1;1:3D"), true);
	});

	it("returns true for home/end release (:3H, :3F)", () => {
		assert.strictEqual(isKeyRelease("\x1b[1;1:3H"), true);
		assert.strictEqual(isKeyRelease("\x1b[1;1:3F"), true);
	});

	it("returns true for function key release (:3P, :3Q, :3S)", () => {
		assert.strictEqual(isKeyRelease("\x1b[1;1:3P"), true);
		assert.strictEqual(isKeyRelease("\x1b[1;1:3Q"), true);
		assert.strictEqual(isKeyRelease("\x1b[1;1:3S"), true);
	});

	it("returns true for tilde-terminated release (:3~)", () => {
		assert.strictEqual(isKeyRelease("\x1b[3;1:3~"), true);
	});

	it("returns false for press event (:1u)", () => {
		assert.strictEqual(isKeyRelease("\x1b[97;1:1u"), false);
	});

	it("returns false for repeat event (:2u)", () => {
		assert.strictEqual(isKeyRelease("\x1b[97;1:2u"), false);
	});
});

describe("isKeyRepeat edge cases", () => {
	it("returns false for empty string", () => {
		assert.strictEqual(isKeyRepeat(""), false);
	});

	it("returns false for plain text", () => {
		assert.strictEqual(isKeyRepeat("hello"), false);
	});

	it("returns false for bracketed paste content containing :2F", () => {
		assert.strictEqual(isKeyRepeat("\x1b[200~:2F\x1b[201~"), false);
	});

	it("returns true for CSI-u repeat event (:2u)", () => {
		assert.strictEqual(isKeyRepeat("\x1b[97;1:2u"), true);
	});

	it("returns true for arrow key repeat (:2A)", () => {
		assert.strictEqual(isKeyRepeat("\x1b[1;1:2A"), true);
	});

	it("returns true for tilde-terminated repeat (:2~)", () => {
		assert.strictEqual(isKeyRepeat("\x1b[3;1:2~"), true);
	});

	it("returns false for press event (:1u)", () => {
		assert.strictEqual(isKeyRepeat("\x1b[97;1:1u"), false);
	});

	it("returns false for release event (:3u)", () => {
		assert.strictEqual(isKeyRepeat("\x1b[97;1:3u"), false);
	});
});

describe("decodeKittyPrintable edge cases", () => {
	it("returns undefined for non-CSI-u sequences", () => {
		assert.strictEqual(decodeKittyPrintable("a"), undefined);
		assert.strictEqual(decodeKittyPrintable("\x1b[A"), undefined);
		assert.strictEqual(decodeKittyPrintable(""), undefined);
	});

	it("returns undefined for control characters (codepoint < 32)", () => {
		// ESC = 27
		assert.strictEqual(decodeKittyPrintable("\x1b[27u"), undefined);
		// Tab = 9
		assert.strictEqual(decodeKittyPrintable("\x1b[9u"), undefined);
	});

	it("returns the character for printable ASCII", () => {
		assert.strictEqual(decodeKittyPrintable("\x1b[97u"), "a");
		assert.strictEqual(decodeKittyPrintable("\x1b[65u"), "A");
		assert.strictEqual(decodeKittyPrintable("\x1b[32u"), " ");
	});

	it("returns undefined for Ctrl-modified keys", () => {
		// ctrl+a = modifier 5 (ctrl=4, +1)
		assert.strictEqual(decodeKittyPrintable("\x1b[97;5u"), undefined);
	});

	it("returns undefined for Alt-modified keys", () => {
		// alt+a = modifier 3 (alt=2, +1)
		assert.strictEqual(decodeKittyPrintable("\x1b[97;3u"), undefined);
	});

	it("returns the shifted character for Shift-modified printable keys", () => {
		// shift+a = modifier 2 (shift=1, +1), shifted key = 65 (A)
		assert.strictEqual(decodeKittyPrintable("\x1b[97:65;2u"), "A");
	});

	it("returns undefined for Kitty functional PUA codepoints", () => {
		// F13 = 57376 (in Kitty PUA range)
		assert.strictEqual(decodeKittyPrintable("\x1b[57376u"), undefined);
	});

	it("returns the character for Unicode printable codepoints", () => {
		// 'é' = 233
		assert.strictEqual(decodeKittyPrintable("\x1b[233u"), "é");
	});

	it("returns undefined for Super-modified keys", () => {
		// super+a = modifier 9 (super=8, +1)
		assert.strictEqual(decodeKittyPrintable("\x1b[97;9u"), undefined);
	});
});

describe("Key helper object", () => {
	it("special key constants are correct strings", () => {
		assert.strictEqual(Key.escape, "escape");
		assert.strictEqual(Key.enter, "enter");
		assert.strictEqual(Key.tab, "tab");
		assert.strictEqual(Key.space, "space");
		assert.strictEqual(Key.backspace, "backspace");
		assert.strictEqual(Key.delete, "delete");
		assert.strictEqual(Key.up, "up");
		assert.strictEqual(Key.down, "down");
		assert.strictEqual(Key.left, "left");
		assert.strictEqual(Key.right, "right");
		assert.strictEqual(Key.home, "home");
		assert.strictEqual(Key.end, "end");
		assert.strictEqual(Key.pageUp, "pageUp");
		assert.strictEqual(Key.pageDown, "pageDown");
	});

	it("function key constants are correct strings", () => {
		for (let i = 1; i <= 12; i++) {
			assert.strictEqual(Key[`f${i}` as keyof typeof Key], `f${i}`);
		}
	});

	it("symbol key constants are correct", () => {
		assert.strictEqual(Key.backtick, "`");
		assert.strictEqual(Key.hyphen, "-");
		assert.strictEqual(Key.equals, "=");
		assert.strictEqual(Key.comma, ",");
		assert.strictEqual(Key.period, ".");
		assert.strictEqual(Key.slash, "/");
	});

	it("ctrl() produces correct key id", () => {
		assert.strictEqual(Key.ctrl("c"), "ctrl+c");
		assert.strictEqual(Key.ctrl("z"), "ctrl+z");
		assert.strictEqual(Key.ctrl("a"), "ctrl+a");
	});

	it("shift() produces correct key id", () => {
		assert.strictEqual(Key.shift("a"), "shift+a");
	});

	it("alt() produces correct key id", () => {
		assert.strictEqual(Key.alt("x"), "alt+x");
	});

	it("super() produces correct key id", () => {
		assert.strictEqual(Key.super("k"), "super+k");
	});

	it("ctrlShift() produces correct key id", () => {
		assert.strictEqual(Key.ctrlShift("p"), "ctrl+shift+p");
	});

	it("ctrlAlt() produces correct key id", () => {
		assert.strictEqual(Key.ctrlAlt("x"), "ctrl+alt+x");
	});

	it("ctrlShiftAlt() produces correct key id", () => {
		assert.strictEqual(Key.ctrlShiftAlt("x"), "ctrl+shift+alt+x");
	});
});

describe("matchesKey edge cases", () => {
	it("returns false for invalid key id", () => {
		assert.strictEqual(matchesKey("a", "invalid+key+id+with+duplicate+modifier+ctrl+ctrl+a" as never), false);
	});

	it("returns false for empty data", () => {
		assert.strictEqual(matchesKey("", "a"), false);
		assert.strictEqual(matchesKey("", "escape"), false);
	});

	it("matches all printable ASCII letters", () => {
		for (let i = 97; i <= 122; i++) {
			const char = String.fromCharCode(i);
			assert.strictEqual(matchesKey(char, char as never), true);
		}
	});

	it("matches all digits", () => {
		for (let i = 0; i <= 9; i++) {
			const char = String(i);
			assert.strictEqual(matchesKey(char, char as never), true);
		}
	});

	it("does not match wrong letter", () => {
		assert.strictEqual(matchesKey("a", "b"), false);
		assert.strictEqual(matchesKey("z", "a"), false);
	});

	it("matches escape with esc alias", () => {
		assert.strictEqual(matchesKey("\x1b", "esc"), true);
		assert.strictEqual(matchesKey("\x1b", "escape"), true);
	});

	it("matches enter with return alias", () => {
		assert.strictEqual(matchesKey("\r", "return"), true);
		assert.strictEqual(matchesKey("\r", "enter"), true);
	});

	it("does not match escape with modifier", () => {
		// escape with any modifier is not supported
		assert.strictEqual(matchesKey("\x1b", "ctrl+escape"), false);
	});

	it("matches all function keys F1-F12 via legacy sequences", () => {
		const sequences = [
			"\x1bOP", "\x1bOQ", "\x1b[13~", "\x1bOS",
			"\x1b[15~", "\x1b[17~", "\x1b[18~", "\x1b[19~",
			"\x1b[20~", "\x1b[21~", "\x1b[23~", "\x1b[24~",
		];
		for (let i = 1; i <= 12; i++) {
			assert.strictEqual(matchesKey(sequences[i - 1]!, `f${i}` as never), true);
		}
	});

	it("shift+tab matches \\x1b[Z", () => {
		assert.strictEqual(matchesKey("\x1b[Z", "shift+tab"), true);
	});

	it("does not match tab as shift+tab", () => {
		assert.strictEqual(matchesKey("\t", "shift+tab"), false);
	});

	it("ctrl+letter matches control characters", () => {
		// ctrl+a = 0x01, ctrl+b = 0x02, ..., ctrl+z = 0x1a
		for (let i = 1; i <= 26; i++) {
			const char = String.fromCharCode(i);
			const letter = String.fromCharCode(i + 96);
			assert.strictEqual(matchesKey(char, `ctrl+${letter}` as never), true);
		}
	});

	it("shift+letter matches uppercase", () => {
		setKittyProtocolActive(false);
		assert.strictEqual(matchesKey("A", "shift+a"), true);
		assert.strictEqual(matchesKey("Z", "shift+z"), true);
	});

	it("does not match lowercase as shift+letter", () => {
		setKittyProtocolActive(false);
		assert.strictEqual(matchesKey("a", "shift+a"), false);
	});
});

describe("parseKey edge cases", () => {
	it("returns undefined for empty string", () => {
		assert.strictEqual(parseKey(""), undefined);
	});

	it("returns undefined for unrecognized sequences", () => {
		assert.strictEqual(parseKey("\x1b[999~"), undefined);
	});

	it("parses all printable ASCII letters", () => {
		for (let i = 97; i <= 122; i++) {
			const char = String.fromCharCode(i);
			assert.strictEqual(parseKey(char), char);
		}
	});

	it("parses all digits", () => {
		for (let i = 0; i <= 9; i++) {
			const char = String(i);
			assert.strictEqual(parseKey(char), char);
		}
	});

	it("parses escape", () => {
		assert.strictEqual(parseKey("\x1b"), "escape");
	});

	it("parses tab", () => {
		assert.strictEqual(parseKey("\t"), "tab");
	});

	it("parses enter (CR)", () => {
		assert.strictEqual(parseKey("\r"), "enter");
	});

	it("parses space", () => {
		assert.strictEqual(parseKey(" "), "space");
	});

	it("parses backspace", () => {
		assert.strictEqual(parseKey("\x7f"), "backspace");
	});

	it("parses shift+tab", () => {
		assert.strictEqual(parseKey("\x1b[Z"), "shift+tab");
	});

	it("parses ctrl+letter for most letters (some are ambiguous with special keys)", () => {
		// ctrl+h (0x08) = backspace, ctrl+i (0x09) = tab,
		// ctrl+j (0x0a) = enter (LF), ctrl+m (0x0d) = enter (CR)
		const ambiguous = new Set([8, 9, 10, 13]);
		for (let i = 1; i <= 26; i++) {
			if (ambiguous.has(i)) continue;
			const char = String.fromCharCode(i);
			const letter = String.fromCharCode(i + 96);
			assert.strictEqual(parseKey(char), `ctrl+${letter}`);
		}
	});

	it("parses delete key", () => {
		assert.strictEqual(parseKey("\x1b[3~"), "delete");
	});

	it("parses pageUp and pageDown", () => {
		assert.strictEqual(parseKey("\x1b[5~"), "pageUp");
		assert.strictEqual(parseKey("\x1b[6~"), "pageDown");
	});

	it("parses home and end", () => {
		assert.strictEqual(parseKey("\x1b[H"), "home");
		assert.strictEqual(parseKey("\x1b[F"), "end");
	});

	it("parses insert", () => {
		assert.strictEqual(parseKey("\x1b[2~"), "insert");
	});
});
