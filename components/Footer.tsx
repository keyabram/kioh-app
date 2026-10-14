import Link from "next/link";

const socialAccounts = ["Instagram", "LinkedIn", "Facebook", "X", "TikTok"];
const partnerLogos = [
  "Impact Fund",
  "Tech Hub",
  "Innovation Lab",
  "Research Partner",
  "Investor Circle",
  "Corporate Network",
];
const marqueeBrands = [...partnerLogos, ...partnerLogos];

interface FooterProps {
  onContactOpen?: () => void;
}

export default function Footer({ onContactOpen }: FooterProps) {
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

          <div className="mt-9 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="#opportunities"
              className="inline-flex items-center gap-3 rounded-full bg-white px-7 py-4 font-semibold text-slate-950 transition duration-300 hover:-translate-y-1 hover:bg-teal-300 shadow-xl shadow-white/10"
            >
              Start your journey
              <span>→</span>
            </Link>
            <button
              type="button"
              onClick={onContactOpen}
              className="inline-flex items-center gap-3 rounded-full border border-white/15 bg-white/5 px-7 py-4 font-semibold text-white transition duration-300 hover:-translate-y-1 hover:border-teal-300/50 hover:text-teal-200"
            >
              Contact Us
            </button>
          </div>
        </div>
      </section>

      <section className="relative z-10 px-6 pb-6 lg:px-10">
        <div className="mx-auto max-w-7xl rounded-[1.75rem] border border-white/10 bg-slate-950/60 p-5 shadow-2xl shadow-black/20 backdrop-blur-xl sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 flex-col gap-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                Follow KIOH
              </p>
              <div className="flex flex-wrap gap-2" aria-label="KIOH social accounts">
                {socialAccounts.map((account) => (
                  <span
                    key={account}
                    aria-label={`${account} account link coming soon`}
                    className="inline-flex min-h-10 items-center rounded-full border border-white/10 bg-white/[0.03] px-3 text-xs font-medium text-slate-300 transition hover:border-teal-300/35 hover:text-white"
                  >
                    {account}
                    <span className="sr-only"> — link coming soon</span>
                  </span>
                ))}
              </div>
            </div>

            <div className="flex flex-col items-start gap-3 lg:items-end">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                Connect with us
              </p>
              <button
                type="button"
                onClick={onContactOpen}
                className="inline-flex min-h-11 items-center justify-center rounded-full border border-emerald-300/25 bg-emerald-300/10 px-5 py-2.5 text-xs font-bold text-emerald-100 transition hover:bg-emerald-300 hover:text-slate-950"
              >
                Contact Us
              </button>
            </div>
          </div>

          <div className="mt-6 border-t border-white/10 pt-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
              Investors & partners
            </p>
            <div className="mt-4 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]">
              <div
                className="partner-marquee flex w-max gap-3 py-3"
              >
                {marqueeBrands.map((brand, index) => (
                  <div
                    key={`${brand}-${index}`}
                    className="flex h-14 w-[170px] shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-slate-900/60 px-3 text-center text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400"
                  >
                    {brand}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="relative z-10 border-t border-white/10 bg-slate-950/80 px-6 pb-8 pt-5 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 text-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-slate-400">© 2026 KIOH — Kenya Innovation & Opportunity Hub</p>
          </div>
          <p className="text-slate-500">From potential → opportunity → capability → impact.</p>
        </div>
      </footer>
    </>
  );
}