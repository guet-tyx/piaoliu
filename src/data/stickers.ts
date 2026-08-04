/**
 * R5 角色表情包（2026-08-03）：
 * 4 角色 × 8 张 Q 版贴纸，素材 public/images/<role>-sticker-<0N>.webp（美术已出图）。
 * 消息中以 [sticker: id] token 表示（复用 [music: 歌名] 的 token 渲染模式），
 * name/vibe 同时服务选择器提示、复制兜底与 AI system prompt 触发语义。
 */

export interface Sticker {
  /** 全局唯一 id："sio-01" */
  id: string;
  roleId: string;
  /** 图片路径（public 下） */
  path: string;
  /** 表情名（选择器展示 / 复制兜底 / AI 引用） */
  name: string;
  /** 适用场景一句话（AI 据语境选择贴纸） */
  vibe: string;
}

const STICKERS: Sticker[] = [
  // 汐 · 星海电台导航少女
  { id: "sio-01", roleId: "sio", path: "/images/sio-sticker-01.webp", name: "挥手问好", vibe: "冷暖打招呼/开场" },
  { id: "sio-02", roleId: "sio", path: "/images/sio-sticker-02.webp", name: "捧心比心", vibe: "喜爱/感谢/示好" },
  { id: "sio-03", roleId: "sio", path: "/images/sio-sticker-03.webp", name: "点赞加油", vibe: "夸奖/鼓励" },
  { id: "sio-04", roleId: "sio", path: "/images/sio-sticker-04.webp", name: "委屈哭哭", vibe: "难过/委屈/撒娇" },
  { id: "sio-05", roleId: "sio", path: "/images/sio-sticker-05.webp", name: "太棒了", vibe: "欢呼/庆祝" },
  { id: "sio-06", roleId: "sio", path: "/images/sio-sticker-06.webp", name: "呆住惊讶", vibe: "惊讶/意外" },
  { id: "sio-07", roleId: "sio", path: "/images/sio-sticker-07.webp", name: "偷笑调皮", vibe: "玩笑/俏皮" },
  { id: "sio-08", roleId: "sio", path: "/images/sio-sticker-08.webp", name: "晚安眯眼", vibe: "夜晚/晚安" },

  // 流明─星海灯塔守望者
  { id: "lumen-01", roleId: "lumen", path: "/images/lumen-sticker-01.webp", name: "灯塔问好", vibe: "沉静问候/开场" },
  { id: "lumen-02", roleId: "lumen", path: "/images/lumen-sticker-02.webp", name: "微笑认可", vibe: "认同/赞同" },
  { id: "lumen-03", roleId: "lumen", path: "/images/lumen-sticker-03.webp", name: "为你点灯", vibe: "鼓励/照亮方向" },
  { id: "lumen-04", roleId: "lumen", path: "/images/lumen-sticker-04.webp", name: "静静陪伴", vibe: "难过/守护" },
  { id: "lumen-05", roleId: "lumen", path: "/images/lumen-sticker-05.webp", name: "星光惊喜", vibe: "好消息/惊喜" },
  { id: "lumen-06", roleId: "lumen", path: "/images/lumen-sticker-06.webp", name: "沉思疑惑", vibe: "疑问/思考" },
  { id: "lumen-07", roleId: "lumen", path: "/images/lumen-sticker-07.webp", name: "温和提醒", vibe: "提醒/叮咛" },
  { id: "lumen-08", roleId: "lumen", path: "/images/lumen-sticker-08.webp", name: "守夜晚安", vibe: "夜晚/晚安" },

  // 朔空─凌晨三点打碟 DJ
  { id: "soku-01", roleId: "soku", path: "/images/soku-sticker-01.webp", name: "嗨起来", vibe: "开场/带节奏" },
  { id: "soku-02", roleId: "soku", path: "/images/soku-sticker-02.webp", name: "这波稳了", vibe: "认同/OK" },
  { id: "soku-03", roleId: "soku", path: "/images/soku-sticker-03.webp", name: "打碟高光", vibe: "玩梗/自夸" },
  { id: "soku-04", roleId: "soku", path: "/images/soku-sticker-04.webp", name: "拍拍肩", vibe: "难过/打气" },
  { id: "soku-05", roleId: "soku", path: "/images/soku-sticker-05.webp", name: "电翻全场", vibe: "庆祝/爆嗨" },
  { id: "soku-06", roleId: "soku", path: "/images/soku-sticker-06.webp", name: "什么情况", vibe: "惊讶/疑惑" },
  { id: "soku-07", roleId: "soku", path: "/images/soku-sticker-07.webp", name: "耍帅甩头", vibe: "调皮/冷幽默" },
  { id: "soku-08", roleId: "soku", path: "/images/soku-sticker-08.webp", name: "收摊休息", vibe: "深夜收尾/晚安" },

  // 悠─星海暗面占卜师
  { id: "yoe-01", roleId: "yoe", path: "/images/yoe-sticker-01.webp", name: "星图招呼", vibe: "玄妙问候/开场" },
  { id: "yoe-02", roleId: "yoe", path: "/images/yoe-sticker-02.webp", name: "卜得妙签", vibe: "好运/认同" },
  { id: "yoe-03", roleId: "yoe", path: "/images/yoe-sticker-03.webp", name: "天机所指", vibe: "指点/指引" },
  { id: "yoe-04", roleId: "yoe", path: "/images/yoe-sticker-04.webp", name: "为你拂尘", vibe: "安慰/祈福" },
  { id: "yoe-05", roleId: "yoe", path: "/images/yoe-sticker-05.webp", name: "卜到奇迹", vibe: "惊喜/意外之喜" },
  { id: "yoe-06", roleId: "yoe", path: "/images/yoe-sticker-06.webp", name: "手指捻星", vibe: "思考/琢磨" },
  { id: "yoe-07", roleId: "yoe", path: "/images/yoe-sticker-07.webp", name: "静静等待", vibe: "等待/安静" },
  { id: "yoe-08", roleId: "yoe", path: "/images/yoe-sticker-08.webp", name: "熄灯好眠", vibe: "夜晚/晚安" },
];

/** 按 id 取表情，未知返回 undefined（渲染层按字面文本兜底） */
export function stickerOf(id: string): Sticker | undefined {
  return STICKERS.find((s) => s.id === id);
}

/**
 * 素材版本号：美术更新贴纸图后 +1。
 * 渲染地址带版本参数，强制浏览器与 next/image 优化器绕过旧缓存
 * （曾出现改图后仍显示旧图的问题——优化器按 URL 缓存不随源文件失效）。
 */
export const STICKER_ASSET_VERSION = 2;

/** 贴纸图片渲染地址（含版本号，素材更新后必然拉新） */
export function stickerSrc(sticker: Pick<Sticker, "path">): string {
  return `${sticker.path}?v=${STICKER_ASSET_VERSION}`;
}

/** 某角色全部表情（按编号有序） */
export function stickersOfRole(roleId: string): Sticker[] {
  return STICKERS.filter((s) => s.roleId === roleId);
}

/**
 * system prompt 段落：告诉 AI 可用表情包与含义（chat-personas 引用，
 * 数据单一来源，避免手写两份）。
 */
export function stickerPromptFor(roleId: string): string {
  const list = stickersOfRole(roleId)
    .map((s) => `${s.id} ${s.name}（${s.vibe}）`)
    .join("、");
  return (
    `- 可以回应表情包，在句中/句尾插入 [sticker: id] 标记（如 [sticker: ${roleId}-04]），` +
    `每条回复最多 1 个。你的表情包：${list}`
  );
}