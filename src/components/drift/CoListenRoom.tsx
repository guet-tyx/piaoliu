"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { SectionHead } from "@/components/shared/SectionHead";
import { Toast } from "@/components/shared/Toast";
import { fetchCoListenRoom, touchCoListenRoom } from "@/lib/api/colisten";
import { getPeerId, publishColisten, subscribeColisten } from "@/lib/realtime/colistenChannel";
import { resolveTrackFull } from "@/lib/player/playSnapshot";
import { isSafeText } from "@/lib/api/moderation";
import { usePlayerStore } from "@/stores/player";
import { GHOST_DANMAKU, type CoListenRoom, type CoListenMessage } from "@/types/colisten";
import type { Track } from "@/types/music";
import styles from "./CoListenRoom.module.css";

/** 弹幕 3 秒限流 */
const DM_COOLDOWN_MS = 3_000;
/** 弹幕长度 1-50 字 */
const DM_MAX = 50;
/** 弹幕展示上限 */
const DM_LIST_MAX = 60;

interface RoomDm {
  key: string;
  peerId: string;
  anonMark: string;
  text: string;
  at: number;
  mine: boolean;
}

interface CoListenRoomProps {
  roomId: string;
}

/**
 * 星海共听房间（P2）：
 * 房主控制播放/暂停/切歌 → 广播 play-state 同步全员；房间内匿名弹幕（3 秒限流、
 * 敏感词、不持久化）；投票过半自动切歌；本地模式幽灵成员营造多人氛围；
 * 房主离开自动转移；30 分钟无人由列表页过滤自动解散。
 */
