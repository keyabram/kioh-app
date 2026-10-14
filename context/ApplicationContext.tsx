"use client";

import React, { createContext, useContext, useState, useEffect, startTransition } from "react";
import { useSession } from "next-auth/react";
import { Opportunity } from "@/server/types/opportunity";
import { Mentor } from "@/server/types/mentor";
import type { UploadedDocument } from "@/server/types/uploads";
import { SAVED_OPPORTUNITIES_KEY } from "@/utils/savedOpportunities";

export interface ApplicationDocuments {
  pitchDeck?: UploadedDocument;
  certificates: UploadedDocument[];
}

export interface AppliedOpportunity {
  id: string;
  opportunity: Opportunity;
  appliedAt: string;
  statusUpdatedAt?: string;
  status: "Under Review" | "Shortlisted" | "Accepted" | "Rejected";
  documents?: ApplicationDocuments;
}

export interface BookedSession {
  id: string;
  mentor: Mentor;
  day: string;
  timeSlot: string;
  topic: string;
  bookedAt: string;
  scheduledAt?: string;
  status: "Upcoming" | "Completed" | "Cancelled";
}

interface ApplicationContextType {
  appliedOpportunities: AppliedOpportunity[];
  bookedSessions: BookedSession[];
  savedOpportunityIds: string[];
  savedOpportunitiesLoading: boolean;
  setOpportunitySaved: (
    opportunityId: string,
    isSaved: boolean
  ) => Promise<void>;
  applyToOpportunity: (
    opportunity: Opportunity,
    documents?: ApplicationDocuments
  ) => Promise<{ confirmationEmailSent: boolean }>;
  hasAppliedToOpportunity: (opportunityId: string) => boolean;
  bookMentorSession: (
    mentor: Mentor,
    day: string,
    timeSlot: string,
    topic: string
  ) => Promise<BookedSession>;
  hasBookedMentor: (mentorId: string) => boolean;
}

const ApplicationContext = createContext<ApplicationContextType | undefined>(
  undefined
);

const LOCAL_STORAGE_KEY_APPS = "kioh_applied_opportunities";
const LOCAL_STORAGE_KEY_SESSIONS = "kioh_booked_sessions";

function readGuestSavedOpportunityIds() {
  try {
    const storedIds = localStorage.getItem(SAVED_OPPORTUNITIES_KEY);
    if (!storedIds) return [];
    const parsedIds: unknown = JSON.parse(storedIds);
    if (!Array.isArray(parsedIds)) return [];
    return [...new Set(
      parsedIds.filter(
        (id): id is string =>
          typeof id === "string" && id.length > 0 && id.length <= 128
      )
    )].slice(0, 500);
  } catch (error) {
    console.error("Failed to load saved opportunities from this browser:", error);
    return [];
  }
}

function isBookedSession(value: unknown): value is BookedSession {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  const mentor = record.mentor;
  return (
    typeof record.id === "string" &&
    typeof record.day === "string" &&
    typeof record.timeSlot === "string" &&
    typeof record.topic === "string" &&
    typeof record.bookedAt === "string" &&
    (record.scheduledAt === undefined ||
      typeof record.scheduledAt === "string") &&
    (record.status === "Upcoming" ||
      record.status === "Completed" ||
      record.status === "Cancelled") &&
    typeof mentor === "object" &&
    mentor !== null &&
    "id" in mentor &&
    "name" in mentor &&
    "avatar" in mentor &&
    typeof mentor.id === "string" &&
    typeof mentor.name === "string" &&
    typeof mentor.avatar === "string"
  );
}

