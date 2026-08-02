import { Topbar } from "@/components/topbar/Topbar";
import { Hero } from "@/components/hero/Hero";
import { MarqueeSection } from "@/components/marquee/MarqueeSection";
import { CharacterSection } from "@/components/character/CharacterSection";
import { PlaylistSection } from "@/components/playlist/PlaylistSection";
import { PlayerSection } from "@/components/player/PlayerSection";
import { BottleSection } from "@/components/bottle/BottleSection";
import { DownloadSection } from "@/components/download/DownloadSection";
import { Footer } from "@/components/layout/Footer";

export default function Home() {
  return (
    <>
      <Topbar />
      <main>
        <Hero />
        <MarqueeSection />
        <CharacterSection />
        <PlaylistSection />
        <PlayerSection />
        <BottleSection />
        <DownloadSection />
      </main>
      <Footer />
    </>
  );
}
