"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import BackgroundCanvas from "@/components/BackgroundCanvas";
import ScrollReveal from "@/components/ScrollReveal";
import { KENYA_COUNTIES } from "@/server/data/opportunities";
import type { UserProfile } from "@/server/types";
import DocumentUploadField from "@/components/DocumentUploadField";
import type { UploadedDocument } from "@/server/types/uploads";
import {
  getMentorSocialUrlError,
  normalizeMentorSocialUrl,
} from "@/utils/mentorSocialUrls";

const DOMAIN_OPTIONS = [
  "AgriTech",
  "FinTech & Web3",
  "Software Architecture",
  "Grant Writing & Funding",
  "Venture Capital & Pitch Decks",
  "CleanTech & Energy",
  "Community Growth & Policy",
  "Product Strategy",
];

export default function ApplyMentorPage() {
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Form Fields
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [title, setTitle] = useState("");
  const [organization, setOrganization] = useState("");
  const [county, setCounty] = useState("Nairobi");
  const [experienceYears, setExperienceYears] = useState<number>(5);
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([]);
  const [bio, setBio] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [xUrl, setXUrl] = useState("");
  const [socialUrlErrors, setSocialUrlErrors] = useState({
    linkedinUrl: "",
    websiteUrl: "",
    githubUrl: "",
    xUrl: "",
  });
  const [availableDays, setAvailableDays] = useState<string[]>(["Tue", "Thu"]);
  const [certificates, setCertificates] = useState<UploadedDocument[]>([]);
  const [publicProfileConsent, setPublicProfileConsent] = useState(false);
  const [confirmationEmailSent, setConfirmationEmailSent] = useState(true);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submissionError, setSubmissionError] = useState("");

  const sessionUser: UserProfile | null =
    sessionStatus === "authenticated" && session?.user
      ? {
          id: session.user.id,
          fullName: session.user.name || "KIOH Member",
          email: session.user.email || "",
          avatar: session.user.image || "",
          role: session.user.role,
          isEmailVerified: true,
          bio: session.user.bio || "",
          location: session.user.location || "",
          organization: session.user.organization || "",
          createdAt: new Date(),
        }
      : null;
  const activeUser = currentUser ?? sessionUser;
  const isAuthenticated = Boolean(activeUser?.id);

  const toggleSpecialty = (domain: string) => {
    setSelectedSpecialties((prev) =>
      prev.includes(domain)
        ? prev.filter((d) => d !== domain)
        : [...prev, domain]
    );
  };

  const toggleDay = (day: string) => {
    setAvailableDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      setSubmissionError("Sign in with a verified account before submitting.");
      setIsAuthModalOpen(true);
      return;
    }

    const normalizedUrls = {
      linkedinUrl: normalizeMentorSocialUrl(linkedinUrl, "linkedin"),
      websiteUrl: websiteUrl.trim()
        ? normalizeMentorSocialUrl(websiteUrl, "website")
        : null,
      githubUrl: githubUrl.trim()
        ? normalizeMentorSocialUrl(githubUrl, "github")
        : null,
      xUrl: xUrl.trim() ? normalizeMentorSocialUrl(xUrl, "x") : null,
    };
    const nextSocialUrlErrors = {
      linkedinUrl: getMentorSocialUrlError(linkedinUrl, "linkedin", true),
      websiteUrl: getMentorSocialUrlError(websiteUrl, "website"),
      githubUrl: getMentorSocialUrlError(githubUrl, "github"),
      xUrl: getMentorSocialUrlError(xUrl, "x"),
    };
    setSocialUrlErrors(nextSocialUrlErrors);
    if (Object.values(nextSocialUrlErrors).some(Boolean)) {
      setSubmissionError("Please check the profile links and correct the highlighted fields.");
      return;
    }

    const applicantName = fullName.trim() || activeUser?.fullName || "";
    setFullName(applicantName);
    setLinkedinUrl(normalizedUrls.linkedinUrl || "");
    setWebsiteUrl(normalizedUrls.websiteUrl || "");
    setGithubUrl(normalizedUrls.githubUrl || "");
    setXUrl(normalizedUrls.xUrl || "");
    setIsSubmitting(true);
    setSubmissionError("");

    try {
      const response = await fetch("/api/mentor-applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: applicantName,
          title,
          organization,
          county,
          experienceYears,
          specialties: selectedSpecialties,
          bio,
          linkedinUrl: normalizedUrls.linkedinUrl,
          websiteUrl: normalizedUrls.websiteUrl,
          githubUrl: normalizedUrls.githubUrl,
          xUrl: normalizedUrls.xUrl,
          availableDays,
          certificateKeys: certificates.map((file) => file.key),
          publicProfileConsent,
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || "Could not submit your application.");
      }
      setConfirmationEmailSent(result.emailSent === true);
      setSubmitted(true);
    } catch (err) {
      console.error("Failed to submit mentor application:", err);
      setSubmissionError(
        err instanceof Error
          ? err.message
          : "We could not submit your application. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950 text-white selection:bg-teal-500/30">
      <BackgroundCanvas />
      <Header
        currentUser={activeUser}
        onLoginSuccess={setCurrentUser}
        onLogout={() => setCurrentUser(null)}
        onOpenProfile={() => router.push("/dashboard")}
        authOpen={isAuthModalOpen}
        onAuthOpenChange={setIsAuthModalOpen}
        redirectOnLogin="/apply-mentor"
      />

      <ScrollReveal>
      <section className="relative px-4 pt-12 pb-16 sm:px-6 sm:pt-16 sm:pb-20 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <div className="text-center">
            <span className="inline-block rounded-full border border-teal-400/30 bg-teal-400/10 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-teal-300">
              Join the KIOH Pipeline
            </span>
            <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              Become an Ecosystem Navigator or Mentor
            </h1>
            <p className="mx-auto mt-2 max-w-xl text-sm text-slate-400">
              Guide Kenya’s next generation of founders, technical leaders, and social innovators through 1-on-1 mentorship.
            </p>
          </div>

          <div className="surface-card mt-10 rounded-3xl p-5 shadow-2xl sm:p-10">
            {submitted ? (
              <div className="py-12 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-teal-400/30 bg-teal-400/10 text-3xl text-teal-300">
                  🎉
                </div>
                <h2 className="mt-4 text-2xl font-bold text-white">
                  Application Submitted!
                </h2>
                <p className="mt-2 text-xs text-slate-300 leading-relaxed max-w-md mx-auto">
                  Thank you, <strong className="text-teal-300">{fullName}</strong>. Your application is saved{confirmationEmailSent ? <> and a confirmation email was sent to <strong>{activeUser?.email || email}</strong></> : <>. We could not send a confirmation email</>}. Our team will review your application and contact you soon.
                </p>
                {certificates.length > 0 && (
                  <div className="mx-auto mt-5 flex max-w-md flex-wrap justify-center gap-2">
                    {certificates.map((certificate) => (
                      <a
                        key={certificate.key}
                        href={`/api/uploads?key=${encodeURIComponent(certificate.key)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="min-h-10 max-w-full truncate rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold text-teal-300 hover:bg-white/5"
                      >
                        {certificate.name}
                      </a>
                    ))}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => router.push("/dashboard?tab=mentor")}
                  className="mt-8 rounded-full bg-teal-400 px-8 py-3 text-xs font-bold text-slate-950 shadow-lg shadow-teal-500/20"
                >
                  Return to Dashboard →
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                {submissionError && (
                  <p role="alert" className="rounded-xl border border-rose-400/25 bg-rose-400/10 p-4 text-sm text-rose-100">
                    {submissionError}
                  </p>
                )}
                {!isAuthenticated && (
                  <div className="rounded-2xl border border-amber-300/20 bg-amber-300/5 p-4">
                    <p className="text-sm font-semibold text-amber-100">
                      Sign in is required to submit and securely attach certificates.
                    </p>
                    <button
                      type="button"
                      onClick={() => setIsAuthModalOpen(true)}
                      className="mt-3 min-h-11 rounded-xl bg-teal-300 px-4 py-2 text-xs font-bold text-slate-950"
                    >
                      Sign in or create an account
                    </button>
                  </div>
                )}
                {/* Basic Details */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                      Full Name
                    </label>
                    <input
                      type="text"
                      required
                      minLength={2}
                      maxLength={120}
                      autoComplete="name"
                      placeholder="e.g. Dr. Achieng Odhiambo"
                      value={fullName || activeUser?.fullName || ""}
                      onChange={(e) => setFullName(e.target.value)}
                      className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-base text-white placeholder-slate-400 focus:border-teal-400 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                      Email Address
                    </label>
                    <input
                      type="email"
                      required
                      autoComplete="email"
                      inputMode="email"
                      maxLength={254}
                      placeholder="you@organization.org"
                      value={email || activeUser?.email || ""}
                      onChange={(e) => setEmail(e.target.value)}
                      className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-base text-white placeholder-slate-400 focus:border-teal-400 focus:outline-none"
                    />
                  </div>
                </div>

                {isAuthenticated ? (
                  <DocumentUploadField
                    category="certificate"
                    documents={certificates}
                    onChange={setCertificates}
                    label="Certificates (optional)"
                    helpText="Upload up to 3 PDFs or images, maximum 8 MB each."
                    multiple
                  />
                ) : (
                  <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 text-xs text-slate-400">
                    Sign in to upload professional certificates. Your files are private and attached to this application.
                  </div>
                )}

                {/* Professional Role & Org */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                      Professional Title
                    </label>
                    <input
                      type="text"
                      required
                      minLength={2}
                      maxLength={120}
                      placeholder="e.g. Senior Systems Architect"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-base text-white placeholder-slate-400 focus:border-teal-400 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                      Company / Organization
                    </label>
                    <input
                      type="text"
                      required
                      minLength={2}
                      maxLength={160}
                      placeholder="e.g. Savannah Digital Labs"
                      value={organization}
                      onChange={(e) => setOrganization(e.target.value)}
                      className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-base text-white placeholder-slate-400 focus:border-teal-400 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Location & Experience */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                      Primary County
                    </label>
                    <select
                      value={county}
                      onChange={(e) => setCounty(e.target.value)}
                      className="mt-1.5 w-full rounded-xl border border-white/10 bg-slate-900 px-3.5 py-2.5 text-base text-white focus:border-teal-400 focus:outline-none"
                    >
                      {KENYA_COUNTIES.filter(
                        (c) => c !== "All Counties" && c !== "Nationwide"
                      ).map(
                        (c) => (
                          <option key={c} value={c} className="bg-slate-900 text-white">
                            {c}
                          </option>
                        )
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                      Years of Experience ({experienceYears} Years)
                    </label>
                    <input
                      type="range"
                      min={1}
                      max={25}
                      value={experienceYears}
                      onChange={(e) => setExperienceYears(Number(e.target.value))}
                      className="mt-3 w-full accent-teal-400"
                    />
                  </div>
                </div>

                {/* Domain Specialties */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Core Mentorship Domains (Select all that apply)
                  </label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {DOMAIN_OPTIONS.map((domain) => {
                      const selected = selectedSpecialties.includes(domain);
                      return (
                        <button
                          key={domain}
                          type="button"
                          onClick={() => toggleSpecialty(domain)}
                          className={`min-h-11 rounded-xl border px-3.5 py-2 text-xs font-semibold transition ${
                            selected
                              ? "border-teal-400 bg-teal-400/10 text-teal-300"
                              : "border-white/10 bg-white/5 text-slate-400 hover:text-white"
                          }`}
                        >
                          {selected ? "✓ " : "+ "}
                          {domain}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Mentorship Bio */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Mentorship Bio & Ecosystem Contributions
                  </label>
                  <textarea
                    rows={4}
                    required
                    minLength={20}
                    maxLength={3000}
                    placeholder="Describe your background and how you plan to guide early-stage Kenyan builders..."
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-base text-white placeholder-slate-400 focus:border-teal-400 focus:outline-none"
                  />
                </div>

                {/* Availability Days */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Preferred Availability Days
                  </label>
                  <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
                    {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => {
                      const active = availableDays.includes(day);
                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() => toggleDay(day)}
                          className={`min-h-11 shrink-0 rounded-xl border px-4 py-2 text-xs font-bold transition ${
                            active
                              ? "border-teal-400 bg-teal-400/10 text-white"
                              : "border-white/10 bg-white/5 text-slate-400"
                          }`}
                        >
                          {day}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <fieldset className="space-y-4">
                  <legend className="text-xs font-bold uppercase tracking-wider text-slate-200">
                    Professional profile links
                  </legend>
                  <p className="text-sm leading-6 text-slate-300">
                    Add your public profiles so reviewers can learn more about your work. Use a full profile link; we’ll add https:// if it’s omitted.
                  </p>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {(
                      [
                        {
                          key: "linkedinUrl",
                          label: "LinkedIn",
                          required: true,
                          value: linkedinUrl,
                          setValue: setLinkedinUrl,
                          placeholder: "linkedin.com/in/yourname",
                        },
                        {
                          key: "websiteUrl",
                          label: "Website or portfolio",
                          required: false,
                          value: websiteUrl,
                          setValue: setWebsiteUrl,
                          placeholder: "yourwebsite.com",
                        },
                        {
                          key: "githubUrl",
                          label: "GitHub",
                          required: false,
                          value: githubUrl,
                          setValue: setGithubUrl,
                          placeholder: "github.com/yourname",
                        },
                        {
                          key: "xUrl",
                          label: "X / Twitter",
                          required: false,
                          value: xUrl,
                          setValue: setXUrl,
                          placeholder: "x.com/yourname",
                        },
                      ] as const
                    ).map((field) => (
                      <label
                        key={field.key}
                        className="block min-w-0 text-xs font-semibold text-slate-200"
                      >
                        {field.label}
                        {field.required ? " (required)" : " (optional)"}
                        <input
                          type="text"
                          inputMode="url"
                          autoCapitalize="none"
                          autoCorrect="off"
                          spellCheck={false}
                          maxLength={500}
                          required={field.required}
                          value={field.value}
                          onChange={(event) => {
                            field.setValue(event.target.value);
                            setSocialUrlErrors((current) => ({
                              ...current,
                              [field.key]: "",
                            }));
                          }}
                          onBlur={() => {
                            const rawValue = field.value;
                            const normalized = normalizeMentorSocialUrl(
                              rawValue,
                              field.key === "linkedinUrl"
                                ? "linkedin"
                                : field.key === "websiteUrl"
                                  ? "website"
                                  : field.key === "githubUrl"
                                    ? "github"
                                    : "x"
                            );
                            if (normalized) field.setValue(normalized);
                            setSocialUrlErrors((current) => ({
                              ...current,
                              [field.key]: getMentorSocialUrlError(
                                rawValue,
                                field.key === "linkedinUrl"
                                  ? "linkedin"
                                  : field.key === "websiteUrl"
                                    ? "website"
                                    : field.key === "githubUrl"
                                      ? "github"
                                      : "x",
                                field.required
                              ),
                            }));
                          }}
                          aria-invalid={Boolean(socialUrlErrors[field.key])}
                          aria-describedby={`${field.key}-hint${socialUrlErrors[field.key] ? ` ${field.key}-error` : ""}`}
                          placeholder={field.placeholder}
                          className="mt-1.5 min-h-11 w-full rounded-xl border border-white/15 bg-white/[0.03] px-3.5 py-2.5 text-base text-white placeholder-slate-400 outline-none focus:border-teal-300 aria-[invalid=true]:border-rose-300"
                        />
                        <span id={`${field.key}-hint`} className="mt-1 block text-xs font-normal text-slate-300">
                          {field.required
                            ? "Your LinkedIn profile is required for review."
                            : "Optional"}
                        </span>
                        {socialUrlErrors[field.key] && (
                          <span
                            id={`${field.key}-error`}
                            role="alert"
                            className="mt-1 block text-xs font-medium text-rose-200"
                          >
                            {socialUrlErrors[field.key]}
                          </span>
                        )}
                      </label>
                    ))}
                  </div>
                </fieldset>

                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-teal-300/15 bg-teal-300/[0.04] p-4">
                  <input
                    type="checkbox"
                    checked={publicProfileConsent}
                    onChange={(event) => setPublicProfileConsent(event.target.checked)}
                    className="mt-0.5 h-4 w-4 accent-teal-300"
                  />
                  <span className="text-xs leading-5 text-slate-300">
                    If approved, KIOH may display my submitted professional profile in the public mentor directory. This is optional; I can still receive a verified Navigator badge on my account without being listed.
                  </span>
                </label>

                <button
                  type="submit"
                  disabled={
                    isSubmitting ||
                    selectedSpecialties.length === 0 ||
                    !availableDays.length ||
                    !isAuthenticated
                  }
                  className="min-h-12 w-full rounded-full bg-gradient-to-r from-emerald-300 to-teal-400 py-3.5 text-sm font-bold text-slate-950 shadow-lg shadow-teal-500/20 transition hover:brightness-105 disabled:opacity-50"
                >
                  {isSubmitting
                    ? "Submitting Application..."
                    : "Submit Navigator Application →"}
                </button>
              </form>
            )}
          </div>
        </div>
      </section>
      </ScrollReveal>

      <Footer />
    </main>
  );
}