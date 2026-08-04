import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CHAT_PERSONAS } from "@/data/chat-personas";
import { ChatPage } from "@/components/chat/ChatPage";

interface ChatRouteProps {
  params: Promise<{ roleId: string }>;
  searchParams: Promise<{ share?: string }>;
}

export async function generateMetadata({ params }: ChatRouteProps): Promise<Metadata> {
  const { roleId } = await params;
  const persona = CHAT_PERSONAS.find((p) => p.roleId === roleId);
  if (!persona) return { title: "漂流 DRIFT · 聊天" };
  return {
    title: `${persona.name} · 星海版 · 聊天`,
    description: persona.greeting,
  };
}

/** 全屏沉浸聊天页（R1 V2.4）：/chat/[roleId]，首个动态路由；
 *  P3-05：?share= 预填分享文案到输入框 */
export default async function ChatRoutePage({ params, searchParams }: ChatRouteProps) {
  const { roleId } = await params;
  const persona = CHAT_PERSONAS.find((p) => p.roleId === roleId);
  if (!persona) notFound();
  const { share } = await searchParams;
  return <ChatPage roleId={roleId} initialDraft={share} />;
}