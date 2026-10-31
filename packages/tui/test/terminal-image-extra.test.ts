// Tests for terminal-image.ts exported functions not covered by terminal-image.test.ts

import assert from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import {
	allocateImageId,
	calculateImageRows,
	getCellDimensions,
	getTerminalColorMode,
	resetCapabilitiesCache,
	setCapabilities,
	setCellDimensions,
} from "../src/terminal-image.ts";

describe("calculateImageRows", () => {
	it("returns 1 for a square image fitting in one cell", () => {
		const rows = calculateImageRows({ widthPx: 9, heightPx: 18 }, 1, { widthPx: 9, heightPx: 18 });
		assert.strictEqual(rows, 1);
	});

	it("scales a tall image to multiple rows", () => {
		// 10px wide, 100px tall, cell 10x10, target 1 column
		// scale = 1 (width fits), rows = ceil(100/10) = 10
		const rows = calculateImageRows({ widthPx: 10, heightPx: 100 }, 1, { widthPx: 10, heightPx: 10 });
		assert.strictEqual(rows, 10);
	});

	it("scales a wide image down to fit the target width", () => {
		// 200px wide, 100px tall, cell 10x10, target 10 columns (100px)
		// scale = 100/200 = 0.5, rows = ceil(50/10) = 5
		const rows = calculateImageRows({ widthPx: 200, heightPx: 100 }, 10, { widthPx: 10, heightPx: 10 });
		assert.strictEqual(rows, 5);
	});

	it("returns at least 1 row", () => {
		const rows = calculateImageRows({ widthPx: 1, heightPx: 1 }, 1, { widthPx: 9, heightPx: 18 });
		assert.ok(rows >= 1);
	});
});

describe("allocateImageId", () => {
	it("returns a positive integer", () => {
		const id = allocateImageId();
		assert.ok(Number.isInteger(id));
		assert.ok(id >= 1);
	});

	it("returns a value within the valid Kitty range", () => {
		const id = allocateImageId();
		assert.ok(id <= 0xffffffff);
	});

	it("returns different values on successive calls (probabilistic)", () => {
		const ids = new Set(Array.from({ length: 10 }, () => allocateImageId()));
		// With 10 random values in a range of ~4 billion, collisions are astronomically unlikely
		assert.ok(ids.size > 1);
	});
});

describe("getCellDimensions and setCellDimensions", () => {
	let savedDimensions: { widthPx: number; heightPx: number };

	beforeEach(() => {
		savedDimensions = getCellDimensions();
	});

	afterEach(() => {
		setCellDimensions(savedDimensions);
	});

	it("getCellDimensions returns the current cell dimensions", () => {
		const dims = getCellDimensions();
		assert.ok(typeof dims.widthPx === "number");
		assert.ok(typeof dims.heightPx === "number");
	});

	it("setCellDimensions updates the cell dimensions", () => {
		setCellDimensions({ widthPx: 12, heightPx: 24 });
		const dims = getCellDimensions();
		assert.strictEqual(dims.widthPx, 12);
		assert.strictEqual(dims.heightPx, 24);
	});
});

describe("getTerminalColorMode", () => {
	afterEach(() => {
		resetCapabilitiesCache();
	});

	it("returns truecolor when capabilities have trueColor: true", () => {
		const mode = getTerminalColorMode({ images: null, trueColor: true, hyperlinks: false });
		assert.strictEqual(mode, "truecolor");
	});

	it("returns 256color when capabilities have trueColor: false", () => {
		const mode = getTerminalColorMode({ images: null, trueColor: false, hyperlinks: false });
		assert.strictEqual(mode, "256color");
	});

	it("uses the cached capabilities when called without arguments", () => {
		setCapabilities({ images: null, trueColor: true, hyperlinks: false });
		assert.strictEqual(getTerminalColorMode(), "truecolor");
		setCapabilities({ images: null, trueColor: false, hyperlinks: false });
		assert.strictEqual(getTerminalColorMode(), "256color");
	});
});
