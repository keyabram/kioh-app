"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  ArrowRightIcon,
  CheckCircleIcon,
  ClockIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";
import { KENYA_COUNTIES } from "@/server/data/opportunities";

const SPECIALTIES = [
  "AgriTech",
  "FinTech & Web3",
  "Software Architecture",
  "Grant Writing & Funding",
  "Venture Capital & Pitch Decks",
  "CleanTech & Energy",
  "Community Growth & Policy",
  "Product Strategy",
];
const AVAILABLE_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface MentorApplication {
  id: string;
  fullName: string;
  title: string;
  organization: string;
  county: string;
  experienceYears: number;
  specialties: string[];
  bio: string;
  linkedinUrl: string;
  websiteUrl: string;
  githubUrl: string;
  xUrl: string;
  availableDays: string[];
  publicProfileConsent: boolean;
  status: "Under Review" | "Approved" | "Rejected";
  submittedAt: string;
  reviewedAt: string | null;
}

type MentorProfileDraft = Omit<
  MentorApplication,
  "id" | "status" | "submittedAt" | "reviewedAt"
>;

interface MentorSession {
  id: string;
  menteeName: string;
  topic: string;
  scheduledAt: string;
  status: "Upcoming" | "Completed" | "Cancelled";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isMentorApplication(value: unknown): value is MentorApplication {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === "string" &&
    typeof value.fullName === "string" &&
    typeof value.title === "string" &&
    typeof value.organization === "string" &&
    typeof value.county === "string" &&
    typeof value.experienceYears === "number" &&
    Array.isArray(value.specialties) &&
    value.specialties.every((item) => typeof item === "string") &&
    typeof value.bio === "string" &&
    typeof value.linkedinUrl === "string" &&
    typeof value.websiteUrl === "string" &&
    typeof value.githubUrl === "string" &&
    typeof value.xUrl === "string" &&
    Array.isArray(value.availableDays) &&
    value.availableDays.every((item) => typeof item === "string") &&
    typeof value.publicProfileConsent === "boolean" &&
    (value.status === "Under Review" ||
      value.status === "Approved" ||
      value.status === "Rejected") &&
    typeof value.submittedAt === "string" &&
    (value.reviewedAt === null || typeof value.reviewedAt === "string")
  );
}

function isMentorSession(value: unknown): value is MentorSession {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === "string" &&
    typeof value.menteeName === "string" &&
    typeof value.topic === "string" &&
    typeof value.scheduledAt === "string" &&
    (value.status === "Upcoming" ||
      value.status === "Completed" ||
      value.status === "Cancelled")
  );
}

function toDraft(application: MentorApplication): MentorProfileDraft {
  return {
    fullName: application.fullName,
    title: application.title,
    organization: application.organization,
    county: application.county,
    experienceYears: application.experienceYears,
    specialties: application.specialties,
    bio: application.bio,
    linkedinUrl: application.linkedinUrl,
    websiteUrl: application.websiteUrl,
    githubUrl: application.githubUrl,
    xUrl: application.xUrl,
    availableDays: application.availableDays,
    publicProfileConsent: application.publicProfileConsent,
  };
}

function statusStyles(status: MentorApplication["status"]) {
  if (status === "Approved") {
    return "border-emerald-300/30 bg-emerald-300/10 text-emerald-100";
  }
  if (status === "Rejected") {
    return "border-rose-300/30 bg-rose-300/10 text-rose-100";
  }
  return "border-amber-300/30 bg-amber-300/10 text-amber-100";
}

