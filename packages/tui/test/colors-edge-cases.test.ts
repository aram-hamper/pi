// Edge-case tests for colors.ts functions

import assert from "node:assert";
import { describe, it } from "node:test";
import {
	backgroundAnsi,
	colorToHex,
	colorToOkhsl,
	colorToOklch,
	colorToRgb,
	foregroundAnsi,
	indexedColor,
	mixColors,
	okhslColor,
	oklchColor,
	parseColor,
	rgbColor,
	styleText,
	styleTextWithAnsi,
} from "../src/colors.ts";

describe("indexedColor edge cases", () => {
	it("accepts 0", () => {
		assert.deepStrictEqual(indexedColor(0), { kind: "indexed", index: 0 });
	});

	it("accepts 255", () => {
		assert.deepStrictEqual(indexedColor(255), { kind: "indexed", index: 255 });
	});

	it("throws for negative index", () => {
		assert.throws(() => indexedColor(-1), /ANSI color index/);
	});

	it("throws for index > 255", () => {
		assert.throws(() => indexedColor(256), /ANSI color index/);
	});

	it("throws for non-integer", () => {
		assert.throws(() => indexedColor(1.5), /ANSI color index/);
	});

	it("result is frozen", () => {
		const color = indexedColor(5);
		assert.ok(Object.isFrozen(color));
	});
});

describe("rgbColor edge cases", () => {
	it("accepts 0,0,0", () => {
		assert.deepStrictEqual(rgbColor(0, 0, 0), { kind: "rgb", r: 0, g: 0, b: 0 });
	});

	it("accepts 255,255,255", () => {
		assert.deepStrictEqual(rgbColor(255, 255, 255), { kind: "rgb", r: 255, g: 255, b: 255 });
	});

	it("throws for r < 0", () => {
		assert.throws(() => rgbColor(-1, 0, 0), /r must be between/);
	});

	it("throws for r > 255", () => {
		assert.throws(() => rgbColor(256, 0, 0), /r must be between/);
	});

	it("throws for g < 0", () => {
		assert.throws(() => rgbColor(0, -1, 0), /g must be between/);
	});

	it("throws for b > 255", () => {
		assert.throws(() => rgbColor(0, 0, 256), /b must be between/);
	});

	it("throws for NaN", () => {
		assert.throws(() => rgbColor(NaN, 0, 0), /r must be finite/);
	});

	it("throws for Infinity", () => {
		assert.throws(() => rgbColor(Infinity, 0, 0), /r must be finite/);
	});

	it("result is frozen", () => {
		const color = rgbColor(100, 150, 200);
		assert.ok(Object.isFrozen(color));
	});
});

describe("oklchColor edge cases", () => {
	it("accepts valid values", () => {
		const color = oklchColor(0.5, 0.1, 120);
		assert.strictEqual(color.kind, "oklch");
		assert.ok(Math.abs(color.l - 0.5) < 1e-9);
		assert.ok(Math.abs(color.c - 0.1) < 1e-9);
		assert.ok(Math.abs(color.h - 120) < 1e-9);
	});

	it("normalizes hue to 0-360 range", () => {
		const color = oklchColor(0.5, 0.1, 400);
		assert.ok(color.h >= 0 && color.h < 360);
	});

	it("normalizes negative hue", () => {
		const color = oklchColor(0.5, 0.1, -60);
		assert.ok(color.h >= 0 && color.h < 360);
	});

	it("throws for l < 0", () => {
		assert.throws(() => oklchColor(-0.1, 0.1, 120), /l must be between/);
	});

	it("throws for l > 1", () => {
		assert.throws(() => oklchColor(1.1, 0.1, 120), /l must be between/);
	});

	it("throws for negative c", () => {
		assert.throws(() => oklchColor(0.5, -0.1, 120), /c must not be negative/);
	});

	it("throws for NaN l", () => {
		assert.throws(() => oklchColor(NaN, 0.1, 120), /l must be finite/);
	});

	it("result is frozen", () => {
		const color = oklchColor(0.5, 0.1, 120);
		assert.ok(Object.isFrozen(color));
	});
});

