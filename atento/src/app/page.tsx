"use client";

import { useEffect, useState } from "react";
import { AttentionTrainingGame } from "@/components/AttentionTrainingGame";

export default function Home() {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    // Garante que o jogo só é renderizado no navegador
    setIsClient(true);
  }, []);

  if (!isClient) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-3xl items-center justify-center px-6 py-10">
        <div className="text-center text-sm text-zinc-500">
          Carregando ATENTO…
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl items-center px-6 py-10">
      <section className="w-full rounded-2xl border border-black/10 bg-white p-6 shadow-sm sm:p-8">
        <AttentionTrainingGame />
      </section>
    </main>
  );
}
