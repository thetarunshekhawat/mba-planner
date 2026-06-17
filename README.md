# MBA Planner (BITSoM Co'27)

A robust Next.js application built to help MBA students effectively plan their courses, manage schedules, and avoid timeline conflicts.

## Features

### Core Planning Features
- **Interactive Course Selection:** Browse through electives, WaWs, and required courses. Filter by specializations, workloads, or depth.
- **Visual Timetable:** Dynamically generated week-by-week and block-by-block view to easily spot overlaps and empty slots.
- **Conflict Detection:** Real-time warnings when you select multiple courses in the same conflict group.
- **Monthly Calendar:** Built-in slide-out calendar on the schedule view for easy cross-referencing.
- **Supabase Integration:** Real-time saving of course selections tied securely to your user profile.

### Friends & Collaboration (New)
- **Friends View:** See and compare course selections with peers in your cohort.
- **Friend Detail Modal:** View detailed course schedules and selections of specific friends for better collaboration and planning.
- **Friend Selection Hooks:** Manage friend relationships and preferences with dedicated data hooks (`useFriends`, `useFriendSelections`).
- **Shared Planning:** Compare schedules with friends to find common slots and coordinate study groups.

### Admin Features (Enhanced)
- **Admin Dashboard:** Comprehensive analytics and user journey tracking with session-level drill-down.
- **User Analytics:** Track user interactions, course selections, and session timelines.
- **Term Filtering:** Admin tools to filter and manage course visibility by academic term.
- **Analytics Tracking:** Enhanced metrics collection for user behavior analysis.

## Recent Updates (Latest Release)

### 🎉 Friends Feature Implementation
- New `FriendsView` component for cohort-wide course comparison
- `FriendDetailModal` component for viewing individual friend schedules
- Hooks for managing friend selections and relationships
- Database migration (`007_friends.sql`) for friend relationship storage

### 🎨 Enhanced Timetable
- Improved layout and responsive design
- Better visual hierarchy for course blocks
- Enhanced timeline visualization for multiple terms
- Better support for friend schedule comparison

### 📊 Admin Dashboard Improvements
- Advanced analytics tracking with funnel insights
- Session-level user journey tracking
- Physics drawer functionality for detailed analytics
- Conflict detection and scheduling audit tools

### 🔧 Code Quality
- Removed deprecated sandbox page
- Updated type definitions to support friend relationships
- Enhanced analytics hooks with better tracking
- Improved component structure and reusability

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Styling:** Tailwind CSS v4, Lucide React
- **Components:** Shadcn/UI (Base UI, Dialog, Sheet, Calendar)
- **Backend/Auth:** Supabase
- **Database:** PostgreSQL (via Supabase)
- **State Management:** React Hooks

## Project Structure

```
mba-planner/
├── app/
│   ├── planner/          # Main planner page with course selection
│   ├── admin/            # Admin dashboard
│   └── kyoto/            # Kyoto admin route
├── components/
│   ├── planner/          # Planner components
│   │   ├── TimetableView.tsx
│   │   ├── FriendsView.tsx (NEW)
│   │   └── FriendDetailModal.tsx (NEW)
│   └── admin/            # Admin components
├── hooks/
│   ├── useAnalytics.ts
│   ├── useFriends.ts (NEW)
│   ├── useFriendSelections.ts (NEW)
│   └── useLandingAnalytics.ts
├── supabase/
│   └── migrations/       # Database migrations
│       └── 007_friends.sql (NEW)
└── types/
    └── index.ts          # TypeScript definitions
```

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

## Database Migrations

The project uses Supabase migrations for schema management. To apply migrations:

1. Navigate to your Supabase dashboard
2. Go to the SQL Editor
3. Run the migration files in order (e.g., `007_friends.sql` for the friends feature)

Key tables:
- `friends_list` - Stores friend relationships between users
- `friend_selections` - Tracks friend course selections for comparison

## Deployment

To deploy this project to Vercel:

1. Import this repository into your Vercel dashboard.
2. In the project settings on Vercel, ensure you add the environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Run database migrations on Supabase before deployment.
4. Deploy!

## Admin Access

Admin features are available to designated users. Current admins:
- tarun.shekhawat2027@bitsom.edu.in
- varad.dharap2027@bitsom.edu.in
- yash.kolhe2027@bitsom.edu.in
- apoorv.sharma2027@bitsom.edu.in

Admin features include analytics dashboard, user journey tracking, and term management.

## Contributing

1. Create a new branch for your feature
2. Make your changes and test locally
3. Submit a pull request with a clear description of changes
4. Ensure all database migrations are included for schema changes

## License

This project is private and intended for use by BITSoM MBA students and administrators.
