"use client";

import dynamic from "next/dynamic";

const GameCanvas = dynamic(
  () => import("@/components/game/GameCanvas").then((m) => m.GameCanvas),
  {
    ssr: false,
    loading: () => <div className="w-full h-screen bg-space-bg" />,
  }
);

export default function GamePage() {
  return <GameCanvas />;
}
