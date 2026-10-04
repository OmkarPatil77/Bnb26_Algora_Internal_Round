import { describe, it, expect } from "vitest";
import { getHighlightedLines } from "./highlighter.js";

describe("Highlighter Heuristics", () => {
  it("highlights range() for M01 and M02", () => {
    const code = `def sum_to_n(n):\n    total = 0\n    for i in range(n):\n        total += i\n    return total`;
    const linesM01 = getHighlightedLines(code, "M01");
    expect(linesM01).toEqual([3]);

    const linesM02 = getHighlightedLines(code, "M02");
    expect(linesM02).toEqual([3]);
  });

  it("highlights print() for M03", () => {
    const code = `def square(x):\n    print(x * x)\n\nsquare(4)`;
    const lines = getHighlightedLines(code, "M03");
    expect(lines).toEqual([2]);
  });

  it("highlights list aliasing assignment for M04", () => {
    const code = `a = [1, 2]\nb = a\nb.append(3)\nprint(a)`;
    const lines = getHighlightedLines(code, "M04");
    expect(lines).toContain(2); // b = a
    expect(lines).toContain(3); // b.append(3)
  });

  it("highlights division operators for M05", () => {
    const code = `def average(nums):\n    return sum(nums) // len(nums)`;
    const lines = getHighlightedLines(code, "M05");
    expect(lines).toEqual([2]);
  });

  it("highlights accumulator re-initialization inside loop for M06", () => {
    const code = `for x in [1, 2, 3]:\n    total = 0\n    total += x\nprint(total)`;
    const lines = getHighlightedLines(code, "M06");
    expect(lines).toEqual([2]); // total = 0 inside loop
  });

  it("highlights input() for M07", () => {
    const code = `x = input()\ny = input()\nprint(x + y)`;
    const lines = getHighlightedLines(code, "M07");
    expect(lines).toEqual([1, 2]);
  });

  it("returns empty array for empty code or unknown label", () => {
    expect(getHighlightedLines("", "M01")).toEqual([]);
    expect(getHighlightedLines("x = 1", undefined)).toEqual([]);
    expect(getHighlightedLines("x = 1", "NONE")).toEqual([]);
  });
});
