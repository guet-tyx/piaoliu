import { Hero } from "@/components/hero/Hero";
import { MarqueeSection } from "@/components/marquee/MarqueeSection";
import { CharacterSection } from "@/components/character/CharacterSection";
import { PlaylistSection } from "@/components/playlist/PlaylistSection";
import { PlayerSection } from "@/components/player/PlayerSection";
import { BottleSection } from "@/components/bottle/BottleSection";
import { DownloadSection } from "@/components/download/DownloadSection";

/** 首页：区块组装（顶栏/页脚已在根布局提供） */
export default function Home() {
  return (
    <main>
      <Hero />
      <MarqueeSection />
      <CharacterSection />
      <PlaylistSection />
      <PlayerSection />
      <BottleSection />
      <DownloadSection />
    </main>
  );
}
