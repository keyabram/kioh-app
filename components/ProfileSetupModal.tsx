"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { CareerStage, UserProfile, UserRole } from "@/server/types";

interface ProfileSetupProps {
  user: UserProfile;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (updatedUser: UserProfile) => void;
}

export default function ProfileSetupModal({
  user,
  isOpen,
  onClose,
  onUpdate,
}: ProfileSetupProps) {
  const [role, setRole] = useState<UserRole>(user.role || "participant");
  const [location, setLocation] = useState(user.location || "");
  const [organization, setOrganization] = useState(user.organization || "");
  const [bio, setBio] = useState(user.bio || "");
  const [careerStage, setCareerStage] = useState<CareerStage>(
    user.careerStage || "other"
  );
  const [skillsText, setSkillsText] = useState(user.skills?.join(", ") || "");
  const [interestsText, setInterestsText] = useState(
    user.interests?.join(", ") || ""
  );
  const [experience, setExperience] = useState(user.experience || "");
  const [goals, setGoals] = useState(user.goals || "");
  const [supportNeedsText, setSupportNeedsText] = useState(
    user.supportNeeds?.join(", ") || ""
  );
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage("");

    try {
      // Call API endpoint to persist update to database
      const response = await fetch("/api/auth/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role,
          location,
          organization,
          bio,
          careerStage,
          skills: skillsText.split(",").map((item) => item.trim()).filter(Boolean),
          interests: interestsText.split(",").map((item) => item.trim()).filter(Boolean),
          experience,
          goals,
          supportNeeds: supportNeedsText.split(",").map((item) => item.trim()).filter(Boolean),
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || "Failed to update profile.");
      }

      onUpdate(result.user as UserProfile);
    } catch (error) {
      console.error("Failed to update profile:", error);
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to update profile."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4"
      initial={reduceMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      role="presentation"
    >
      {/* Backdrop */}
      <button type="button" aria-label="Close profile dialog" onClick={onClose} className="fixed inset-0 cursor-default bg-slate-950/80 backdrop-blur-md" />

      {/* Modal Container */}
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-dialog-title"
        initial={reduceMotion ? false : { opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.22 }}
        className="relative max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-white/15 bg-slate-900 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl sm:rounded-3xl sm:p-8"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-300 hover:text-white sm:right-5 sm:top-5"
        >
          ✕
        </button>

        <div className="flex items-center gap-3">
          <img
            src={user.avatar}
            alt={user.fullName}
            className="h-12 w-12 rounded-full border-2 border-teal-400/50 bg-slate-800 object-cover"
          />
          <div>
            <h3 id="profile-dialog-title" className="pr-10 text-xl font-bold text-white">Complete Your Profile</h3>
            <p className="text-xs text-teal-300 font-mono">{user.email}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {errorMessage && (
            <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
              {errorMessage}
            </p>
          )}
          {/* Role Selection */}
          <div>
            <label className="block text-[11px] font-medium uppercase tracking-wider text-slate-400">
              Ecosystem Role
            </label>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {[
                { id: "participant", label: "Participant", desc: "Student & Builder" },
                { id: "navigator", label: "Navigator", desc: "Guide & Mentor" },
              ].map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setRole(r.id as UserRole)}
                  className={`rounded-2xl border p-3 text-left transition ${
                    role === r.id
                      ? "border-teal-400 bg-teal-400/10 text-white"
                      : "border-white/10 bg-white/5 text-slate-400"
                  }`}
                >
                  <p className="text-xs font-bold">{r.label}</p>
                  <p className="text-[10px] text-slate-400">{r.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Location & County */}
          <div>
            <label className="block text-xs font-medium text-slate-300">County / Location</label>
            <input
              type="text"
              required
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Kiambu, Nairobi, Machakos"
              className="mt-1 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-teal-400 focus:outline-none"
            />
          </div>

          {/* University / Organization */}
          <div>
            <label className="block text-xs font-medium text-slate-300">
              Institution or Organization
            </label>
            <input
              type="text"
              required
              value={organization}
              onChange={(e) => setOrganization(e.target.value)}
              placeholder="e.g. JKUAT, University of Nairobi, Independent"
              className="mt-1 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-teal-400 focus:outline-none"
            />
          </div>

          {/* Bio / Key Skills */}
          <div>
            <label className="block text-xs font-medium text-slate-300">Short Bio & Focus Area</label>
            <textarea
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Describe what you are building or learning (e.g. Full-Stack Web, AgriTech, FinTech)..."
              className="mt-1 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-teal-400 focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="career-stage" className="block text-xs font-medium text-slate-300">
              Current stage
            </label>
            <select
              id="career-stage"
              value={careerStage}
              onChange={(event) => setCareerStage(event.target.value as CareerStage)}
              className="mt-1 w-full rounded-xl border border-white/10 bg-slate-900 px-3.5 py-2.5 text-sm text-white focus:border-teal-400 focus:outline-none"
            >
              <option value="student">Student or young person</option>
              <option value="graduate">Graduate or skilled job seeker</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label htmlFor="profile-skills" className="block text-xs font-medium text-slate-300">
              Skills
            </label>
            <input
              id="profile-skills"
              value={skillsText}
              onChange={(event) => setSkillsText(event.target.value)}
              placeholder="e.g. data analysis, design, project management"
              className="mt-1 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-teal-400 focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="profile-interests" className="block text-xs font-medium text-slate-300">
              Areas of interest
            </label>
            <input
              id="profile-interests"
              value={interestsText}
              onChange={(event) => setInterestsText(event.target.value)}
              placeholder="e.g. climate, health, technology, agriculture"
              className="mt-1 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-teal-400 focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="profile-experience" className="block text-xs font-medium text-slate-300">
              Experience so far
            </label>
            <textarea
              id="profile-experience"
              rows={2}
              value={experience}
              onChange={(event) => setExperience(event.target.value)}
              placeholder="Work, volunteering, projects, research, or practical experience"
              className="mt-1 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-teal-400 focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="profile-goals" className="block text-xs font-medium text-slate-300">
              What are you working toward?
            </label>
            <textarea
              id="profile-goals"
              rows={2}
              value={goals}
              onChange={(event) => setGoals(event.target.value)}
              placeholder="Describe the opportunity or outcome you want next"
              className="mt-1 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-teal-400 focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="profile-support" className="block text-xs font-medium text-slate-300">
              Support you are looking for
            </label>
            <input
              id="profile-support"
              value={supportNeedsText}
              onChange={(event) => setSupportNeedsText(event.target.value)}
              placeholder="e.g. mentorship, funding, training, collaborators"
              className="mt-1 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-teal-400 focus:outline-none"
            />
          </div>

          {/* Actions */}
          <div className="mt-6 flex flex-col-reverse items-stretch justify-end gap-3 pt-2 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={onClose}
              className="min-h-11 rounded-full border border-white/10 px-5 py-2.5 text-xs font-semibold text-slate-400 hover:text-white"
            >
              Skip for Now
            </button>
            <button
              type="submit"
              disabled={loading}
              className="min-h-11 rounded-full bg-gradient-to-r from-emerald-300 to-teal-400 px-7 py-2.5 text-xs font-bold text-slate-950 shadow-lg shadow-teal-500/20 transition hover:brightness-105 disabled:opacity-50"
            >
              {loading ? "Saving..." : "Save & Complete Setup →"}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}