import { describe, expect, test } from "vitest";
import { pipe } from "./pipe";

describe("Example", () => {
  test("obvious thing", () => {
    const add = (x: number) => (y: number) => x + y;

    expect(pipe(2, add(2))).toBe(4);
  });
});
