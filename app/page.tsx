import Link from "next/link";

export default function Home() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen">
      <h1 className="text-5xl font-bold tracking-wider text-accent mb-2">
        Orbital Launch
      </h1>
      <p className="text-lg text-text-muted mb-10">
        Launch planets into orbit around real stars!
      </p>
      <Link
        href="/game"
        className="px-8 py-4 text-xl font-semibold rounded-xl border-2 border-white/15 bg-white/5 hover:bg-accent/15 hover:border-accent transition-all hover:-translate-y-0.5"
      >
        Play
      </Link>
    </main>
  );
}
