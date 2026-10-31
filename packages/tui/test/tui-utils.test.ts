// Tests for tui.ts exported functions: isFocusable, isViewportTUI, renderFakeCursor,
// compositeTuiLine, Container

import assert from "node:assert";
import { describe, it } from "node:test";
import {
	type Component,
	compositeTuiLine,
	Container,
	CURSOR_MARKER,
	type Focusable,
	isFocusable,
	isViewportTUI,
	renderFakeCursor,
	type TUI,
	VIEWPORT_TUI,
	type ViewportTUI,
} from "../src/tui.ts";
import { visibleWidth } from "../src/utils.ts";

// Minimal component for testing
class SimpleComponent implements Component {
	render(_width: number): string[] {
		return ["line"];
	}
	invalidate(): void {}
}

// Component that also implements Focusable
class FocusableComponent implements Component, Focusable {
	focused = false;
	render(_width: number): string[] {
		return ["line"];
	}
	invalidate(): void {}
}

describe("isFocusable", () => {
	it("returns true for a component with a focused property", () => {
		const component = new FocusableComponent();
		assert.strictEqual(isFocusable(component), true);
	});

	it("returns false for a component without a focused property", () => {
		const component = new SimpleComponent();
		assert.strictEqual(isFocusable(component), false);
	});

	it("returns false for null", () => {
		assert.strictEqual(isFocusable(null), false);
	});

	it("returns true even when focused is false", () => {
		const component = new FocusableComponent();
		component.focused = false;
		assert.strictEqual(isFocusable(component), true);
	});
});

describe("isViewportTUI", () => {
	it("returns false for a TUI that does not have the VIEWPORT_TUI symbol", () => {
		const fakeTui = {} as TUI;
		assert.strictEqual(isViewportTUI(fakeTui), false);
	});

	it("returns true for an object with the VIEWPORT_TUI symbol set to true", () => {
		const fakeViewportTui = { [VIEWPORT_TUI]: true } as unknown as ViewportTUI;
		assert.strictEqual(isViewportTUI(fakeViewportTui as TUI), true);
	});

	it("returns false when the symbol is present but not true", () => {
		const obj = { [VIEWPORT_TUI]: false } as unknown as TUI;
		assert.strictEqual(isViewportTUI(obj), false);
	});
});

describe("renderFakeCursor", () => {
	it("wraps text in FAKE_CURSOR_START and FAKE_CURSOR_END APC markers", () => {
		const result = renderFakeCursor("X");
		assert.strictEqual(result, "\x1b_pi:fc\x07X\x1b_pi:/fc\x07");
	});

	it("wraps empty string", () => {
		assert.strictEqual(renderFakeCursor(""), "\x1b_pi:fc\x07\x1b_pi:/fc\x07");
	});

	it("wraps multi-character text", () => {
		assert.strictEqual(renderFakeCursor("hello"), "\x1b_pi:fc\x07hello\x1b_pi:/fc\x07");
	});

	it("wraps a space (the common cursor-at-end-of-line case)", () => {
		assert.strictEqual(renderFakeCursor(" "), "\x1b_pi:fc\x07 \x1b_pi:/fc\x07");
	});

	it("wraps styled text without altering the style codes", () => {
		const styled = "\x1b[31mA\x1b[0m";
		assert.strictEqual(renderFakeCursor(styled), `\x1b_pi:fc\x07${styled}\x1b_pi:/fc\x07`);
	});
});

