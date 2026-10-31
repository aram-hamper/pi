// Edge-case tests for oklab.ts functions

import assert from "node:assert";
import { describe, it } from "node:test";
import { oklabToOkhslLightness, oklabToLinearSrgb, rgbToOklab, linearSrgbToRgb, okhslToRgb, rgbToOkhsl } from "../src/oklab.ts";

describe("oklabToOkhslLightness edge cases", () => {
	it("maps 0 to 0", () => {
		assert.strictEqual(oklabToOkhslLightness(0), 0);
	});

	it("maps 1 to approximately 1", () => {
		assert.ok(Math.abs(oklabToOkhslLightness(1) - 1) < 1e-9);
	});

	it("is monotonically increasing", () => {
		const inputs = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0];
		for (let i = 1; i < inputs.length; i++) {
			const prev = oklabToOkhslLightness(inputs[i - 1]!);
			const curr = oklabToOkhslLightness(inputs[i]!);
			assert.ok(curr >= prev, `expected ${curr} >= ${prev} at index ${i}`);
		}
	});

	it("returns values in [0, 1] for inputs in [0, 1]", () => {
		for (let x = 0; x <= 1; x += 0.1) {
			const result = oklabToOkhslLightness(x);
			assert.ok(result >= 0 && result <= 1 + 1e-9, `result ${result} out of range for input ${x}`);
		}
	});
});

describe("rgbToOklab", () => {
	it("black maps to L=0", () => {
		const [L] = rgbToOklab({ r: 0, g: 0, b: 0 });
		assert.ok(Math.abs(L) < 1e-9);
	});

	it("white maps to L≈1", () => {
		const [L] = rgbToOklab({ r: 255, g: 255, b: 255 });
		assert.ok(Math.abs(L - 1) < 0.01);
	});

	it("gray maps to near-zero a and b", () => {
		const [, a, b] = rgbToOklab({ r: 128, g: 128, b: 128 });
		assert.ok(Math.abs(a) < 0.01);
		assert.ok(Math.abs(b) < 0.01);
	});

	it("returns a 3-element array", () => {
		const result = rgbToOklab({ r: 100, g: 150, b: 200 });
		assert.strictEqual(result.length, 3);
		for (const v of result) {
			assert.ok(Number.isFinite(v));
		}
	});
});

describe("oklabToLinearSrgb", () => {
	it("black [0,0,0] maps to [0,0,0]", () => {
		const [r, g, b] = oklabToLinearSrgb([0, 0, 0]);
		assert.ok(Math.abs(r) < 1e-9);
		assert.ok(Math.abs(g) < 1e-9);
		assert.ok(Math.abs(b) < 1e-9);
	});

	it("white [1,0,0] maps to approximately [1,1,1]", () => {
		const [r, g, b] = oklabToLinearSrgb([1, 0, 0]);
		assert.ok(Math.abs(r - 1) < 0.01);
		assert.ok(Math.abs(g - 1) < 0.01);
		assert.ok(Math.abs(b - 1) < 0.01);
	});

	it("returns a 3-element array", () => {
		const result = oklabToLinearSrgb([0.5, 0.1, -0.1]);
		assert.strictEqual(result.length, 3);
		for (const v of result) {
			assert.ok(Number.isFinite(v));
		}
	});
});

describe("linearSrgbToRgb", () => {
	it("clips negative values to 0", () => {
		const result = linearSrgbToRgb([-0.5, 0, 0]);
		assert.strictEqual(result.r, 0);
	});

	it("clips values > 1 to 255", () => {
		const result = linearSrgbToRgb([1.5, 0, 0]);
		assert.strictEqual(result.r, 255);
	});

	it("converts [0,0,0] to rgb(0,0,0)", () => {
		assert.deepStrictEqual(linearSrgbToRgb([0, 0, 0]), { r: 0, g: 0, b: 0 });
	});

	it("converts [1,1,1] to rgb(255,255,255)", () => {
		assert.deepStrictEqual(linearSrgbToRgb([1, 1, 1]), { r: 255, g: 255, b: 255 });
	});

	it("rounds to nearest integer", () => {
		const result = linearSrgbToRgb([0.5, 0.5, 0.5]);
		assert.ok(Number.isInteger(result.r));
		assert.ok(Number.isInteger(result.g));
		assert.ok(Number.isInteger(result.b));
	});
});

