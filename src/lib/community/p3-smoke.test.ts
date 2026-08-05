import { beforeEach, describe, expect, it, vi } from "vitest";
import { STAR_PRAISE_ROLES } from "@/data/star-praise";
import { TEAHOUSE_SCHEDULE } from "@/data/teahouse-lines";
import type * as starPraiseMod from "@/lib/community/starPraise";
import type * as contextMod from "@/lib/community/context";
import type * as teahouseMod from "@/lib/colisten/teahouse";
import type * as anonApi from "@/lib/supabase/anon";
import type { Bottle, TrackSnapshot } from "@/types/social";
import type { CoListenRoom } from "@/types/colisten";

/**
 * P3 端到端联动冒烟（代码级验收，非 GUI）：
 * 用接近真实的本地数据跑通 A-01 星海赞 → A-03 注入 → A-04 提及 → A-02 茶话会，
 * 输出各功能在真实链路上的运行时产物供人工核对。
 */

const mem = new Map<string, string>();
const localStorageMock: Storage = {
  getItem: (k: string) => mem.get(k) ?? null,
  setItem: (k: string, v: string) => void mem.set(k, v),
  removeItem: (k: string) => void mem.delete(k),
  clear: () => mem.clear(),
  key: () => null,
  get length() {
    return mem.size;
  },
};

vi.mock("@/lib/supabase/anon", () => ({ isSupabaseReady: vi.fn(() => false) }));
vi.mock("@/lib/supabase/client", () => ({ getSupabase: vi.fn(() => null) }));
vi.mock("@/lib/api/sailor", () => ({
  getOrCreateSailor: vi.fn().mockResolvedValue({ anonMark: "晚风船客·A7F3" }),
  GUEST_ID: "local-guest",
  SYSTEM_ID: "system",
}));

let starApi: typeof starPraiseMod;
let ctxApi: typeof contextMod;
let teaApi: typeof teahouseMod;
let anon: typeof anonApi;

const snap = (t: { t: string; tag: string; s?: string }): TrackSnapshot => ({
  t: t.t,
  tag: t.tag,
  s: t.s ?? "测试站",
  cover: "/images/cover-anime-1.png",
});

const makePublicBottle = (over: Partial<Bottle> & { track?: TrackSnapshot } = {}): Bottle => ({
  id: `bb-${Math.random().toString(36).slice(2, 8)}`,
  authorId: "local-guest",
  text: "凌晨三点，耳机里放着一首很旧的后摇，忽然觉得星海很温柔。",
  track: snap({ t: "信风", tag: "后摇" }),
  bottleStyle: "paper",
  anonMark: "晚风船客·A7F3",
  status: "drifting",
  pickedBy: null,
  isSystem: false,
  createdAt: Date.now() - 30 * 60_000,
  repliedAt: null,
  readAt: null,
  isPublic: true,
  likedBy: [],
  ...over,
});

beforeEach(async () => {
  mem.clear();
  vi.resetModules();
  vi.stubGlobal("localStorage", localStorageMock);
  starApi = await import("@/lib/community/starPraise");
  ctxApi = await import("@/lib/community/context");
  teaApi = await import("@/lib/colisten/teahouse");
  anon = await import("@/lib/supabase/anon");
  vi.mocked(anon.isSupabaseReady).mockReturnValue(false);
});

