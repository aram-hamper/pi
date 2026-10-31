// Additional edge-case tests for KeybindingsManager

import assert from "node:assert";
import { describe, it } from "node:test";
import {
	getSelectPageIndex,
	KeybindingsManager,
	TUI_KEYBINDINGS,
} from "../src/keybindings.ts";

describe("KeybindingsManager edge cases", () => {
	describe("constructor", () => {
		it("creates manager with default bindings", () => {
			const km = new KeybindingsManager(TUI_KEYBINDINGS);
			assert.ok(km instanceof KeybindingsManager);
		});

		it("creates manager with empty user bindings", () => {
			const km = new KeybindingsManager(TUI_KEYBINDINGS, {});
			assert.deepStrictEqual(km.getConflicts(), []);
		});

		it("creates manager with custom definitions", () => {
			const km = new KeybindingsManager({
				"custom.action": { defaultKeys: "ctrl+x", description: "Custom action" },
			} as never);
			assert.deepStrictEqual(km.getKeys("custom.action" as never), ["ctrl+x"]);
		});
	});

	describe("matches", () => {
		it("returns false for unknown keybinding", () => {
			const km = new KeybindingsManager(TUI_KEYBINDINGS);
			assert.strictEqual(km.matches("a", "tui.editor.cursorUp"), false);
		});

		it("returns true for default key", () => {
			const km = new KeybindingsManager(TUI_KEYBINDINGS);
			assert.strictEqual(km.matches("\x1b[A", "tui.editor.cursorUp"), true);
		});

		it("returns true for any key in a multi-key binding", () => {
			const km = new KeybindingsManager(TUI_KEYBINDINGS);
			// cursorLeft has ["left", "ctrl+b"]
			assert.strictEqual(km.matches("\x1b[D", "tui.editor.cursorLeft"), true);
			assert.strictEqual(km.matches("\x02", "tui.editor.cursorLeft"), true);
		});

		it("returns false when binding has no keys", () => {
			const km = new KeybindingsManager(TUI_KEYBINDINGS);
			// historyPrevious has defaultKeys: []
			assert.strictEqual(km.matches("\x1b[A", "tui.editor.historyPrevious"), false);
		});

		it("uses user binding when provided", () => {
			const km = new KeybindingsManager(TUI_KEYBINDINGS, {
				"tui.editor.cursorUp": "ctrl+p",
			});
			assert.strictEqual(km.matches("\x10", "tui.editor.cursorUp"), true);
			// Default "up" should no longer match
			assert.strictEqual(km.matches("\x1b[A", "tui.editor.cursorUp"), false);
		});

		it("user binding with empty array disables the binding", () => {
			const km = new KeybindingsManager(TUI_KEYBINDINGS, {
				"tui.input.submit": [],
			});
			assert.strictEqual(km.matches("\r", "tui.input.submit"), false);
		});
	});

	describe("getKeys", () => {
		it("returns default keys for unoverridden binding", () => {
			const km = new KeybindingsManager(TUI_KEYBINDINGS);
			assert.deepStrictEqual(km.getKeys("tui.editor.cursorUp"), ["up"]);
		});

		it("returns user keys when overridden", () => {
			const km = new KeybindingsManager(TUI_KEYBINDINGS, {
				"tui.editor.cursorUp": ["ctrl+p", "up"],
			});
			assert.deepStrictEqual(km.getKeys("tui.editor.cursorUp"), ["ctrl+p", "up"]);
		});

		it("returns empty array for binding with no keys", () => {
			const km = new KeybindingsManager(TUI_KEYBINDINGS);
			assert.deepStrictEqual(km.getKeys("tui.editor.historyPrevious"), []);
		});

		it("deduplicates keys", () => {
			const km = new KeybindingsManager(TUI_KEYBINDINGS, {
				"tui.editor.cursorUp": ["up", "up", "ctrl+p"],
			});
			assert.deepStrictEqual(km.getKeys("tui.editor.cursorUp"), ["up", "ctrl+p"]);
		});

		it("returns a copy (not the internal array)", () => {
			const km = new KeybindingsManager(TUI_KEYBINDINGS);
			const keys = km.getKeys("tui.editor.cursorUp");
			keys.push("ctrl+z" as never);
			assert.deepStrictEqual(km.getKeys("tui.editor.cursorUp"), ["up"]);
		});
	});

	describe("getDefinition", () => {
		it("returns the definition for a known keybinding", () => {
			const km = new KeybindingsManager(TUI_KEYBINDINGS);
			const def = km.getDefinition("tui.editor.cursorUp");
			assert.strictEqual(def.defaultKeys, "up");
			assert.strictEqual(def.description, "Move cursor up");
		});
	});

	describe("getConflicts", () => {
		it("returns empty array when no conflicts", () => {
			const km = new KeybindingsManager(TUI_KEYBINDINGS);
			assert.deepStrictEqual(km.getConflicts(), []);
		});

		it("detects conflict when two bindings share a user key", () => {
			const km = new KeybindingsManager(TUI_KEYBINDINGS, {
				"tui.input.submit": "ctrl+x",
				"tui.select.confirm": "ctrl+x",
			});
			const conflicts = km.getConflicts();
			assert.strictEqual(conflicts.length, 1);
			assert.strictEqual(conflicts[0]!.key, "ctrl+x");
			assert.ok(conflicts[0]!.keybindings.includes("tui.input.submit"));
			assert.ok(conflicts[0]!.keybindings.includes("tui.select.confirm"));
		});

		it("returns a copy (not the internal array)", () => {
			const km = new KeybindingsManager(TUI_KEYBINDINGS, {
				"tui.input.submit": "ctrl+x",
				"tui.select.confirm": "ctrl+x",
			});
			const conflicts = km.getConflicts();
			conflicts.length = 0;
			assert.strictEqual(km.getConflicts().length, 1);
		});

		it("ignores unknown keybinding names in user config", () => {
			const km = new KeybindingsManager(TUI_KEYBINDINGS, {
				"unknown.action": "ctrl+x",
			} as never);
			assert.deepStrictEqual(km.getConflicts(), []);
		});
	});

	describe("setUserBindings", () => {
		it("updates bindings and rebuilds", () => {
			const km = new KeybindingsManager(TUI_KEYBINDINGS);
			km.setUserBindings({ "tui.editor.cursorUp": "ctrl+p" });
			assert.deepStrictEqual(km.getKeys("tui.editor.cursorUp"), ["ctrl+p"]);
		});

		it("clears previous user bindings", () => {
			const km = new KeybindingsManager(TUI_KEYBINDINGS, {
				"tui.editor.cursorUp": "ctrl+p",
			});
			km.setUserBindings({});
			assert.deepStrictEqual(km.getKeys("tui.editor.cursorUp"), ["up"]);
		});
	});

	describe("getUserBindings", () => {
		it("returns empty object when no user bindings", () => {
			const km = new KeybindingsManager(TUI_KEYBINDINGS);
			assert.deepStrictEqual(km.getUserBindings(), {});
		});

		it("returns a copy of user bindings", () => {
			const km = new KeybindingsManager(TUI_KEYBINDINGS, {
				"tui.editor.cursorUp": "ctrl+p",
			});
			const bindings = km.getUserBindings();
			assert.strictEqual(bindings["tui.editor.cursorUp"], "ctrl+p");
			// Mutating the copy should not affect the manager
			bindings["tui.editor.cursorUp"] = "ctrl+z" as never;
			assert.strictEqual(km.getUserBindings()["tui.editor.cursorUp"], "ctrl+p");
		});
	});

	describe("getResolvedBindings", () => {
		it("returns all bindings with their resolved keys", () => {
			const km = new KeybindingsManager(TUI_KEYBINDINGS);
			const resolved = km.getResolvedBindings();
			// Should have all TUI_KEYBINDINGS keys
			for (const key of Object.keys(TUI_KEYBINDINGS)) {
				assert.ok(key in resolved, `${key} should be in resolved bindings`);
			}
		});

		it("single key is returned as a string, not array", () => {
			const km = new KeybindingsManager(TUI_KEYBINDINGS);
			const resolved = km.getResolvedBindings();
			// tui.editor.cursorUp has single key "up"
			assert.strictEqual(resolved["tui.editor.cursorUp"], "up");
		});

		it("multiple keys are returned as an array", () => {
			const km = new KeybindingsManager(TUI_KEYBINDINGS);
			const resolved = km.getResolvedBindings();
			// tui.editor.cursorLeft has ["left", "ctrl+b"]
			assert.deepStrictEqual(resolved["tui.editor.cursorLeft"], ["left", "ctrl+b"]);
		});
	});
});

