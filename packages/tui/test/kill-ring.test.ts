// Tests for KillRing class

import assert from "node:assert";
import { describe, it } from "node:test";
import { KillRing } from "../src/kill-ring.ts";

describe("KillRing", () => {
	describe("push", () => {
		it("adds a single entry", () => {
			const ring = new KillRing();
			ring.push("hello", { prepend: false });
			assert.strictEqual(ring.length, 1);
			assert.strictEqual(ring.peek(), "hello");
		});

		it("ignores empty string", () => {
			const ring = new KillRing();
			ring.push("", { prepend: false });
			assert.strictEqual(ring.length, 0);
			assert.strictEqual(ring.peek(), undefined);
		});

		it("adds multiple entries independently", () => {
			const ring = new KillRing();
			ring.push("first", { prepend: false });
			ring.push("second", { prepend: false });
			assert.strictEqual(ring.length, 2);
			assert.strictEqual(ring.peek(), "second");
		});

		it("accumulates by appending when prepend is false", () => {
			const ring = new KillRing();
			ring.push("hello", { prepend: false });
			ring.push(" world", { prepend: false, accumulate: true });
			assert.strictEqual(ring.length, 1);
			assert.strictEqual(ring.peek(), "hello world");
		});

		it("accumulates by prepending when prepend is true", () => {
			const ring = new KillRing();
			ring.push("world", { prepend: false });
			ring.push("hello ", { prepend: true, accumulate: true });
			assert.strictEqual(ring.length, 1);
			assert.strictEqual(ring.peek(), "hello world");
		});

		it("accumulate on empty ring creates a new entry", () => {
			const ring = new KillRing();
			ring.push("text", { prepend: false, accumulate: true });
			assert.strictEqual(ring.length, 1);
			assert.strictEqual(ring.peek(), "text");
		});

		it("accumulate=false always creates a new entry", () => {
			const ring = new KillRing();
			ring.push("a", { prepend: false });
			ring.push("b", { prepend: false, accumulate: false });
			assert.strictEqual(ring.length, 2);
			assert.strictEqual(ring.peek(), "b");
		});

		it("multiple accumulations build up the entry", () => {
			const ring = new KillRing();
			ring.push("a", { prepend: false });
			ring.push("b", { prepend: false, accumulate: true });
			ring.push("c", { prepend: false, accumulate: true });
			assert.strictEqual(ring.length, 1);
			assert.strictEqual(ring.peek(), "abc");
		});

		it("accumulate with empty string is a no-op", () => {
			const ring = new KillRing();
			ring.push("hello", { prepend: false });
			ring.push("", { prepend: false, accumulate: true });
			assert.strictEqual(ring.length, 1);
			assert.strictEqual(ring.peek(), "hello");
		});
	});

	describe("peek", () => {
		it("returns undefined for empty ring", () => {
			const ring = new KillRing();
			assert.strictEqual(ring.peek(), undefined);
		});

		it("returns the most recent entry without modifying the ring", () => {
			const ring = new KillRing();
			ring.push("a", { prepend: false });
			ring.push("b", { prepend: false });
			assert.strictEqual(ring.peek(), "b");
			assert.strictEqual(ring.length, 2);
		});

		it("peek is idempotent", () => {
			const ring = new KillRing();
			ring.push("x", { prepend: false });
			assert.strictEqual(ring.peek(), "x");
			assert.strictEqual(ring.peek(), "x");
		});
	});

	describe("rotate", () => {
		it("is a no-op on empty ring", () => {
			const ring = new KillRing();
			assert.doesNotThrow(() => ring.rotate());
			assert.strictEqual(ring.length, 0);
		});

		it("is a no-op on single-entry ring", () => {
			const ring = new KillRing();
			ring.push("only", { prepend: false });
			ring.rotate();
			assert.strictEqual(ring.peek(), "only");
			assert.strictEqual(ring.length, 1);
		});

		it("moves the last entry to the front", () => {
			const ring = new KillRing();
			ring.push("first", { prepend: false });
			ring.push("second", { prepend: false });
			ring.push("third", { prepend: false });
			// Before rotate: peek = "third"
			ring.rotate();
			// After rotate: "third" moves to front, peek = "second"
			assert.strictEqual(ring.peek(), "second");
		});

		it("cycles through all entries", () => {
			const ring = new KillRing();
			ring.push("a", { prepend: false });
			ring.push("b", { prepend: false });
			ring.push("c", { prepend: false });
			// Initial: peek = "c"
			ring.rotate(); // "c" -> front, peek = "b"
			assert.strictEqual(ring.peek(), "b");
			ring.rotate(); // "b" -> front, peek = "a"
			assert.strictEqual(ring.peek(), "a");
			ring.rotate(); // "a" -> front, peek = "c"
			assert.strictEqual(ring.peek(), "c");
		});
	});

	describe("length", () => {
		it("starts at 0", () => {
			const ring = new KillRing();
			assert.strictEqual(ring.length, 0);
		});

		it("increments with each non-empty push", () => {
			const ring = new KillRing();
			ring.push("a", { prepend: false });
			assert.strictEqual(ring.length, 1);
			ring.push("b", { prepend: false });
			assert.strictEqual(ring.length, 2);
		});

		it("does not change on accumulate", () => {
			const ring = new KillRing();
			ring.push("a", { prepend: false });
			ring.push("b", { prepend: false, accumulate: true });
			assert.strictEqual(ring.length, 1);
		});

		it("does not change on rotate", () => {
			const ring = new KillRing();
			ring.push("a", { prepend: false });
			ring.push("b", { prepend: false });
			ring.rotate();
			assert.strictEqual(ring.length, 2);
		});
	});
});
