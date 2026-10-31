// Edge-case tests for terminal-colors.ts functions

import assert from "node:assert";
import { describe, it } from "node:test";
import { parseOscColorResponse, parseTerminalColorSchemeReport } from "../src/terminal-colors.ts";

describe("parseOscColorResponse edge cases", () => {
	it("returns undefined for empty string", () => {
		assert.strictEqual(parseOscColorResponse(""), undefined);
	});

	it("returns undefined for plain text", () => {
		assert.strictEqual(parseOscColorResponse("hello"), undefined);
	});

	it("returns undefined for non-color OSC sequences", () => {
		assert.strictEqual(parseOscColorResponse("\x1b]0;title\x07"), undefined);
		assert.strictEqual(parseOscColorResponse("\x1b]7501;?\x1b\\"), undefined);
	});

	it("parses OSC 10 (foreground) with rgb: format", () => {
		const result = parseOscColorResponse("\x1b]10;rgb:ffff/0000/0000\x07");
		assert.deepStrictEqual(result, { target: "foreground", rgb: { r: 255, g: 0, b: 0 } });
	});

	it("parses OSC 11 (background) with rgb: format", () => {
		const result = parseOscColorResponse("\x1b]11;rgb:0000/0000/0000\x07");
		assert.deepStrictEqual(result, { target: "background", rgb: { r: 0, g: 0, b: 0 } });
	});

	it("parses OSC 10 with ST terminator", () => {
		const result = parseOscColorResponse("\x1b]10;rgb:ffff/ffff/ffff\x1b\\");
		assert.deepStrictEqual(result, { target: "foreground", rgb: { r: 255, g: 255, b: 255 } });
	});

	it("parses OSC 4 palette index", () => {
		const result = parseOscColorResponse("\x1b]4;0;rgb:0000/0000/0000\x07");
		assert.deepStrictEqual(result, { target: 0, rgb: { r: 0, g: 0, b: 0 } });
	});

	it("parses OSC 4 palette index 15", () => {
		const result = parseOscColorResponse("\x1b]4;15;rgb:ffff/ffff/ffff\x07");
		assert.deepStrictEqual(result, { target: 15, rgb: { r: 255, g: 255, b: 255 } });
	});

	it("parses OSC 4 with hex color", () => {
		const result = parseOscColorResponse("\x1b]4;1;#ff0000\x07");
		assert.deepStrictEqual(result, { target: 1, rgb: { r: 255, g: 0, b: 0 } });
	});

	it("parses 12-digit hex color (4 digits per channel)", () => {
		// 4-digit hex: ffff = 255, 8080 ≈ 128
		const result = parseOscColorResponse("\x1b]10;#ffffffffffff\x07");
		assert.deepStrictEqual(result, { target: "foreground", rgb: { r: 255, g: 255, b: 255 } });
	});

	it("returns rgb=undefined for unparseable color value", () => {
		const result = parseOscColorResponse("\x1b]4;1;bogus\x07");
		assert.deepStrictEqual(result, { target: 1, rgb: undefined });
	});

	it("returns rgb=undefined for invalid hex", () => {
		const result = parseOscColorResponse("\x1b]4;1;#xyz\x07");
		assert.deepStrictEqual(result, { target: 1, rgb: undefined });
	});

	it("returns rgb=undefined for incomplete rgb: format", () => {
		const result = parseOscColorResponse("\x1b]10;rgb:ffff/0000\x07");
		assert.deepStrictEqual(result, { target: "foreground", rgb: undefined });
	});

	it("parses rgba: format (same as rgb:)", () => {
		const result = parseOscColorResponse("\x1b]10;rgba:ffff/0000/0000\x07");
		assert.deepStrictEqual(result, { target: "foreground", rgb: { r: 255, g: 0, b: 0 } });
	});

	it("handles 2-digit hex channels", () => {
		const result = parseOscColorResponse("\x1b]10;rgb:ff/00/80\x07");
		assert.deepStrictEqual(result, { target: "foreground", rgb: { r: 255, g: 0, b: 128 } });
	});

	it("handles 1-digit hex channels", () => {
		const result = parseOscColorResponse("\x1b]10;rgb:f/0/8\x07");
		assert.deepStrictEqual(result, { target: "foreground", rgb: { r: 255, g: 0, b: 136 } });
	});

	it("returns undefined for OSC 12 (cursor color, not supported)", () => {
		assert.strictEqual(parseOscColorResponse("\x1b]12;#ffffff\x07"), undefined);
	});

	it("parses case-insensitively for rgb: prefix", () => {
		const result = parseOscColorResponse("\x1b]10;RGB:ffff/0000/0000\x07");
		assert.deepStrictEqual(result, { target: "foreground", rgb: { r: 255, g: 0, b: 0 } });
	});
});

describe("parseTerminalColorSchemeReport edge cases", () => {
	it("returns undefined for empty string", () => {
		assert.strictEqual(parseTerminalColorSchemeReport(""), undefined);
	});

	it("returns undefined for plain text", () => {
		assert.strictEqual(parseTerminalColorSchemeReport("hello"), undefined);
	});

	it("returns dark for code 1", () => {
		assert.strictEqual(parseTerminalColorSchemeReport("\x1b[?997;1n"), "dark");
	});

	it("returns light for code 2", () => {
		assert.strictEqual(parseTerminalColorSchemeReport("\x1b[?997;2n"), "light");
	});

	it("returns undefined for code 3", () => {
		assert.strictEqual(parseTerminalColorSchemeReport("\x1b[?997;3n"), undefined);
	});

	it("returns undefined for wrong OSC number", () => {
		assert.strictEqual(parseTerminalColorSchemeReport("\x1b[?996;1n"), undefined);
	});

	it("returns undefined when prefixed with non-ESC text", () => {
		assert.strictEqual(parseTerminalColorSchemeReport("x\x1b[?997;1n"), undefined);
	});

	it("handles multiple reports: last one wins", () => {
		// Multiple reports: last code determines result
		assert.strictEqual(parseTerminalColorSchemeReport("\x1b[?997;1n\x1b[?997;2n"), "light");
		assert.strictEqual(parseTerminalColorSchemeReport("\x1b[?997;2n\x1b[?997;1n"), "dark");
	});

	it("handles triple reports", () => {
		assert.strictEqual(parseTerminalColorSchemeReport("\x1b[?997;1n\x1b[?997;2n\x1b[?997;1n"), "dark");
	});
});