describe("getSelectPageIndex edge cases", () => {
	const km = new KeybindingsManager(TUI_KEYBINDINGS);

	it("returns undefined for non-page key", () => {
		assert.strictEqual(getSelectPageIndex(km, "a", 5, 10, 3), undefined);
	});

	it("pageUp at index 0 returns 0", () => {
		assert.strictEqual(getSelectPageIndex(km, "\x1b[5~", 0, 10, 3), 0);
	});

	it("pageDown at last index returns last index", () => {
		assert.strictEqual(getSelectPageIndex(km, "\x1b[6~", 9, 10, 3), 9);
	});

	it("pageUp with pageSize larger than current index clamps to 0", () => {
		assert.strictEqual(getSelectPageIndex(km, "\x1b[5~", 2, 10, 10), 0);
	});

	it("pageDown with pageSize larger than remaining items clamps to last", () => {
		assert.strictEqual(getSelectPageIndex(km, "\x1b[6~", 7, 10, 10), 9);
	});

	it("returns 0 for empty list on pageUp", () => {
		assert.strictEqual(getSelectPageIndex(km, "\x1b[5~", 0, 0, 5), 0);
	});

	it("returns 0 for empty list on pageDown", () => {
		assert.strictEqual(getSelectPageIndex(km, "\x1b[6~", 0, 0, 5), 0);
	});

	it("pageSize of 1 moves exactly one step", () => {
		assert.strictEqual(getSelectPageIndex(km, "\x1b[5~", 5, 10, 1), 4);
		assert.strictEqual(getSelectPageIndex(km, "\x1b[6~", 5, 10, 1), 6);
	});
});
