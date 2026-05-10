# MBA Planner (BITSoM Co'27)

A robust Next.js application built to help MBA students effectively plan their courses, manage schedules, and avoid timeline conflicts.

## Features

- **Interactive Course Selection:** Browse through electives, WaWs, and required courses. Filter by specializations, workloads, or depth.
- **Visual Timetable:** Dynamically generated week-by-week and block-by-block view to easily spot overlaps and empty slots.
- **Conflict Detection:** Real-time warnings when you select multiple courses in the same conflict group.
- **Monthly Calendar:** Built-in slide-out calendar on the schedule view for easy cross-referencing.
- **Supabase Integration:** Real-time saving of course selections tied securely to your user profile.

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Styling:** Tailwind CSS v4, Lucide React
- **Components:** Shadcn/UI (Base UI, Dialog, Sheet, Calendar)
- **Backend/Auth:** Supabase

## Setup Instructions

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up your environment variables by creating a `.env.local` file in the root directory and adding your Supabase credentials:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```
4. Run the development server:
   ```bash
   npm run dev
   ```
5. Open [http://localhost:3000](http://localhost:3000) with your browser to see the application.

## Deployment

To deploy this project to Vercel:

1. Import this repository into your Vercel dashboard.
2. In the project settings on Vercel, ensure you add the `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` environment variables.
3. Deploy!
