// Tests for isAppleTerminalSession and parseKeyboardProtocolNegotiationSequence

import assert from "node:assert";
import { describe, it } from "node:test";
import { isAppleTerminalSession, parseKeyboardProtocolNegotiationSequence } from "../src/terminal.ts";

function withEnv(overrides: Record<string, string | undefined>, fn: () => void): void {
	const saved: Record<string, string | undefined> = {};
	for (const key of Object.keys(overrides)) {
		saved[key] = process.env[key];
		if (overrides[key] === undefined) {
			delete process.env[key];
		} else {
			process.env[key] = overrides[key];
		}
	}
	try {
		fn();
	} finally {
		for (const key of Object.keys(saved)) {
			if (saved[key] === undefined) {
				delete process.env[key];
			} else {
				process.env[key] = saved[key];
			}
		}
	}
}

describe("isAppleTerminalSession", () => {
	it("returns true on macOS with Apple_Terminal TERM_PROGRAM", () => {
		if (process.platform !== "darwin") return;
		withEnv({ TERM_PROGRAM: "Apple_Terminal" }, () => {
			assert.strictEqual(isAppleTerminalSession(), true);
		});
	});

	it("returns false when TERM_PROGRAM is not Apple_Terminal", () => {
		withEnv({ TERM_PROGRAM: "iTerm.app" }, () => {
			// Only true on darwin with Apple_Terminal
			if (process.platform !== "darwin") {
				assert.strictEqual(isAppleTerminalSession(), false);
			}
		});
	});

	it("returns false on non-darwin platforms regardless of TERM_PROGRAM", () => {
		if (process.platform === "darwin") return;
		withEnv({ TERM_PROGRAM: "Apple_Terminal" }, () => {
			assert.strictEqual(isAppleTerminalSession(), false);
		});
	});
});

describe("parseKeyboardProtocolNegotiationSequence", () => {
	it("parses a Kitty flags response", () => {
		const result = parseKeyboardProtocolNegotiationSequence("\x1b[?7u");
		assert.deepStrictEqual(result, { type: "kitty-flags", flags: 7 });
	});

	it("parses zero Kitty flags", () => {
		const result = parseKeyboardProtocolNegotiationSequence("\x1b[?0u");
		assert.deepStrictEqual(result, { type: "kitty-flags", flags: 0 });
	});

	it("parses a device attributes response", () => {
		const result = parseKeyboardProtocolNegotiationSequence("\x1b[?62;4;52c");
		assert.deepStrictEqual(result, { type: "device-attributes" });
	});

	it("parses a minimal device attributes response", () => {
		const result = parseKeyboardProtocolNegotiationSequence("\x1b[?c");
		assert.deepStrictEqual(result, { type: "device-attributes" });
	});

	it("returns undefined for unrecognized sequences", () => {
		assert.strictEqual(parseKeyboardProtocolNegotiationSequence("a"), undefined);
		assert.strictEqual(parseKeyboardProtocolNegotiationSequence("\x1b[A"), undefined);
		assert.strictEqual(parseKeyboardProtocolNegotiationSequence(""), undefined);
	});
});
