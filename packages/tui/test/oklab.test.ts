// Tests for oklabToOkhslLightness exported from oklab.ts

import assert from "node:assert";
import { describe, it } from "node:test";
import { oklabToOkhslLightness } from "../src/oklab.ts";

describe("oklabToOkhslLightness", () => {
	it("maps Oklab L=0 to OKHSL lightness 0", () => {
		assert.strictEqual(oklabToOkhslLightness(0), 0);
	});

	it("maps Oklab L=1 to OKHSL lightness 1", () => {
		assert.ok(Math.abs(oklabToOkhslLightness(1) - 1) < 1e-9);
	});

	it("returns a value between 0 and 1 for mid-range Oklab lightness", () => {
		const result = oklabToOkhslLightness(0.5);
		assert.ok(result > 0 && result < 1, `expected 0 < ${result} < 1`);
	});

	it("is monotonically increasing", () => {
		const values = [0, 0.1, 0.2, 0.5, 0.8, 0.9, 1];
		for (let i = 1; i < values.length; i++) {
			const prev = oklabToOkhslLightness(values[i - 1]!);
			const curr = oklabToOkhslLightness(values[i]!);
			assert.ok(curr >= prev, `expected ${curr} >= ${prev} at index ${i}`);
		}
	});
});
