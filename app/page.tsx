"use client";

import { useState, useEffect, startTransition } from "react";
import { useSession } from "next-auth/react";
import BackgroundCanvas from "@/components/BackgroundCanvas";
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import AboutIdentity from "@/components/AboutIdentity";
import OpportunityBoard from "@/components/OpportunityBoard";
import MentorshipSection from "@/components/MentorshipSection";
import StakeholdersSection from "@/components/StakeholdersSection";
import EcosystemNetwork from "@/components/EcosystemNetwork";
import JourneyRoadmap from "@/components/JourneyRoadmap";
import Footer from "@/components/Footer";
import JoinModal from "@/components/JoinModal";
import ProfileSetupModal from "@/components/ProfileSetupModal";
import ScrollReveal from "@/components/ScrollReveal";
import { UserProfile } from "@/server/types";

export default function Home() {
  const { data: session, status, update: updateSession } = useSession();
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [verificationNotice, setVerificationNotice] = useState<{
    success: boolean;
    text: string;
  } | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const verification = params.get("verified");
    const error = params.get("error");
    if (verification === "true") {
      startTransition(() => {
        setVerificationNotice({
          success: true,
          text: "Your email is verified. You can now sign in to KIOH.",
        });
      });
    } else if (error) {
      const messages: Record<string, string> = {
        invalid_verification_link: "That verification link is incomplete.",
        token_expired_or_invalid:
          "That verification link has expired or was already used. Request a new one from the sign-in window.",
        verification_failed:
          "We could not verify your email right now. Please try again.",
      };
      startTransition(() => {
        setVerificationNotice({
          success: false,
          text: messages[error] || "Email verification could not be completed.",
        });
      });
    }
    if (verification || error) {
      window.history.replaceState(
        {},
        "",
        `${window.location.pathname}${window.location.hash}`
      );
    }
  }, []);

  // Synchronize Google session with local UserProfile state
  useEffect(() => {
    if (status === "authenticated" && session?.user) {
      const profile: UserProfile = {
        id: session.user.id,
        fullName: session.user.name || "Innovator",
        email: session.user.email || "",
        avatar: session.user.image || "https://api.dicebear.com/7.x/avataaars/svg?seed=KIOH",
        role: session.user.role,
        navigatorVerified: session.user.navigatorVerified,
        isEmailVerified: true,
        bio: session.user.bio || "",
        location: session.user.location || "",
        organization: session.user.organization || "",
        careerStage: session.user.careerStage || "other",
        skills: session.user.skills || [],
        interests: session.user.interests || [],
        experience: session.user.experience || "",
        goals: session.user.goals || "",
        supportNeeds: session.user.supportNeeds || [],
        createdAt: new Date(),
      };

      // Check if extended Google profile needs setup
      const hasCompletedSetup = localStorage.getItem(`profile_setup_${profile.email}`);
      startTransition(() => {
        setCurrentUser(profile);
        if (!hasCompletedSetup && (!profile.location || !profile.organization)) {
          setIsProfileModalOpen(true);
        }
      });
    }
  }, [session, status]);

  const handleUserLogin = (user: UserProfile) => {
    setCurrentUser(user);
    if (!user.location || !user.organization) {
      setIsProfileModalOpen(true);
    }
  };

  const handleProfileSave = async (updatedUser: UserProfile) => {
    setCurrentUser(updatedUser);
    localStorage.setItem(`profile_setup_${updatedUser.email}`, "true");

    // Persist changes back into NextAuth session
    if (status === "authenticated") {
      await updateSession({
        role: updatedUser.role,
        location: updatedUser.location,
        bio: updatedUser.bio,
        organization: updatedUser.organization,
        careerStage: updatedUser.careerStage,
        skills: updatedUser.skills,
        interests: updatedUser.interests,
        experience: updatedUser.experience,
        goals: updatedUser.goals,
        supportNeeds: updatedUser.supportNeeds,
      });
    }

    setIsProfileModalOpen(false);
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950 text-white selection:bg-teal-500/30">
      <BackgroundCanvas />

      <Header
        currentUser={currentUser}
        onLoginSuccess={handleUserLogin}
        onLogout={() => {
          setCurrentUser(null);
        }}
        onOpenProfile={() => setIsProfileModalOpen(true)}
        onContactOpen={() => setIsContactModalOpen(true)}
        authOpen={isAuthModalOpen}
        onAuthOpenChange={setIsAuthModalOpen}
      />

      {verificationNotice && (
        <div
          role={verificationNotice.success ? "status" : "alert"}
          className={`relative z-10 mx-4 mt-3 rounded-2xl border p-4 text-sm sm:mx-auto sm:max-w-3xl ${
            verificationNotice.success
              ? "border-emerald-300/30 bg-emerald-300/10 text-emerald-100"
              : "border-rose-300/30 bg-rose-300/10 text-rose-100"
          }`}
        >
          <div className="flex items-start justify-between gap-4">
            <p>{verificationNotice.text}</p>
            <button
              type="button"
              aria-label="Dismiss verification message"
              onClick={() => setVerificationNotice(null)}
              className="min-h-8 min-w-8 rounded-lg text-current hover:bg-white/10"
            >
              ×
            </button>
          </div>
        </div>
      )}

      <Hero />
      <ScrollReveal><AboutIdentity /></ScrollReveal>
      <ScrollReveal>
        <OpportunityBoard
          currentUser={currentUser}
          onRequestSignIn={() => setIsAuthModalOpen(true)}
        />
      </ScrollReveal>
      <ScrollReveal><MentorshipSection /></ScrollReveal>
      <ScrollReveal><StakeholdersSection /></ScrollReveal>
      <ScrollReveal><EcosystemNetwork /></ScrollReveal>
      <ScrollReveal><JourneyRoadmap /></ScrollReveal>
      <Footer onContactOpen={() => setIsContactModalOpen(true)} />

      <JoinModal
        isOpen={isContactModalOpen}
        onClose={() => setIsContactModalOpen(false)}
        defaultRole="builder"
      />

      {/* Profile Onboarding / Editing Modal */}
      {currentUser && (
        <ProfileSetupModal
          user={currentUser}
          isOpen={isProfileModalOpen}
          onClose={() => setIsProfileModalOpen(false)}
          onUpdate={handleProfileSave}
        />
      )}
    </main>
  );
}