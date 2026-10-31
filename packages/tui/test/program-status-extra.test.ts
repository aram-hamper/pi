// Edge-case tests for program-status functions

import assert from "node:assert";
import { describe, it } from "node:test";
import { formatProgramStatus, isProgramStatusReply } from "../src/program-status.ts";

function decodeMessage(sequence: string): string | undefined {
	const message = /:msg=([A-Za-z0-9+/=]*)/.exec(sequence)?.[1];
	return message === undefined ? undefined : Buffer.from(message, "base64").toString("utf8");
}

describe("formatProgramStatus edge cases", () => {
	it("all valid states produce valid OSC 7501 sequences", () => {
		for (const state of ["idle", "working", "blocked", "done", "error", "clear"] as const) {
			const seq = formatProgramStatus({ state });
			assert.ok(seq.startsWith("\x1b]7501;"), `state=${state} should start with OSC 7501`);
			assert.ok(seq.endsWith("\x1b\\"), `state=${state} should end with ST`);
			assert.ok(seq.includes(`state=${state}`), `state=${state} should be in sequence`);
		}
	});

	it("omits kind for non-blocked states", () => {
		for (const state of ["idle", "working", "done", "error", "clear"] as const) {
			const seq = formatProgramStatus({ state, kind: "permission" });
			assert.ok(!seq.includes("kind="), `state=${state} should not include kind`);
		}
	});

	it("includes kind for blocked state with all valid kinds", () => {
		for (const kind of ["permission", "question", "auth"] as const) {
			const seq = formatProgramStatus({ state: "blocked", kind });
			assert.ok(seq.includes(`kind=${kind}`), `kind=${kind} should be in sequence`);
		}
	});

	it("omits kind for blocked state when kind is not provided", () => {
		const seq = formatProgramStatus({ state: "blocked" });
		assert.ok(!seq.includes("kind="), "should not include kind when not provided");
	});

	it("app name at exactly 32 chars is included", () => {
		const app = "a".repeat(32);
		const seq = formatProgramStatus({ state: "idle", app });
		assert.ok(seq.includes(`app=${app}`), "32-char app name should be included");
	});

	it("app name at 33 chars is omitted", () => {
		const app = "a".repeat(33);
		const seq = formatProgramStatus({ state: "idle", app });
		assert.ok(!seq.includes("app="), "33-char app name should be omitted");
	});

	it("app name with valid special chars is included", () => {
		for (const app of ["my-app", "my.app", "my_app", "my+app"]) {
			const seq = formatProgramStatus({ state: "idle", app });
			assert.ok(seq.includes(`app=${app}`), `app=${app} should be included`);
		}
	});

	it("app name with invalid chars is omitted", () => {
		for (const app of ["my app", "my/app", "my@app", ""]) {
			const seq = formatProgramStatus({ state: "idle", app });
			assert.ok(!seq.includes("app="), `app=${app} should be omitted`);
		}
	});

	it("message is trimmed before encoding", () => {
		const seq = formatProgramStatus({ state: "idle", message: "  hello  " });
		assert.strictEqual(decodeMessage(seq), "hello");
	});

	it("message with only whitespace is omitted", () => {
		const seq = formatProgramStatus({ state: "idle", message: "   " });
		assert.ok(!seq.includes("msg="), "whitespace-only message should be omitted");
	});

	it("empty message is omitted", () => {
		const seq = formatProgramStatus({ state: "idle", message: "" });
		assert.ok(!seq.includes("msg="), "empty message should be omitted");
	});

	it("message with Unicode is encoded correctly", () => {
		const msg = "日本語テスト";
		const seq = formatProgramStatus({ state: "idle", message: msg });
		assert.strictEqual(decodeMessage(seq), msg);
	});

	it("message with control characters has them replaced", () => {
		const seq = formatProgramStatus({ state: "idle", message: "line1\nline2\x1b[31m" });
		const decoded = decodeMessage(seq);
		assert.ok(decoded !== undefined);
		assert.ok(!decoded.includes("\n"), "newline should be replaced");
		assert.ok(!decoded.includes("\x1b"), "ESC should be replaced");
	});

	it("clear state produces minimal sequence", () => {
		const seq = formatProgramStatus({ state: "clear" });
		assert.strictEqual(seq, "\x1b]7501;state=clear\x1b\\");
	});

	it("sequence is valid OSC format (no BEL terminator)", () => {
		const seq = formatProgramStatus({ state: "idle" });
		assert.ok(!seq.includes("\x07"), "should use ST not BEL");
	});
});

describe("isProgramStatusReply edge cases", () => {
	it("returns false for empty string", () => {
		assert.strictEqual(isProgramStatusReply(""), false);
	});

	it("returns false for plain text", () => {
		assert.strictEqual(isProgramStatusReply("hello"), false);
	});

	it("returns false for OSC 7501 status report (not a query echo)", () => {
		assert.strictEqual(isProgramStatusReply("\x1b]7501;state=idle\x1b\\"), false);
	});

	it("returns false for other OSC sequences", () => {
		assert.strictEqual(isProgramStatusReply("\x1b]11;rgb:0000/0000/0000\x07"), false);
		assert.strictEqual(isProgramStatusReply("\x1b]10;#ffffff\x07"), false);
	});

	it("returns true for query echo with BEL terminator", () => {
		assert.strictEqual(isProgramStatusReply("\x1b]7501;?\x07"), true);
	});

	it("returns true for query echo with ST terminator", () => {
		assert.strictEqual(isProgramStatusReply("\x1b]7501;?\x1b\\"), true);
	});

	it("returns true for query echo with additional pairs", () => {
		assert.strictEqual(isProgramStatusReply("\x1b]7501;?version=2:extra=data\x1b\\"), true);
	});

	it("returns false when query echo contains control characters in body", () => {
		// BEL or ESC in the body terminates the sequence early
		assert.strictEqual(isProgramStatusReply("\x1b]7501;?\x07extra"), false);
	});
});
