import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { stickerOf, stickerPromptFor, stickersOfRole } from "@/data/stickers";

/** R5 表情包数据冒烟：素材就位 / id 唯一 / prompt 可读 */

describe("素材就位", () => {
  const PUBLIC = join(process.cwd(), "public", "images");

  it("四角色各 8 张，共 32 张，且全部图片文件存在", () => {
    for (const roleId of ["sio", "lumen", "soku", "yoe"]) {
      const list = stickersOfRole(roleId);
      expect(list).toHaveLength(8);
      for (const s of list) {
        expect(existsSync(join(PUBLIC, s.path.replace("/images/", ""))), s.path).toBe(true);
      }
    }
  });

  it("id 全局唯一", () => {
    const all = ["sio", "lumen", "soku", "yoe"].flatMap(stickersOfRole);
    const ids = all.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("stickerOf 命中已知 / 未知返回 undefined", () => {
    expect(stickerOf("sio-01")?.path).toBe("/images/sio-sticker-01.webp");
    expect(stickerOf("nope-99")).toBeUndefined();
  });
});

describe("stickerPromptFor（AI 触发语义）", () => {
  it("段落包含该角色全部 8 个 id 与名字", () => {
    for (const roleId of ["sio", "lumen", "soku", "yoe"]) {
      const prompt = stickerPromptFor(roleId);
      const list = stickersOfRole(roleId);
      for (const s of list) {
        expect(prompt).toContain(s.id);
        expect(prompt).toContain(s.name);
      }
    }
  });
});