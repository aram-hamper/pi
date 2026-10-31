// Tests for Text, Spacer, and Box components

import assert from "node:assert";
import { describe, it } from "node:test";
import { Box } from "../src/components/box.ts";
import { Spacer } from "../src/components/spacer.ts";
import { Text } from "../src/components/text.ts";
import { visibleWidth } from "../src/utils.ts";

describe("Spacer", () => {
	it("renders 1 empty line by default", () => {
		const spacer = new Spacer();
		assert.deepStrictEqual(spacer.render(80), [""]);
	});

	it("renders the specified number of empty lines", () => {
		const spacer = new Spacer(3);
		const lines = spacer.render(80);
		assert.strictEqual(lines.length, 3);
		for (const line of lines) {
			assert.strictEqual(line, "");
		}
	});

	it("renders 0 lines when constructed with 0", () => {
		const spacer = new Spacer(0);
		assert.deepStrictEqual(spacer.render(80), []);
	});

	it("setLines updates the line count", () => {
		const spacer = new Spacer(1);
		spacer.setLines(5);
		assert.strictEqual(spacer.render(80).length, 5);
	});

	it("invalidate is a no-op (no cached state)", () => {
		const spacer = new Spacer(2);
		assert.doesNotThrow(() => spacer.invalidate());
		assert.strictEqual(spacer.render(80).length, 2);
	});

	it("width argument is ignored", () => {
		const spacer = new Spacer(2);
		assert.deepStrictEqual(spacer.render(1), ["", ""]);
		assert.deepStrictEqual(spacer.render(200), ["", ""]);
	});
});

describe("Text", () => {
	it("renders empty string as empty array", () => {
		const text = new Text("");
		assert.deepStrictEqual(text.render(80), []);
	});

	it("renders whitespace-only text as empty array", () => {
		const text = new Text("   ");
		assert.deepStrictEqual(text.render(80), []);
	});

	it("renders text with padding", () => {
		const text = new Text("hello", 1, 0);
		const lines = text.render(20);
		assert.ok(lines.length > 0);
		// Each line should be padded to width
		for (const line of lines) {
			assert.strictEqual(visibleWidth(line), 20);
		}
	});

	it("renders text with top/bottom padding", () => {
		const text = new Text("hello", 0, 1);
		const lines = text.render(20);
		// Should have 1 empty line top + content + 1 empty line bottom
		assert.ok(lines.length >= 3);
		assert.strictEqual(visibleWidth(lines[0]!), 20); // top padding
		assert.strictEqual(visibleWidth(lines[lines.length - 1]!), 20); // bottom padding
	});

	it("setText updates the text and invalidates cache", () => {
		const text = new Text("hello", 0, 0);
		const first = text.render(20);
		text.setText("world");
		const second = text.render(20);
		assert.ok(first[0]?.includes("hello"));
		assert.ok(second[0]?.includes("world"));
	});

	it("invalidate clears the cache", () => {
		const text = new Text("hello", 0, 0);
		text.render(20); // populate cache
		text.invalidate();
		// Should still render correctly after invalidation
		const lines = text.render(20);
		assert.ok(lines.length > 0);
	});

	it("setPaddingX updates padding", () => {
		const text = new Text("hello", 0, 0);
		const before = text.render(20);
		text.setPaddingX(2);
		const after = text.render(20);
		// With padding 2, content should be indented
		assert.ok(after[0]?.startsWith("  "));
		assert.ok(!before[0]?.startsWith("  "));
	});

	it("wraps long text to fit width", () => {
		const text = new Text("hello world this is a long text", 0, 0);
		const lines = text.render(10);
		for (const line of lines) {
			assert.ok(visibleWidth(line) <= 10, `line "${line}" exceeds width`);
		}
	});

	it("applies background function to each line", () => {
		let bgCalled = 0;
		const bgFn = (t: string) => {
			bgCalled++;
			return `\x1b[41m${t}\x1b[49m`;
		};
		const text = new Text("hello", 0, 0, bgFn);
		const lines = text.render(20);
		assert.ok(bgCalled > 0);
		for (const line of lines) {
			assert.ok(line.includes("\x1b[41m"));
		}
	});

	it("setCustomBgFn updates the background function", () => {
		const text = new Text("hello", 0, 0);
		text.setCustomBgFn((t) => `\x1b[42m${t}\x1b[49m`);
		const lines = text.render(20);
		for (const line of lines) {
			assert.ok(line.includes("\x1b[42m"));
		}
	});

	it("setCustomBgFn with undefined removes background", () => {
		const text = new Text("hello", 0, 0, (t) => `\x1b[41m${t}\x1b[49m`);
		text.setCustomBgFn(undefined);
		const lines = text.render(20);
		for (const line of lines) {
			assert.ok(!line.includes("\x1b[41m"));
		}
	});

	it("caches render output for same text and width", () => {
		const text = new Text("hello", 0, 0);
		const first = text.render(20);
		const second = text.render(20);
		// Same array reference means cache was used
		assert.strictEqual(first, second);
	});

	it("re-renders when width changes", () => {
		const text = new Text("hello", 0, 0);
		const narrow = text.render(10);
		const wide = text.render(40);
		// Different widths should produce different results
		assert.notStrictEqual(narrow, wide);
	});

	it("handles ANSI-styled text", () => {
		const text = new Text("\x1b[31mhello\x1b[0m", 0, 0);
		const lines = text.render(20);
		assert.ok(lines.some((line) => line.includes("\x1b[31m")));
	});

	it("handles CJK text", () => {
		const text = new Text("日本語", 0, 0);
		const lines = text.render(20);
		assert.ok(lines.length > 0);
		for (const line of lines) {
			assert.ok(visibleWidth(line) <= 20);
		}
	});
});

