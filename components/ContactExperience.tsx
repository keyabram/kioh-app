"use client";

import { useState, type FormEvent } from "react";
import BackgroundCanvas from "@/components/BackgroundCanvas";
import Footer from "@/components/Footer";
import Header from "@/components/Header";

type InquiryRole = "builder" | "mentor" | "donor" | "partner";

const roleOptions: { value: InquiryRole; label: string }[] = [
  { value: "builder", label: "Builder" },
  { value: "mentor", label: "Mentor" },
  { value: "donor", label: "Funder" },
  { value: "partner", label: "Partner" },
];

export default function ContactExperience() {
  const [role, setRole] = useState<InquiryRole | "">("");
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    organization: "",
    location: "",
    interest: "",
    publicOrganizationConsent: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!role) {
      setError("Choose the option that best describes your enquiry.");
      return;
    }
    if (formData.fullName.trim().length < 2) {
      setError("Enter your name using at least 2 characters.");
      return;
    }
    if (role === "partner" && formData.organization.trim().length < 2) {
      setError("Enter your organization’s name using at least 2 characters.");
      return;
    }
    if (!formData.location.trim()) {
      setError("Enter your location so we can understand your context.");
      return;
    }
    if (formData.interest.trim().length < 10) {
      setError("Add at least 10 characters to tell us what you’d like to discuss.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, role }),
      });
      if (!response.headers.get("content-type")?.includes("application/json")) {
        throw new Error(
          "The server returned an unexpected response. Please try again."
        );
      }
      const result: { success?: boolean; message?: string } =
        await response.json();

      if (!response.ok || result.success !== true) {
        throw new Error(
          result.message || "We could not submit your enquiry. Please try again."
        );
      }

      setSuccessMessage(
        result.message || "Your enquiry has been received. Thank you for reaching out."
      );
      setSubmitted(true);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "We could not submit your enquiry. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setRole("");
    setFormData({
      fullName: "",
      email: "",
      organization: "",
      location: "",
      interest: "",
      publicOrganizationConsent: false,
    });
    setError("");
    setSuccessMessage("");
    setSubmitted(false);
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950 text-white selection:bg-teal-500/30">
      <BackgroundCanvas />
      <Header
        currentUser={null}
        redirectOnLogin="/contact"
        hideAccountActions
      />

      <section className="relative z-10 px-4 pb-20 pt-12 sm:px-6 sm:pb-28 sm:pt-16 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <h1 className="text-4xl font-semibold leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl">
              Let’s talk about what comes next.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg sm:leading-8">
              Whether you’re building something, looking for a mentor, or
              exploring ways to support Kenya’s innovation ecosystem, tell us
              what brings you here.
            </p>
          </div>

          <div className="mt-10 grid gap-8 lg:mt-14 lg:grid-cols-[0.8fr_1.2fr] lg:gap-14">
            <div className="pt-2">
              <h2 className="text-xl font-semibold text-white sm:text-2xl">
                A good place to begin
              </h2>
              <p className="mt-4 max-w-md text-sm leading-7 text-slate-300 sm:text-base">
                Share a little about your question or idea. Choose the option
                that fits best so your enquiry is recorded with the right
                context.
              </p>
              <p className="mt-5 max-w-md text-sm leading-7 text-slate-400">
                Choose the closest fit, then use your message to give the team
                any extra context.
              </p>
            </div>

            <div className="surface-card rounded-3xl p-5 sm:p-8 lg:p-9">
              {submitted ? (
                <div
                  aria-live="polite"
                  className="flex min-h-80 flex-col items-start justify-center"
                >
                  <span
                    aria-hidden="true"
                    className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-300/10 text-2xl text-emerald-200"
                  >
                    ✓
                  </span>
                  <h2 className="mt-5 text-2xl font-semibold text-white">
                    Enquiry received
                  </h2>
                  <p className="mt-3 max-w-lg text-sm leading-7 text-slate-300">
                    Thanks, {formData.fullName}. {successMessage}
                  </p>
                  <button
                    type="button"
                    onClick={resetForm}
                    className="mt-7 inline-flex min-h-12 items-center justify-center rounded-xl border border-emerald-200/30 bg-emerald-200/10 px-5 py-3 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-200/15"
                  >
                    Send another enquiry
                  </button>
                </div>
              ) : (
                <>
                  <h2 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                    Send us a message
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    Fields marked required help us follow up on your enquiry.
                  </p>

                  {error && (
                    <p
                      role="alert"
                      className="mt-5 rounded-xl border border-rose-400/25 bg-rose-400/10 p-3 text-sm leading-6 text-rose-200"
                    >
                      {error}
                    </p>
                  )}

                  <form
                    onSubmit={handleSubmit}
                    aria-busy={loading}
                    className="mt-6 space-y-5"
                  >
                    <fieldset disabled={loading} className="space-y-5 disabled:opacity-70">
                      <legend className="sr-only">Your enquiry details</legend>

                      <label className="block">
                        <span className="text-sm font-medium text-slate-200">
                          I’m reaching out as{" "}
                          <span className="text-emerald-200">(required)</span>
                        </span>
                        <select
                          required
                          value={role}
                          onChange={(event) => {
                            setRole(event.target.value as InquiryRole | "");
                            setError("");
                          }}
                          className="mt-2 min-h-12 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-3 text-sm text-white focus:border-emerald-300 focus:outline-none"
                        >
                          <option value="" disabled>
                            Choose the closest fit
                          </option>
                          {roleOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </label>

                      <div className="grid gap-5 sm:grid-cols-2">
                        <label className="block">
                          <span className="text-sm font-medium text-slate-200">
                            Full name{" "}
                            <span className="text-emerald-200">(required)</span>
                          </span>
                          <input
                            name="fullName"
                            autoComplete="name"
                            required
                            minLength={2}
                            maxLength={120}
                            pattern={".*\\S.*"}
                            value={formData.fullName}
                            onChange={(event) =>
                              setFormData({
                                ...formData,
                                fullName: event.target.value,
                              })
                            }
                            placeholder="Your name"
                            className="mt-2 min-h-12 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-3 text-sm text-white placeholder-slate-500 focus:border-emerald-300 focus:outline-none"
                          />
                        </label>

                        <label className="block">
                          <span className="text-sm font-medium text-slate-200">
                            Email address{" "}
                            <span className="text-emerald-200">(required)</span>
                          </span>
                          <input
                            name="email"
                            type="email"
                            autoComplete="email"
                            inputMode="email"
                            required
                            maxLength={254}
                            value={formData.email}
                            onChange={(event) =>
                              setFormData({
                                ...formData,
                                email: event.target.value,
                              })
                            }
                            placeholder="you@example.com"
                            className="mt-2 min-h-12 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-3 text-sm text-white placeholder-slate-500 focus:border-emerald-300 focus:outline-none"
                          />
                        </label>
                      </div>

                      <div className="grid gap-5 sm:grid-cols-2">
                        <label className="block">
                          <span className="text-sm font-medium text-slate-200">
                            Organization{" "}
                            {role === "partner" ? (
                              <span className="text-emerald-200">(required)</span>
                            ) : (
                              <span className="text-slate-400">(optional)</span>
                            )}
                          </span>
                          <input
                            name="organization"
                            autoComplete="organization"
                            required={role === "partner"}
                            minLength={role === "partner" ? 2 : undefined}
                            maxLength={160}
                            pattern={role === "partner" ? ".*\\S.*" : undefined}
                            value={formData.organization}
                            onChange={(event) =>
                              setFormData({
                                ...formData,
                                organization: event.target.value,
                              })
                            }
                            placeholder="Company or institution"
                            className="mt-2 min-h-12 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-3 text-sm text-white placeholder-slate-500 focus:border-emerald-300 focus:outline-none"
                          />
                        </label>

                        <label className="block">
                          <span className="text-sm font-medium text-slate-200">
                            Location{" "}
                            <span className="text-emerald-200">(required)</span>
                          </span>
                          <input
                            name="location"
                            autoComplete="address-level2"
                            required
                            maxLength={100}
                            pattern={".*\\S.*"}
                            value={formData.location}
                            onChange={(event) =>
                              setFormData({
                                ...formData,
                                location: event.target.value,
                              })
                            }
                            placeholder="County or country"
                            className="mt-2 min-h-12 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-3 text-sm text-white placeholder-slate-500 focus:border-emerald-300 focus:outline-none"
                          />
                        </label>
                      </div>

                      {role === "partner" && (
                        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-emerald-200/15 bg-emerald-200/[0.04] p-4">
                          <input
                            name="publicOrganizationConsent"
                            type="checkbox"
                            checked={formData.publicOrganizationConsent}
                            onChange={(event) =>
                              setFormData({
                                ...formData,
                                publicOrganizationConsent: event.target.checked,
                              })
                            }
                            className="mt-1 h-4 w-4 accent-emerald-300"
                          />
                          <span className="text-sm leading-6 text-slate-300">
                            If approved, KIOH may display my organization’s name
                            with a verified partner badge.
                          </span>
                        </label>
                      )}

                      <label className="block">
                        <span className="text-sm font-medium text-slate-200">
                          What would you like to talk about?{" "}
                          <span className="text-emerald-200">(required)</span>
                        </span>
                        <textarea
                          name="interest"
                          required
                          minLength={10}
                          maxLength={2000}
                          rows={5}
                          value={formData.interest}
                          onChange={(event) =>
                            setFormData({
                              ...formData,
                              interest: event.target.value,
                            })
                          }
                          placeholder="Share a few details so we understand how to help."
                          className="mt-2 w-full resize-y rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-3 text-sm leading-6 text-white placeholder-slate-500 focus:border-emerald-300 focus:outline-none"
                        />
                      </label>
                    </fieldset>

                    <button
                      type="submit"
                      disabled={loading}
                      className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-300 to-teal-400 px-5 py-3 text-sm font-bold text-slate-950 shadow-lg shadow-emerald-900/20 transition hover:brightness-105 disabled:cursor-wait disabled:opacity-60"
                    >
                      {loading ? "Sending your enquiry…" : "Send enquiry"}
                      {!loading && <span aria-hidden="true">→</span>}
                    </button>
                    <p className="text-center text-xs leading-5 text-slate-400">
                      Your information is used only to follow up on this KIOH
                      enquiry.
                    </p>
                  </form>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
