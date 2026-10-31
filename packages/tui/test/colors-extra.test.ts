// Tests for exported color utilities not covered by colors.test.ts

import assert from "node:assert";
import { describe, it } from "node:test";
import {
	backgroundAnsi,
	colorToOklch,
	foregroundAnsi,
	indexedColor,
	mixColors,
	oklchColor,
	rgbColor,
	styleTextWithAnsi,
} from "../src/colors.ts";

describe("foregroundAnsi", () => {
	it("emits a 256-color foreground sequence for an indexed color", () => {
		assert.strictEqual(foregroundAnsi(indexedColor(4), "256color"), "\x1b[38;5;4m");
	});

	it("emits a truecolor foreground sequence for an RGB color", () => {
		assert.strictEqual(foregroundAnsi(rgbColor(18, 52, 86), "truecolor"), "\x1b[38;2;18;52;86m");
	});

	it("emits a 256-color approximation for an RGB color in 256color mode", () => {
		const seq = foregroundAnsi(rgbColor(0, 0, 0), "256color");
		assert.match(seq, /^\x1b\[38;5;\d+m$/);
	});
});

describe("backgroundAnsi", () => {
	it("emits a 256-color background sequence for an indexed color", () => {
		assert.strictEqual(backgroundAnsi(indexedColor(9), "256color"), "\x1b[48;5;9m");
	});

	it("emits a truecolor background sequence for an RGB color", () => {
		assert.strictEqual(backgroundAnsi(rgbColor(255, 0, 0), "truecolor"), "\x1b[48;2;255;0;0m");
	});
});

describe("colorToOklch", () => {
	it("returns the stored channels for an OKLCH color", () => {
		const color = oklchColor(0.5, 0.1, 120);
		const result = colorToOklch(color);
		assert.ok(Math.abs(result.l - 0.5) < 1e-9);
		assert.ok(Math.abs(result.c - 0.1) < 1e-9);
		assert.ok(Math.abs(result.h - 120) < 1e-9);
	});

	it("converts an RGB color to OKLCH with non-negative chroma", () => {
		const result = colorToOklch(rgbColor(255, 0, 0));
		assert.ok(result.l > 0 && result.l < 1);
		assert.ok(result.c >= 0);
		assert.ok(result.h >= 0 && result.h < 360);
	});

	it("converts black to near-zero chroma", () => {
		const result = colorToOklch(rgbColor(0, 0, 0));
		assert.ok(result.l < 0.01);
		assert.ok(result.c < 0.01);
	});
});

describe("mixColors", () => {
	it("returns the first color at amount=0", () => {
		const red = rgbColor(255, 0, 0);
		const blue = rgbColor(0, 0, 255);
		const result = mixColors(red, blue, 0, "srgb");
		assert.deepStrictEqual(result, red);
	});

	it("returns the second color at amount=1", () => {
		const red = rgbColor(255, 0, 0);
		const blue = rgbColor(0, 0, 255);
		const result = mixColors(red, blue, 1, "srgb");
		assert.deepStrictEqual(result, blue);
	});

	it("mixes in sRGB space at midpoint", () => {
		const black = rgbColor(0, 0, 0);
		const white = rgbColor(255, 255, 255);
		const mid = mixColors(black, white, 0.5, "srgb");
		assert.strictEqual(mid.kind, "rgb");
		if (mid.kind === "rgb") {
			assert.ok(mid.r > 100 && mid.r < 155);
		}
	});

	it("mixes in OKLCH space by default", () => {
		const red = rgbColor(255, 0, 0);
		const blue = rgbColor(0, 0, 255);
		const result = mixColors(red, blue, 0.5);
		// OKLCH mix produces a different result than sRGB mix
		assert.ok(result.kind === "oklch");
	});

	it("throws for amount outside 0-1", () => {
		assert.throws(() => mixColors(rgbColor(0, 0, 0), rgbColor(255, 255, 255), -0.1), /amount/);
		assert.throws(() => mixColors(rgbColor(0, 0, 0), rgbColor(255, 255, 255), 1.1), /amount/);
	});
});

describe("styleTextWithAnsi", () => {
	it("applies precomputed fg and bg ANSI codes around text", () => {
		const result = styleTextWithAnsi("hello", "\x1b[31m", "\x1b[41m", {});
		assert.strictEqual(result, "\x1b[31m\x1b[41mhello\x1b[49m\x1b[39m");
	});

	it("applies bold and italic attributes", () => {
		const result = styleTextWithAnsi("hi", undefined, undefined, { bold: true, italic: true });
		assert.strictEqual(result, "\x1b[1m\x1b[3mhi\x1b[23m\x1b[22m");
	});

	it("applies underline and closes it specifically", () => {
		const result = styleTextWithAnsi("u", undefined, undefined, { underline: true });
		assert.strictEqual(result, "\x1b[4mu\x1b[24m");
	});

	it("applies strikethrough and closes it specifically", () => {
		const result = styleTextWithAnsi("s", undefined, undefined, { strikethrough: true });
		assert.strictEqual(result, "\x1b[9ms\x1b[29m");
	});

	it("applies inverse", () => {
		const result = styleTextWithAnsi("i", undefined, undefined, { inverse: true });
		assert.strictEqual(result, "\x1b[7mi\x1b[27m");
	});

	it("applies dim", () => {
		const result = styleTextWithAnsi("d", undefined, undefined, { dim: true });
		assert.strictEqual(result, "\x1b[2md\x1b[22m");
	});

	it("returns plain text when no styles are applied", () => {
		assert.strictEqual(styleTextWithAnsi("plain", undefined, undefined, {}), "plain");
	});
});