describe("Box", () => {
	it("renders empty array when no children", () => {
		const box = new Box();
		assert.deepStrictEqual(box.render(80), []);
	});

	it("renders children with padding", () => {
		const box = new Box(1, 1);
		const child = {
			render: (_w: number) => ["content"],
			invalidate: () => {},
		};
		box.addChild(child);
		const lines = box.render(20);
		// Should have top padding + content + bottom padding
		assert.ok(lines.length >= 3);
		// Each line should be padded to width
		for (const line of lines) {
			assert.strictEqual(visibleWidth(line), 20);
		}
	});

	it("addChild appends to children", () => {
		const box = new Box();
		const child = { render: () => ["line"], invalidate: () => {} };
		box.addChild(child);
		assert.strictEqual(box.children.length, 1);
	});

	it("removeChild removes the child", () => {
		const box = new Box();
		const child = { render: () => ["line"], invalidate: () => {} };
		box.addChild(child);
		box.removeChild(child);
		assert.strictEqual(box.children.length, 0);
	});

	it("removeChild is a no-op for unknown child", () => {
		const box = new Box();
		const child = { render: () => ["line"], invalidate: () => {} };
		assert.doesNotThrow(() => box.removeChild(child));
	});

	it("clear removes all children", () => {
		const box = new Box();
		box.addChild({ render: () => ["a"], invalidate: () => {} });
		box.addChild({ render: () => ["b"], invalidate: () => {} });
		box.clear();
		assert.strictEqual(box.children.length, 0);
		assert.deepStrictEqual(box.render(80), []);
	});

	it("invalidate propagates to children", () => {
		const box = new Box();
		let invalidated = 0;
		const child = {
			render: () => ["line"],
			invalidate: () => { invalidated++; },
		};
		box.addChild(child);
		box.invalidate();
		assert.strictEqual(invalidated, 1);
	});

	it("applies background function to all lines", () => {
		const box = new Box(0, 0, (t) => `\x1b[41m${t}\x1b[49m`);
		box.addChild({ render: () => ["content"], invalidate: () => {} });
		const lines = box.render(20);
		for (const line of lines) {
			assert.ok(line.includes("\x1b[41m"), `line "${line}" should have bg color`);
		}
	});

	it("setBgFn updates the background function", () => {
		const box = new Box(0, 0);
		box.addChild({ render: () => ["content"], invalidate: () => {} });
		box.setBgFn((t) => `\x1b[42m${t}\x1b[49m`);
		const lines = box.render(20);
		for (const line of lines) {
			assert.ok(line.includes("\x1b[42m"));
		}
	});

	it("setPaddingX updates padding", () => {
		const box = new Box(0, 0);
		box.addChild({ render: () => ["content"], invalidate: () => {} });
		box.setPaddingX(3);
		const lines = box.render(20);
		// Content line should be indented by 3 spaces
		const contentLine = lines.find((l) => l.includes("content"));
		assert.ok(contentLine?.startsWith("   "), `expected 3-space indent, got: "${contentLine}"`);
	});

	it("caches render output", () => {
		const box = new Box(0, 0);
		box.addChild({ render: () => ["content"], invalidate: () => {} });
		const first = box.render(20);
		const second = box.render(20);
		assert.strictEqual(first, second);
	});

	it("re-renders when width changes", () => {
		const box = new Box(0, 0);
		box.addChild({ render: () => ["content"], invalidate: () => {} });
		const narrow = box.render(10);
		const wide = box.render(40);
		assert.notStrictEqual(narrow, wide);
	});

	it("renders empty array when children render no lines", () => {
		const box = new Box(0, 0);
		box.addChild({ render: () => [], invalidate: () => {} });
		assert.deepStrictEqual(box.render(80), []);
	});

	it("zero paddingX and paddingY renders content directly", () => {
		const box = new Box(0, 0);
		box.addChild({ render: () => ["hello"], invalidate: () => {} });
		const lines = box.render(20);
		assert.ok(lines.some((l) => l.includes("hello")));
	});
});