describe("okhslToRgb", () => {
	it("black (l=0) returns rgb(0,0,0)", () => {
		assert.deepStrictEqual(okhslToRgb(0, 0, 0), { r: 0, g: 0, b: 0 });
	});

	it("white (l=1) returns rgb(255,255,255)", () => {
		assert.deepStrictEqual(okhslToRgb(0, 0, 1), { r: 255, g: 255, b: 255 });
	});

	it("gray (s=0) returns equal r,g,b", () => {
		const result = okhslToRgb(0, 0, 0.5);
		assert.ok(Math.abs(result.r - result.g) <= 1);
		assert.ok(Math.abs(result.g - result.b) <= 1);
	});

	it("hue wraps around 360", () => {
		const a = okhslToRgb(0, 0.8, 0.5);
		const b = okhslToRgb(360, 0.8, 0.5);
		assert.deepStrictEqual(a, b);
	});

	it("hue wraps negative values", () => {
		const a = okhslToRgb(0, 0.8, 0.5);
		const b = okhslToRgb(-360, 0.8, 0.5);
		assert.deepStrictEqual(a, b);
	});

	it("returns integer rgb values", () => {
		const result = okhslToRgb(120, 0.5, 0.5);
		assert.ok(Number.isInteger(result.r));
		assert.ok(Number.isInteger(result.g));
		assert.ok(Number.isInteger(result.b));
	});

	it("returns values in 0-255 range", () => {
		for (const h of [0, 60, 120, 180, 240, 300]) {
			const result = okhslToRgb(h, 0.8, 0.5);
			assert.ok(result.r >= 0 && result.r <= 255);
			assert.ok(result.g >= 0 && result.g <= 255);
			assert.ok(result.b >= 0 && result.b <= 255);
		}
	});
});

describe("rgbToOkhsl", () => {
	it("black returns l=0", () => {
		const result = rgbToOkhsl({ r: 0, g: 0, b: 0 });
		assert.ok(result.l < 0.01);
	});

	it("white returns l≈1", () => {
		const result = rgbToOkhsl({ r: 255, g: 255, b: 255 });
		assert.ok(Math.abs(result.l - 1) < 0.01);
	});

	it("gray returns s=0", () => {
		const result = rgbToOkhsl({ r: 128, g: 128, b: 128 });
		assert.ok(result.s < 0.01);
	});

	it("returns h in [0, 360)", () => {
		const result = rgbToOkhsl({ r: 255, g: 0, b: 0 });
		assert.ok(result.h >= 0 && result.h < 360);
	});

	it("returns s in [0, 1]", () => {
		const result = rgbToOkhsl({ r: 255, g: 0, b: 0 });
		assert.ok(result.s >= 0 && result.s <= 1);
	});

	it("round-trips through okhslToRgb", () => {
		const original = { r: 100, g: 150, b: 200 };
		const { h, s, l } = rgbToOkhsl(original);
		const roundTripped = okhslToRgb(h, s, l);
		// Allow ±2 rounding error
		assert.ok(Math.abs(roundTripped.r - original.r) <= 2, `r: ${roundTripped.r} vs ${original.r}`);
		assert.ok(Math.abs(roundTripped.g - original.g) <= 2, `g: ${roundTripped.g} vs ${original.g}`);
		assert.ok(Math.abs(roundTripped.b - original.b) <= 2, `b: ${roundTripped.b} vs ${original.b}`);
	});
});
