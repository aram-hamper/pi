// Tests for getSelectPageIndex, getKeybindings, and setKeybindings

import assert from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import {
	getKeybindings,
	getSelectPageIndex,
	KeybindingsManager,
	setKeybindings,
	TUI_KEYBINDINGS,
} from "../src/keybindings.ts";

describe("getSelectPageIndex", () => {
	const keybindings = new KeybindingsManager(TUI_KEYBINDINGS);

	it("returns undefined for non-page keys", () => {
		assert.strictEqual(getSelectPageIndex(keybindings, "a", 0, 10, 5), undefined);
		assert.strictEqual(getSelectPageIndex(keybindings, "\x1b[A", 0, 10, 5), undefined);
	});

	it("moves up by pageSize for pageUp key", () => {
		// pageUp key is "pageUp" = \x1b[5~
		const result = getSelectPageIndex(keybindings, "\x1b[5~", 8, 10, 3);
		assert.strictEqual(result, 5);
	});

	it("moves down by pageSize for pageDown key", () => {
		// pageDown key is "pageDown" = \x1b[6~
		const result = getSelectPageIndex(keybindings, "\x1b[6~", 2, 10, 3);
		assert.strictEqual(result, 5);
	});

	it("clamps to 0 when paging up past the start", () => {
		const result = getSelectPageIndex(keybindings, "\x1b[5~", 1, 10, 5);
		assert.strictEqual(result, 0);
	});

	it("clamps to itemCount-1 when paging down past the end", () => {
		const result = getSelectPageIndex(keybindings, "\x1b[6~", 8, 10, 5);
		assert.strictEqual(result, 9);
	});

	it("returns 0 for an empty list", () => {
		const result = getSelectPageIndex(keybindings, "\x1b[5~", 0, 0, 5);
		assert.strictEqual(result, 0);
	});

	it("moves exactly pageSize steps when not near a boundary", () => {
		const result = getSelectPageIndex(keybindings, "\x1b[6~", 0, 20, 4);
		assert.strictEqual(result, 4);
	});
});

describe("getKeybindings", () => {
	let savedKeybindings: KeybindingsManager;

	beforeEach(() => {
		savedKeybindings = getKeybindings();
	});

	afterEach(() => {
		setKeybindings(savedKeybindings);
	});

	it("returns a KeybindingsManager instance", () => {
		const kb = getKeybindings();
		assert.ok(kb instanceof KeybindingsManager);
	});

	it("returns the same instance on repeated calls", () => {
		const first = getKeybindings();
		const second = getKeybindings();
		assert.strictEqual(first, second);
	});

	it("returns the default TUI keybindings when none have been set", () => {
		// Reset to a fresh state by setting a new default manager
		const fresh = new KeybindingsManager(TUI_KEYBINDINGS);
		setKeybindings(fresh);
		const kb = getKeybindings();
		// Default enter key should be bound to tui.input.submit
		assert.ok(kb.matches("\r", "tui.input.submit"));
	});
});

describe("setKeybindings", () => {
	let savedKeybindings: KeybindingsManager;

	beforeEach(() => {
		savedKeybindings = getKeybindings();
	});

	afterEach(() => {
		setKeybindings(savedKeybindings);
	});

	it("replaces the global keybindings instance", () => {
		const custom = new KeybindingsManager(TUI_KEYBINDINGS, {
			"tui.input.submit": "ctrl+x",
		});
		setKeybindings(custom);
		assert.strictEqual(getKeybindings(), custom);
	});

	it("the replaced instance is immediately active for matches()", () => {
		const custom = new KeybindingsManager(TUI_KEYBINDINGS, {
			"tui.input.submit": "ctrl+x",
		});
		setKeybindings(custom);
		const kb = getKeybindings();
		// ctrl+x should now trigger submit
		assert.ok(kb.matches("\x18", "tui.input.submit"));
		// enter should no longer trigger submit (overridden)
		assert.ok(!kb.matches("\r", "tui.input.submit"));
	});

	it("restoring the original instance reverts the change", () => {
		const original = getKeybindings();
		const custom = new KeybindingsManager(TUI_KEYBINDINGS, {
			"tui.input.submit": "ctrl+x",
		});
		setKeybindings(custom);
		setKeybindings(original);
		assert.strictEqual(getKeybindings(), original);
	});
});
