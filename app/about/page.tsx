import Link from "next/link";

export default function AboutPage() {
  return (
    <main className="max-w-2xl mx-auto px-6 py-16">
      <h1 className="text-3xl font-bold text-accent mb-4">
        About Orbital Launch
      </h1>
      <p className="text-text-muted mb-6">
        Orbital Launch is a science fair project exploring orbital mechanics and
        resonance through interactive gameplay. Launch planets into orbit around
        real stars and discover how gravity creates musical patterns in the
        cosmos.
      </p>
      <Link href="/" className="text-accent hover:underline">
        Back to home
      </Link>
    </main>
  );
}
