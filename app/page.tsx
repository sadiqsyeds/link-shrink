import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import UrlShortener from "@/components/UrlShortener";
import RecentLinks from "@/components/RecentLinks";
import Footer from "@/components/Footer";

/**
 * app/page.tsx — LinkShrink Homepage
 *
 * Server component shell; all interactivity lives inside client components.
 */
export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen bg-[var(--bg-base)]">
      {/* Fixed top navigation */}
      <Navbar />

      {/* ── Decorative background blobs ── */}
      <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden -z-10">
        <div className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full bg-gradient-to-br from-blue-400/10 to-violet-500/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-[600px] h-[600px] rounded-full bg-gradient-to-tr from-cyan-400/10 to-blue-500/10 blur-3xl" />
      </div>

      {/* ── Main content ── */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8 pt-28 pb-16 gap-10">
        {/* Hero section */}
        <Hero />

        {/* URL shortener input + result */}
        <UrlShortener />

        {/* Recent links history */}
        <RecentLinks />

        {/* Feature highlights */}
        <FeatureGrid />
      </main>

      <Footer />
    </div>
  );
}

/* ─── Feature grid (server-rendered, no JS needed) ─────────────────────── */
function FeatureGrid() {
  const features = [
    {
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
        </svg>
      ),
      title: "Instant",
      description: "Short URLs are generated in milliseconds.",
    },
    {
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      ),
      title: "Secure",
      description: "Only valid http/https URLs accepted. No open redirects.",
    },
    {
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="2" y1="12" x2="22" y2="12" />
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </svg>
      ),
      title: "No sign-up",
      description: "Completely free. No account or credit card required.",
    },
    {
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
        </svg>
      ),
      title: "Click tracking",
      description: "Every redirect is counted so you know your reach.",
    },
  ];

  return (
    <section
      aria-label="Features"
      className="w-full max-w-2xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4"
    >
      {features.map((f) => (
        <div
          key={f.title}
          className="flex flex-col gap-2 p-4 rounded-2xl bg-[var(--bg-subtle)] border border-[var(--border-default)] hover:border-blue-500/40 transition-colors duration-200"
        >
          <span className="text-blue-500">{f.icon}</span>
          <p className="text-sm font-semibold text-[var(--text-primary)]">{f.title}</p>
          <p className="text-xs text-[var(--text-muted)] leading-relaxed">{f.description}</p>
        </div>
      ))}
    </section>
  );
}
