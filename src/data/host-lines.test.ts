import { describe, it, expect } from "vitest";
import { HOST_LINES, hostLinesOf, pickLine } from "./host-lines";
import { CHANNELS } from "./channels";

describe("host-lines（P3-01）", () => {
  it("4 位主持人各配齐 enter/per3/idle 三类台词池", () => {
    expect(HOST_LINES.length).toBe(4);
    for (const h of HOST_LINES) {
      expect(h.lines.enter.length).toBeGreaterThan(0);
      expect(h.lines.per3.length).toBeGreaterThan(0);
      expect(h.lines.idle.length).toBeGreaterThan(0);
    }
  });

  it("主持人频道与 CHANNELS 的 host 映射一致（除私人 FM）", () => {
    for (const ch of CHANNELS) {
      if (ch.id === "ch-fm") continue;
      const lines = hostLinesOf(ch.id);
      expect(lines, `频道 ${ch.id} 应有主持人台词`).toBeDefined();
      expect(lines!.roleId).toBe(ch.host);
    }
  });

  it("私人 FM 无主持人台词", () => {
    expect(hostLinesOf("ch-fm")).toBeUndefined();
  });

  it("pickLine 从池中取一条非空台词", () => {
    const h = hostLinesOf("ch-night")!;
    const line = pickLine(h.lines.enter);
    expect(typeof line).toBe("string");
    expect(line.length).toBeGreaterThan(0);
  });

  it("pickLine 空池返回空串", () => {
    expect(pickLine([])).toBe("");
  });

  it("hostLinesOf 未知频道返回 undefined", () => {
    expect(hostLinesOf("ch-nope")).toBeUndefined();
  });
});