// Tests for UndoStack class

import assert from "node:assert";
import { describe, it } from "node:test";
import { UndoStack } from "../src/undo-stack.ts";

describe("UndoStack", () => {
	describe("push and pop", () => {
		it("push stores a deep clone, pop returns it", () => {
			const stack = new UndoStack<{ x: number }>();
			const state = { x: 1 };
			stack.push(state);
			state.x = 99; // mutate original
			const popped = stack.pop();
			assert.deepStrictEqual(popped, { x: 1 }); // clone was stored
		});

		it("pop returns undefined on empty stack", () => {
			const stack = new UndoStack<number>();
			assert.strictEqual(stack.pop(), undefined);
		});

		it("pop removes the entry", () => {
			const stack = new UndoStack<number>();
			stack.push(1);
			stack.pop();
			assert.strictEqual(stack.length, 0);
		});

		it("multiple pushes and pops in LIFO order", () => {
			const stack = new UndoStack<number>();
			stack.push(1);
			stack.push(2);
			stack.push(3);
			assert.strictEqual(stack.pop(), 3);
			assert.strictEqual(stack.pop(), 2);
			assert.strictEqual(stack.pop(), 1);
			assert.strictEqual(stack.pop(), undefined);
		});

		it("stores independent clones for each push", () => {
			const stack = new UndoStack<number[]>();
			const arr = [1, 2, 3];
			stack.push(arr);
			arr.push(4);
			stack.push(arr);
			const second = stack.pop();
			const first = stack.pop();
			assert.deepStrictEqual(second, [1, 2, 3, 4]);
			assert.deepStrictEqual(first, [1, 2, 3]);
		});
	});

	describe("clear", () => {
		it("removes all entries", () => {
			const stack = new UndoStack<number>();
			stack.push(1);
			stack.push(2);
			stack.clear();
			assert.strictEqual(stack.length, 0);
			assert.strictEqual(stack.pop(), undefined);
		});

		it("is safe to call on empty stack", () => {
			const stack = new UndoStack<number>();
			assert.doesNotThrow(() => stack.clear());
			assert.strictEqual(stack.length, 0);
		});
	});

	describe("length", () => {
		it("starts at 0", () => {
			const stack = new UndoStack<string>();
			assert.strictEqual(stack.length, 0);
		});

		it("increments with each push", () => {
			const stack = new UndoStack<string>();
			stack.push("a");
			assert.strictEqual(stack.length, 1);
			stack.push("b");
			assert.strictEqual(stack.length, 2);
		});

		it("decrements with each pop", () => {
			const stack = new UndoStack<string>();
			stack.push("a");
			stack.push("b");
			stack.pop();
			assert.strictEqual(stack.length, 1);
		});

		it("resets to 0 after clear", () => {
			const stack = new UndoStack<string>();
			stack.push("a");
			stack.push("b");
			stack.clear();
			assert.strictEqual(stack.length, 0);
		});
	});

	describe("deep clone behavior", () => {
		it("clones nested objects", () => {
			const stack = new UndoStack<{ nested: { value: number } }>();
			const state = { nested: { value: 42 } };
			stack.push(state);
			state.nested.value = 0;
			const popped = stack.pop();
			assert.deepStrictEqual(popped, { nested: { value: 42 } });
		});

		it("clones arrays", () => {
			const stack = new UndoStack<number[]>();
			const arr = [1, 2, 3];
			stack.push(arr);
			arr[0] = 99;
			const popped = stack.pop();
			assert.deepStrictEqual(popped, [1, 2, 3]);
		});
	});
});
