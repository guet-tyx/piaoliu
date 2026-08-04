import { describe, expect, it } from "vitest";
import { CHARACTERS } from "@/data/character";
import { CHAT_PERSONAS } from "@/data/chat-personas";
import { GREETING_POOLS } from "@/data/greetings";
import { LIFE_STATUS_POOLS } from "@/data/life-status";
import { DEFAULT_ROLE_ID, ROLE_IDS } from "./roles";

describe("角色注册完整性（ROLE_IDS 单一来源）", () => {
  it("ROLE_IDS 覆盖 4 位星海守望者且 DEFAULT_ROLE_ID 在其中", () => {
    expect(ROLE_IDS).toHaveLength(4);
    expect(ROLE_IDS).toContain(DEFAULT_ROLE_ID);
  });

  it("CHAT_PERSONAS 覆盖全部 ROLE_IDS", () => {
    const ids = new Set(CHAT_PERSONAS.map((p) => p.roleId));
    for (const id of ROLE_IDS) expect(ids.has(id)).toBe(true);
  });

  it("persona 与角色卡的 avatar/image 路径一致（防双处维护漂移）", () => {
    for (const persona of CHAT_PERSONAS) {
      const ch = CHARACTERS.find((c) => c.id === persona.roleId);
      expect(ch, `${persona.roleId} 在 CHARACTERS 中存在`).toBeTruthy();
      expect(persona.avatar, `${persona.roleId} avatar`).toBe(ch!.avatar);
      expect(persona.image, `${persona.roleId} image`).toBe(ch!.image);
    }
  });

  it("开场白池覆盖全部 ROLE_IDS 且默认池 ≥3 句", () => {
    const poolIds = new Set(GREETING_POOLS.map((p) => p.roleId));
    for (const id of ROLE_IDS) {
      expect(poolIds.has(id), `${id} 有开场白池`).toBe(true);
      const pool = GREETING_POOLS.find((p) => p.roleId === id)!;
      expect(pool.default.length).toBeGreaterThanOrEqual(3);
    }
  });

  it("生活状态池覆盖全部 ROLE_IDS", () => {
    const poolIds = new Set(LIFE_STATUS_POOLS.map((p) => p.roleId));
    for (const id of ROLE_IDS) expect(poolIds.has(id), `${id} 有生活状态池`).toBe(true);
  });
});
