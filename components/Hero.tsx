"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowDownIcon,
  ArrowRightIcon,
  GlobeAltIcon,
  LightBulbIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";

const pathways = [
  { icon: LightBulbIcon, title: "Discover", description: "Find opportunities that move you forward." },
  { icon: UserGroupIcon, title: "Connect", description: "Learn from people building alongside you." },
  { icon: GlobeAltIcon, title: "Build", description: "Turn local insight into lasting impact." },
];

export default function Hero() {
  const reduceMotion = useReducedMotion();

  return (
    <section className="relative isolate overflow-hidden px-4 pb-14 pt-12 sm:px-6 sm:pb-20 sm:pt-16 lg:px-10 lg:pb-28 lg:pt-24">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -right-44 top-0 h-[34rem] w-[34rem] rounded-full bg-emerald-400/10 blur-3xl" />
        <div className="absolute -left-40 top-52 h-[28rem] w-[28rem] rounded-full bg-cyan-500/[0.08] blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(27,77,63,0.3),transparent_60%)]" />
      </div>

      <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:gap-16">
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="relative"
        >
          <div className="section-kicker inline-flex items-center gap-2 rounded-full border border-emerald-200/20 bg-emerald-200/[0.07] px-3.5 py-2 text-[11px] font-semibold tracking-[0.18em] text-emerald-100 sm:text-xs">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-300 opacity-50" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-300" />
            </span>
            Kenya-born. Africa-facing. Future-focused.
          </div>

          <h1 className="display-heading mt-6 max-w-4xl text-[2.7rem] font-semibold leading-[1.04] text-white sm:text-6xl lg:text-7xl xl:text-[5.25rem]">
            Potential is everywhere.
            <span className="mt-2 block bg-gradient-to-r from-emerald-200 via-teal-200 to-cyan-200 bg-clip-text text-transparent animate-gradient">
              Opportunity should be, too.
            </span>
          </h1>

          <p className="mt-6 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg sm:leading-8">
            KIOH connects young people and skilled graduates to opportunities, mentors, and a community to build with—turning individual ambition into shared progress.
          </p>

          <div className="mt-8 grid gap-3 sm:flex sm:flex-wrap">
            <Link
              href="/opportunities"
              className="group inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-emerald-300 px-6 py-3 text-sm font-bold text-slate-950 shadow-lg shadow-emerald-950/25 transition hover:-translate-y-0.5 hover:bg-emerald-200 active:scale-[0.99] sm:w-auto"
            >
              Explore opportunities
              <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="#stakeholders"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.035] px-6 py-3 text-sm font-semibold text-white transition hover:border-emerald-200/40 hover:bg-white/[0.07] active:scale-[0.99] sm:w-auto"
            >
              Partner with KIOH
              <ArrowDownIcon className="h-4 w-4" />
            </Link>
          </div>

          <div className="mt-9 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-400 sm:mt-11">
            <span className="inline-flex items-center gap-2">
              <GlobeAltIcon className="h-4 w-4 text-emerald-300" />
              Built for all 47 counties
            </span>
            <span className="hidden h-1 w-1 rounded-full bg-slate-600 sm:block" />
            <span>Connected pathways. Local insight.</span>
          </div>
        </motion.div>

        <motion.aside
          initial={reduceMotion ? false : { opacity: 0, y: 20, scale: 0.985 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.55, delay: 0.12, ease: "easeOut" }}
          aria-label="How KIOH creates pathways to impact"
          className="relative mx-auto w-full max-w-xl"
        >
          <div className="absolute -inset-1 rounded-[2rem] bg-gradient-to-br from-emerald-300/20 via-cyan-400/10 to-transparent blur-xl" />
          <div className="relative overflow-hidden rounded-[1.75rem] border border-white/10 bg-[#0c1d1a]/95 p-5 shadow-2xl shadow-black/25 sm:p-7">
            <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-5">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-200">
                  One connected ecosystem
                </p>
                <h2 className="mt-2 text-xl font-semibold text-white sm:text-2xl">
                  From ambition to impact
                </h2>
              </div>
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-emerald-200/20 bg-emerald-200/10 text-emerald-100">
                <GlobeAltIcon className="h-6 w-6" />
              </div>
            </div>

            <div className="mt-2">
              {pathways.map((step, index) => {
                const StepIcon = step.icon;
                return (
                  <motion.div
                    key={step.title}
                    initial={reduceMotion ? false : { opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: 0.25 + index * 0.1 }}
                    className="relative flex gap-4 py-4"
                  >
                    {index < pathways.length - 1 && (
                      <span aria-hidden="true" className="absolute bottom-0 left-5 top-14 w-px bg-gradient-to-b from-emerald-300/40 to-white/5" />
                    )}
                    <div className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-emerald-200/20 bg-[#112723] text-emerald-200">
                      <StepIcon className="h-5 w-5" />
                    </div>
                    <div className="pt-0.5">
                      <h3 className="text-sm font-semibold text-white">{step.title}</h3>
                      <p className="mt-1 text-xs leading-5 text-slate-400">{step.description}</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            <div className="mt-2 grid grid-cols-2 gap-3 rounded-2xl border border-white/10 bg-white/[0.035] p-4">
              <div>
                <p className="text-xl font-semibold text-white sm:text-2xl">1 million</p>
                <p className="mt-1 text-[10px] leading-4 text-slate-400 sm:text-xs">young people by 2045 · vision target</p>
              </div>
              <div className="border-l border-white/10 pl-4">
                <p className="text-xl font-semibold text-white sm:text-2xl">10,000</p>
                <p className="mt-1 text-[10px] leading-4 text-slate-400 sm:text-xs">solutions by 2045 · vision target</p>
              </div>
            </div>
          </div>
          <p className="mt-3 px-2 text-center text-[10px] leading-4 text-slate-500">
            Long-term goals, not current impact figures.
          </p>
        </motion.aside>
      </div>
    </section>
  );
}
