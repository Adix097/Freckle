import { useState } from "react";
import type { View } from "./types";
import TopBar from "./components/TopBar";
import SidePanel from "./components/SidePanel";
import Deck from "./components/Deck";
import { Dig, Home, Placeholder } from "./views";

export default function App() {
  const [view, setView] = useState<View>("home");
  return (
    <div className="scheme-dark grid h-screen grid-rows-[64px_1fr_92px] overflow-hidden bg-ink font-sans text-bone">
      <TopBar view={view} setView={setView} />
      <div className="grid min-h-0 grid-cols-[1fr_300px] gap-4 px-4 pb-3">
        <main className="min-h-0 overflow-y-auto px-2 pb-6">
          {view === "home" && <Home />}
          {view === "dig" && <Dig />}
          {view === "library" && (
            <Placeholder name="Library" branch="feat/library" />
          )}
          {view === "echo" && <Placeholder name="Echo" branch="feat/echo" />}
        </main>
        <SidePanel />
      </div>
      <Deck />
    </div>
  );
}