describe("P3 联动冒烟（代码级验收）", () => {
  it("A-01: 模拟漂流广场 feed 组装，星海赞与角色信息正确挂载", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.0); // 全命中，看最大表现
    const pool: Bottle[] = [
      makePublicBottle({ id: "seed-postrock", text: "「信风」响起时，我刚好路过一片海。", track: snap({ t: "信风", tag: "后摇" }) }),
      makePublicBottle({ id: "seed-study", text: "自习到深夜，靠一曲钢琴续命。", track: snap({ t: "钢琴曲", tag: "钢琴" }) }),
      makePublicBottle({ id: "seed-rain", text: "窗外的雨没有停，耳机里的钢琴也没有。", track: snap({ t: "雨夜", tag: "环境" }) }),
      makePublicBottle({ id: "seed-jp", text: "日系的小调，让人想起夏天的祭典。", track: snap({ t: "夏日祭", tag: "日系" }) }),
    ];
    // 模拟 DriftPage 组装逻辑
    const praisedMap = starApi.ensureStarPraises(pool);
    const posts = pool.map((b) => ({ bottle: b, starPraises: praisedMap[b.id] ?? [] }));
    const names: Record<string, string> = Object.fromEntries(STAR_PRAISE_ROLES.map((r) => [r.roleId, r.name]));
    const lines = posts.map((p) => `「${p.bottle.track.tag}」→ ${p.starPraises.map((r) => names[r] ?? r).join("、") || "（无）"}`);
    process.stdout.write("\n[A-01 星海赞判定结果]\n" + lines.join("\n") + "\n");
    expect(posts.find((p) => p.bottle.id === "seed-postrock")!.starPraises).toContain("sio");
    expect(posts.find((p) => p.bottle.id === "seed-jp")!.starPraises).toContain("soku");
    expect(posts.every((p) => Array.isArray(p.starPraises))).toBe(true);
  });

  it("A-03+A-04: 真实社区数据下组装注入文本（星海近况 + 被关注瓶子提及）", () => {
    // 今日社区热点数据
    const today = Date.now() - 60 * 60_000;
    const hotPool: Bottle[] = [
      makePublicBottle({ id: "t-in1", topic: "insomnia", text: "今晚又失眠了，第 1001 个这样的夜。", createdAt: today, likedBy: ["m1", "m2", "m3", "m4", "m5", "m6"] }),
      makePublicBottle({ id: "t-in2", topic: "insomnia", text: "睡不着的时候，后摇是唯一的岸。", createdAt: today }),
      makePublicBottle({ id: "t-in3", topic: "insomnia", text: "三点四十七分，星海还很亮。", createdAt: today }),
      makePublicBottle({ id: "t-xins", topic: "study", text: "今天的自习进度：钢琴曲 x3。", createdAt: today }),
    ];
    // 用户最近投的、被汐关注的瓶子（A-04）
    const watched = makePublicBottle({
      id: "u-watched",
      text: "我把今晚的失眠写成了一艘纸船，希望有人捡到它。",
      watchedBy: "sio",
      createdAt: Date.now() - 2 * 86_400_000,
    });
    hotPool.push(watched);
    mem.set("drift-bottles-pool", JSON.stringify(hotPool));
    // 活跃共听房间（4 幽灵 + 自己 = 5 人 ≥ 5）
    const room: CoListenRoom = {
      id: "cr-test",
      title: "星海共听 · 信风",
      startTrack: snap({ t: "信风", tag: "后摇" }),
      playlist: [snap({ t: "信风", tag: "后摇" })],
      createdBy: "晚风船客·A7F3",
      hostId: "p-me",
      createdAt: Date.now(),
      lastActiveAt: Date.now(),
      ghosts: [
        { peerId: "ghost-1", anonMark: "纸鹤水手·A1" },
        { peerId: "ghost-2", anonMark: "薄雾领航·B2" },
        { peerId: "ghost-3", anonMark: "星尘游民·C3" },
        { peerId: "ghost-4", anonMark: "晚风灯塔·D4" },
      ],
    };
    mem.set("drift-colisten-rooms", JSON.stringify([room]));

    const payload = ctxApi.buildCommunityPayload("sio");
    process.stdout.write("\n[A-03 星海近况注入]" + (payload.communityContext || "（社区暂无热门内容，不注入）") + "\n");
    process.stdout.write(
      "\n[A-04 被关注瓶子提及注入]" + (payload.bottleMention || "（无可提及的瓶）") + "\n",
    );

    // 汐的注入应含失眠夜热点 + 高赞瓶 + 活跃房间 + 被关注瓶子
    expect(payload.communityContext).toContain("失眠夜");
    expect(payload.communityContext).toContain("信风");
    expect(payload.communityContext).toContain("汐也在关注");
    expect(payload.communityContext.length).toBeLessThanOrEqual(200);
    expect(payload.bottleMention).toContain("失眠");
    // 注意：注入块不包含角色名（角色身份来自 persona system，符合需求文档 A-04 模板）
    // B 性格筛选：同一份数据，流明不应提到失眠夜话题
    const lumenPayload = ctxApi.buildCommunityPayload("lumen");
    expect(lumenPayload.communityContext).not.toContain("失眠夜");
  });

  it("A-02: 茶话会排期 / 歌单 / 主持角色在真实链路上可用", () => {
    const now = new Date();
    now.setHours(22, 15, 0, 0);
    const dow = 5; // 周五
    now.setDate(now.getDate() + (dow - now.getDay()));
    const info = teaApi.getTeahouseFor(now)!;
    process.stdout.write(
      `\n[A-02 茶话会排期] ${info.roleName}主持 房间=${info.roomId}\n`,
    );
    const playlist = teaApi.buildTeahousePlaylist(info.roleId);
    process.stdout.write(`[A-02 茶话会歌单] ${playlist.length} 首，首曲=${playlist[0].t}\n`);
    const brief = teaApi.teahouseHostBrief(info.roleId);
    process.stdout.write(`[A-02 主持区] ${brief.name} 配色=${brief.color} 头像=${brief.avatar}\n`);
    expect(info.roleId).toBe("sio");
    expect(playlist.length).toBeGreaterThanOrEqual(15);
    expect(TEAHOUSE_SCHEDULE.length).toBe(4);
  });

  it("A-01 每日上限在真实 pool 规模下成立（20 上限）", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.0);
    const pool = Array.from({ length: 24 }, (_, i) =>
      makePublicBottle({ id: `many-${i}`, track: snap({ t: `曲${i}`, tag: "后摇" }) }),
    );
    const map = starApi.ensureStarPraises(pool);
    const sioHits = Object.values(map).filter((r) => r.includes("sio")).length;
    expect(sioHits).toBe(20);
  });
});