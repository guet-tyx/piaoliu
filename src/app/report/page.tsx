import type { Metadata } from "next";
import { ReportPage } from "@/components/report/ReportPage";

export const metadata: Metadata = {
  title: "星海周报 · 漂流 DRIFT",
  description: "漂流 DRIFT · 星海版：本周航行小结、热门航线与收听星图。",
};

/** 星海周报页（FR-13） */
export default function ReportRoute() {
  return <ReportPage />;
}
