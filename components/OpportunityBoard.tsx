"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { ArrowPathIcon, BookmarkIcon } from "@heroicons/react/24/outline";
import { Opportunity, OpportunityCategory } from "@/server/types/opportunity";
import { KENYA_COUNTIES } from "@/server/data/opportunities";
import { useApplications } from "@/context/ApplicationContext";
import { UserProfile } from "@/server/types";
import DocumentUploadField from "@/components/DocumentUploadField";
import type { UploadedDocument } from "@/server/types/uploads";

const CATEGORIES: OpportunityCategory[] = [
  "All",
  "Grants & Funding",
  "Incubators & Accelerators",
  "Hackathons & Challenges",
  "Fellowships & Training",
  "Scholarships",
];

const MATCH_STOP_WORDS = new Set([
  "and",
  "for",
  "from",
  "into",
  "the",
  "with",
  "you",
  "your",
]);

function matchTokens(value: string) {
  return (value.toLowerCase().match(/[a-z0-9+#]+/g) || []).filter(
    (token) =>
      (token.length >= 3 || ["ai", "ml", "ui", "ux"].includes(token)) &&
      !MATCH_STOP_WORDS.has(token)
  );
}

function getOpportunityText(opportunity: Opportunity) {
  return [
    opportunity.title,
    opportunity.organization,
    opportunity.category,
    opportunity.description,
    ...opportunity.tags,
    ...opportunity.eligibility,
  ].join(" ");
}

interface OpportunityBoardProps {
  currentUser?: UserProfile | null;
  onRequestSignIn?: () => void;
}

export default function OpportunityBoard({
  currentUser,
  onRequestSignIn,
}: OpportunityBoardProps) {
  const {
    applyToOpportunity,
    hasAppliedToOpportunity,
    savedOpportunityIds,
    savedOpportunitiesLoading,
    setOpportunitySaved,
  } = useApplications();
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loadError, setLoadError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const hasLoadedOpportunities = useRef(false);
  const reduceMotion = useReducedMotion();

  // Filter States
  const [selectedCategory, setSelectedCategory] = useState<OpportunityCategory>("All");
  const [selectedCounty, setSelectedCounty] = useState<string>("All Counties");
  const [minGrantAmount, setMinGrantAmount] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [activeView, setActiveView] = useState<"all" | "recommended" | "saved">("all");
  const [savingOpportunityId, setSavingOpportunityId] = useState<string | null>(null);
  const [saveError, setSaveError] = useState("");

  // Active Selected Opportunity for Modal Details
  const [selectedOpp, setSelectedOpp] = useState<Opportunity | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submissionError, setSubmissionError] = useState("");
  const [pitchDeck, setPitchDeck] = useState<UploadedDocument[]>([]);
  const [certificates, setCertificates] = useState<UploadedDocument[]>([]);
  const [confirmationEmailSent, setConfirmationEmailSent] = useState(false);

  const refreshOpportunities = useCallback(async (cancelled?: () => boolean) => {
    setIsRefreshing(true);
    try {
      const response = await fetch("/api/opportunities", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || "Failed to load opportunities.");
      }
      if (cancelled?.()) return;
      setOpportunities(result.data);
      hasLoadedOpportunities.current = true;
      setLastChecked(new Date(result.checkedAt || Date.now()));
      setLoadError("");
    } catch (error) {
      if (!cancelled?.()) {
        console.error("[OPPORTUNITIES_LOAD_ERROR]:", error);
        setLoadError(
          hasLoadedOpportunities.current
            ? "Could not refresh listings. Showing the last loaded results."
            : "Opportunities are unavailable right now. Please try again later."
        );
      }
    } finally {
      if (!cancelled?.()) {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const refresh = () => {
      if (document.visibilityState === "visible") {
        void refreshOpportunities(() => cancelled);
      }
    };
    refresh();
    const interval = window.setInterval(refresh, 5 * 60 * 1000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [refreshOpportunities]);

  useEffect(() => {
    if (!selectedOpp) return;

    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelectedOpp(null);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [selectedOpp]);

  const profileKeywords = useMemo(() => {
    if (!currentUser) return new Set<string>();

    const careerStageKeywords =
      currentUser.careerStage === "student"
        ? "student youth learner"
        : currentUser.careerStage === "graduate"
        ? "graduate graduates early career"
        : "";
    const profileText = [
      ...(currentUser.skills || []),
      ...(currentUser.interests || []),
      ...(currentUser.supportNeeds || []),
      currentUser.goals || "",
      currentUser.experience || "",
      currentUser.bio || "",
      careerStageKeywords,
    ].join(" ");

    return new Set(matchTokens(profileText));
  }, [currentUser]);

  const matchedKeywordsByOpportunity = useMemo(() => {
    return new Map(
      opportunities.map((opportunity) => {
        const listingKeywords = new Set(matchTokens(getOpportunityText(opportunity)));
        const matches = [...profileKeywords].filter((keyword) =>
          listingKeywords.has(keyword)
        );
        return [opportunity.id, matches] as const;
      })
    );
  }, [opportunities, profileKeywords]);

  // Filter Logic
  const filteredOpportunities = useMemo(() => {
    const filtered = opportunities.filter((opp) => {
      const matchesCategory =
        selectedCategory === "All" || opp.category === selectedCategory;

      const matchesCounty =
        selectedCounty === "All Counties" ||
        opp.county === selectedCounty ||
        opp.county === "Nationwide";

      const matchesGrant = opp.grantAmount >= minGrantAmount;
      const deadlineEnd = new Date(`${opp.deadline}T23:59:59`).getTime();
      const isActiveScholarship =
        opp.category !== "Scholarships" ||
        !Number.isFinite(deadlineEnd) ||
        deadlineEnd >= (lastChecked?.getTime() ?? 0);

      const matchesSearch =
        searchQuery.trim() === "" ||
        opp.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        opp.organization.toLowerCase().includes(searchQuery.toLowerCase()) ||
        opp.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        opp.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        opp.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()));

      return (
        matchesCategory &&
        matchesCounty &&
        matchesGrant &&
        matchesSearch &&
        (activeView !== "saved" || savedOpportunityIds.includes(opp.id)) &&
        (activeView !== "recommended" ||
          (matchedKeywordsByOpportunity.get(opp.id)?.length ?? 0) > 0) &&
        isActiveScholarship
      );
    });

    if (activeView === "recommended") {
      return filtered.sort(
        (first, second) =>
          (matchedKeywordsByOpportunity.get(second.id)?.length ?? 0) -
          (matchedKeywordsByOpportunity.get(first.id)?.length ?? 0)
      );
    }
    return filtered;
  }, [
    opportunities,
    selectedCategory,
    selectedCounty,
    minGrantAmount,
    searchQuery,
    lastChecked,
    activeView,
    savedOpportunityIds,
    matchedKeywordsByOpportunity,
  ]);

  const toggleSavedOpportunity = async (opportunityId: string) => {
    setSaveError("");
    setSavingOpportunityId(opportunityId);
    try {
      await setOpportunitySaved(
        opportunityId,
        !savedOpportunityIds.includes(opportunityId)
      );
    } catch (error) {
      setSaveError(
        error instanceof Error ? error.message : "Could not update saved opportunities."
      );
    } finally {
      setSavingOpportunityId(null);
    }
  };

  const handleApply = async () => {
    if (!selectedOpp) return;
    if (!currentUser?.id) {
      if (onRequestSignIn) {
        setSelectedOpp(null);
        onRequestSignIn();
      } else {
        setSubmissionError("Sign in before submitting an opportunity application.");
      }
      return;
    }

    setIsSubmitting(true);
    setSubmissionError("");

    try {
      const result = await applyToOpportunity(selectedOpp, {
        pitchDeck: pitchDeck[0],
        certificates,
      });
      setConfirmationEmailSent(result.confirmationEmailSent);
      setPitchDeck([]);
      setCertificates([]);
    } catch (error) {
      console.error("[APPLICATION_SUBMIT_ERROR]:", error);
      setSubmissionError(
        error instanceof Error
          ? error.message
          : "Failed to submit application. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const isCurrentOppApplied = selectedOpp
    ? hasAppliedToOpportunity(selectedOpp.id)
    : false;

  return (
    <section id="opportunities" className="relative scroll-mt-28 px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Discover opportunities
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-300">
            Find scholarships, grants, fellowships, training, and challenges that help
            you turn potential into progress.
          </p>
        </div>

        {/* Filter Toolbar */}
        <div className="mt-10 rounded-3xl border border-white/10 bg-slate-900/80 p-6 backdrop-blur-xl shadow-2xl space-y-6">
          <div className="flex flex-wrap gap-2" aria-label="Opportunity views">
            <button
              type="button"
              aria-pressed={activeView === "all"}
              onClick={() => setActiveView("all")}
              className={`min-h-11 rounded-xl px-4 py-2 text-xs font-semibold transition ${
                activeView === "all"
                  ? "bg-teal-400 text-slate-950"
                  : "border border-white/10 bg-white/5 text-slate-400 hover:text-white"
              }`}
            >
              Browse all
            </button>
            <button
              type="button"
              aria-pressed={activeView === "recommended"}
              onClick={() => setActiveView("recommended")}
              className={`min-h-11 rounded-xl px-4 py-2 text-xs font-semibold transition ${
                activeView === "recommended"
                  ? "bg-teal-400 text-slate-950"
                  : "border border-white/10 bg-white/5 text-slate-400 hover:text-white"
              }`}
            >
              Recommended
            </button>
            <button
              type="button"
              aria-pressed={activeView === "saved"}
              onClick={() => setActiveView("saved")}
              className={`min-h-11 rounded-xl px-4 py-2 text-xs font-semibold transition ${
                activeView === "saved"
                  ? "bg-teal-400 text-slate-950"
                  : "border border-white/10 bg-white/5 text-slate-400 hover:text-white"
              }`}
            >
              Saved ({savedOpportunityIds.length})
            </button>
          </div>
          {saveError && (
            <p role="status" className="rounded-xl border border-rose-300/20 bg-rose-300/5 p-3 text-xs text-rose-200">
              {saveError}
            </p>
          )}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
            <p className="text-xs text-slate-300" aria-live="polite">
              {lastChecked
                ? `Listings last checked ${lastChecked.toLocaleTimeString([], {
                    hour: "numeric",
                    minute: "2-digit",
                  })}`
                : "Checking for the latest listings…"}
                {" · "}KIOH updates auto-refresh every 5 minutes
            </p>
            <button
              type="button"
              onClick={() => void refreshOpportunities()}
              disabled={isRefreshing}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/15 bg-white/[0.04] px-4 py-2 text-xs font-semibold text-white transition hover:border-teal-300/40 hover:bg-teal-300/10 disabled:cursor-wait disabled:opacity-60"
            >
              <ArrowPathIcon
                aria-hidden="true"
                className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
              />
              {isRefreshing ? "Refreshing…" : "Refresh listings"}
            </button>
          </div>
          {loadError && (
            <p
              role="status"
              className="rounded-xl border border-amber-300/20 bg-amber-300/5 p-3 text-xs text-amber-100"
            >
              {loadError}
            </p>
          )}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {/* Search Input */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Search Opportunities
              </label>
              <input
                type="text"
                placeholder="Search title, organization, or skill..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-teal-400 focus:outline-none"
              />
            </div>

            {/* County Filter */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                County / Region
              </label>
              <select
                value={selectedCounty}
                onChange={(e) => setSelectedCounty(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-white/10 bg-slate-900 px-3.5 py-2.5 text-xs text-white focus:border-teal-400 focus:outline-none"
              >
                {KENYA_COUNTIES.map((county) => (
                  <option key={county} value={county} className="bg-slate-900 text-white">
                    {county}
                  </option>
                ))}
              </select>
            </div>

            {/* Minimum Funding Slider */}
            <div>
              <div className="flex justify-between text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <span>Min Funding (KSh)</span>
                <span className="text-teal-300 font-mono">
                  {minGrantAmount === 0 ? "Any Amount" : `≥ KSh ${minGrantAmount.toLocaleString()}`}
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={2500000}
                step={100000}
                value={minGrantAmount}
                onChange={(e) => setMinGrantAmount(Number(e.target.value))}
                className="mt-3 w-full accent-teal-400"
              />
            </div>
          </div>

          {/* Category Tabs */}
          <div className="-mx-1 flex snap-x gap-2 overflow-x-auto border-t border-white/10 px-1 pt-4 pb-1 [scrollbar-width:thin] sm:flex-wrap sm:overflow-visible">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`min-h-11 shrink-0 snap-start rounded-xl px-4 py-2 text-xs font-semibold transition ${
                  selectedCategory === cat
                    ? "bg-teal-400 text-slate-950 shadow-md shadow-teal-500/20"
                    : "border border-white/10 bg-white/5 text-slate-400 hover:text-white"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Opportunity Cards Grid */}
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
          {loadError && opportunities.length === 0 ? (
            <p className="col-span-full rounded-2xl border border-rose-400/20 bg-rose-400/5 p-6 text-center text-sm text-rose-300">
              {loadError}
            </p>
          ) : isLoading ? (
            Array.from({ length: 3 }, (_, index) => (
              <div
                key={index}
                className="h-64 animate-pulse rounded-3xl border border-white/10 bg-white/[0.04]"
                aria-label="Loading opportunities"
              />
            ))
          ) : filteredOpportunities.length > 0 ? (
            filteredOpportunities.map((opp) => {
              const applied = hasAppliedToOpportunity(opp.id);
              return (
                <motion.article
                  key={opp.id}
                  initial={reduceMotion ? false : { opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduceMotion ? undefined : { opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.25 }}
                  layout
                  className="interactive-card group relative flex flex-col justify-between rounded-3xl border border-white/10 bg-slate-900/70 p-5 shadow-xl backdrop-blur-xl sm:p-6"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="rounded-full border border-teal-400/30 bg-teal-400/10 px-3 py-1 text-[10px] font-bold text-teal-300">
                        {opp.category}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-slate-400">
                          📍 {opp.county}
                        </span>
                        <button
                          type="button"
                          aria-label={`${savedOpportunityIds.includes(opp.id) ? "Remove saved" : "Save"} ${opp.title}`}
                          aria-pressed={savedOpportunityIds.includes(opp.id)}
                          title={savedOpportunityIds.includes(opp.id) ? "Remove from saved" : "Save opportunity"}
                          onClick={() => void toggleSavedOpportunity(opp.id)}
                          disabled={savedOpportunitiesLoading || savingOpportunityId === opp.id}
                          className={`inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border transition disabled:cursor-wait disabled:opacity-50 ${
                            savedOpportunityIds.includes(opp.id)
                              ? "border-teal-300/40 bg-teal-300/10 text-teal-200"
                              : "border-white/10 bg-white/[0.03] text-slate-400 hover:border-teal-300/35 hover:text-white"
                          }`}
                        >
                          <BookmarkIcon
                            aria-hidden="true"
                            className={`h-5 w-5 ${savedOpportunityIds.includes(opp.id) ? "fill-current" : ""}`}
                          />
                        </button>
                      </div>
                    </div>

                    <h3 className="mt-4 text-lg font-bold text-white group-hover:text-teal-300 transition">
                      {opp.title}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">{opp.organization}</p>

                    <p className="mt-3 text-xs text-slate-300 line-clamp-2 leading-relaxed">
                      {opp.description}
                    </p>
                    {opp.applicationUrl && (
                      <p className="mt-3 text-[11px] font-semibold text-teal-200">
                        Direct application link available
                      </p>
                    )}

                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {opp.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-lg bg-white/5 px-2 py-0.5 text-[10px] font-medium text-slate-400"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                    {activeView === "recommended" && (
                      <p className="mt-3 text-[10px] leading-4 text-emerald-200">
                        Matches your profile: {matchedKeywordsByOpportunity
                          .get(opp.id)
                          ?.slice(0, 4)
                          .join(" · ")}
                      </p>
                    )}
                  </div>

                  <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-4">
                    <div>
                      <p className="text-[10px] text-slate-500 uppercase font-mono">Grant Value</p>
                      <p className="text-sm font-extrabold text-teal-300 font-mono">
                        {opp.grantAmountLabel}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedOpp(opp)}
                      className={`min-h-11 rounded-full px-4 py-2 text-xs font-bold transition ${
                        applied
                          ? "border border-teal-400/40 bg-teal-400/10 text-teal-300"
                          : "bg-white/10 text-white hover:bg-teal-400 hover:text-slate-950"
                      }`}
                    >
                      {applied
                        ? "Applied ✓"
                        : opp.applicationUrl
                        ? opp.category === "Scholarships"
                          ? "View scholarship →"
                          : "View & Apply →"
                        : "View & Apply →"}
                    </button>
                  </div>
                </motion.article>
              );
            })
          ) : (
            <div className="col-span-full rounded-3xl border border-dashed border-white/10 p-12 text-center">
              <p className="text-sm text-slate-400">
                {activeView === "recommended" && profileKeywords.size === 0
                  ? "Add skills, interests, or goals to your profile to get recommendations."
                  : activeView === "recommended"
                  ? "No direct matches found yet. Browse all opportunities to explore more listings."
                  : activeView === "saved" && savedOpportunityIds.length === 0
                  ? "You have not saved any opportunities yet. Browse all opportunities and save ones you want to revisit."
                  : selectedCategory === "Scholarships"
                  ? "No active scholarships match your filters right now."
                  : "No opportunities match your current filter criteria."}
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-4">
                {activeView === "recommended" && profileKeywords.size === 0 && (
                  currentUser?.id ? (
                    <Link
                      href="/dashboard?tab=settings"
                      className="text-xs font-semibold text-teal-300 underline"
                    >
                      Complete your profile
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={onRequestSignIn}
                      className="text-xs font-semibold text-teal-300 underline"
                    >
                      Sign in to personalize recommendations
                    </button>
                  )
                )}
                {activeView === "recommended" && profileKeywords.size > 0 && (
                  <button
                    type="button"
                    onClick={() => setActiveView("all")}
                    className="text-xs font-semibold text-teal-300 underline"
                  >
                    Browse all opportunities
                  </button>
                )}
                {(activeView !== "recommended" || profileKeywords.size > 0) && (
                  <button
                    type="button"
                    onClick={() => {
                      setActiveView("all");
                      setSelectedCategory("All");
                      setSelectedCounty("All Counties");
                      setMinGrantAmount(0);
                      setSearchQuery("");
                    }}
                    className="text-xs font-semibold text-teal-300 underline"
                  >
                    Reset filters
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      <AnimatePresence>
      {selectedOpp && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="presentation"
        >
          <button
            type="button"
            aria-label="Close opportunity details"
            onClick={() => setSelectedOpp(null)}
            className="fixed inset-0 cursor-default bg-slate-950/80 backdrop-blur-md"
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="opportunity-dialog-title"
            initial={reduceMotion ? false : { opacity: 0, y: 28, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: 20, scale: 0.98 }}
            transition={{ duration: 0.22 }}
            className="relative max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-white/15 bg-slate-900 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl sm:rounded-3xl sm:p-8"
          >
            <button
              type="button"
              onClick={() => setSelectedOpp(null)}
              aria-label="Close"
              className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-300 hover:text-white sm:right-5 sm:top-5"
            >
              ✕
            </button>

            <span className="rounded-full border border-teal-400/30 bg-teal-400/10 px-3 py-1 text-[10px] font-bold text-teal-300">
              {selectedOpp.category}
            </span>

            <h3 id="opportunity-dialog-title" className="mt-3 pr-12 text-2xl font-bold text-white">{selectedOpp.title}</h3>
            <p className="text-xs text-teal-300 mt-1 font-mono">{selectedOpp.organization}</p>

            <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-xs text-slate-300 space-y-2">
              <p>📍 <strong>Location:</strong> {selectedOpp.county}</p>
              <p>💰 <strong>Funding Support:</strong> {selectedOpp.grantAmountLabel}</p>
              <p>⏰ <strong>Deadline:</strong> {selectedOpp.deadline}</p>
            </div>

            <div className="mt-4">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                Description
              </h4>
              <p className="mt-1 text-xs text-slate-300 leading-relaxed">
                {selectedOpp.description}
              </p>
            </div>

            <div className="mt-4">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                Eligibility Criteria
              </h4>
              <ul className="mt-2 space-y-1 text-xs text-slate-400 list-disc list-inside">
                {selectedOpp.eligibility.map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
            </div>

            {selectedOpp.applicationUrl && (
              <a
                href={selectedOpp.applicationUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-full bg-teal-300 px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-emerald-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-200"
              >
                Apply on provider&apos;s site ↗
              </a>
            )}

            {!selectedOpp.applicationUrl && currentUser?.id && (
              <div className="mt-5 space-y-5 border-t border-white/10 pt-5">
                <DocumentUploadField
                  category="pitchDeck"
                  documents={pitchDeck}
                  onChange={setPitchDeck}
                  label="Pitch deck (optional)"
                  helpText="Upload one PDF, up to 16 MB."
                />
                <DocumentUploadField
                  category="certificate"
                  documents={certificates}
                  onChange={setCertificates}
                  label="Supporting certificates (optional)"
                  helpText="Upload up to 3 PDFs or images, maximum 8 MB each."
                  multiple
                />
              </div>
            )}

            {!selectedOpp.applicationUrl && (
              <div className="mt-6 border-t border-white/10 pt-4">
                {submissionError && (
                  <p className="mb-3 text-center text-xs text-rose-300">
                    {submissionError}
                  </p>
                )}
                {isCurrentOppApplied ? (
                  <div className="rounded-2xl border border-teal-500/30 bg-teal-500/10 p-3 text-center text-xs font-bold text-teal-300">
                    ✓ Application submitted and saved to your Dashboard.
                    {confirmationEmailSent
                      ? " A confirmation email was sent."
                      : " We could not send a confirmation email."}
                  </div>
                ) : (
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleApply}
                  className="min-h-12 w-full rounded-full bg-gradient-to-r from-emerald-300 to-teal-400 py-3 text-sm font-bold text-slate-950 shadow-lg transition hover:brightness-105 disabled:opacity-50"
                >
                  {isSubmitting
                    ? "Submitting Application..."
                    : currentUser?.id
                    ? "Submit Application →"
                    : "Sign In to Apply"}
                </button>
                )}
              </div>
            )}
            {selectedOpp.applicationUrl && (
              <p className="mt-3 text-center text-xs text-slate-300">
                Complete your application directly on the provider&apos;s site.
              </p>
            )}
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>
    </section>
  );
}