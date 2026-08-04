import { describe, expect, it } from "vitest";
import { isSafeText } from "./moderation";

describe("isSafeText（NFR-1 本地词库即时拦截）", () => {
  it("正常文本放行", () => {
    expect(isSafeText("今晚的星海很安静，适合听歌。")).toEqual({ ok: true });
  });

  it("空字符串放行", () => {
    expect(isSafeText("")).toEqual({ ok: true });
  });

  it("命中敏感词拦截并返回命中词", () => {
    const r = isSafeText("你这个傻逼");
    expect(r.ok).toBe(false);
    expect(r.word).toBe("傻逼");
  });

  it("命中即返回，不依赖词在句中的位置", () => {
    expect(isSafeText("别再说去死了")).toEqual({ ok: false, word: "去死" });
  });
});