function formatSessionDate(value: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "Time to be confirmed";
  return new Intl.DateTimeFormat("en-KE", {
    timeZone: "Africa/Nairobi",
    weekday: "long",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export default function MentorWorkspace() {
  const { status: sessionStatus } = useSession();
  const [application, setApplication] = useState<
    MentorApplication | null | undefined
  >(undefined);
  const [draft, setDraft] = useState<MentorProfileDraft | null>(null);
  const [sessions, setSessions] = useState<MentorSession[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [sessionsLoadError, setSessionsLoadError] = useState("");
  const [saveMessage, setSaveMessage] = useState("");
  const [saveError, setSaveError] = useState("");

  const fetchWorkspaceData = useCallback(async () => {
    const response = await fetch("/api/mentor/dashboard", {
      cache: "no-store",
    });
    const result: unknown = await response.json();
    if (
      !response.ok ||
      !isRecord(result) ||
      result.success !== true
    ) {
      throw new Error(
        isRecord(result) && typeof result.message === "string"
          ? result.message
          : "Could not load your mentor workspace."
      );
    }

    let nextApplication: MentorApplication | null;
    if (result.data === null) {
      nextApplication = null;
    } else if (isMentorApplication(result.data)) {
      nextApplication = result.data;
    } else {
      throw new Error("Mentor application data has an invalid format.");
    }

    let nextSessions: MentorSession[] = [];
    let nextSessionsError = "";
    if (nextApplication?.status === "Approved") {
      try {
        const sessionsResponse = await fetch("/api/mentor-sessions?view=mentor", {
          cache: "no-store",
        });
        const sessionsResult: unknown = await sessionsResponse.json();
        if (
          !sessionsResponse.ok ||
          !isRecord(sessionsResult) ||
          sessionsResult.success !== true
        ) {
          throw new Error(
            isRecord(sessionsResult) && typeof sessionsResult.message === "string"
              ? sessionsResult.message
              : "Could not load your upcoming sessions."
          );
        }
        if (
          !Array.isArray(sessionsResult.data) ||
          !sessionsResult.data.every(isMentorSession)
        ) {
          throw new Error("Mentorship session data has an invalid format.");
        }
        nextSessions = sessionsResult.data;
      } catch (error) {
        console.error("[MENTOR_WORKSPACE_SESSIONS_LOAD_ERROR]:", error);
        nextSessionsError =
          error instanceof Error
            ? error.message
            : "Could not load your upcoming sessions.";
      }
    }
    return {
      application: nextApplication,
      sessions: nextSessions,
      sessionsError: nextSessionsError,
    };
  }, []);

  useEffect(() => {
    if (sessionStatus !== "authenticated") return;
    let cancelled = false;
    const load = async () => {
      try {
        const data = await fetchWorkspaceData();
        if (cancelled) return;
        setApplication(data.application);
        setDraft(data.application ? toDraft(data.application) : null);
        setSessions(data.sessions);
        setSessionsLoadError(data.sessionsError);
      } catch (error) {
        if (cancelled) return;
        console.error("[MENTOR_WORKSPACE_LOAD_ERROR]:", error);
        setLoadError(
          error instanceof Error
            ? error.message
            : "Could not load your mentor workspace."
        );
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [fetchWorkspaceData, sessionStatus]);

  const loadWorkspace = useCallback(async () => {
    try {
      const data = await fetchWorkspaceData();
      setApplication(data.application);
      setDraft(data.application ? toDraft(data.application) : null);
      setSessions(data.sessions);
      setSessionsLoadError(data.sessionsError);
    } catch (error) {
      console.error("[MENTOR_WORKSPACE_LOAD_ERROR]:", error);
      setLoadError(
        error instanceof Error
          ? error.message
          : "Could not load your mentor workspace."
      );
    }
  }, [fetchWorkspaceData]);

  const updateDraft = <K extends keyof MentorProfileDraft>(
    field: K,
    value: MentorProfileDraft[K]
  ) => {
    setDraft((current) => (current ? { ...current, [field]: value } : current));
    setSaveMessage("");
  };

  const toggleValue = (field: "specialties" | "availableDays", value: string) => {
    if (!draft) return;
    const currentValues = draft[field];
    if (currentValues.includes(value) && currentValues.length === 1) {
      setSaveError(
        field === "specialties"
          ? "Select at least one mentorship area."
          : "Select at least one available day."
      );
      return;
    }
    setSaveError("");
    updateDraft(
      field,
      currentValues.includes(value)
        ? currentValues.filter((item) => item !== value)
        : [...currentValues, value]
    );
  };

  const saveProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!draft) return;

    setIsSaving(true);
    setSaveError("");
    setSaveMessage("");
    try {
      const response = await fetch("/api/mentor/dashboard", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const result: unknown = await response.json();
      if (!response.ok || !isRecord(result) || result.success !== true) {
        throw new Error(
          isRecord(result) && typeof result.message === "string"
            ? result.message
            : "Could not save your mentor profile."
        );
      }
      if (!isMentorApplication(result.data)) {
        throw new Error("Saved mentor profile data has an invalid format.");
      }
      setApplication(result.data);
      setDraft(toDraft(result.data));
      setSaveMessage("Your mentor profile has been saved.");
    } catch (error) {
      console.error("[MENTOR_WORKSPACE_SAVE_ERROR]:", error);
      setSaveError(
        error instanceof Error
          ? error.message
          : "Could not save your mentor profile."
      );
    } finally {
      setIsSaving(false);
    }
  };

  const canEdit =
    application?.status === "Approved" ||
    application?.status === "Under Review";
  const isLoading =
    sessionStatus === "loading" ||
    (sessionStatus === "authenticated" &&
      application === undefined &&
      !loadError);

  return (
    <section className="mt-8 space-y-6" aria-labelledby="mentor-workspace-title">
      <div className="flex flex-col justify-between gap-4 border-b border-white/10 pb-5 sm:flex-row sm:items-end">
        <div>
          <h2
            id="mentor-workspace-title"
            className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl"
          >
            Mentor Workspace
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-200">
            Keep your public mentor profile current and stay on top of sessions booked with you.
          </p>
        </div>
        {application && (
          <span
            className={`inline-flex min-h-9 items-center rounded-full border px-3.5 py-1 text-xs font-semibold ${statusStyles(application.status)}`}
          >
            {application.status === "Approved" && (
              <CheckCircleIcon aria-hidden="true" className="mr-1.5 h-4 w-4" />
            )}
            {application.status === "Under Review" && (
              <ClockIcon aria-hidden="true" className="mr-1.5 h-4 w-4" />
            )}
            {application.status}
          </span>
        )}
      </div>

      {sessionStatus === "unauthenticated" && (
        <div className="rounded-2xl border border-amber-300/25 bg-amber-300/10 p-5 text-sm text-amber-100">
          Sign in to view your mentor application, update your profile, and manage sessions.
        </div>
      )}

      {loadError && (
        <div
          role="alert"
          className="flex flex-col gap-3 rounded-2xl border border-rose-300/25 bg-rose-300/10 p-5 text-sm text-rose-100 sm:flex-row sm:items-center sm:justify-between"
        >
          <span>{loadError}</span>
          <button
            type="button"
            onClick={() => {
              setLoadError("");
              setApplication(undefined);
              setDraft(null);
              setSessionsLoadError("");
              void loadWorkspace();
            }}
            className="min-h-10 shrink-0 rounded-full border border-rose-200/30 px-4 text-xs font-semibold hover:bg-rose-200/10"
          >
            Try again
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-8 text-sm text-slate-200">
          Loading your mentor workspace…
        </div>
      ) : sessionStatus === "authenticated" && !loadError && !application ? (
        <div className="rounded-3xl border border-dashed border-teal-300/30 bg-teal-300/[0.04] p-7 sm:p-10">
          <h3 className="text-xl font-bold text-white">Start your mentor application</h3>
          <p className="mt-2 max-w-xl text-sm leading-6 text-teal-50">
            Share your experience with Kenya’s next generation of founders and innovators. Once approved, your profile can appear in the mentor directory.
          </p>
          <Link
            href="/apply-mentor"
            className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-full bg-teal-300 px-5 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-teal-200"
          >
            Apply to become a mentor
            <ArrowRightIcon aria-hidden="true" className="h-4 w-4" />
          </Link>
        </div>
      ) : sessionStatus === "authenticated" ? (
        application &&
        draft && (
          <div className="grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,1.55fr)_minmax(18rem,0.8fr)]">
            <form
              onSubmit={saveProfile}
              className="space-y-6 rounded-3xl border border-white/10 bg-slate-900/65 p-5 sm:p-7"
            >
              <div className="flex flex-col justify-between gap-3 border-b border-white/10 pb-5 sm:flex-row sm:items-start">
                <div>
                  <h3 className="text-lg font-bold text-white">Mentor profile</h3>
                  <p className="mt-1 text-sm text-slate-200">
                    Submitted {new Date(application.submittedAt).toLocaleDateString()}
                    {application.reviewedAt
                      ? ` · Reviewed ${new Date(application.reviewedAt).toLocaleDateString()}`
                      : ""}
                  </p>
                </div>
                {application.status === "Rejected" && (
                  <Link
                    href="/apply-mentor"
                    className="min-h-10 inline-flex items-center rounded-full border border-white/15 px-4 text-xs font-semibold text-white hover:bg-white/5"
                  >
                    Submit a new application
                  </Link>
                )}
              </div>

              {saveError && (
                <p role="alert" className="rounded-xl border border-rose-300/25 bg-rose-300/10 p-3 text-sm text-rose-100">
                  {saveError}
                </p>
              )}
              {saveMessage && (
                <p role="status" className="rounded-xl border border-emerald-300/25 bg-emerald-300/10 p-3 text-sm text-emerald-100">
                  {saveMessage}
                </p>
              )}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="text-xs font-semibold text-slate-200">
                  Display name
                  <input
                    required
                    minLength={2}
                    maxLength={120}
                    value={draft.fullName}
                    disabled={!canEdit || isSaving}
                    onChange={(event) => updateDraft("fullName", event.target.value)}
                    className="mt-2 min-h-11 w-full rounded-xl border border-white/15 bg-slate-950/60 px-3 text-sm text-white placeholder-slate-400 outline-none focus:border-teal-300 disabled:opacity-60"
                  />
                </label>
                <label className="text-xs font-semibold text-slate-200">
                  Professional title
                  <input
                    required
                    minLength={2}
                    maxLength={120}
                    value={draft.title}
                    disabled={!canEdit || isSaving}
                    onChange={(event) => updateDraft("title", event.target.value)}
                    className="mt-2 min-h-11 w-full rounded-xl border border-white/15 bg-slate-950/60 px-3 text-sm text-white placeholder-slate-400 outline-none focus:border-teal-300 disabled:opacity-60"
                  />
                </label>
                <label className="text-xs font-semibold text-slate-200">
                  Organization
                  <input
                    required
                    minLength={2}
                    maxLength={160}
                    value={draft.organization}
                    disabled={!canEdit || isSaving}
                    onChange={(event) => updateDraft("organization", event.target.value)}
                    className="mt-2 min-h-11 w-full rounded-xl border border-white/15 bg-slate-950/60 px-3 text-sm text-white outline-none focus:border-teal-300 disabled:opacity-60"
                  />
                </label>
                <label className="text-xs font-semibold text-slate-200">
                  County
                  <select
                    value={draft.county}
                    disabled={!canEdit || isSaving}
                    onChange={(event) => updateDraft("county", event.target.value)}
                    className="mt-2 min-h-11 w-full rounded-xl border border-white/15 bg-slate-950/60 px-3 text-sm text-white outline-none focus:border-teal-300 disabled:opacity-60"
                  >
                    {KENYA_COUNTIES.filter(
                      (county) => county !== "All Counties" && county !== "Nationwide"
                    ).map((county) => (
                      <option key={county} value={county} className="bg-slate-900">
                        {county}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-xs font-semibold text-slate-200">
                  Years of experience
                  <input
                    required
                    type="number"
                    min={1}
                    max={25}
                    value={draft.experienceYears}
                    disabled={!canEdit || isSaving}
                    onChange={(event) =>
                      updateDraft("experienceYears", Number(event.target.value))
                    }
                    className="mt-2 min-h-11 w-full rounded-xl border border-white/15 bg-slate-950/60 px-3 text-sm text-white outline-none focus:border-teal-300 disabled:opacity-60"
                  />
                </label>
              </div>

              <fieldset disabled={!canEdit || isSaving} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <legend className="mb-2 text-xs font-semibold text-slate-200">
                  Professional profile links
                </legend>
                {(
                  [
                    ["linkedinUrl", "LinkedIn (required)", "linkedin.com/in/yourname"],
                    ["websiteUrl", "Website or portfolio (optional)", "yourwebsite.com"],
                    ["githubUrl", "GitHub (optional)", "github.com/yourname"],
                    ["xUrl", "X / Twitter (optional)", "x.com/yourname"],
                  ] as const
                ).map(([field, label, placeholder]) => (
                  <label key={field} className="min-w-0 text-xs font-semibold text-slate-200">
                    {label}
                    <input
                      type="text"
                      inputMode="url"
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck={false}
                      required={field === "linkedinUrl"}
                      maxLength={500}
                      value={draft[field]}
                      onChange={(event) => updateDraft(field, event.target.value)}
                      placeholder={placeholder}
                      className="mt-2 min-h-11 w-full rounded-xl border border-white/15 bg-slate-950/60 px-3 text-sm text-white outline-none focus:border-teal-300 disabled:opacity-60"
                    />
                  </label>
                ))}
                <p className="text-xs leading-5 text-slate-300 sm:col-span-2">
                  Use a full profile URL; we’ll add https:// if you leave it out.
                </p>
              </fieldset>

              <fieldset disabled={!canEdit || isSaving}>
                <legend className="text-xs font-semibold text-slate-200">
                  Mentorship areas · choose at least one
                </legend>
                <div className="mt-3 flex flex-wrap gap-2">
                  {SPECIALTIES.map((specialty) => {
                    const selected = draft.specialties.includes(specialty);
                    return (
                      <button
                        key={specialty}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => toggleValue("specialties", specialty)}
                        className={`min-h-10 rounded-full border px-3.5 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-300 ${
                          selected
                            ? "border-teal-300/60 bg-teal-300/15 text-teal-100"
                            : "border-white/15 bg-white/[0.03] text-slate-200 hover:bg-white/[0.07]"
                        }`}
                      >
                        {specialty}
                      </button>
                    );
                  })}
                </div>
              </fieldset>

              <fieldset disabled={!canEdit || isSaving}>
                <legend className="text-xs font-semibold text-slate-200">
                  Available days · choose at least one
                </legend>
                <div className="mt-3 flex flex-wrap gap-2">
                  {AVAILABLE_DAYS.map((day) => {
                    const selected = draft.availableDays.includes(day);
                    return (
                      <button
                        key={day}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => toggleValue("availableDays", day)}
                        className={`min-h-10 min-w-14 rounded-xl border px-3 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-300 ${
                          selected
                            ? "border-teal-300/60 bg-teal-300/15 text-teal-100"
                            : "border-white/15 bg-white/[0.03] text-slate-200 hover:bg-white/[0.07]"
                        }`}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </fieldset>

              <label className="block text-xs font-semibold text-slate-200">
                About your mentoring
                <textarea
                  required
                  minLength={20}
                  maxLength={3000}
                  rows={5}
                  value={draft.bio}
                  disabled={!canEdit || isSaving}
                  onChange={(event) => updateDraft("bio", event.target.value)}
                  className="mt-2 w-full resize-y rounded-xl border border-white/15 bg-slate-950/60 px-3 py-3 text-sm leading-6 text-white outline-none focus:border-teal-300 disabled:opacity-60"
                />
              </label>

              <label className="flex items-start gap-3 rounded-2xl border border-white/10 p-4 text-sm leading-6 text-slate-200">
                <input
                  type="checkbox"
                  checked={draft.publicProfileConsent}
                  disabled={!canEdit || isSaving}
                  onChange={(event) =>
                    updateDraft("publicProfileConsent", event.target.checked)
                  }
                  className="mt-1 h-4 w-4 shrink-0 accent-teal-300"
                />
                <span>
                  Allow my approved profile to appear in the public mentor directory.
                </span>
              </label>

              {canEdit && (
                <div className="flex flex-col gap-3 border-t border-white/10 pt-5 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs leading-5 text-slate-200">
                    {application.status === "Approved"
                      ? "Profile changes are reflected in the directory."
                      : "Changes will be visible to reviewers while your application is under review."}
                  </p>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="min-h-11 shrink-0 rounded-full bg-teal-300 px-5 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-teal-200 disabled:cursor-wait disabled:opacity-60"
                  >
                    {isSaving ? "Saving…" : "Save profile"}
                  </button>
                </div>
              )}
            </form>

            <aside className="space-y-5">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                  <h3 className="text-lg font-bold text-white">Your sessions</h3>
                  <p className="mt-1 text-sm text-slate-200">
                    {sessions.length} {sessions.length === 1 ? "booking" : "bookings"}
                  </p>
                </div>
                <UserGroupIcon aria-hidden="true" className="h-6 w-6 text-teal-200" />
              </div>

              {sessionsLoadError ? (
                <div
                  role="alert"
                  className="rounded-2xl border border-rose-300/25 bg-rose-300/10 p-5 text-sm text-rose-100"
                >
                  <p>{sessionsLoadError}</p>
                  <button
                    type="button"
                    onClick={() => {
                      setSessionsLoadError("");
                      void loadWorkspace();
                    }}
                    className="mt-3 min-h-10 rounded-full border border-rose-200/30 px-4 text-xs font-semibold hover:bg-rose-200/10"
                  >
                    Retry loading sessions
                  </button>
                </div>
              ) : application.status !== "Approved" ? (
                <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-5">
                  <h4 className="text-sm font-semibold text-white">
                    Sessions appear after approval
                  </h4>
                  <p className="mt-2 text-sm leading-6 text-slate-200">
                    Once KIOH approves your application and you consent to a public profile, innovators can book a session with you.
                  </p>
                </div>
              ) : sessions.length > 0 ? (
                <ol className="space-y-3">
                  {sessions.map((session) => (
                    <li
                      key={session.id}
                      className="rounded-2xl border border-white/10 bg-slate-900/55 p-5"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-semibold text-teal-100">
                            {formatSessionDate(session.scheduledAt)}
                          </p>
                          <p className="mt-2 text-sm font-bold text-white">
                            {session.menteeName}
                          </p>
                        </div>
                        <span className="rounded-full border border-teal-300/25 bg-teal-300/10 px-2.5 py-1 text-[10px] font-semibold text-teal-100">
                          {session.status}
                        </span>
                      </div>
                      <p className="mt-3 border-t border-white/10 pt-3 text-sm leading-6 text-slate-200">
                        {session.topic}
                      </p>
                    </li>
                  ))}
                </ol>
              ) : (
                <div className="rounded-2xl border border-dashed border-white/15 p-6">
                  <h4 className="text-sm font-semibold text-white">
                    No sessions booked yet
                  </h4>
                  <p className="mt-2 text-sm leading-6 text-slate-200">
                    New bookings from the public mentor directory will appear here.
                  </p>
                </div>
              )}
            </aside>
          </div>
        )
      ) : null}
    </section>
  );
}
