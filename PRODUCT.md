# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Kenya-based innovators use KIOH to find opportunities, mentorship, and ecosystem partners. Mentors and Navigators apply to guide those innovators and may publish a profile after KIOH review.

## Product Purpose

KIOH connects Kenya's innovation community with mentorship, opportunities, venture visibility, and ecosystem partners.

## Capabilities and Constraints

Mentor applications are reviewed by KIOH. Approved profiles are public only with the applicant's consent. The mentor dashboard manages the user's application/profile and shows sessions assigned to that mentor account. Bookings must be stored persistently and linked to approved mentor accounts; unlinked sample profiles are not bookable.

## Evidence on Hand

- Mentor application, approval, consent, and directory flows are implemented in `app/apply-mentor/page.tsx`, `app/api/mentor-applications/route.ts`, `app/api/admin/verification/route.ts`, and `server/services/mentorService.ts`.
- The app's existing design and interaction patterns are implemented in its Next.js pages and shared components.

## Product Principles

- Make opportunities and guidance accessible to Kenya's innovation community.
- Keep mentor verification and public-profile consent explicit.
- Show account owners only the application and session information relevant to them.
- Use real account-linked bookings for mentor operations.
