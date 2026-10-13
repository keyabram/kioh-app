import type { Metadata } from "next";
import ContactExperience from "@/components/ContactExperience";

export const metadata: Metadata = {
  title: "Contact Us | KIOH",
  description:
    "Contact the Kenya Innovation & Opportunity Hub about building, mentorship, funding, or partnerships.",
};

export default function ContactPage() {
  return <ContactExperience />;
}
