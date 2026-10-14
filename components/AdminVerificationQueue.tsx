"use client";

import { useEffect, useState } from "react";
import {
  CheckBadgeIcon,
  CheckIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

interface MentorApplication {
  id: string;
  fullName: string;
  email: string;
  title: string;
  organization: string;
  county: string;
  experienceYears: number;
  specialties: string[];
  bio: string;
  linkedinUrl: string;
  websiteUrl: string | null;
  githubUrl: string | null;
  xUrl: string | null;
  availableDays: string[];
  createdAt: string;
  certificates: { key: string; name: string }[];
}

interface PartnerInquiry {
  id: string;
  fullName: string;
  email: string;
  organization: string;
  location: string;
  interest: string;
  publicOrganizationConsent: boolean;
  createdAt: string;
}

interface VerificationQueueData {
  mentorApplications: MentorApplication[];
  partnerInquiries: PartnerInquiry[];
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-KE", {
    dateStyle: "medium",
  }).format(new Date(value));
}

export default function AdminVerificationQueue() {
  const [queue, setQueue] = useState<VerificationQueueData>({
    mentorApplications: [],
    partnerInquiries: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [loadingError, setLoadingError] = useState("");
  const [actionError, setActionError] = useState("");
  const [savingKey, setSavingKey] = useState("");
  const [reloadVersion, setReloadVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const loadQueue = async () => {
      setIsLoading(true);
      setLoadingError("");
      try {
        const response = await fetch("/api/admin/verification");
        const result = await response.json();
        if (!response.ok || !result.data) {
          throw new Error(result.message || "Could not load verification requests.");
        }
        if (!cancelled) {
          setQueue(result.data);
        }
      } catch (error) {
        if (!cancelled) {
          console.error("[ADMIN_VERIFICATION_LOAD_ERROR]:", error);
          setLoadingError(
            error instanceof Error
              ? error.message
              : "Could not load verification requests."
          );
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    void loadQueue();
    return () => {
      cancelled = true;
    };
  }, [reloadVersion]);

  const review = async (
    type: "mentor" | "partner",
    id: string,
    name: string,
    decision: "approve" | "reject"
  ) => {
    const action = decision === "approve" ? "approve" : "reject";
    if (!window.confirm(`${action === "approve" ? "Approve" : "Reject"} ${name}?`)) {
      return;
    }

    const key = `${type}:${id}`;
    setSavingKey(key);
    setActionError("");
    try {
      const response = await fetch("/api/admin/verification", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, id, decision }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || "Could not save this decision.");
      }

      setQueue((current) =>
        type === "mentor"
          ? {
              ...current,
              mentorApplications: current.mentorApplications.filter(
                (application) => application.id !== id
              ),
            }
          : {
              ...current,
              partnerInquiries: current.partnerInquiries.filter(
                (inquiry) => inquiry.id !== id
              ),
            }
      );
      setReloadVersion((version) => version + 1);
    } catch (error) {
      console.error("[ADMIN_VERIFICATION_REVIEW_ERROR]:", error);
      setActionError(
        error instanceof Error ? error.message : "Could not save this decision."
      );
    } finally {
      setSavingKey("");
    }
  };

  const totalRequests =
    queue.mentorApplications.length + queue.partnerInquiries.length;

  return (
    <div className="mt-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-white sm:text-2xl">
            Verification requests
          </h2>
          <p className="mt-1 text-sm text-slate-300">
            Review submitted evidence before granting verified status.
          </p>
        </div>
        <span className="rounded-full border border-emerald-300/25 bg-emerald-300/10 px-3 py-1.5 text-xs font-semibold text-emerald-100">
          {totalRequests} awaiting review
        </span>
      </div>

      {loadingError && (
        <div className="mb-5 rounded-xl border border-rose-400/25 bg-rose-400/10 p-4 text-sm text-rose-200">
          <p role="alert">{loadingError}</p>
          <button
            type="button"
            onClick={() => setReloadVersion((version) => version + 1)}
            className="mt-2 min-h-10 font-semibold underline underline-offset-4"
          >
            Retry
          </button>
        </div>
      )}
      {actionError && (
        <p role="alert" className="mb-5 rounded-xl border border-rose-400/25 bg-rose-400/10 p-4 text-sm text-rose-200">
          {actionError}
        </p>
      )}
      {isLoading ? (
        <p role="status" className="rounded-2xl border border-white/10 bg-slate-900/60 p-8 text-center text-sm text-slate-300">
          Loading verification requests…
        </p>
      ) : (
        <div className="space-y-10">
          <section aria-labelledby="mentor-review-heading">
            <div className="mb-4 flex items-center gap-2">
              <h3 id="mentor-review-heading" className="text-lg font-semibold text-white">
                Navigator applications
              </h3>
              <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-slate-300">
                {queue.mentorApplications.length}
              </span>
            </div>
            {queue.mentorApplications.length === 0 ? (
              <p className="rounded-2xl border border-white/10 bg-slate-900/50 p-5 text-sm text-slate-300">
                No Navigator applications are waiting for review.
              </p>
            ) : (
              <div className="space-y-4">
                {queue.mentorApplications.map((application) => {
                  const key = `mentor:${application.id}`;
                  return (
                    <article
                      key={application.id}
                      className="rounded-2xl border border-white/10 bg-slate-900/65 p-5 sm:p-6"
                    >
                      <div className="flex flex-col gap-5 lg:flex-row lg:justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="text-lg font-semibold text-white">
                              {application.fullName}
                            </h4>
                            <span className="rounded-full border border-amber-300/25 bg-amber-300/10 px-2.5 py-1 text-[10px] font-semibold text-amber-100">
                              Under review
                            </span>
                          </div>
                          <p className="mt-1 text-sm text-slate-300">
                            {application.title} · {application.organization}
                          </p>
                          <p className="mt-1 text-xs text-slate-400">
                            {application.email} · {application.county} · {application.experienceYears} years experience · Submitted {formatDate(application.createdAt)}
                          </p>
                          <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-300">
                            {application.bio}
                          </p>
                          <ul className="mt-3 flex flex-wrap gap-2">
                            {application.specialties.map((specialty) => (
                              <li key={specialty} className="rounded-full border border-white/10 px-2.5 py-1 text-xs text-slate-300">
                                {specialty}
                              </li>
                            ))}
                          </ul>
                          <div className="mt-4 flex flex-wrap gap-3 text-xs">
                            {(
                              [
                                ["LinkedIn", application.linkedinUrl],
                                ["Website", application.websiteUrl],
                                ["GitHub", application.githubUrl],
                                ["X / Twitter", application.xUrl],
                              ] as const
                            ).map(([label, href]) =>
                              href ? (
                                <a
                                  key={label}
                                  href={href}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="font-semibold text-teal-200 underline underline-offset-4"
                                >
                                  {label}
                                </a>
                              ) : null
                            )}
                            {application.certificates.map((certificate) => (
                              <a
                                key={certificate.key}
                                href={`/api/admin/verification/files?key=${encodeURIComponent(certificate.key)}`}
                                target="_blank"
                                rel="noreferrer"
                                className="font-semibold text-teal-200 underline underline-offset-4"
                              >
                                View {certificate.name}
                              </a>
                            ))}
                          </div>
                        </div>
                        <div className="flex shrink-0 flex-wrap gap-2 lg:w-36 lg:flex-col">
                          <button
                            type="button"
                            disabled={Boolean(savingKey)}
                            onClick={() =>
                              void review("mentor", application.id, application.fullName, "approve")
                            }
                            className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-300 px-4 py-2 text-sm font-bold text-slate-950 transition hover:bg-emerald-200 disabled:cursor-wait disabled:opacity-50 lg:flex-none"
                          >
                            <CheckIcon aria-hidden="true" className="h-4 w-4" />
                            {savingKey === key ? "Saving…" : "Approve"}
                          </button>
                          <button
                            type="button"
                            disabled={Boolean(savingKey)}
                            onClick={() =>
                              void review("mentor", application.id, application.fullName, "reject")
                            }
                            className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-rose-300/25 px-4 py-2 text-sm font-semibold text-rose-200 transition hover:bg-rose-300/10 disabled:cursor-wait disabled:opacity-50 lg:flex-none"
                          >
                            <XMarkIcon aria-hidden="true" className="h-4 w-4" />
                            Reject
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          <section aria-labelledby="partner-review-heading">
            <div className="mb-4 flex items-center gap-2">
              <h3 id="partner-review-heading" className="text-lg font-semibold text-white">
                Partner organizations
              </h3>
              <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-slate-300">
                {queue.partnerInquiries.length}
              </span>
            </div>
            {queue.partnerInquiries.length === 0 ? (
              <p className="rounded-2xl border border-white/10 bg-slate-900/50 p-5 text-sm text-slate-300">
                No partner organizations are waiting for review.
              </p>
            ) : (
              <div className="space-y-4">
                {queue.partnerInquiries.map((inquiry) => {
                  const key = `partner:${inquiry.id}`;
                  return (
                    <article
                      key={inquiry.id}
                      className="rounded-2xl border border-white/10 bg-slate-900/65 p-5 sm:p-6"
                    >
                      <div className="flex flex-col gap-5 lg:flex-row lg:justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="text-lg font-semibold text-white">
                              {inquiry.organization}
                            </h4>
                            {inquiry.publicOrganizationConsent ? (
                              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300/25 bg-emerald-300/10 px-2.5 py-1 text-[10px] font-semibold text-emerald-100">
                                <CheckBadgeIcon aria-hidden="true" className="h-3.5 w-3.5" />
                                Public listing consent
                              </span>
                            ) : (
                              <span className="rounded-full border border-white/10 px-2.5 py-1 text-[10px] font-medium text-slate-300">
                                Admin-only badge
                              </span>
                            )}
                          </div>
                          <p className="mt-1 text-xs text-slate-400">
                            Contact: {inquiry.fullName} · {inquiry.email} · {inquiry.location} · Submitted {formatDate(inquiry.createdAt)}
                          </p>
                          <p className="mt-4 max-w-3xl whitespace-pre-wrap text-sm leading-6 text-slate-300">
                            {inquiry.interest}
                          </p>
                        </div>
                        <div className="flex shrink-0 flex-wrap gap-2 lg:w-36 lg:flex-col">
                          <button
                            type="button"
                            disabled={Boolean(savingKey)}
                            onClick={() =>
                              void review("partner", inquiry.id, inquiry.organization, "approve")
                            }
                            className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-300 px-4 py-2 text-sm font-bold text-slate-950 transition hover:bg-emerald-200 disabled:cursor-wait disabled:opacity-50 lg:flex-none"
                          >
                            <CheckIcon aria-hidden="true" className="h-4 w-4" />
                            {savingKey === key ? "Saving…" : "Approve"}
                          </button>
                          <button
                            type="button"
                            disabled={Boolean(savingKey)}
                            onClick={() =>
                              void review("partner", inquiry.id, inquiry.organization, "reject")
                            }
                            className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-rose-300/25 px-4 py-2 text-sm font-semibold text-rose-200 transition hover:bg-rose-300/10 disabled:cursor-wait disabled:opacity-50 lg:flex-none"
                          >
                            <XMarkIcon aria-hidden="true" className="h-4 w-4" />
                            Reject
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
