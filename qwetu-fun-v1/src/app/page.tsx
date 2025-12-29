import Deck from "@/components/Deck";
import Header from "@/components/Header";
import { Toaster } from "react-hot-toast";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center p-4 overflow-hidden relative">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_10%,_var(--tw-gradient-stops))] from-purple-900/40 via-[#0a0a0a] to-[#0a0a0a]" />

      <Header />
      <Toaster position="bottom-center" />

      <main className="relative z-10 w-full flex items-center justify-center mt-10">
        <Deck />
      </main>

      <div className="fixed bottom-8 text-white/30 text-xs font-mono">
        Qwetu Betting V1.0 - Nairobi Edition
      </div>
    </div>
  );
}