export function CoListenRoom({ roomId }: CoListenRoomProps) {
  const myPeer = useMemo(() => getPeerId(), []);
  const [room, setRoom] = useState<CoListenRoom | null>(null);
  const [loading, setLoading] = useState(true);
  const [dmText, setDmText] = useState("");
  const [danmakus, setDanmakus] = useState<RoomDm[]>([]);
  /** 投票记录（peerId → up；防重复投票） */
  const [votes, setVotes] = useState<Record<string, string>>({});
  /** 活跃成员（自己 + 幽灵 + 收到消息的 peers） */
  const [activePeers, setActivePeers] = useState<Set<string>>(new Set([myPeer]));
  const [isHost, setIsHost] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const lastDmRef = useRef(0);

  const currentIndex = usePlayerStore((s) => s.currentIndex);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const currentTime = usePlayerStore((s) => s.currentTime);

  // 曲目队列（快照 → 曲库完整曲目）
  const queue: Track[] = useMemo(
    () => (room ? room.playlist.map((s) => resolveTrackFull(s)).filter((t): t is Track => Boolean(t)) : []),
    [room],
  );

  // 在线成员（自己 + 幽灵 + 真实活跃 peers）
  const members = useMemo(() => {
    if (!room) return [];
    const list = [
      { peerId: myPeer, anonMark: `船客·${myPeer.slice(2, 6).toUpperCase()}`, isHost, ghost: false },
      ...(room.ghosts ?? []).map((g) => ({ peerId: g.peerId, anonMark: g.anonMark, isHost: false, ghost: true })),
    ];
    for (const p of activePeers) {
      if (p === myPeer || list.some((m) => m.peerId === p)) continue;
      list.push({ peerId: p, anonMark: `船客·${p.slice(2, 6).toUpperCase()}`, isHost: false, ghost: false });
    }
    return list;
  }, [room, activePeers, myPeer, isHost]);

  // 挂载：加载房间 + 订阅频道 + 初始化播放器 + 心跳
  useEffect(() => {
    let alive = true;
    (async () => {
      const r = await fetchCoListenRoom(roomId);
      if (!alive) return;
      if (!r) {
        setLoading(false);
        setToast("这个共听房间已经结束了。");
        return;
      }
      setRoom(r);
      setLoading(false);
      setIsHost(r.hostId === myPeer);
      // 本标签页加入房间：接管播放器播放房间队列
      if (r.playlist.length > 0) {
        usePlayerStore.getState().playQueue(queue, { type: "colisten" });
        if (r.hostId === myPeer) usePlayerStore.getState().toggle();
      }
    })();
    // 心跳（自动解散依据）
    const heartbeat = window.setInterval(() => {
      void touchCoListenRoom(roomId);
    }, 30_000);
    // 离开房间：广播 leave + 停止房间播放（仅当播放源为共听）
    const cleanup = () => {
      alive = false;
      window.clearInterval(heartbeat);
      publishColisten({
        type: "leave",
        roomId,
        peerId: myPeer,
        at: Date.now(),
      });
      const st = usePlayerStore.getState();
      if (st.source && st.source.type === "colisten" && st.isPlaying) {
        st.toggle();
      }
    };
    return cleanup;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, myPeer]);

  // 频道订阅：弹幕 / 播放同步 / 投票 / 房主转移
  useEffect(() => {
    if (!room) return;
    return subscribeColisten(roomId, (msg: CoListenMessage) => {
      // 活跃成员维护（幽灵也在本地消息流中）
      setActivePeers((prev) => {
        const next = new Set(prev);
        if (msg.peerId) next.add(msg.peerId);
        return next;
      });

      if (msg.type === "danmaku" && msg.peerId !== myPeer) {
        setDanmakus((prev) =>
          [...prev, { key: `${msg.peerId}-${msg.at}`, peerId: msg.peerId, anonMark: msg.anonMark, text: msg.text, at: msg.at, mine: false }].slice(-DM_LIST_MAX),
        );
      } else if (msg.type === "play-state" && msg.peerId !== myPeer) {
        // 成员同步：切到该曲 + 对齐进度/播放状态
        const idx = Math.min(msg.index, Math.max(queue.length - 1, 0));
        if (queue.length > 0) {
          usePlayerStore.getState().playQueueAt(queue, { type: "colisten" }, idx);
          usePlayerStore.getState().seekTo(msg.currentTime);
          if (usePlayerStore.getState().isPlaying !== msg.playing) {
            usePlayerStore.getState().toggle();
          }
        }
      } else if (msg.type === "vote" && msg.peerId !== myPeer) {
        setVotes((prev) => {
          if (prev[msg.peerId]) return prev;
          const next = { ...prev, [msg.peerId]: msg.action };
          maybeAutoNext(next);
          return next;
        });
      } else if (msg.type === "vote-result" && msg.peerId !== myPeer) {
        usePlayerStore.getState().next();
        setVotes({});
      } else if (msg.type === "leave" && msg.peerId === room.hostId && !isHost) {
        // 房主离开 → 最早在线成员接管（本地/单端场景即当前页）
        setIsHost(true);
        setToast("房主离开了，你成为新的房主。");
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, room?.id, myPeer, isHost, queue]);

  // 幽灵成员定时行为（本地演示多人）：弹幕 + 参与投票
  useEffect(() => {
    const ghosts = room?.ghosts;
    if (!ghosts || ghosts.length === 0 || !room) return;
    const timers = ghosts.map((g, i) =>
      window.setInterval(() => {
        if (Math.random() < 0.75) {
          publishColisten({
            type: "danmaku",
            roomId,
            peerId: g.peerId,
            anonMark: g.anonMark,
            text: GHOST_DANMAKU[Math.floor(Math.random() * GHOST_DANMAKU.length)],
            at: Date.now(),
          });
        }
        if (Math.random() < 0.35) {
          publishColisten({ type: "vote", roomId, peerId: g.peerId, action: "up", at: Date.now() });
        }
      }, 7000 + i * 1800),
    );
    return () => timers.forEach((t) => window.clearInterval(t));
  }, [roomId, room]);

  /** 投票过半 → 广播 vote-result 并切歌 */
  const maybeAutoNext = useCallback(
    (nextVotes: Record<string, string>) => {
      if (!room) return;
      const memberCount = (room.ghosts?.length ?? 0) + activePeers.size;
      const up = Object.values(nextVotes).filter((v) => v === "up").length;
      if (memberCount >= 2 && up > memberCount / 2) {
        publishColisten({
          type: "vote-result",
          roomId,
          peerId: myPeer,
          at: Date.now(),
        });
        usePlayerStore.getState().next();
        setVotes({});
      }
    },
    [room, activePeers, myPeer, roomId],
  );

  /** 广播当前播放状态（房主操作后调用） */
  const broadcastPlay = useCallback(() => {
    if (!room) return;
    const st = usePlayerStore.getState();
    const current = queue[st.currentIndex];
    if (!current) return;
    publishColisten({
      type: "play-state",
      roomId,
      peerId: myPeer,
      track: { id: current.id, t: current.t, tag: current.tag, s: current.s, cover: current.cover },
      index: st.currentIndex,
      playing: st.isPlaying,
      currentTime: st.currentTime,
      at: Date.now(),
    });
    // 广播后重置投票（切歌后重新计票）
    setVotes({});
  }, [room, queue, myPeer, roomId]);

  const onToggle = () => {
    usePlayerStore.getState().toggle();
    // 播放状态变化稍后广播（等 store 更新）
    window.setTimeout(broadcastPlay, 60);
  };
  const onNext = () => {
    usePlayerStore.getState().next();
    window.setTimeout(broadcastPlay, 60);
  };

  const onSendDm = () => {
    const text = dmText.trim();
    if (text.length === 0) return;
    if (text.length > DM_MAX) {
      setToast("弹幕最多 50 字。");
      return;
    }
    if (!isSafeText(text).ok) {
      setToast("这里有不能上船的文字。");
      return;
    }
    const now = Date.now();
    if (now - lastDmRef.current < DM_COOLDOWN_MS) {
      setToast("太快了，休息 3 秒。");
      return;
    }
    lastDmRef.current = now;
    const mark = `船客·${myPeer.slice(2, 6).toUpperCase()}`;
    publishColisten({
      type: "danmaku",
      roomId,
      peerId: myPeer,
      anonMark: mark,
      text,
      at: now,
    });
    setDanmakus((prev) =>
      [...prev, { key: `${myPeer}-${now}`, peerId: myPeer, anonMark: mark, text, at: now, mine: true }].slice(-DM_LIST_MAX),
    );
    setDmText("");
  };

  const onVote = () => {
    if (votes[myPeer]) return;
    setVotes((prev) => {
      const next = { ...prev, [myPeer]: "up" };
      maybeAutoNext(next);
      return next;
    });
    publishColisten({ type: "vote", roomId, peerId: myPeer, action: "up", at: Date.now() });
  };

  if (loading) {
    return (
      <main className={`section ${styles.page}`}>
        <SectionHead tag="COLISTEN" title="星海共听" subtitle="正在进入房间…" />
        <p className={styles.empty}>正在连上这片星海…</p>
      </main>
    );
  }

  if (!room) {
    return (
      <main className={`section ${styles.page}`}>
        <SectionHead tag="COLISTEN" title="星海共听" subtitle="房间状态" />
        <div className={styles.emptyBox}>
          <p className={styles.empty}>这个共听房间已经结束了。</p>
          <Link href="/drift/colisten" className={styles.backLink}>
            ← 回房间列表
          </Link>
        </div>
      </main>
    );
  }

  const upCount = Object.values(votes).filter((v) => v === "up").length;

  return (
    <main className={`section ${styles.page}`}>
      <SectionHead tag="COLISTEN" title="星海共听" subtitle="同一首歌，同一片星海。" />

      {/* 房间头部 */}
      <div className={styles.roomHead}>
        <div className={styles.roomMeta}>
          <h2 className={styles.roomTitle}>🎧 {room.title}</h2>
          <p className={styles.roomSub}>
            {room.createdBy} 开房 · 房主 {isHost ? "你" : "其他船客"} · 👥 {members.length}
          </p>
        </div>
        <Link href="/drift/colisten" className={styles.leaveBtn}>
          离开房间
        </Link>
      </div>

      {/* 播放器区 */}
      <div className={styles.playerBox}>
        <Image
          src={queue[currentIndex]?.cover ?? room.startTrack.cover}
          alt=""
          width={92}
          height={92}
          className={styles.cover}
        />
        <div className={styles.playerMeta}>
          <p className={styles.nowTitle}>
            {queue[currentIndex]?.t ?? room.startTrack.t}
            <em>{queue[currentIndex]?.tag ?? room.startTrack.tag}</em>
          </p>
          <p className={styles.nowSub}>{queue[currentIndex]?.s ?? room.startTrack.s}</p>
          <div className={styles.ctrlRow}>
            <button type="button" className={styles.ctrlBtn} disabled={!isHost} aria-label="上一首" onClick={() => { usePlayerStore.getState().prev(); window.setTimeout(broadcastPlay, 60); }}>
              ⏮
            </button>
            <button type="button" className={styles.ctrlMain} disabled={!isHost} aria-label={isPlaying ? "暂停" : "播放"} onClick={onToggle}>
              {isPlaying ? "❚❚" : "▶"}
            </button>
            <button type="button" className={styles.ctrlBtn} disabled={!isHost} aria-label="下一首" onClick={onNext}>
              ⏭
            </button>
            {!isHost && <span className={styles.hostHint}>由房主控制播放</span>}
            <button type="button" className={`${styles.voteBtn}${votes[myPeer] ? ` ${styles.voted}` : ""}`} onClick={onVote}>
              🗳 切歌（{upCount}/{Math.floor(members.length / 2) + 1} 票）
            </button>
          </div>
          <div className={styles.progressRow}>
            <span className={styles.progressTrack} aria-hidden="true">
              <i style={{ width: `${(currentTime / (queue[currentIndex]?.duration ?? 1)) * 100}%` }} />
            </span>
            <span className={styles.progressTime}>{Math.floor(currentTime)}s</span>
          </div>
        </div>
        {/* 播放列表（房主可点切歌） */}
        <div className={styles.playlist}>
          <p className={styles.playlistTitle}>共听歌单 · {room.playlist.length} 首</p>
          {room.playlist.map((s, i) => (
            <button
              key={`${s.t}-${i}`}
              type="button"
              className={`${styles.playlistItem}${i === currentIndex ? ` ${styles.current}` : ""}`}
              disabled={!isHost}
              onClick={() => {
                usePlayerStore.getState().playQueueAt(queue, { type: "colisten" }, Math.min(i, Math.max(queue.length - 1, 0)));
                window.setTimeout(broadcastPlay, 60);
              }}
            >
              {i === currentIndex ? "▶" : "♪"} {s.t}
            </button>
          ))}
        </div>
      </div>

      {/* 弹幕区 */}
      <div className={styles.dmBox}>
        <p className={styles.dmTitle}>💬 房间弹幕 · 仅本房间可见</p>
        <div className={styles.dmList}>
          {danmakus.length === 0 ? (
            <p className={styles.dmEmpty}>发第一条弹幕，打破安静吧。</p>
          ) : (
            danmakus.map((d) => (
              <p key={d.key} className={`${styles.dm}${d.mine ? ` ${styles.mine}` : ""}`}>
                <b>{d.anonMark}</b> {d.text}
              </p>
            ))
          )}
        </div>
        <div className={styles.dmSend}>
          <input
            className={styles.dmInput}
            value={dmText}
            maxLength={DM_MAX}
            placeholder="发条弹幕（1-50 字，3 秒一条）…"
            aria-label="房间弹幕"
            onChange={(e) => setDmText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onSendDm();
            }}
          />
          <button type="button" className={styles.dmBtn} disabled={dmText.trim().length === 0} onClick={onSendDm}>
            发送
          </button>
        </div>
      </div>

      {/* 成员区 */}
      <div className={styles.members}>
        <p className={styles.membersTitle}>👥 同船的人（{members.length}）</p>
        <div className={styles.memberList}>
          {members.map((m) => (
            <span key={m.peerId} className={`${styles.member}${m.ghost ? ` ${styles.ghost}` : ""}`} title={m.ghost ? "共听演示船客" : undefined}>
              🎭 {m.anonMark}
              {m.isHost && <em>房主</em>}
            </span>
          ))}
        </div>
      </div>

      <Toast text={toast} onDone={() => setToast(null)} />
    </main>
  );
}