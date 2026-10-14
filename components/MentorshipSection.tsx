"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useSession } from "next-auth/react";
import { CheckBadgeIcon } from "@heroicons/react/24/solid";
import { Mentor } from "@/server/types/mentor";
import { useApplications } from "@/context/ApplicationContext";
import AuthModal from "@/components/AuthModal";

export default function MentorshipSection() {
  const { bookMentorSession } = useApplications();
  const { data: session } = useSession();
  const reduceMotion = useReducedMotion();

  const [selectedSpecialty, setSelectedSpecialty] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [approvedMentors, setApprovedMentors] = useState<Mentor[]>([]);
  const [mentorLoadError, setMentorLoadError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const loadApprovedMentors = async () => {
      try {
        const response = await fetch("/api/mentors");
        const result = await response.json();
        if (!response.ok || !Array.isArray(result.data)) {
          throw new Error(result.message || "Unable to load verified Navigators.");
        }
        if (!cancelled) {
          setApprovedMentors(result.data);
          setMentorLoadError("");
        }
      } catch (error) {
        if (!cancelled) {
          console.error("[MENTOR_DIRECTORY_LOAD_ERROR]:", error);
          setMentorLoadError(
            error instanceof Error
              ? error.message
              : "Unable to load verified Navigators."
          );
        }
      }
    };

    void loadApprovedMentors();
    return () => {
      cancelled = true;
    };
  }, []);

  // Booking Modal States
  const [selectedMentor, setSelectedMentor] = useState<Mentor | null>(null);
  const [selectedDay, setSelectedDay] = useState<string>("");
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>("");
  const [topicNote, setTopicNote] = useState<string>("");
  const [isBooked, setIsBooked] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [scheduledSessionAt, setScheduledSessionAt] = useState("");
  const [bookingError, setBookingError] = useState("");
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const resetModalState = useCallback(() => {
    setSelectedMentor(null);
    setSelectedDay("");
    setSelectedTimeSlot("");
    setTopicNote("");
    setIsBooked(false);
    setScheduledSessionAt("");
    setBookingError("");
  }, []);

  useEffect(() => {
    if (!selectedMentor) return;

    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") resetModalState();
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [selectedMentor, resetModalState]);

  const mentors = approvedMentors;

  // Extract all unique specialties
  const allSpecialties = useMemo(() => {
    const set = new Set<string>();
    mentors.forEach((m) => m.specialties.forEach((s) => set.add(s)));
    return ["All", ...Array.from(set)];
  }, [mentors]);

  // Filter logic
  const filteredMentors = useMemo(() => {
    return mentors.filter((m) => {
      const matchesSpecialty =
        selectedSpecialty === "All" || m.specialties.includes(selectedSpecialty);
      const matchesSearch =
        searchQuery.trim() === "" ||
        m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.bio.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesSpecialty && matchesSearch;
    });
  }, [mentors, selectedSpecialty, searchQuery]);

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMentor || !selectedDay || !selectedTimeSlot) return;
    setBookingError("");
    if (!session?.user?.id) {
      setBookingError("Sign in to book a session with this mentor.");
      setIsAuthModalOpen(true);
      return;
    }

    setIsSubmitting(true);
    try {
      const bookedSession = bookMentorSession(
        selectedMentor,
        selectedDay,
        selectedTimeSlot,
        topicNote
      );
      const savedSession = await bookedSession;
      setScheduledSessionAt(savedSession.scheduledAt ?? "");
      setIsBooked(true);
    } catch (error) {
      setBookingError(
        error instanceof Error
          ? error.message
          : "Could not book this session. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section id="mentorship" className="relative scroll-mt-28 bg-slate-950/50 px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="text-center">
          <span className="inline-block rounded-full border border-teal-400/30 bg-teal-400/10 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-teal-300">
            Ecosystem Navigators & Mentors
          </span>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Book 1-on-1 Guidance Sessions
          </h2>
          <p className="mx-auto mt-2 max-w-2xl text-sm text-slate-400">
            Connect with ecosystem mentors. KIOH-reviewed Navigators are marked as verified.
          </p>
        </div>
        {mentorLoadError && (
          <p role="status" className="mt-4 text-center text-xs text-amber-200">
            {mentorLoadError}
          </p>
        )}

        {/* Toolbar & Filters */}
        <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-3xl border border-white/10 bg-slate-900/80 p-5 backdrop-blur-xl">
          {/* Search Input */}
          <div className="w-full sm:w-72">
            <input
              type="text"
              placeholder="Search mentor or domain..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-teal-400 focus:outline-none"
            />
          </div>

          {/* Specialty Filter Pills */}
          <div className="-mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:thin] sm:flex-wrap sm:overflow-visible">
            {allSpecialties.map((spec) => (
              <button
                key={spec}
                type="button"
                onClick={() => setSelectedSpecialty(spec)}
                className={`min-h-11 shrink-0 snap-start rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                  selectedSpecialty === spec
                    ? "bg-teal-400 text-slate-950 shadow-md shadow-teal-500/20"
                    : "border border-white/10 bg-white/5 text-slate-300 hover:text-white"
                }`}
              >
                {spec}
              </button>
            ))}
          </div>
        </div>

        {/* Mentors Grid */}
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6">
          {filteredMentors.map((m) => (
            <motion.article
              key={m.id}
              initial={reduceMotion ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              layout
              className="interactive-card group relative flex flex-col justify-between rounded-3xl border border-white/10 bg-slate-900/70 p-5 shadow-xl backdrop-blur-xl sm:p-6"
            >
              <div>
                <div className="flex items-start gap-4">
                  <img
                    src={m.avatar}
                    alt={m.name}
                    className="h-16 w-16 rounded-2xl border-2 border-teal-400/40 object-cover bg-slate-800"
                  />
                  <div className="flex-1">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-bold text-white group-hover:text-teal-300 transition">
                          {m.name}
                        </h3>
                        {m.isVerified && (
                          <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-emerald-300/25 bg-emerald-300/10 px-2 py-1 text-[10px] font-semibold text-emerald-200">
                            <CheckBadgeIcon className="h-3.5 w-3.5" aria-hidden="true" />
                            Verified
                          </span>
                        )}
                      </div>
                      {m.isVerified ? (
                        <span className="rounded-full border border-white/10 px-2.5 py-1 text-[11px] font-semibold text-slate-300">
                          New Navigator
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 rounded-full border border-amber-400/20 bg-amber-400/10 px-2.5 py-0.5 text-[11px] font-bold text-amber-300">
                          ★ {m.rating} ({m.sessionsCompleted} sessions)
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-medium text-teal-300">{m.title}</p>
                    <p className="text-[11px] text-slate-400">{m.organization} • 📍 {m.county}</p>
                    {(m.linkedinUrl || m.websiteUrl || m.githubUrl || m.xUrl) && (
                      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px]">
                        {(
                          [
                            ["LinkedIn", m.linkedinUrl],
                            ["Website", m.websiteUrl],
                            ["GitHub", m.githubUrl],
                            ["X / Twitter", m.xUrl],
                          ] as const
                        ).map(([label, href]) =>
                          href ? (
                            <a
                              key={label}
                              href={href}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(event) => event.stopPropagation()}
                              className="font-semibold text-teal-200 underline underline-offset-4 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-300"
                            >
                              {label}
                            </a>
                          ) : null
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <p className="mt-4 text-xs text-slate-300 leading-relaxed line-clamp-3">
                  {m.bio}
                </p>

                {/* Specialties Tags */}
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {m.specialties.map((s) => (
                    <span
                      key={s}
                      className="rounded-lg bg-teal-400/10 border border-teal-400/20 px-2.5 py-1 text-[10px] font-bold text-teal-300"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>

              {/* Card Footer */}
              <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-4">
                <div className="text-[11px] text-slate-400">
                  <span>Available: </span>
                  <span className="font-semibold text-white">
                    {m.availableDays.join(", ")} ({m.sessionDuration})
                  </span>
                </div>

                {m.isBookable ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedMentor(m);
                      setSelectedDay(m.availableDays[0] || "");
                      setSelectedTimeSlot("");
                      setTopicNote("");
                      setBookingError("");
                      setIsBooked(false);
                      setScheduledSessionAt("");
                    }}
                    className="min-h-11 shrink-0 rounded-full bg-gradient-to-r from-emerald-300 to-teal-400 px-5 py-2 text-xs font-bold text-slate-950 shadow-lg shadow-teal-500/20 transition hover:brightness-105"
                  >
                    Book Session →
                  </button>
                ) : (
                  <span className="shrink-0 rounded-full border border-white/15 px-3 py-2 text-[11px] font-semibold text-slate-300">
                    Directory preview
                  </span>
                )}
              </div>
            </motion.article>
          ))}
        </div>
      </div>

      {/* Booking Modal */}
      <AnimatePresence>
      {selectedMentor && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="presentation"
        >
          <button
            type="button"
            aria-label="Close booking dialog"
            onClick={resetModalState}
            className="fixed inset-0 cursor-default bg-slate-950/80 backdrop-blur-md"
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="mentorship-dialog-title"
            initial={reduceMotion ? false : { opacity: 0, y: 28, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: 20, scale: 0.98 }}
            transition={{ duration: 0.22 }}
            className="relative max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-white/15 bg-slate-900 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl sm:rounded-3xl sm:p-8"
          >
            <button
              type="button"
              onClick={resetModalState}
              aria-label="Close"
              className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-300 hover:text-white sm:right-5 sm:top-5"
            >
              ✕
            </button>

            {isBooked ? (
              <div className="py-6 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-teal-400/30 bg-teal-400/10 text-2xl text-teal-300">
                  📅
                </div>
                <h3 className="mt-4 text-2xl font-bold text-white">Session Scheduled!</h3>
                <p className="mt-2 text-xs text-slate-300 leading-relaxed">
                  Your 1-on-1 mentorship session with{" "}
                  <strong className="text-teal-300">{selectedMentor.name}</strong> for{" "}
                  <strong>
                    {scheduledSessionAt
                      ? new Date(scheduledSessionAt).toLocaleString([], {
                          weekday: "long",
                          month: "long",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })
                      : `${selectedDay} at ${selectedTimeSlot}`}
                  </strong>{" "}
                  has been booked and added to your dashboard.
                </p>
                <button
                  type="button"
                  onClick={resetModalState}
                  className="mt-6 w-full rounded-full bg-teal-400 py-3 text-xs font-bold text-slate-950 shadow-lg"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleBookingSubmit}>
                <div className="flex items-center gap-3">
                  <img
                    src={selectedMentor.avatar}
                    alt={selectedMentor.name}
                    className="h-12 w-12 rounded-2xl border border-teal-400/40 object-cover"
                  />
                  <div>
                    <h3 id="mentorship-dialog-title" className="pr-10 text-xl font-bold text-white">Book Mentorship</h3>
                    <p className="text-xs text-teal-300 font-mono">{selectedMentor.name}</p>
                  </div>
                </div>

                <div className="mt-6 space-y-4">
                  {bookingError && (
                    <p role="alert" className="rounded-xl border border-rose-300/25 bg-rose-300/10 p-3 text-xs text-rose-100">
                      {bookingError}
                    </p>
                  )}
                  {/* Select Day */}
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Select Available Day
                    </label>
                    <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
                      {selectedMentor.availableDays.map((day) => (
                        <button
                          key={day}
                          type="button"
                          onClick={() => setSelectedDay(day)}
                          className={`min-h-11 shrink-0 rounded-xl border px-4 py-2 text-xs font-bold transition ${
                            selectedDay === day
                              ? "border-teal-400 bg-teal-400/10 text-white"
                              : "border-white/10 bg-white/5 text-slate-300"
                          }`}
                        >
                          {day}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Select Time Slot */}
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Select Time Slot
                    </label>
                    <div className="mt-2 grid grid-cols-3 gap-2">
                      {["10:00 AM", "02:00 PM", "04:30 PM"].map((time) => (
                        <button
                          key={time}
                          type="button"
                          onClick={() => setSelectedTimeSlot(time)}
                          className={`min-h-11 rounded-xl border p-2 text-center text-xs font-semibold transition ${
                            selectedTimeSlot === time
                              ? "border-teal-400 bg-teal-400/10 text-teal-300"
                              : "border-white/10 bg-white/5 text-slate-300"
                          }`}
                        >
                          {time}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Topic / Note */}
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Discussion Topic or Question
                    </label>
                    <textarea
                      rows={3}
                      required
                      value={topicNote}
                      onChange={(e) => setTopicNote(e.target.value)}
                      placeholder="Briefly state what you'd like guidance on (e.g., Pitch Deck Review, Grant Writing, Web Architecture)..."
                      className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-teal-400 focus:outline-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={!selectedDay || !selectedTimeSlot || isSubmitting}
                  className="mt-6 min-h-12 w-full rounded-full bg-gradient-to-r from-emerald-300 to-teal-400 py-3 text-sm font-bold text-slate-950 shadow-lg transition hover:brightness-105 disabled:opacity-50"
                >
                  {isSubmitting ? "Confirming Session..." : "Confirm & Book Session →"}
                </button>
              </form>
            )}
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        redirectTo="/#mentorship"
      />
    </section>
  );
}