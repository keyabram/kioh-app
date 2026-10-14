"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import BackgroundCanvas from "@/components/BackgroundCanvas";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import JoinModal from "@/components/JoinModal";
import OpportunityBoard from "@/components/OpportunityBoard";
import type { UserProfile } from "@/server/types";

export default function OpportunitiesPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isContactOpen, setIsContactOpen] = useState(false);
  const sessionUser: UserProfile | null = session?.user
    ? {
        id: session.user.id,
        fullName: session.user.name || "Innovator",
        email: session.user.email || "",
        avatar:
          session.user.image ||
          "https://api.dicebear.com/7.x/avataaars/svg?seed=KIOH",
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
      }
    : null;
  const activeUser = currentUser ?? sessionUser;

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950 text-white selection:bg-teal-500/30">
      <BackgroundCanvas />
      <Header
        currentUser={activeUser}
        onLoginSuccess={setCurrentUser}
        onLogout={() => setCurrentUser(null)}
        onOpenProfile={() => router.push("/dashboard?tab=settings")}
        onContactOpen={() => setIsContactOpen(true)}
        authOpen={isAuthOpen}
        onAuthOpenChange={setIsAuthOpen}
      />
      <OpportunityBoard
        currentUser={activeUser}
        onRequestSignIn={() => setIsAuthOpen(true)}
      />
      <Footer onContactOpen={() => setIsContactOpen(true)} />
      <JoinModal
        isOpen={isContactOpen}
        onClose={() => setIsContactOpen(false)}
        defaultRole="builder"
      />
    </main>
  );
}