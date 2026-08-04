/**
 * 虚拟主持人台词库（P3-01）
 * 每位主持人（除私人 FM）按触发时机分三类台词池，随机取一条：
 * - enter      进入频道时打招呼
 * - per3       每连续 3 首曲目切换时介绍
 * - idle       用户 60 秒无操作时安慰
 * 全部人工维护文案（NFR-2：禁止生成式发言）。
 */

import { pickRandom } from "@/lib/random";

export type HostTrigger = "enter" | "per3" | "idle";

/** 主持人台词（按角色分组，每时机一个台词池） */
export interface HostLines {
  roleId: string;
  /** 所属频道（主持人与频道绑定） */
  channelId: string;
  lines: Record<HostTrigger, string[]>;
}

export const HOST_LINES: HostLines[] = [
  {
    roleId: "sio",
    channelId: "ch-night",
    lines: {
      enter: [
        "夜深了，让我陪你听一首歌吧。",
        "你还没睡啊？正好，我也在听。",
        "今晚的星海很安静，适合一个人听歌。",
      ],
      per3: [
        "下一首，是我很喜欢的后摇。",
        "这首歌的旋律，像深夜吹过的风。",
        "你知道吗，有人说后摇是失眠者的摇篮曲。",
      ],
      idle: [
        "如果困了就先睡吧，歌会一直放着。",
        "我在这里，不会走。",
      ],
    },
  },
  {
    roleId: "soku",
    channelId: "ch-jp",
    lines: {
      enter: [
        "ようこそ！今天的风很舒服呢！",
        "来啦！正好有一首超棒的歌要放给你听！",
        "日系频道打开——今天的元气从这首歌开始！",
      ],
      per3: [
        "接下来这首歌，夏天感满满！",
        "你听过这首吗？我可是循环了一整天！",
        "日系旋律配上这个黄昏，绝杀。",
      ],
      idle: [
        "要不要跟着节奏晃一晃？反正没人看见。",
        "听歌的时候，烦恼什么的先丢一边吧！",
      ],
    },
  },
  {
    roleId: "lumen",
    channelId: "ch-study",
    lines: {
      enter: [
        "翻开书，戴上耳机，世界安静了。",
        "学习的时候，需要一点刚刚好的背景音。",
        "这里是学习频道，你的专注 BGM 已就绪。",
      ],
      per3: [
        "这首钢琴曲的节奏，很适合现在的心流状态。",
        "轻音乐的好处是——它不会抢走你的注意力。",
        "下一首，来自一位我很喜欢的钢琴家。",
      ],
      idle: [
        "专注的人，连背影都很好看。",
        "慢慢来，比较快。",
      ],
    },
  },
  {
    roleId: "yoe",
    channelId: "ch-rain",
    lines: {
      enter: [
        "雨停了，但旋律还在下。",
        "你听，雨声和钢琴声，是不是很像？",
        "雨天频道，给潮湿的心情一个容器。",
      ],
      per3: [
        "这首歌里藏着一个秘密，你听得到吗。",
        "雨天的旋律，总是带着一点怀念。",
        "下一首，像雨滴落在湖面。",
      ],
      idle: [
        "有些情绪，只有雨天和音乐能懂。",
        "静静地听，让旋律替你说话。",
      ],
    },
  },
];

/** 按频道取主持人台词（无则 null） */
export function hostLinesOf(channelId: string): HostLines | undefined {
  return HOST_LINES.find((h) => h.channelId === channelId);
}

/** 从台词池随机取一条（稳定的运行期随机） */
export function pickLine(lines: string[]): string {
  return pickRandom(lines) ?? "";
}