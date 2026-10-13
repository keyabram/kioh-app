import Link from "next/link";

const socialAccounts = ["Instagram", "LinkedIn", "Facebook", "X", "TikTok"];

export default function Footer() {
  return (
    <>
      {/* Final CTA */}
      <section
        id="join"
        className="relative z-10 px-6 py-28 text-center lg:px-10"
      >
        <div className="relative mx-auto max-w-4xl rounded-3xl border border-white/10 bg-white/[0.02] p-12 backdrop-blur-2xl shadow-2xl">
          <div className="pointer-events-none absolute -inset-px rounded-3xl bg-gradient-to-b from-teal-500/10 to-transparent opacity-50" />

          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-teal-300">
            The future starts with a step
          </p>

          <h2 className="mt-5 text-4xl font-bold tracking-tight sm:text-6xl">
            Your potential deserves
            <span className="text-teal-300"> a pathway.</span>
          </h2>

          <p className="mx-auto mt-6 max-w-xl leading-8 text-slate-400">
            Discover opportunities. Meet people. Learn. Build. Create impact.
          </p>

          <Link
            href="/#opportunities"
            className="mt-9 inline-flex items-center gap-3 rounded-full bg-white px-7 py-4 font-semibold text-slate-950 transition duration-300 hover:-translate-y-1 hover:bg-teal-300 shadow-xl shadow-white/10"
          >
            Start your journey
            <span>→</span>
          </Link>
        </div>
      </section>

      {/* Footer Bottom */}
      <footer className="relative z-10 border-t border-white/10 bg-slate-950/80 px-6 py-8 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 text-sm sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-slate-400">© 2026 KIOH — Kenya Innovation & Opportunity Hub</p>
            <p className="mt-2 text-slate-500">From potential → opportunity → capability → impact.</p>
          </div>
          <div>
            <Link
              href="/contact"
              className="inline-flex min-h-10 items-center text-sm font-semibold text-emerald-200 transition hover:text-white"
            >
              Contact Us
            </Link>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
              Follow KIOH
            </p>
            <ul className="mt-3 flex flex-wrap gap-2" aria-label="KIOH social accounts">
              {socialAccounts.map((account) => (
                <li key={account}>
                  <span
                    aria-label={`${account} account link coming soon`}
                    className="inline-flex min-h-10 items-center rounded-full border border-white/10 px-3 text-xs text-slate-400"
                  >
                    {account}
                    <span className="sr-only"> — link coming soon</span>
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-slate-500">Social links coming soon.</p>
          </div>
        </div>
      </footer>
    </>
  );
}