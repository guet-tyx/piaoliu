import { Topbar } from "@/components/topbar/Topbar";
import { Hero } from "@/components/hero/Hero";
import { MarqueeSection } from "@/components/marquee/MarqueeSection";
import { CharacterSection } from "@/components/character/CharacterSection";

export default function Home() {
  return (
    <>
      <Topbar />
      <main>
        <Hero />
        <MarqueeSection />
        <CharacterSection />
      </main>
    </>
  );
}