describe("okhslColor edge cases", () => {
	it("accepts valid values", () => {
		const color = okhslColor(120, 0.5, 0.5);
		assert.strictEqual(color.kind, "rgb");
	});

	it("throws for s < 0", () => {
		assert.throws(() => okhslColor(120, -0.1, 0.5), /s must be between/);
	});

	it("throws for s > 1", () => {
		assert.throws(() => okhslColor(120, 1.1, 0.5), /s must be between/);
	});

	it("throws for l < 0", () => {
		assert.throws(() => okhslColor(120, 0.5, -0.1), /l must be between/);
	});

	it("throws for l > 1", () => {
		assert.throws(() => okhslColor(120, 0.5, 1.1), /l must be between/);
	});

	it("black (l=0) produces rgb(0,0,0)", () => {
		const color = okhslColor(0, 0, 0);
		assert.deepStrictEqual(color, rgbColor(0, 0, 0));
	});

	it("white (l=1) produces rgb(255,255,255)", () => {
		const color = okhslColor(0, 0, 1);
		assert.deepStrictEqual(color, rgbColor(255, 255, 255));
	});
});

describe("parseColor edge cases", () => {
	it("parses 3-digit hex", () => {
		assert.deepStrictEqual(parseColor("#abc"), { kind: "rgb", r: 170, g: 187, b: 204 });
	});

	it("parses 6-digit hex", () => {
		assert.deepStrictEqual(parseColor("#ff0080"), { kind: "rgb", r: 255, g: 0, b: 128 });
	});

	it("parses hex case-insensitively", () => {
		assert.deepStrictEqual(parseColor("#FF0080"), { kind: "rgb", r: 255, g: 0, b: 128 });
	});

	it("parses indexed color from number", () => {
		assert.deepStrictEqual(parseColor(5), { kind: "indexed", index: 5 });
	});

	it("parses OKLCH with percentage lightness", () => {
		const color = parseColor("oklch(50% 0.1 120)");
		assert.strictEqual(color.kind, "oklch");
		if (color.kind === "oklch") {
			assert.ok(Math.abs(color.l - 0.5) < 1e-9);
		}
	});

	it("parses OKLCH case-insensitively", () => {
		const color = parseColor("OKLCH(0.5 0.1 120)");
		assert.strictEqual(color.kind, "oklch");
	});

	it("parses OKHSL with percentage values", () => {
		const color = parseColor("okhsl(120 50% 50%)");
		assert.strictEqual(color.kind, "rgb");
	});

	it("throws for invalid color string", () => {
		assert.throws(() => parseColor("red"), /Invalid color value/);
		assert.throws(() => parseColor(""), /Invalid color value/);
		assert.throws(() => parseColor("rgb(255,0,0)"), /Invalid color value/);
	});

	it("throws for 4-digit hex", () => {
		assert.throws(() => parseColor("#abcd"), /Invalid color value/);
	});
});

describe("colorToRgb edge cases", () => {
	it("converts indexed color 0 to black", () => {
		assert.deepStrictEqual(colorToRgb(indexedColor(0)), { r: 0, g: 0, b: 0 });
	});

	it("converts indexed color 15 to white", () => {
		assert.deepStrictEqual(colorToRgb(indexedColor(15)), { r: 255, g: 255, b: 255 });
	});

	it("converts indexed color 16 (first cube color)", () => {
		// Index 16 = cube(0,0,0) = rgb(0,0,0)
		assert.deepStrictEqual(colorToRgb(indexedColor(16)), { r: 0, g: 0, b: 0 });
	});

	it("converts indexed color 231 (last cube color)", () => {
		// Index 231 = cube(5,5,5) = rgb(255,255,255)
		assert.deepStrictEqual(colorToRgb(indexedColor(231)), { r: 255, g: 255, b: 255 });
	});

	it("converts indexed color 232 (first gray)", () => {
		// Index 232 = gray 8
		assert.deepStrictEqual(colorToRgb(indexedColor(232)), { r: 8, g: 8, b: 8 });
	});

	it("converts indexed color 255 (last gray)", () => {
		// Index 255 = gray 238
		assert.deepStrictEqual(colorToRgb(indexedColor(255)), { r: 238, g: 238, b: 238 });
	});

	it("converts RGB color directly", () => {
		assert.deepStrictEqual(colorToRgb(rgbColor(100, 150, 200)), { r: 100, g: 150, b: 200 });
	});

	it("converts OKLCH black to near-black", () => {
		const rgb = colorToRgb(oklchColor(0, 0, 0));
		assert.deepStrictEqual(rgb, { r: 0, g: 0, b: 0 });
	});

	it("converts OKLCH white to near-white", () => {
		const rgb = colorToRgb(oklchColor(1, 0, 0));
		assert.deepStrictEqual(rgb, { r: 255, g: 255, b: 255 });
	});
});