describe("Container", () => {
	it("renders children in order", () => {
		const container = new Container();
		const a: Component = { render: () => ["line-a"], invalidate: () => {} };
		const b: Component = { render: () => ["line-b"], invalidate: () => {} };
		container.addChild(a);
		container.addChild(b);
		assert.deepStrictEqual(container.render(80), ["line-a", "line-b"]);
	});

	it("concatenates multiple lines from each child", () => {
		const container = new Container();
		const a: Component = { render: () => ["a1", "a2"], invalidate: () => {} };
		const b: Component = { render: () => ["b1"], invalidate: () => {} };
		container.addChild(a);
		container.addChild(b);
		assert.deepStrictEqual(container.render(80), ["a1", "a2", "b1"]);
	});

	it("addChild appends to the children array", () => {
		const container = new Container();
		const child = new SimpleComponent();
		container.addChild(child);
		assert.strictEqual(container.children.length, 1);
		assert.strictEqual(container.children[0], child);
	});

	it("removeChild removes the specified child", () => {
		const container = new Container();
		const child = new SimpleComponent();
		container.addChild(child);
		container.removeChild(child);
		assert.strictEqual(container.children.length, 0);
	});

	it("removeChild is a no-op for a child not in the container", () => {
		const container = new Container();
		const child = new SimpleComponent();
		assert.doesNotThrow(() => container.removeChild(child));
		assert.strictEqual(container.children.length, 0);
	});

	it("clear removes all children", () => {
		const container = new Container();
		container.addChild(new SimpleComponent());
		container.addChild(new SimpleComponent());
		container.clear();
		assert.strictEqual(container.children.length, 0);
	});

	it("invalidate propagates to all children", () => {
		const container = new Container();
		let invalidated = 0;
		const child: Component = {
			render: () => [],
			invalidate: () => {
				invalidated++;
			},
		};
		container.addChild(child);
		container.addChild(child);
		container.invalidate();
		assert.strictEqual(invalidated, 2);
	});

	it("render returns empty array for no children", () => {
		const container = new Container();
		assert.deepStrictEqual(container.render(80), []);
	});

	it("passes the width argument to each child", () => {
		const container = new Container();
		const widths: number[] = [];
		const child: Component = {
			render: (w) => {
				widths.push(w);
				return [];
			},
			invalidate: () => {},
		};
		container.addChild(child);
		container.addChild(child);
		container.render(42);
		assert.deepStrictEqual(widths, [42, 42]);
	});
});

describe("compositeTuiLine", () => {
	it("places the overlay at the specified column in a plain ASCII base", () => {
		// Base: "0123456789", overlay "ABC" at col 2, width 3, total 10
		const result = compositeTuiLine("0123456789", "ABC", 2, 3, 10);
		assert.strictEqual(visibleWidth(result), 10, "total width must equal totalWidth");
		// The overlay text must appear in the result
		assert.ok(result.includes("ABC"), "overlay text must be present");
	});

	it("places the overlay at column 0", () => {
		const result = compositeTuiLine("0123456789", "ABC", 0, 3, 10);
		assert.strictEqual(visibleWidth(result), 10);
		assert.ok(result.includes("ABC"));
	});

	it("places the overlay at the last columns", () => {
		const result = compositeTuiLine("0123456789", "ABC", 7, 3, 10);
		assert.strictEqual(visibleWidth(result), 10);
		assert.ok(result.includes("ABC"));
	});

	it("preserves base text outside the overlay region", () => {
		// Base "0123456789", overlay "ABC" at col 2, width 3
		// Columns 0-1 should be "01", columns 5-9 should be "56789"
		const result = compositeTuiLine("0123456789", "ABC", 2, 3, 10);
		assert.ok(result.includes("01"), "text before overlay must be preserved");
		assert.ok(result.includes("56789"), "text after overlay must be preserved");
	});

	it("works with a styled base line", () => {
		const result = compositeTuiLine("\x1b[31m0123456789\x1b[0m", "ABC", 2, 3, 10);
		assert.strictEqual(visibleWidth(result), 10);
		assert.ok(result.includes("ABC"));
	});

	it("clips the overlay when it extends beyond totalWidth", () => {
		// Overlay "ABCDE" at col 8, width 5, but total is only 10
		const result = compositeTuiLine("0123456789", "ABCDE", 8, 5, 10);
		assert.ok(visibleWidth(result) <= 10, "result must not exceed totalWidth");
	});

	it("returns the base line unchanged when it is an image line", () => {
		// Image lines (Kitty APC prefix) must not be composited
		const imageLine = "\x1b_Ga=T,f=100,q=2;AAAA\x1b\\";
		const result = compositeTuiLine(imageLine, "ABC", 0, 3, 80);
		assert.strictEqual(result, imageLine, "image lines must pass through unchanged");
	});
});

describe("CURSOR_MARKER", () => {
	it("is an APC sequence starting with ESC _", () => {
		assert.ok(CURSOR_MARKER.startsWith("\x1b_"), "should start with ESC _");
		assert.ok(CURSOR_MARKER.endsWith("\x07"), "should end with BEL");
	});

	it("has zero visible width", () => {
		assert.strictEqual(visibleWidth(CURSOR_MARKER), 0);
	});
});
