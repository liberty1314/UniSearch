import { describe, expect, it } from "vitest";
import {
  SOURCE_FOCUS_LONG_PRESS_MS,
  clampMenuPosition,
} from "@/components/search-filters/sourceFocusMenuUtils";

describe("sourceFocusMenu", () => {
  it("使用足够长但不迟钝的长按阈值", () => {
    expect(SOURCE_FOCUS_LONG_PRESS_MS).toBe(520);
  });

  it("将菜单坐标限制在视口内", () => {
    expect(
      clampMenuPosition({
        x: 380,
        y: 820,
        viewportWidth: 390,
        viewportHeight: 844,
        menuWidth: 220,
        menuHeight: 176,
      }),
    ).toEqual({ x: 154, y: 660 });
  });

  it("保留安全边距内的菜单坐标", () => {
    expect(
      clampMenuPosition({
        x: 80,
        y: 120,
        viewportWidth: 390,
        viewportHeight: 844,
        menuWidth: 220,
        menuHeight: 176,
      }),
    ).toEqual({ x: 80, y: 120 });
  });
});
