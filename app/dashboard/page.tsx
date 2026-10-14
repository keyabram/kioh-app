"use client";

import { startTransition, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  AcademicCapIcon,
  BookmarkIcon,
  BriefcaseIcon,
  ChartBarIcon,
  UserCircleIcon,
} from "@heroicons/react/24/outline";
import NotificationActivity from "@/components/NotificationActivity";
import EcosystemAnalytics from "@/components/EcosystemAnalytics";
import { useNotifications } from "@/context/NotificationContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import BackgroundCanvas from "@/components/BackgroundCanvas";
import ProfileSetupModal from "@/components/ProfileSetupModal";
import MentorWorkspace from "@/components/MentorWorkspace";
import ScrollReveal from "@/components/ScrollReveal";
import { UserProfile } from "@/server/types";
import { useApplications } from "@/context/ApplicationContext";
import type { Opportunity } from "@/server/types/opportunity";

type DashboardTab =
  | "overview"
  | "applications"
  | "saved"
  | "mentorship"
  | "mentor"
  | "notifications"
  | "analytics"
  | "settings";
type MentorApplicationStatus = "Under Review" | "Approved" | "Rejected";

interface MentorApplicationSummary {
  status: MentorApplicationStatus;
  submittedAt: string;
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const {
    appliedOpportunities,
    bookedSessions,
    savedOpportunityIds,
    savedOpportunitiesLoading,
    setOpportunitySaved,
  } = useApplications();
  const { unreadCount } = useNotifications();
  const canViewAnalytics =
    session?.user?.role === "admin" || session?.user?.role === "funder";

  const [activeTab, setActiveTab] = useState<DashboardTab>("overview");
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [profileOverride, setProfileOverride] = useState<UserProfile | null>(null);
  const [savedOpportunities, setSavedOpportunities] = useState<Opportunity[]>([]);
  const [savedOpportunitiesLoaded, setSavedOpportunitiesLoaded] = useState(false);
  const [savedOpportunitiesResolvedKey, setSavedOpportunitiesResolvedKey] =
    useState("");
  const [savedOpportunityError, setSavedOpportunityError] = useState("");
  const [mentorApplicationResult, setMentorApplicationResult] = useState<{
    userId: string;
    application: MentorApplicationSummary | null;
    error?: string;
  } | null>(null);

  useEffect(() => {
    const requestedTab = new URLSearchParams(window.location.search).get("tab");
    if (
      requestedTab === "overview" ||
      requestedTab === "applications" ||
      requestedTab === "saved" ||
      requestedTab === "mentorship" ||
      requestedTab === "mentor" ||
      requestedTab === "notifications" ||
      requestedTab === "settings" ||
      requestedTab === "analytics"
    ) {
      if (requestedTab === "analytics" && !canViewAnalytics) return;
      const timeout = window.setTimeout(
        () => setActiveTab(requestedTab),
        0
      );
      return () => window.clearTimeout(timeout);
    }
  }, [canViewAnalytics]);

  useEffect(() => {
    let cancelled = false;

    const loadSavedOpportunities = async () => {
      if (savedOpportunitiesLoading) return;
      const queryKey = JSON.stringify([
        session?.user?.id || "guest",
        savedOpportunityIds,
      ]);
      if (savedOpportunityIds.length === 0) {
        startTransition(() => {
          setSavedOpportunities([]);
          setSavedOpportunitiesLoaded(true);
          setSavedOpportunitiesResolvedKey(queryKey);
          setSavedOpportunityError("");
        });
        return;
      }

      startTransition(() => {
        setSavedOpportunitiesLoaded(false);
        setSavedOpportunityError("");
      });
      try {
        const response = await fetch("/api/opportunities", { cache: "no-store" });
        const result = await response.json();
        if (!response.ok || !Array.isArray(result.data)) {
          throw new Error(result.message || "Could not load saved opportunities.");
        }
        if (cancelled) return;

        const opportunitiesById = new Map<string, Opportunity>(
          (result.data as Opportunity[]).map((opportunity) => [
            opportunity.id,
            opportunity,
          ])
        );
        setSavedOpportunities(
          savedOpportunityIds
            .map((id: string) => opportunitiesById.get(id))
            .filter((opportunity): opportunity is Opportunity => Boolean(opportunity))
        );
        setSavedOpportunityError("");
      } catch (error) {
        if (!cancelled) {
          console.error("Failed to load saved opportunities:", error);
          setSavedOpportunityError("Saved opportunities could not be loaded.");
        }
      } finally {
        if (!cancelled) {
          setSavedOpportunitiesLoaded(true);
          setSavedOpportunitiesResolvedKey(queryKey);
        }
      }
    };

    void loadSavedOpportunities();
    return () => {
      cancelled = true;
    };
  }, [savedOpportunityIds, savedOpportunitiesLoading, session?.user?.id]);

