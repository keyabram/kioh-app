"use client";

import { startTransition, useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowRightIcon,
  BuildingOffice2Icon,
  CheckCircleIcon,
  EnvelopeIcon,
  MapPinIcon,
  UserIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

type RoleType = "builder" | "mentor" | "donor" | "partner";

interface JoinModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultRole?: RoleType;
}

const roleOptions: { id: RoleType; label: string }[] = [
  { id: "builder", label: "Builder" },
  { id: "mentor", label: "Mentor" },
  { id: "donor", label: "Funder" },
  { id: "partner", label: "Partner" },
];

const interestLabels: Record<RoleType, string> = {
  builder: "What are you looking to build or learn?",
  mentor: "Which areas can you mentor in?",
  donor: "What kind of program or impact would you like to fund?",
  partner: "What would a partnership with KIOH look like?",
};

export default function JoinModal({
  isOpen,
  onClose,
  defaultRole = "builder",
}: JoinModalProps) {
  const [selectedRole, setSelectedRole] = useState<RoleType>(defaultRole);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    organization: "",
    location: "Nairobi",
    interest: "",
    publicOrganizationConsent: false,
  });
  const reduceMotion = useReducedMotion();

  const close = useCallback(() => {
    if (loading) return;
    setFormData((previous) => ({
      ...previous,
      publicOrganizationConsent: false,
    }));
    onClose();
  }, [loading, onClose]);

  useEffect(() => {
    if (!isOpen) return;

    startTransition(() => setSelectedRole(defaultRole));
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [close, defaultRole, isOpen]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, role: selectedRole }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || "Unable to submit your enquiry.");
      }
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

  const finish = () => {
    setSubmitted(false);
    setError("");
    setFormData({
      fullName: "",
      email: "",
      organization: "",
      location: "Nairobi",
      interest: "",
      publicOrganizationConsent: false,
    });
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center sm:p-4"
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="presentation"
        >
          <button
            type="button"
            aria-label="Close enquiry form"
            onClick={close}
            className="fixed inset-0 cursor-default bg-slate-950/75 backdrop-blur-md"
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="join-dialog-title"
            initial={reduceMotion ? false : { opacity: 0, y: 28, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: 20, scale: 0.98 }}
            transition={{ duration: 0.22 }}
            className="relative flex max-h-[92dvh] w-full max-w-xl flex-col overflow-hidden rounded-t-3xl border border-white/15 bg-slate-900 p-5 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl sm:max-h-[min(90dvh,800px)] sm:rounded-3xl sm:p-8"
          >
            <button
              type="button"
              onClick={close}
              aria-label="Close"
              className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-300 transition hover:bg-white/10"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>

            {submitted ? (
              <div className="my-auto overflow-y-auto py-8 text-center">
                <CheckCircleIcon className="mx-auto h-14 w-14 text-emerald-400" />
                <h3 id="join-dialog-title" className="mt-5 text-2xl font-bold text-white">
                  Enquiry received
                </h3>
                <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-300">
                  Thanks, {formData.fullName}. Your {selectedRole} enquiry is recorded. We appreciate your interest in building with KIOH.
                </p>
                <button
                  type="button"
                  onClick={finish}
                  className="mt-6 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-emerald-300 px-6 py-3 text-sm font-bold text-slate-950 transition hover:bg-emerald-200"
                >
                  Done <ArrowRightIcon className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <>
                <div className="shrink-0 border-b border-white/10 pb-4 pr-10">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300">
                    {selectedRole === "donor"
                      ? "Funding conversations"
                      : "Build a stronger innovation ecosystem"}
                  </p>
                  <h3 id="join-dialog-title" className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">
                    {selectedRole === "donor"
                      ? "Discuss a funding program"
                      : selectedRole === "mentor"
                      ? "Explore mentorship"
                      : selectedRole === "partner"
                      ? "Start a partnership"
                      : "Start a conversation."}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    {selectedRole === "donor"
                      ? "Share who you want to support, the outcomes you care about, and any funding priorities."
                      : "Tell us what you care about. We’ll use your details to follow up on this enquiry."}
                  </p>
                </div>

                {defaultRole === "builder" && (
                  <div className="mt-4 grid shrink-0 grid-cols-2 gap-2 sm:grid-cols-4">
                    {roleOptions.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        aria-pressed={selectedRole === option.id}
                        onClick={() => setSelectedRole(option.id)}
                        className={`min-h-11 rounded-xl border px-3 py-2 text-sm font-semibold transition active:scale-[0.98] ${
                          selectedRole === option.id
                            ? "border-emerald-300/50 bg-emerald-300/10 text-emerald-200"
                            : "border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/[0.07]"
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="mt-4 flex min-h-0 flex-1 flex-col">
                  <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain pr-1">
                    {error && (
                      <p role="alert" className="rounded-xl border border-rose-400/25 bg-rose-400/10 p-3 text-sm text-rose-200">
                        {error}
                      </p>
                    )}
                    {selectedRole === "partner" && (
                      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-emerald-200/15 bg-emerald-200/[0.04] p-3.5">
                        <input
                          type="checkbox"
                          checked={formData.publicOrganizationConsent}
                          onChange={(event) =>
                            setFormData({
                              ...formData,
                              publicOrganizationConsent: event.target.checked,
                            })
                          }
                          className="mt-0.5 h-4 w-4 accent-emerald-300"
                        />
                        <span className="text-xs leading-5 text-slate-300">
                          If approved, KIOH may display my organization’s name with a verified partner badge.
                        </span>
                      </label>
                    )}
                  <label className="block">
                    <span className="text-xs font-semibold text-slate-300">Full name</span>
                    <span className="relative mt-1.5 block">
                      <UserIcon className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
                      <input
                        autoComplete="name"
                        required
                        minLength={2}
                        maxLength={120}
                        value={formData.fullName}
                        onChange={(event) => setFormData({ ...formData, fullName: event.target.value })}
                        placeholder="Your name"
                        className="min-h-12 w-full rounded-xl border border-white/10 bg-white/[0.03] py-3 pl-11 pr-3.5 text-sm text-white placeholder-slate-500 focus:border-emerald-300 focus:outline-none"
                      />
                    </span>
                  </label>

                  <label className="block">
                    <span className="text-xs font-semibold text-slate-300">Work email</span>
                    <span className="relative mt-1.5 block">
                      <EnvelopeIcon className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
                      <input
                        type="email"
                        autoComplete="email"
                        inputMode="email"
                        required
                        maxLength={254}
                        value={formData.email}
                        onChange={(event) => setFormData({ ...formData, email: event.target.value })}
                        placeholder="you@organization.org"
                        className="min-h-12 w-full rounded-xl border border-white/10 bg-white/[0.03] py-3 pl-11 pr-3.5 text-sm text-white placeholder-slate-500 focus:border-emerald-300 focus:outline-none"
                      />
                    </span>
                  </label>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block">
                      <span className="text-xs font-semibold text-slate-300">
                        Organization{" "}
                        {selectedRole === "partner" ? (
                          <span className="font-normal text-slate-400">(required for verification)</span>
                        ) : (
                          <span className="font-normal text-slate-500">(optional)</span>
                        )}
                      </span>
                      <span className="relative mt-1.5 block">
                        <BuildingOffice2Icon className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
                        <input
                          autoComplete="organization"
                          required={selectedRole === "partner"}
                          maxLength={160}
                          value={formData.organization}
                          onChange={(event) => setFormData({ ...formData, organization: event.target.value })}
                          placeholder="Company or institution"
                          className="min-h-12 w-full rounded-xl border border-white/10 bg-white/[0.03] py-3 pl-11 pr-3.5 text-sm text-white placeholder-slate-500 focus:border-emerald-300 focus:outline-none"
                        />
                      </span>
                    </label>
                    <label className="block">
                      <span className="text-xs font-semibold text-slate-300">Location</span>
                      <span className="relative mt-1.5 block">
                        <MapPinIcon className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
                        <input
                          required
                          maxLength={100}
                          value={formData.location}
                          onChange={(event) => setFormData({ ...formData, location: event.target.value })}
                          placeholder="County or country"
                          className="min-h-12 w-full rounded-xl border border-white/10 bg-white/[0.03] py-3 pl-11 pr-3.5 text-sm text-white placeholder-slate-500 focus:border-emerald-300 focus:outline-none"
                        />
                      </span>
                    </label>
                  </div>

                  <label className="block">
                    <span className="text-xs font-semibold text-slate-300">{interestLabels[selectedRole]}</span>
                    <textarea
                      required
                      minLength={10}
                      maxLength={2000}
                      rows={selectedRole === "donor" ? 5 : 4}
                      value={formData.interest}
                      onChange={(event) => setFormData({ ...formData, interest: event.target.value })}
                      placeholder={
                        selectedRole === "donor"
                          ? "Describe the people or communities you want to reach, the outcomes you hope to fund, and any priorities or timeline..."
                          : "A few sentences is enough to get started..."
                      }
                      className="mt-1.5 w-full resize-y rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-3 text-sm leading-6 text-white placeholder-slate-500 focus:border-emerald-300 focus:outline-none"
                    />
                  </label>
                  </div>
                  <div className="mt-4 shrink-0 border-t border-white/10 bg-slate-900 pt-4">
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-300 to-teal-400 px-5 py-3 text-sm font-bold text-slate-950 shadow-lg shadow-emerald-900/20 transition hover:brightness-105 disabled:cursor-wait disabled:opacity-60"
                    >
                      {loading
                        ? "Sending your enquiry…"
                        : selectedRole === "donor"
                        ? "Send funding enquiry"
                        : "Send enquiry"}
                      {!loading && <ArrowRightIcon className="h-4 w-4" />}
                    </button>
                    <p className="mt-2 text-center text-[11px] leading-5 text-slate-500">
                      Your information is used only to follow up on this KIOH enquiry.
                    </p>
                  </div>
                </form>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