export const ApplicationProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { data: session, status } = useSession();
  const userId = session?.user?.id;
  const [appliedOpportunities, setAppliedOpportunities] = useState<
    AppliedOpportunity[]
  >([]);
  const [bookedSessions, setBookedSessions] = useState<BookedSession[]>([]);
  const [savedOpportunityIds, setSavedOpportunityIds] = useState<string[]>([]);
  const [savedOpportunityOwner, setSavedOpportunityOwner] = useState<string | null>(
    null
  );
  const [bookedSessionsOwner, setBookedSessionsOwner] = useState<string | null>(
    null
  );
  const sessionOwner = userId || "guest";
  const savedOpportunitiesLoading =
    status === "loading" || savedOpportunityOwner !== sessionOwner;
  const sessionsStorageKey = userId
    ? `${LOCAL_STORAGE_KEY_SESSIONS}:${encodeURIComponent(userId)}`
    : LOCAL_STORAGE_KEY_SESSIONS;

  // Load account applications from MongoDB, retaining local-only guest data.
  useEffect(() => {
    if (status === "loading") return;
    let cancelled = false;

    const loadData = async () => {
      if (userId) {
        setBookedSessions([]);
        setBookedSessionsOwner(sessionOwner);
        try {
          const response = await fetch("/api/mentor-sessions", {
            cache: "no-store",
          });
          const result = await response.json();
          if (!response.ok || !Array.isArray(result.data)) {
            throw new Error(result.message || "Failed to load mentorship sessions.");
          }
          if (!result.data.every(isBookedSession)) {
            throw new Error("Mentorship session data has an invalid format.");
          }
          if (!cancelled) setBookedSessions(result.data);
        } catch (error) {
          if (!cancelled) {
            console.error("Failed to load mentorship sessions:", error);
          }
        }

        try {
          setAppliedOpportunities([]);
          const response = await fetch("/api/applications", { cache: "no-store" });
          const result = await response.json();
          if (!response.ok) {
            throw new Error(result.message || "Failed to load applications.");
          }
          if (!cancelled) setAppliedOpportunities(result.data);
        } catch (error) {
          if (!cancelled) {
            console.error("Failed to load applications:", error);
          }
        }
      } else {
        try {
        const savedSessions = localStorage.getItem(sessionsStorageKey);
        if (savedSessions && !cancelled) {
          const parsedSessions: unknown = JSON.parse(savedSessions);
          if (
            Array.isArray(parsedSessions) &&
            parsedSessions.every(isBookedSession)
          ) {
            setBookedSessions(parsedSessions);
          } else {
            throw new Error("Saved mentorship sessions have an invalid format.");
          }
          setBookedSessionsOwner(sessionOwner);
        } else if (!cancelled) {
          setBookedSessions([]);
          setBookedSessionsOwner(sessionOwner);
        }
          const savedApps = localStorage.getItem(LOCAL_STORAGE_KEY_APPS);
          if (savedApps && !cancelled) {
            setAppliedOpportunities(JSON.parse(savedApps));
          }
        } catch (error) {
          if (!cancelled) {
            console.error("Failed to load saved KIOH data:", error);
          }
        }
      }
    };

    void loadData();
    return () => {
      cancelled = true;
    };
  }, [status, userId, sessionOwner, sessionsStorageKey]);

  useEffect(() => {
    if (status === "loading") return;
    let cancelled = false;

    const loadSavedOpportunities = async () => {
      const guestIds = readGuestSavedOpportunityIds();
      let resolvedIds = guestIds;

      if (userId) {
        try {
          const response = await fetch("/api/saved-opportunities", {
            cache: "no-store",
          });
          const result = await response.json();
          if (!response.ok || !Array.isArray(result.data)) {
            throw new Error(result.message || "Failed to load saved opportunities.");
          }
          const accountIds = result.data.filter(
            (id: unknown): id is string => typeof id === "string"
          );
          resolvedIds = [...new Set([...accountIds, ...guestIds])];

          if (guestIds.length > 0) {
            const syncResponse = await fetch("/api/saved-opportunities", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ opportunityIds: resolvedIds }),
            });
            const syncResult = await syncResponse.json();
            if (!syncResponse.ok || !Array.isArray(syncResult.data)) {
              throw new Error(
                syncResult.message || "Failed to sync browser bookmarks."
              );
            }
            resolvedIds = syncResult.data.filter(
              (id: unknown): id is string => typeof id === "string"
            );
            localStorage.removeItem(SAVED_OPPORTUNITIES_KEY);
          }
        } catch (error) {
          console.error("Failed to sync saved opportunities:", error);
        }
      }

      if (!cancelled) {
        startTransition(() => {
          setSavedOpportunityIds(resolvedIds);
          setSavedOpportunityOwner(sessionOwner);
        });
      }
    };

    void loadSavedOpportunities();
    return () => {
      cancelled = true;
    };
  }, [status, userId, sessionOwner]);

  // Keep local storage only for users who are not signed in.
  useEffect(() => {
    if (status === "loading" || userId) return;
    try {
      localStorage.setItem(
        LOCAL_STORAGE_KEY_APPS,
        JSON.stringify(appliedOpportunities)
      );
    } catch (error) {
      console.error("Failed to persist applications:", error);
    }
  }, [appliedOpportunities, status, userId]);

  useEffect(() => {
    if (
      status === "loading" ||
      userId ||
      savedOpportunityOwner !== "guest"
    ) {
      return;
    }
    try {
      localStorage.setItem(
        SAVED_OPPORTUNITIES_KEY,
        JSON.stringify(savedOpportunityIds)
      );
    } catch (error) {
      console.error("Failed to persist saved opportunities:", error);
    }
  }, [savedOpportunityIds, savedOpportunityOwner, status, userId]);

  // Keep local bookings isolated by account on shared browsers.
  useEffect(() => {
    if (
      status === "loading" ||
      bookedSessionsOwner !== sessionOwner
    ) {
      return;
    }
    try {
      localStorage.setItem(
        sessionsStorageKey,
        JSON.stringify(bookedSessions)
      );
    } catch (error) {
      console.error("Failed to persist booked sessions:", error);
    }
  }, [bookedSessions, bookedSessionsOwner, sessionOwner, sessionsStorageKey, status]);

  const applyToOpportunity = async (
    opportunity: Opportunity,
    documents?: ApplicationDocuments
  ) => {
    if (appliedOpportunities.some((a) => a.opportunity.id === opportunity.id)) {
      return { confirmationEmailSent: false };
    }

    if (userId) {
      const response = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          opportunityId: opportunity.id,
          pitchDeckKey: documents?.pitchDeck?.key,
          certificateKeys: documents?.certificates.map((file) => file.key) ?? [],
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || "Failed to submit application.");
      }
      setAppliedOpportunities((prev) => [
        { ...result.data, documents },
        ...prev,
      ]);
      return { confirmationEmailSent: result.confirmationEmailSent === true };
    }

    const newApplication: AppliedOpportunity = {
      id: `app-${Date.now()}`,
      opportunity,
      appliedAt: new Date().toISOString().split("T")[0],
      statusUpdatedAt: new Date().toISOString(),
      status: "Under Review",
    };

    setAppliedOpportunities((prev) => [newApplication, ...prev]);
    return { confirmationEmailSent: false };
  };

  const hasAppliedToOpportunity = (opportunityId: string) => {
    return appliedOpportunities.some((a) => a.opportunity.id === opportunityId);
  };

  const setOpportunitySaved = async (
    opportunityId: string,
    isSaved: boolean
  ) => {
    if (savedOpportunitiesLoading) {
      throw new Error("Saved opportunities are still loading. Please try again.");
    }

    if (userId) {
      const response = await fetch("/api/saved-opportunities", {
        method: isSaved ? "POST" : "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ opportunityId }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || "Could not update saved opportunities.");
      }
    }

    setSavedOpportunityIds((currentIds) => {
      if (isSaved) {
        return currentIds.includes(opportunityId)
          ? currentIds
          : [...currentIds, opportunityId];
      }
      return currentIds.filter((id) => id !== opportunityId);
    });
  };

  const bookMentorSession = async (
    mentor: Mentor,
    day: string,
    timeSlot: string,
    topic: string
  ): Promise<BookedSession> => {
    if (!userId) {
      throw new Error("Sign in to book a session with this mentor.");
    }

    const response = await fetch("/api/mentor-sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mentorApplicationId: mentor.id,
        day,
        timeSlot,
        topic,
      }),
    });
    const result = await response.json();
    if (!response.ok || !isBookedSession(result.data)) {
      throw new Error(result.message || "Failed to book mentorship session.");
    }

    setBookedSessions((prev) => [result.data, ...prev]);
    setBookedSessionsOwner(sessionOwner);
    return result.data;
  };

  const hasBookedMentor = (mentorId: string) => {
    return (
      bookedSessionsOwner === sessionOwner &&
      bookedSessions.some((s) => s.mentor.id === mentorId)
    );
  };

  return (
    <ApplicationContext.Provider
      value={{
        appliedOpportunities,
        bookedSessions:
          bookedSessionsOwner === sessionOwner ? bookedSessions : [],
        savedOpportunityIds:
          savedOpportunityOwner === sessionOwner ? savedOpportunityIds : [],
        savedOpportunitiesLoading,
        setOpportunitySaved,
        applyToOpportunity,
        hasAppliedToOpportunity,
        bookMentorSession,
        hasBookedMentor,
      }}
    >
      {children}
    </ApplicationContext.Provider>
  );
};

export const useApplications = () => {
  const context = useContext(ApplicationContext);
  if (!context) {
    throw new Error(
      "useApplications must be used within an ApplicationProvider"
    );
  }
  return context;
};