  useEffect(() => {
    const userId = session?.user?.id;
    if (!userId) return;

    let cancelled = false;

    const loadMentorApplication = async () => {
      try {
        const response = await fetch("/api/mentor-applications", {
          cache: "no-store",
        });
        const result = await response.json();
        if (!response.ok) {
          throw new Error(
            result.message || "Failed to load your mentor application."
          );
        }
        if (!cancelled) {
          setMentorApplicationResult({
            userId,
            application: result.data,
          });
        }
      } catch (error) {
        if (!cancelled) {
          console.error("Failed to load mentor application:", error);
          setMentorApplicationResult({
            userId,
            application: null,
            error: "We could not load your mentor application status.",
          });
        }
      }
    };

    void loadMentorApplication();
    return () => {
      cancelled = true;
    };
  }, [session?.user?.id]);

  const mentorApplication =
    mentorApplicationResult &&
    mentorApplicationResult.userId === session?.user?.id
      ? mentorApplicationResult.application
      : null;
  const mentorApplicationError =
    mentorApplicationResult &&
    mentorApplicationResult.userId === session?.user?.id
      ? mentorApplicationResult.error
      : undefined;

  // Construct current user state
  const sessionUser: UserProfile = {
    id: session?.user?.id || "kioh-user",
    fullName: session?.user?.name || "Innovator",
    email: session?.user?.email || "innovator@kioh.org",
    avatar:
      session?.user?.image ||
      "https://api.dicebear.com/7.x/avataaars/svg?seed=KIOH",
    role: session?.user?.role || "participant",
    navigatorVerified: session?.user?.navigatorVerified === true,
    isEmailVerified: true,
    location: session?.user?.location || "",
    organization: session?.user?.organization || "",
    bio:
      session?.user?.bio ||
      "",
    careerStage: session?.user?.careerStage || "other",
    skills: session?.user?.skills || [],
    interests: session?.user?.interests || [],
    experience: session?.user?.experience || "",
    goals: session?.user?.goals || "",
    supportNeeds: session?.user?.supportNeeds || [],
    createdAt: new Date(0),
  };
  const currentUser = profileOverride ?? sessionUser;
  const savedOpportunityQueryKey = JSON.stringify([
    session?.user?.id || "guest",
    savedOpportunityIds,
  ]);
  const savedOpportunityViewIsCurrent =
    !savedOpportunitiesLoading &&
    savedOpportunitiesLoaded &&
    savedOpportunitiesResolvedKey === savedOpportunityQueryKey;
  const profileFields = [
    currentUser.fullName,
    currentUser.email,
    currentUser.location,
    currentUser.organization,
    currentUser.bio,
    currentUser.careerStage,
    currentUser.skills?.join(", "),
    currentUser.interests?.join(", "),
    currentUser.experience,
    currentUser.goals,
    currentUser.supportNeeds?.join(", "),
  ];
  const profileCompleteness = Math.round(
    (profileFields.filter((value) => Boolean(value?.trim())).length /
      profileFields.length) *
      100
  );
  const applicationsInReview = appliedOpportunities.filter(
    (application) => application.status === "Under Review"
  ).length;
  const upcomingSessions = bookedSessions.filter(
    (session) => session.status === "Upcoming"
  ).length;

