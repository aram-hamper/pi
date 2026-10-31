// Additional edge-case tests for StdinBuffer

import assert from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import { StdinBuffer } from "../src/stdin-buffer.ts";

describe("StdinBuffer additional edge cases", () => {
	let buffer: StdinBuffer;
	let sequences: string[];
	let pastes: string[];

	beforeEach(() => {
		buffer = new StdinBuffer({ timeout: 10, escapeTimeout: 10 });
		sequences = [];
		pastes = [];
		buffer.on("data", (s) => sequences.push(s));
		buffer.on("paste", (s) => pastes.push(s));
	});

	afterEach(() => buffer.destroy());

	describe("process with Buffer input", () => {
		it("handles Buffer input for plain text", () => {
			buffer.process(Buffer.from("abc"));
			assert.deepStrictEqual(sequences, ["a", "b", "c"]);
		});

		it("handles Buffer input for escape sequence", () => {
			buffer.process(Buffer.from("\x1b[A"));
			assert.deepStrictEqual(sequences, ["\x1b[A"]);
		});

		it("converts high-byte Buffer to ESC + (byte-128)", () => {
			// Single byte > 127: e.g. 0x80 + 'a' (97) = 0xe1 -> ESC + 'a'
			buffer.process(Buffer.from([0x80 + 97])); // 0xe1 -> ESC + 'a'
			assert.deepStrictEqual(sequences, ["\x1ba"]);
		});
	});

	describe("getBuffer", () => {
		it("returns empty string initially", () => {
			assert.strictEqual(buffer.getBuffer(), "");
		});

		it("returns buffered incomplete sequence", () => {
			buffer.process("\x1b[");
			assert.strictEqual(buffer.getBuffer(), "\x1b[");
		});

		it("returns empty after complete sequence", () => {
			buffer.process("\x1b[A");
			assert.strictEqual(buffer.getBuffer(), "");
		});
	});

	describe("clear", () => {
		it("clears buffer and does not emit", () => {
			buffer.process("\x1b[<35");
			buffer.clear();
			assert.strictEqual(buffer.getBuffer(), "");
			assert.deepStrictEqual(sequences, []);
		});

		it("clears paste buffer", () => {
			buffer.process("\x1b[200~partial paste");
			buffer.clear();
			assert.strictEqual(buffer.getBuffer(), "");
		});
	});

	describe("flush", () => {
		it("returns empty array when buffer is empty", () => {
			assert.deepStrictEqual(buffer.flush(), []);
		});

		it("returns buffered content and clears buffer", () => {
			buffer.process("\x1b[<35");
			const flushed = buffer.flush();
			assert.deepStrictEqual(flushed, ["\x1b[<35"]);
			assert.strictEqual(buffer.getBuffer(), "");
		});

		it("cancels pending timeout", async () => {
			buffer.process("\x1b[<35");
			buffer.flush();
			// Wait longer than timeout; no additional events should fire
			await new Promise((resolve) => setTimeout(resolve, 20));
			assert.deepStrictEqual(sequences, []);
		});
	});

	describe("bracketed paste edge cases", () => {
		it("handles empty paste content", () => {
			buffer.process("\x1b[200~\x1b[201~");
			assert.deepStrictEqual(pastes, [""]);
			assert.deepStrictEqual(sequences, []);
		});

		it("handles paste with escape sequences in content", () => {
			buffer.process("\x1b[200~hello\x1b[31mworld\x1b[201~");
			assert.deepStrictEqual(pastes, ["hello\x1b[31mworld"]);
		});

		it("handles input after paste end", () => {
			buffer.process("\x1b[200~pasted\x1b[201~after");
			assert.deepStrictEqual(pastes, ["pasted"]);
			assert.deepStrictEqual(sequences, ["a", "f", "t", "e", "r"]);
		});

		it("handles input before paste start", () => {
			buffer.process("before\x1b[200~pasted\x1b[201~");
			assert.deepStrictEqual(pastes, ["pasted"]);
			assert.ok(sequences.includes("b"));
		});

		it("handles paste with Unicode content", () => {
			buffer.process("\x1b[200~日本語\x1b[201~");
			assert.deepStrictEqual(pastes, ["日本語"]);
		});

		it("handles paste with newlines", () => {
			buffer.process("\x1b[200~line1\nline2\x1b[201~");
			assert.deepStrictEqual(pastes, ["line1\nline2"]);
		});
	});

	describe("SS3 sequences", () => {
		it("handles SS3 arrow keys", () => {
			buffer.process("\x1bOA");
			assert.deepStrictEqual(sequences, ["\x1bOA"]);
		});

		it("handles SS3 home/end", () => {
			buffer.process("\x1bOH");
			assert.deepStrictEqual(sequences, ["\x1bOH"]);
			sequences.length = 0;
			buffer.process("\x1bOF");
			assert.deepStrictEqual(sequences, ["\x1bOF"]);
		});
	});

	describe("multiple sequences in one process call", () => {
		it("handles multiple complete sequences", () => {
			buffer.process("\x1b[A\x1b[B\x1b[C\x1b[D");
			assert.deepStrictEqual(sequences, ["\x1b[A", "\x1b[B", "\x1b[C", "\x1b[D"]);
		});

		it("handles text mixed with escape sequences", () => {
			buffer.process("a\x1b[Ab");
			assert.deepStrictEqual(sequences, ["a", "\x1b[A", "b"]);
		});

		it("handles Kitty CSI-u sequences", () => {
			buffer.process("\x1b[97u\x1b[98u");
			assert.deepStrictEqual(sequences, ["\x1b[97u", "\x1b[98u"]);
		});
	});

	describe("destroy", () => {
		it("clears buffer on destroy", () => {
			buffer.process("\x1b[<35");
			buffer.destroy();
			assert.strictEqual(buffer.getBuffer(), "");
		});

		it("does not emit after destroy", async () => {
			buffer.process("\x1b[<35");
			buffer.destroy();
			await new Promise((resolve) => setTimeout(resolve, 20));
			assert.deepStrictEqual(sequences, []);
		});
	});

	describe("empty input", () => {
		it("empty string emits empty data event", () => {
			buffer.process("");
			assert.deepStrictEqual(sequences, [""]);
		});

		it("empty Buffer emits empty data event", () => {
			buffer.process(Buffer.from(""));
			assert.deepStrictEqual(sequences, [""]);
		});
	});
});