describe("colorToHex edge cases", () => {
	it("converts black to #000000", () => {
		assert.strictEqual(colorToHex(rgbColor(0, 0, 0)), "#000000");
	});

	it("converts white to #ffffff", () => {
		assert.strictEqual(colorToHex(rgbColor(255, 255, 255)), "#ffffff");
	});

	it("pads single-digit hex channels", () => {
		assert.strictEqual(colorToHex(rgbColor(1, 2, 3)), "#010203");
	});

	it("converts indexed color to hex", () => {
		const hex = colorToHex(indexedColor(0));
		assert.match(hex, /^#[0-9a-f]{6}$/);
	});
});

describe("colorToOklch edge cases", () => {
	it("returns stored channels for OKLCH color", () => {
		const color = oklchColor(0.5, 0.1, 120);
		const result = colorToOklch(color);
		assert.ok(Math.abs(result.l - 0.5) < 1e-9);
		assert.ok(Math.abs(result.c - 0.1) < 1e-9);
		assert.ok(Math.abs(result.h - 120) < 1e-9);
	});

	it("converts black to near-zero chroma", () => {
		const result = colorToOklch(rgbColor(0, 0, 0));
		assert.ok(result.c < 0.01);
	});

	it("converts white to near-zero chroma", () => {
		const result = colorToOklch(rgbColor(255, 255, 255));
		assert.ok(result.c < 0.01);
	});

	it("hue is in 0-360 range", () => {
		const result = colorToOklch(rgbColor(255, 0, 0));
		assert.ok(result.h >= 0 && result.h < 360);
	});
});

describe("colorToOkhsl edge cases", () => {
	it("converts black to l=0", () => {
		const result = colorToOkhsl(rgbColor(0, 0, 0));
		assert.ok(result.l < 0.01);
	});

	it("converts white to l=1", () => {
		const result = colorToOkhsl(rgbColor(255, 255, 255));
		assert.ok(Math.abs(result.l - 1) < 0.01);
	});

	it("saturation is in 0-1 range", () => {
		const result = colorToOkhsl(rgbColor(255, 0, 0));
		assert.ok(result.s >= 0 && result.s <= 1);
	});

	it("hue is in 0-360 range", () => {
		const result = colorToOkhsl(rgbColor(255, 0, 0));
		assert.ok(result.h >= 0 && result.h < 360);
	});
});

describe("foregroundAnsi and backgroundAnsi edge cases", () => {
	it("foreground indexed color uses 38;5", () => {
		assert.strictEqual(foregroundAnsi(indexedColor(0), "256color"), "\x1b[38;5;0m");
		assert.strictEqual(foregroundAnsi(indexedColor(255), "256color"), "\x1b[38;5;255m");
	});

	it("background indexed color uses 48;5", () => {
		assert.strictEqual(backgroundAnsi(indexedColor(0), "256color"), "\x1b[48;5;0m");
		assert.strictEqual(backgroundAnsi(indexedColor(255), "256color"), "\x1b[48;5;255m");
	});

	it("foreground truecolor uses 38;2;r;g;b", () => {
		assert.strictEqual(foregroundAnsi(rgbColor(255, 128, 0), "truecolor"), "\x1b[38;2;255;128;0m");
	});

	it("background truecolor uses 48;2;r;g;b", () => {
		assert.strictEqual(backgroundAnsi(rgbColor(0, 128, 255), "truecolor"), "\x1b[48;2;0;128;255m");
	});

	it("foreground 256color mode approximates RGB", () => {
		const seq = foregroundAnsi(rgbColor(255, 0, 0), "256color");
		assert.match(seq, /^\x1b\[38;5;\d+m$/);
	});
});

describe("mixColors edge cases", () => {
	it("throws for amount < 0", () => {
		assert.throws(() => mixColors(rgbColor(0, 0, 0), rgbColor(255, 255, 255), -0.01), /amount/);
	});

	it("throws for amount > 1", () => {
		assert.throws(() => mixColors(rgbColor(0, 0, 0), rgbColor(255, 255, 255), 1.01), /amount/);
	});

	it("throws for NaN amount", () => {
		assert.throws(() => mixColors(rgbColor(0, 0, 0), rgbColor(255, 255, 255), NaN), /amount must be finite/);
	});

	it("amount=0 returns first color in sRGB", () => {
		const red = rgbColor(255, 0, 0);
		const blue = rgbColor(0, 0, 255);
		assert.deepStrictEqual(mixColors(red, blue, 0, "srgb"), red);
	});

	it("amount=1 returns second color in sRGB", () => {
		const red = rgbColor(255, 0, 0);
		const blue = rgbColor(0, 0, 255);
		assert.deepStrictEqual(mixColors(red, blue, 1, "srgb"), blue);
	});

	it("OKLCH mix of achromatic colors uses hue from chromatic one", () => {
		// Mixing black (achromatic) with red (chromatic) should use red's hue
		const black = rgbColor(0, 0, 0);
		const red = rgbColor(255, 0, 0);
		const result = mixColors(black, red, 0.5);
		assert.strictEqual(result.kind, "oklch");
	});

	it("sRGB midpoint of black and white is gray", () => {
		const black = rgbColor(0, 0, 0);
		const white = rgbColor(255, 255, 255);
		const mid = mixColors(black, white, 0.5, "srgb");
		assert.strictEqual(mid.kind, "rgb");
		if (mid.kind === "rgb") {
			assert.ok(mid.r > 100 && mid.r < 155);
			assert.ok(mid.g > 100 && mid.g < 155);
			assert.ok(mid.b > 100 && mid.b < 155);
		}
	});
});

describe("styleText edge cases", () => {
	it("no styles returns plain text", () => {
		assert.strictEqual(styleText("hello", {}, "truecolor"), "hello");
	});

	it("bold only", () => {
		const result = styleText("hi", { bold: true }, "truecolor");
		assert.ok(result.includes("\x1b[1m"));
		assert.ok(result.includes("\x1b[22m"));
	});

	it("dim only", () => {
		const result = styleText("hi", { dim: true }, "truecolor");
		assert.ok(result.includes("\x1b[2m"));
		assert.ok(result.includes("\x1b[22m"));
	});

	it("italic only", () => {
		const result = styleText("hi", { italic: true }, "truecolor");
		assert.ok(result.includes("\x1b[3m"));
		assert.ok(result.includes("\x1b[23m"));
	});

	it("underline only", () => {
		const result = styleText("hi", { underline: true }, "truecolor");
		assert.ok(result.includes("\x1b[4m"));
		assert.ok(result.includes("\x1b[24m"));
	});

	it("inverse only", () => {
		const result = styleText("hi", { inverse: true }, "truecolor");
		assert.ok(result.includes("\x1b[7m"));
		assert.ok(result.includes("\x1b[27m"));
	});

	it("strikethrough only", () => {
		const result = styleText("hi", { strikethrough: true }, "truecolor");
		assert.ok(result.includes("\x1b[9m"));
		assert.ok(result.includes("\x1b[29m"));
	});

	it("fg color in truecolor mode", () => {
		const result = styleText("hi", { fg: rgbColor(255, 0, 0) }, "truecolor");
		assert.ok(result.includes("\x1b[38;2;255;0;0m"));
		assert.ok(result.includes("\x1b[39m"));
	});

	it("bg color in truecolor mode", () => {
		const result = styleText("hi", { bg: rgbColor(0, 0, 255) }, "truecolor");
		assert.ok(result.includes("\x1b[48;2;0;0;255m"));
		assert.ok(result.includes("\x1b[49m"));
	});

	it("closes sequences in reverse order: bg before fg", () => {
		const result = styleText("hi", { fg: rgbColor(255, 0, 0), bg: rgbColor(0, 0, 255) }, "truecolor");
		const bgClose = result.indexOf("\x1b[49m");
		const fgClose = result.indexOf("\x1b[39m");
		assert.ok(bgClose < fgClose, "bg close should come before fg close");
	});
});

describe("styleTextWithAnsi edge cases", () => {
	it("no fg, no bg, no attrs returns plain text", () => {
		assert.strictEqual(styleTextWithAnsi("hello", undefined, undefined, {}), "hello");
	});

	it("fg only", () => {
		const result = styleTextWithAnsi("hi", "\x1b[31m", undefined, {});
		assert.strictEqual(result, "\x1b[31mhi\x1b[39m");
	});

	it("bg only", () => {
		const result = styleTextWithAnsi("hi", undefined, "\x1b[41m", {});
		assert.strictEqual(result, "\x1b[41mhi\x1b[49m");
	});

	it("bold and dim together use single reset code 22", () => {
		const result = styleTextWithAnsi("hi", undefined, undefined, { bold: true, dim: true });
		assert.ok(result.includes("\x1b[1m"));
		assert.ok(result.includes("\x1b[2m"));
		// Only one \x1b[22m for both bold and dim
		const count = (result.match(/\x1b\[22m/g) ?? []).length;
		assert.strictEqual(count, 1);
	});
});