  const removeSavedOpportunity = async (opportunityId: string) => {
    try {
      await setOpportunitySaved(opportunityId, false);
      setSavedOpportunities((current) =>
        current.filter((opportunity) => opportunity.id !== opportunityId)
      );
      setSavedOpportunityError("");
    } catch (error) {
      console.error("Failed to remove saved opportunity:", error);
      setSavedOpportunityError(
        error instanceof Error ? error.message : "Could not remove saved opportunity."
      );
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950 text-white selection:bg-teal-500/30">
      <BackgroundCanvas />

      {/* Navigation Header */}
      <Header
        currentUser={profileOverride ?? (session?.user ? currentUser : null)}
        onLoginSuccess={setProfileOverride}
        onLogout={() => setProfileOverride(null)}
        onOpenProfile={() => setIsEditModalOpen(true)}
      />

      <ScrollReveal>
      <section className="relative px-4 pt-12 pb-16 sm:px-6 sm:pt-16 sm:pb-20 lg:px-8">
        <div className="mx-auto max-w-7xl">
          {/* User Welcome Banner */}
          <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-6 sm:p-8 backdrop-blur-xl shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <img
                src={currentUser.avatar}
                alt={currentUser.fullName}
                className="h-16 w-16 rounded-2xl border-2 border-teal-400/50 bg-slate-800 object-cover"
              />
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-extrabold text-white sm:text-3xl">
                    Jambo, {currentUser.fullName}!
                  </h1>
                  <span className="rounded-full border border-teal-400/30 bg-teal-400/10 px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider text-teal-300">
                    {currentUser.role}
                  </span>
                  {currentUser.navigatorVerified && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300/30 bg-emerald-300/10 px-2.5 py-1 text-[10px] font-semibold text-emerald-200">
                      <span aria-hidden="true">✓</span> Verified Navigator
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs text-teal-100/80">
                  {currentUser.location || "Add your county"}
                  {currentUser.organization
                    ? ` · ${currentUser.organization}`
                    : ""}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => setIsEditModalOpen(true)}
                className="rounded-full border border-white/15 bg-white/5 px-5 py-2.5 text-xs font-semibold text-white hover:bg-white/10 transition"
              >
                Edit Profile
              </button>
              <Link
                href="/opportunities"
                className="min-h-11 rounded-full bg-gradient-to-r from-emerald-300 to-teal-400 px-6 py-2.5 text-sm font-bold text-slate-950 shadow-lg shadow-teal-500/20 transition hover:brightness-105"
              >
                Browse Opportunities →
              </Link>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="mt-8 flex gap-2 overflow-x-auto border-b border-white/10 pb-2 [scrollbar-width:thin]">
            {[
              { id: "overview", label: "Overview", icon: "📊" },
              {
                id: "applications",
                label: `My Applications (${appliedOpportunities.length})`,
                icon: "🚀",
              },
              {
                id: "saved",
                label: `Saved (${savedOpportunityIds.length})`,
                icon: "🔖",
              },
              {
                id: "mentorship",
                label: `Mentorship Sessions (${bookedSessions.length})`,
                icon: "📅",
              },
              { id: "mentor", label: "Mentor Workspace", icon: "🧭" },
              {
                id: "notifications",
                label: `Activity & Notifications${unreadCount ? ` (${unreadCount})` : ""}`,
                icon: "🔔",
              },
              ...(canViewAnalytics
                ? [{ id: "analytics", label: "Ecosystem Analytics", icon: "📈" }]
                : []),
              { id: "settings", label: "Profile & Settings", icon: "⚙️" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as DashboardTab)}
                className={`flex min-h-11 shrink-0 items-center gap-2 rounded-2xl px-4 py-3 text-xs font-bold transition whitespace-nowrap sm:px-5 ${
                  activeTab === tab.id
                    ? "bg-teal-400/10 text-teal-300 border border-teal-400/30 shadow-md"
                    : "text-slate-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* TAB 1: OVERVIEW */}
          {activeTab === "overview" && (
            <div className="mt-8 space-y-8">
              {/* Stat Cards */}
              <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
                <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4 backdrop-blur-xl sm:p-5">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Applications in review
                    </p>
                    <BriefcaseIcon
                      aria-hidden="true"
                      className="h-5 w-5 text-emerald-300"
                    />
                  </div>
                  <p className="mt-2 text-2xl font-extrabold text-white font-mono sm:text-3xl">
                    {applicationsInReview}
                  </p>
                  <span className="text-[11px] text-teal-300">
                    {appliedOpportunities.length} total submitted
                  </span>
                </div>

                <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4 backdrop-blur-xl sm:p-5">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Upcoming mentorships
                    </p>
                    <AcademicCapIcon
                      aria-hidden="true"
                      className="h-5 w-5 text-cyan-300"
                    />
                  </div>
                  <p className="mt-2 text-2xl font-extrabold text-white font-mono sm:text-3xl">
                    {upcomingSessions}
                  </p>
                  <span className="text-[11px] text-teal-300">
                    {bookedSessions.length} total booked
                  </span>
                </div>

                <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4 backdrop-blur-xl sm:p-5">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Your KIOH role
                    </p>
                    <UserCircleIcon
                      aria-hidden="true"
                      className="h-5 w-5 text-violet-300"
                    />
                  </div>
                  <p className="mt-2 text-xl font-extrabold text-teal-300 font-mono capitalize sm:text-3xl">
                    {currentUser.role}
                  </p>
                  <span className="text-[11px] text-slate-400">
                    {currentUser.navigatorVerified
                      ? "Verified Navigator"
                      : "KIOH Hub Member"}
                  </span>
                </div>

                <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4 backdrop-blur-xl sm:p-5">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Profile completeness
                    </p>
                    <ChartBarIcon
                      aria-hidden="true"
                      className="h-5 w-5 text-amber-300"
                    />
                  </div>
                  <p className="mt-2 text-2xl font-extrabold text-white font-mono sm:text-3xl">
                    {profileCompleteness}%
                  </p>
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                    <div
                      className="h-full rounded-full bg-teal-400 transition-[width] duration-500"
                      style={{ width: `${profileCompleteness}%` }}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(true)}
                    className="mt-3 text-left text-[11px] font-semibold text-teal-300 underline-offset-4 hover:underline"
                  >
                    Complete your profile
                  </button>
                </div>
              </div>

              {mentorApplication && (
                <div className="rounded-3xl border border-teal-400/20 bg-teal-400/[0.05] p-6 backdrop-blur-xl">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="text-base font-bold text-white">
                        Navigator application
                      </h3>
                      <p className="mt-1 text-xs text-teal-100/80">
                        Submitted on {mentorApplication.submittedAt}
                      </p>
                    </div>
                    <span className="rounded-full border border-teal-400/30 bg-teal-400/10 px-4 py-1.5 text-xs font-bold text-teal-300">
                      {mentorApplication.status}
                    </span>
                    <button
                      type="button"
                      onClick={() => setActiveTab("mentor")}
                      className="min-h-10 rounded-full border border-teal-300/30 px-4 text-xs font-semibold text-teal-100 transition hover:bg-teal-300/10"
                    >
                      Manage application →
                    </button>
                  </div>
                </div>
              )}
              {mentorApplicationError && (
                <p role="status" className="text-xs text-amber-200">
                  {mentorApplicationError}
                </p>
              )}

              {/* Live Preview Cards */}
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                {/* Applications Preview */}
                <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-6 backdrop-blur-xl">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-bold text-white">Recent Applications</h3>
                    <button
                      type="button"
                      onClick={() => setActiveTab("applications")}
                      className="text-xs font-semibold text-teal-300 hover:underline"
                    >
                      View All →
                    </button>
                  </div>

                  <div className="mt-4 space-y-3">
                    {appliedOpportunities.length > 0 ? (
                      appliedOpportunities.slice(0, 3).map((app) => (
                        <div
                          key={app.id}
                          className="rounded-2xl border border-white/5 bg-white/[0.02] p-4 flex items-center justify-between"
                        >
                          <div>
                            <h4 className="text-xs font-bold text-white">
                              {app.opportunity.title}
                            </h4>
                            <p className="text-[11px] text-slate-400">
                              {app.opportunity.organization}
                            </p>
                          </div>
                          <span className="rounded-full border border-teal-400/30 bg-teal-400/10 px-3 py-1 text-[10px] font-bold text-teal-300">
                            {app.status}
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-slate-400 py-4">
                        No applications submitted yet.
                      </p>
                    )}
                  </div>
                </div>

                {/* Mentorship Preview */}
                <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-6 backdrop-blur-xl">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-bold text-white">Upcoming Sessions</h3>
                    <button
                      type="button"
                      onClick={() => setActiveTab("mentorship")}
                      className="text-xs font-semibold text-teal-300 hover:underline"
                    >
                      View All →
                    </button>
                  </div>

                  <div className="mt-4 space-y-3">
                    {bookedSessions.length > 0 ? (
                      bookedSessions.slice(0, 3).map((session) => (
                        <div
                          key={session.id}
                          className="rounded-2xl border border-white/5 bg-white/[0.02] p-4 flex items-center gap-3"
                        >
                          <img
                            src={session.mentor.avatar}
                            alt={session.mentor.name}
                            className="h-10 w-10 rounded-xl object-cover"
                          />
                          <div className="flex-1">
                            <h4 className="text-xs font-bold text-white">
                              {session.mentor.name}
                            </h4>
                            <p className="text-[11px] text-teal-300">
                              {session.day} at {session.timeSlot}
                            </p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-slate-400 py-4">
                        No mentor sessions booked yet.
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <section className="rounded-3xl border border-white/10 bg-slate-900/60 p-6 backdrop-blur-xl">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-bold text-white">Saved opportunities</h3>
                    <p className="mt-1 text-xs text-slate-400">
                      {savedOpportunityIds.length} saved {session?.user?.id ? "to your account" : "in this browser"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab("saved")}
                    className="min-h-10 text-xs font-semibold text-teal-300 hover:underline"
                  >
                    View saved →
                  </button>
                </div>
                {savedOpportunityError ? (
                  <p role="status" className="mt-4 text-xs text-rose-200">
                    {savedOpportunityError}
                  </p>
                ) : savedOpportunityViewIsCurrent && savedOpportunities.length > 0 ? (
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {savedOpportunities.slice(0, 2).map((opportunity) => (
                      <div
                        key={opportunity.id}
                        className="rounded-2xl border border-white/5 bg-white/[0.02] p-4"
                      >
                        <p className="text-[10px] font-semibold uppercase text-teal-300">
                          {opportunity.category}
                        </p>
                        <h4 className="mt-2 text-sm font-bold text-white">
                          {opportunity.title}
                        </h4>
                        <p className="mt-1 text-xs text-slate-400">
                          {opportunity.organization}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-4 text-xs text-slate-400">
                    {savedOpportunityViewIsCurrent
                      ? "No saved opportunities yet. Browse listings and bookmark ones to revisit."
                      : "Loading saved opportunities…"}
                  </p>
                )}
              </section>
            </div>
          )}

          {/* TAB 2: APPLICATIONS */}
          {activeTab === "applications" && (
            <div className="mt-8 space-y-4">
              <h3 className="text-xl font-bold text-white">
                Submitted Opportunity Applications
              </h3>

              <div className="grid grid-cols-1 gap-4">
                {appliedOpportunities.length > 0 ? (
                  appliedOpportunities.map((app) => (
                    <div
                      key={app.id}
                      className="rounded-3xl border border-white/10 bg-slate-900/60 p-6 backdrop-blur-xl flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      <div>
                        <span className="text-[10px] font-mono text-slate-400">
                          Submitted on {app.appliedAt}
                        </span>
                        <h4 className="text-base font-bold text-white mt-1">
                          {app.opportunity.title}
                        </h4>
                        <p className="text-xs text-slate-400">
                          {app.opportunity.organization} • 📍 {app.opportunity.county}
                        </p>
                        <p className="mt-2 text-xs font-extrabold text-teal-300 font-mono">
                          Grant Value: {app.opportunity.grantAmountLabel}
                        </p>
                        {app.documents &&
                          (app.documents.pitchDeck ||
                            app.documents.certificates.length > 0) && (
                            <div className="mt-3 flex flex-wrap gap-2">
                              {[
                                ...(app.documents.pitchDeck
                                  ? [app.documents.pitchDeck]
                                  : []),
                                ...app.documents.certificates,
                              ].map((document) => (
                                <a
                                  key={document.key}
                                  href={`/api/uploads?key=${encodeURIComponent(document.key)}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="min-h-10 inline-flex max-w-full items-center rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold text-teal-300 hover:bg-white/5"
                                >
                                  <span className="truncate">{document.name}</span>
                                </a>
                              ))}
                            </div>
                          )}
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="rounded-full border border-teal-400/30 bg-teal-400/10 px-4 py-1.5 text-xs font-bold text-teal-300">
                          {app.status}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-3xl border border-dashed border-white/10 p-8 text-center text-xs text-slate-400">
                    You have not submitted any applications yet.{" "}
                    <Link href="/opportunities" className="text-teal-300 underline">
                      Browse available opportunities
                    </Link>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "saved" && (
            <section className="mt-8 space-y-4">
              <div>
                <h3 className="text-xl font-bold text-white">Saved opportunities</h3>
                <p className="mt-1 text-xs text-slate-400">
                  {session?.user?.id
                    ? "These bookmarks are synced to your KIOH account."
                    : "These bookmarks are saved in this browser."}
                </p>
              </div>
              {savedOpportunityError ? (
                <p role="status" className="rounded-xl border border-rose-300/20 bg-rose-300/5 p-4 text-xs text-rose-200">
                  {savedOpportunityError}
                </p>
              ) : savedOpportunityViewIsCurrent && savedOpportunities.length > 0 ? (
                <div className="grid gap-4">
                  {savedOpportunities.map((opportunity) => (
                    <article
                      key={opportunity.id}
                      className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-slate-900/60 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6"
                    >
                      <div>
                        <p className="text-[10px] font-semibold uppercase text-teal-300">
                          {opportunity.category} · {opportunity.county}
                        </p>
                        <h4 className="mt-2 text-base font-bold text-white">
                          {opportunity.title}
                        </h4>
                        <p className="mt-1 text-xs text-slate-400">
                          {opportunity.organization} · Deadline {opportunity.deadline}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <Link
                          href="/opportunities"
                          className="inline-flex min-h-11 items-center rounded-full bg-teal-300 px-4 text-xs font-bold text-slate-950 transition hover:bg-emerald-200"
                        >
                          View listing
                        </Link>
                        <button
                          type="button"
                          aria-label={`Remove ${opportunity.title} from saved opportunities`}
                          disabled={savedOpportunitiesLoading}
                          onClick={() => void removeSavedOpportunity(opportunity.id)}
                          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border border-white/10 text-slate-300 transition hover:border-rose-300/30 hover:text-rose-200 disabled:cursor-wait disabled:opacity-50"
                        >
                          <BookmarkIcon aria-hidden="true" className="h-5 w-5" />
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="rounded-3xl border border-dashed border-white/10 p-8 text-center text-xs text-slate-400">
                  {savedOpportunityViewIsCurrent
                    ? "No saved opportunities found in this browser."
                    : "Loading saved opportunities…"}{" "}
                  <Link href="/opportunities" className="text-teal-300 underline">
                    Browse opportunities
                  </Link>
                </div>
              )}
            </section>
          )}

          {/* TAB 3: MENTORSHIP */}
          {activeTab === "mentorship" && (
            <div className="mt-8 space-y-4">
              <h3 className="text-xl font-bold text-white">1-on-1 Mentorship Sessions</h3>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {bookedSessions.length > 0 ? (
                  bookedSessions.map((session) => (
                    <div
                      key={session.id}
                      className="rounded-3xl border border-white/10 bg-slate-900/60 p-6 backdrop-blur-xl space-y-4"
                    >
                      <div className="flex items-center gap-4">
                        <img
                          src={session.mentor.avatar}
                          alt={session.mentor.name}
                          className="h-14 w-14 rounded-2xl border border-teal-400/40 object-cover"
                        />
                        <div>
                          <h4 className="text-base font-bold text-white">
                            {session.mentor.name}
                          </h4>
                          <p className="text-xs text-slate-400">
                            {session.mentor.title}
                          </p>
                          <p className="text-xs font-bold text-teal-300 mt-1">
                            📅 {session.day} @ {session.timeSlot}
                          </p>
                        </div>
                      </div>

                      <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-3 text-xs text-slate-300">
                        <strong>Discussion Topic:</strong> {session.topic}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="col-span-full rounded-3xl border border-dashed border-white/10 p-8 text-center text-xs text-slate-400">
                    You have no upcoming mentorship bookings.{" "}
                    <Link href="/#navigators" className="text-teal-300 underline">
                      Find a Navigator
                    </Link>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "notifications" && <NotificationActivity />}
          {activeTab === "mentor" && (
            <MentorWorkspace key={session?.user?.id ?? "guest"} />
          )}
          {activeTab === "analytics" && canViewAnalytics && (
            <EcosystemAnalytics />
          )}

          {/* TAB 5: SETTINGS */}
          {activeTab === "settings" && (
            <div className="mt-8 rounded-3xl border border-white/10 bg-slate-900/60 p-6 sm:p-8 backdrop-blur-xl max-w-2xl">
              <h3 className="text-xl font-bold text-white">Account & Profile Settings</h3>

              <div className="mt-6 space-y-4 text-xs text-slate-300">
                <div>
                  <label className="block font-bold text-slate-400 uppercase tracking-wider text-[10px]">
                    Full Name
                  </label>
                  <p className="mt-1 text-sm text-white font-semibold">
                    {currentUser.fullName}
                  </p>
                </div>

                <div>
                  <label className="block font-bold text-slate-400 uppercase tracking-wider text-[10px]">
                    Email Address
                  </label>
                  <p className="mt-1 text-sm text-teal-300 font-mono">
                    {currentUser.email}
                  </p>
                </div>

                <div>
                  <label className="block font-bold text-slate-400 uppercase tracking-wider text-[10px]">
                    County Location
                  </label>
                  <p className="mt-1 text-sm text-white font-semibold">
                    {currentUser.location}
                  </p>
                </div>

                <div>
                  <label className="block font-bold text-slate-400 uppercase tracking-wider text-[10px]">
                    Institution / Organization
                  </label>
                  <p className="mt-1 text-sm text-white font-semibold">
                    {currentUser.organization}
                  </p>
                </div>

                <div>
                  <label className="block font-bold text-slate-400 uppercase tracking-wider text-[10px]">
                    Bio
                  </label>
                  <p className="mt-1 text-xs text-slate-200 leading-relaxed">
                    {currentUser.bio}
                  </p>
                </div>

                <div>
                  <label className="block font-bold text-slate-400 uppercase tracking-wider text-[10px]">
                    Career stage
                  </label>
                  <p className="mt-1 text-sm font-semibold capitalize text-white">
                    {currentUser.careerStage || "Not set"}
                  </p>
                </div>

                {[
                  ["Skills", currentUser.skills],
                  ["Interests", currentUser.interests],
                  ["Support sought", currentUser.supportNeeds],
                ].map(([label, values]) => (
                  <div key={label as string}>
                    <label className="block font-bold text-slate-400 uppercase tracking-wider text-[10px]">
                      {label}
                    </label>
                    <p className="mt-1 text-sm font-semibold text-white">
                      {(values as string[] | undefined)?.join(", ") || "Not set"}
                    </p>
                  </div>
                ))}

                <div>
                  <label className="block font-bold text-slate-400 uppercase tracking-wider text-[10px]">
                    Goals
                  </label>
                  <p className="mt-1 text-xs leading-relaxed text-slate-200">
                    {currentUser.goals || "Not set"}
                  </p>
                </div>

                <div>
                  <label className="block font-bold text-slate-400 uppercase tracking-wider text-[10px]">
                    Experience
                  </label>
                  <p className="mt-1 text-xs leading-relaxed text-slate-200">
                    {currentUser.experience || "Not set"}
                  </p>
                </div>

                <div className="pt-4 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(true)}
                    className="rounded-full bg-teal-400 px-6 py-2.5 text-xs font-bold text-slate-950 shadow-lg"
                  >
                    Edit Profile Details
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
      </ScrollReveal>

      {/* Edit Profile Modal */}
      {isEditModalOpen && (
        <ProfileSetupModal
          user={currentUser}
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          onUpdate={(updatedUser) => {
            setProfileOverride(updatedUser);
            setIsEditModalOpen(false);
          }}
        />
      )}

      <Footer />
    </main>
  );
}