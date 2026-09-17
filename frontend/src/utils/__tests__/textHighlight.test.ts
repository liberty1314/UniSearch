import { describe, expect, it } from "vitest";
import {
  buildHighlightSegments,
  splitKeywordTokens,
} from "@/utils/textHighlight";

describe("关键词分词", () => {
  it("按空白拆分并去重（大小写不敏感）", () => {
    expect(splitKeywordTokens("Dune  dune 沙丘")).toEqual(["Dune", "沙丘"]);
  });

  it("超长输入的分词数量收敛到上限", () => {
    const tokens = splitKeywordTokens("a b c d e f g h");
    expect(tokens.length).toBeLessThanOrEqual(6);
  });

  it("空关键词不产生分词", () => {
    expect(splitKeywordTokens("   ")).toEqual([]);
  });
});

describe("高亮分段", () => {
  it("无关键词时返回单个普通分段", () => {
    expect(buildHighlightSegments("你的名字", "")).toEqual([
      { text: "你的名字", highlighted: false },
    ]);
  });

  it("命中片段按大小写不敏感切分", () => {
    expect(buildHighlightSegments("Dune Part Two dune", "dune")).toEqual([
      { text: "Dune", highlighted: true },
      { text: " Part Two ", highlighted: false },
      { text: "dune", highlighted: true },
    ]);
  });

  it("多词关键词全部命中", () => {
    expect(
      buildHighlightSegments("沙丘2 4K 剧场版", "沙丘 4K"),
    ).toEqual([
      { text: "沙丘", highlighted: true },
      { text: "2 ", highlighted: false },
      { text: "4K", highlighted: true },
      { text: " 剧场版", highlighted: false },
    ]);
  });

  it("正则元字符不逃逸出匹配", () => {
    expect(buildHighlightSegments("a.b (c) d*", "a.b (c)")).toEqual([
      { text: "a.b", highlighted: true },
      { text: " ", highlighted: false },
      { text: "(c)", highlighted: true },
      { text: " d*", highlighted: false },
    ]);
  });

  it("无命中时返回单个普通分段", () => {
    expect(buildHighlightSegments("流浪地球", "星际穿越")).toEqual([
      { text: "流浪地球", highlighted: false },
    ]);
  });

  it("长词优先匹配避免分词嵌套", () => {
    expect(buildHighlightSegments("4K蓝光 4K", "4K 4K蓝光")).toEqual([
      { text: "4K蓝光", highlighted: true },
      { text: " ", highlighted: false },
      { text: "4K", highlighted: true },
    ]);
  });

  it("空文本返回空分段数组", () => {
    expect(buildHighlightSegments("", "关键词")).toEqual([]);
  });
});
