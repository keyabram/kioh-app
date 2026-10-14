This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Environment and uploaded documents

Copy `.env.example` to `.env.local` and provide the MongoDB, NextAuth, Google OAuth, Resend, and UploadThing values for your environment. Set `NEXT_PUBLIC_APP_URL` to the public application URL so email verification and password-reset links return to the right site.

Pitch decks are accepted as private PDFs (up to 16 MB). Mentor certificates accept private PDFs or images (up to 8 MB each, three files maximum). Users must sign in to upload; files are attached to the application and are only served to their owner through short-lived signed URLs.

## Mentor workspace and sessions

Signed-in users can open **Mentor Workspace** from the dashboard to check an application, edit their mentor profile, and manage public-profile consent. Approved mentors see upcoming bookings assigned to their account. Session bookings are stored in MongoDB and are available to both the mentor and the person who booked.

Only approved profiles with public-directory consent can be booked. Sample directory profiles are previews and are not bookable because they are not linked to mentor accounts. Session times use the `Africa/Nairobi` time zone.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
