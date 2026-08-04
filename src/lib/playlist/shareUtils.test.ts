import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { PLAYLISTS } from "@/data/playlists";
import { shareToChatText, shareToChatUrl } from "./shareUtils";

/** 取一张官方歌单做测试 */
const playlist = PLAYLISTS[0];

describe("shareUtils（P3-05）", () => {
  it("shareToChatText 生成带歌单名的分享文案", () => {
    const text = shareToChatText(playlist);
    expect(text).toContain(playlist.name);
    expect(text).toContain("推荐");
  });

  it("shareToChatUrl 拼出带 encode 分享文案的聊天链接", () => {
    const url = shareToChatUrl("sio", playlist);
    expect(url).toMatch(/^\/chat\/sio\?share=/);
    // 文案被 encodeURIComponent 编码，URL 不直接含中文原始字符
    expect(url).not.toContain(playlist.name);
    expect(decodeURIComponent(url.split("share=")[1])).toContain(playlist.name);
  });
});

describe("shareUtils.playlistShareUrl / copyShareLink", () => {
  beforeEach(() => {
    // 模拟 window（node 环境无 window/navigator）
    vi.stubGlobal("window", { location: { origin: "https://drift.test" } });
    vi.stubGlobal("navigator", { clipboard: undefined });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("playlistShareUrl 基于 origin 拼链接（window 存在时）", async () => {
    const { playlistShareUrl } = await import("./shareUtils");
    expect(playlistShareUrl("pl-night-postrock")).toBe(
      "https://drift.test/playlist/pl-night-postrock",
    );
  });

  it("copyShareLink 剪贴板 API 可用时写入并返回 true", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    const { copyShareLink } = await import("./shareUtils");
    const ok = await copyShareLink("pl-jp-breeze");
    expect(ok).toBe(true);
    expect(writeText).toHaveBeenCalledWith("https://drift.test/playlist/pl-jp-breeze");
  });

  it("copyShareLink 剪贴板不可用时走 execCommand 降级", async () => {
    // 剪贴板 API 缺失 → 走 execCommand 路径（模拟 document）
    const execCommand = vi.fn().mockReturnValue(true);
    vi.stubGlobal("document", {
      createElement: () => ({
        value: "",
        style: {},
        select: vi.fn(),
        remove: vi.fn(),
      }),
      body: { appendChild: vi.fn() },
      execCommand,
    });
    const { copyShareLink } = await import("./shareUtils");
    const ok = await copyShareLink("pl-night-postrock");
    expect(ok).toBe(true);
    expect(execCommand).toHaveBeenCalledWith("copy");
  });
});