"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSession, signOut } from "next-auth/react";
import { Bars3Icon, XMarkIcon, ChevronDownIcon, Squares2X2Icon, UserCircleIcon } from "@heroicons/react/24/outline";
import AuthModal from "./AuthModal";
import NotificationMenu from "./NotificationMenu";
import { UserProfile } from "@/server/types";

interface HeaderProps {
  currentUser: UserProfile | null;
  onLoginSuccess?: (user: UserProfile) => void;
  onLogout?: () => void;
  onOpenProfile?: () => void;
  authOpen?: boolean;
  onAuthOpenChange?: (open: boolean) => void;
  redirectOnLogin?: string;
  hideAccountActions?: boolean;
}

export default function Header({
  currentUser,
  onLoginSuccess,
  onLogout,
  onOpenProfile,
  authOpen: controlledAuthOpen,
  onAuthOpenChange,
  redirectOnLogin = "/dashboard",
  hideAccountActions = false,
}: HeaderProps) {
  const { data: session, status } = useSession();
  const [localAuthOpen, setLocalAuthOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [signOutError, setSignOutError] = useState("");
  const isAuthOpen = controlledAuthOpen ?? localAuthOpen;
  const setIsAuthOpen = onAuthOpenChange ?? setLocalAuthOpen;

  // Derive active user from Google NextAuth session OR client state
  const nextAuthUser = session?.user;
  const activeUser =
    currentUser ||
    (nextAuthUser
      ? {
          id: nextAuthUser.id || "google-user",
          fullName: nextAuthUser.name || "User",
          email: nextAuthUser.email || "",
          avatar:
            nextAuthUser.image ||
            "https://api.dicebear.com/7.x/avataaars/svg?seed=User",
          role: "participant" as const,
          isEmailVerified: true,
          navigatorVerified: nextAuthUser.navigatorVerified === true,
          createdAt: new Date(),
        }
      : null);

  // Complete Sign-Out Handler
  const handleSignOutUser = async () => {
    setIsUserMenuOpen(false);
    setSignOutError("");
    try {
      if (status === "authenticated") {
        await signOut({ redirectTo: "/" });
      }
      onLogout?.();
    } catch (error) {
      console.error("[SIGN_OUT_ERROR]:", error);
      setSignOutError("Could not sign out. Please try again.");
    }
  };

  return (
    <>
      <header className="sticky top-0 z-50 px-3 pt-3 sm:px-6 sm:pt-4 lg:px-8">
        <nav className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 shadow-2xl shadow-black/30 backdrop-blur-2xl sm:px-6">
          <Link
            href="/"
            aria-label="KIOH Hub home"
            className="group flex shrink-0 items-center rounded-xl bg-slate-950 px-2 py-1 shadow-sm transition-transform duration-300 hover:scale-[1.02]"
          >
            <Image
              src="/KIOH_Logo_Shield_Chevron.svg"
              alt="KIOH Hub — Kenya Opportunity Hub, National Innovation Pipeline"
              width={340}
              height={110}
              priority
              className="h-auto w-[140px] min-[380px]:w-[160px] sm:w-[180px]"
            />
          </Link>

          <div className="hidden items-center gap-4 xl:flex">
            <Link href="/#identity" className="text-sm text-slate-300 transition hover:text-emerald-200">
              About Us
            </Link>
            <Link href="/#opportunities" className="text-sm text-slate-300 transition hover:text-emerald-200">
              Scholarships & Funding
            </Link>
            <Link href="/showcase" className="text-sm text-slate-300 transition hover:text-emerald-200">
              Ventures
            </Link>
            <Link href="/#mentorship" className="text-sm text-slate-300 transition hover:text-emerald-200">
              Mentorship
            </Link>
            <Link href="/#stakeholders" className="text-sm text-slate-300 transition hover:text-emerald-200">
              Partners & Donors
            </Link>
            <Link href="/#journey" className="text-sm text-slate-300 transition hover:text-emerald-200">
              Roadmap 2045
            </Link>
            <Link href="/contact" className="text-sm text-slate-300 transition hover:text-emerald-200">
              Contact Us
            </Link>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <Link
              href="/apply-mentor"
              className="hidden rounded-full border border-emerald-300/25 bg-emerald-300/10 px-4 py-2.5 text-xs font-bold text-emerald-100 transition hover:bg-emerald-300 hover:text-slate-950 sm:inline-flex"
            >
              Become a Mentor
            </Link>

            {!hideAccountActions && (activeUser ? (
              <div className="relative">
                {session?.user?.id && <NotificationMenu />}
                <button
                  type="button"
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  aria-expanded={isUserMenuOpen}
                  aria-label={`Open account menu for ${activeUser.fullName}`}
                  className="flex min-h-11 items-center gap-2 rounded-full border border-emerald-300/25 bg-emerald-300/10 py-1.5 pl-1.5 pr-3 text-xs font-semibold text-emerald-100 transition hover:bg-emerald-300/20 sm:gap-2.5 sm:pl-2 sm:pr-4"
                >
                  <img
                    src={activeUser.avatar}
                    alt={activeUser.fullName}
                    className="h-8 w-8 rounded-full border border-emerald-300/40 bg-slate-800 object-cover"
                  />
                  <span className="hidden max-w-24 truncate sm:block">{activeUser.fullName}</span>
                  <ChevronDownIcon aria-hidden="true" className={`h-4 w-4 transition-transform ${isUserMenuOpen ? "rotate-180" : ""}`} />
                </button>

                {isUserMenuOpen && (
                  <div className="absolute right-0 mt-3 w-52 rounded-2xl border border-white/15 bg-slate-900/95 p-2 shadow-2xl backdrop-blur-xl">
                    <div className="border-b border-white/10 px-3 py-2">
                      <p className="text-xs font-bold text-white">{activeUser.fullName}</p>
                      <p className="text-[10px] text-teal-300 uppercase font-mono">{activeUser.role}</p>
                    </div>
                    {signOutError && (
                      <p role="alert" className="px-3 py-2 text-xs text-rose-300">
                        {signOutError}
                      </p>
                    )}

                    <div className="py-1">
                      <Link
                        href="/dashboard"
                        onClick={() => setIsUserMenuOpen(false)}
                        className="flex min-h-11 w-full items-center rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-white/5 hover:text-white"
                      >
                        <Squares2X2Icon aria-hidden="true" className="mr-2 h-4 w-4" /> Dashboard
                      </Link>
                      <button
                        type="button"
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          onOpenProfile?.();
                        }}
                        className="min-h-11 w-full rounded-lg px-3 py-2 text-left text-sm text-slate-300 hover:bg-white/5 hover:text-white"
                      >
                        <UserCircleIcon aria-hidden="true" className="mr-2 inline h-4 w-4" /> Edit Profile
                      </button>

                      {/* Sign Out Button */}
                      <button
                        type="button"
                        onClick={handleSignOutUser}
                        className="min-h-11 w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-rose-400 hover:bg-rose-500/10"
                      >
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsAuthOpen(true)}
                className="min-h-11 rounded-full border border-emerald-300/25 bg-emerald-300/10 px-4 py-2.5 text-xs font-semibold text-emerald-100 backdrop-blur-md transition duration-300 hover:bg-emerald-300/20 sm:px-5 sm:text-sm"
              >
                <span className="sm:hidden">Sign in</span>
                <span className="hidden sm:inline">Sign In / Join</span>
              </button>
            ))}

            <button
              type="button"
              onClick={() => setIsMobileNavOpen((open) => !open)}
              aria-label={isMobileNavOpen ? "Close navigation menu" : "Open navigation menu"}
              aria-expanded={isMobileNavOpen}
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/5 text-lg text-white transition hover:bg-white/10 xl:hidden"
            >
              {isMobileNavOpen ? (
                <XMarkIcon className="h-6 w-6" aria-hidden="true" />
              ) : (
                <Bars3Icon className="h-6 w-6" aria-hidden="true" />
              )}
            </button>
          </div>

          {isMobileNavOpen && (
            <div className="grid w-full grid-cols-2 gap-2 border-t border-white/10 pt-3 xl:hidden">
              {[
                ["About Us", "/#identity"],
                ["Scholarships & Funding", "/#opportunities"],
                ["Venture showcase", "/showcase"],
                ["Mentorship", "/#mentorship"],
                ["Partners & Donors", "/#stakeholders"],
                ["Roadmap 2045", "/#journey"],
                ["Contact Us", "/contact"],
                ["Become a Mentor", "/apply-mentor"],
              ].map(([label, href]) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setIsMobileNavOpen(false)}
                  className="flex min-h-11 items-center rounded-xl px-3 text-sm text-slate-300 transition hover:bg-white/5 hover:text-emerald-100"
                >
                  {label}
                </Link>
              ))}
            </div>
          )}
        </nav>
      </header>

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        redirectTo={redirectOnLogin}
        onLoginSuccess={(user) => {
          onLoginSuccess?.(user);
          setIsAuthOpen(false);
        }}
      />
    </>
  );
}