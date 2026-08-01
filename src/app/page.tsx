import { Topbar } from "@/components/topbar/Topbar";
import { Hero } from "@/components/hero/Hero";
import { MarqueeSection } from "@/components/marquee/MarqueeSection";
import { CharacterSection } from "@/components/character/CharacterSection";
import { PlayerSection } from "@/components/player/PlayerSection";

export default function Home() {
  return (
    <>
      <Topbar />
      <main>
        <Hero />
        <MarqueeSection />
        <CharacterSection />
        <PlayerSection />
      </main>
    </>
  );
}
