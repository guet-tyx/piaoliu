import type { Metadata } from "next";
import { SailorPage } from "@/components/sailor/SailorPage";

export const metadata: Metadata = {
  title: "星尘船员证 · 漂流 DRIFT",
  description: "漂流 DRIFT · 星海版：你的星尘船员证——代号、称号、羁绊与收集。",
};

/** 星尘船员证页（FR-9 独立路由） */
export default function SailorRoute() {
  return <SailorPage />;
}
