# Changelog

All notable changes to the MBA Planner project will be documented in this file.

## [Unreleased]

### Added - Friends & Collaboration Feature
- **FriendsView Component** (`components/planner/FriendsView.tsx`)
  - Displays list of friends in the cohort with their course selections
  - Allows quick filtering and selection of friends to compare schedules
  - Responsive layout optimized for mobile and desktop views
  - Real-time updates with Supabase integration

- **FriendDetailModal Component** (`components/planner/FriendDetailModal.tsx`)
  - Modal view for detailed friend schedule and course comparison
  - Shows friend's selected courses, timing, and conflicts
  - Highlights common courses and scheduling overlaps
  - Easy-to-understand visual representation of friend's academic plan

- **useFriends Hook** (`hooks/useFriends.ts`)
  - Manages friend list fetching and caching
  - Real-time friend data synchronization with Supabase
  - Handles friend selection state
  - Error handling and loading states

- **useFriendSelections Hook** (`hooks/useFriendSelections.ts`)
  - Manages friend course selections and preferences
  - Tracks which courses are selected by which friends
  - Comparison logic for schedule overlaps
  - Efficient data structure for friend-course relationships

- **Friends Database Migration** (`supabase/migrations/007_friends.sql`)
  - New `friends_list` table for friend relationships
  - New `friend_selections` table for tracking friend courses
  - Proper foreign key constraints and indexes
  - Row-level security policies for data privacy

### Enhanced - Timetable Improvements
- **TimetableView Component** (`components/planner/TimetableView.tsx`)
  - Complete redesign with improved layout and visual hierarchy
  - Better responsive design for mobile devices
  - Enhanced course block visualization with improved spacing
  - Friend schedule comparison overlay option
  - Timeline visualization improvements for multi-term view
  - Better handling of course conflicts and overlaps
  - Improved accessibility with better keyboard navigation
  - ~344 lines of enhancements and refactoring

### Enhanced - Admin Features
- **AdminDashboard Component** (`components/admin/AdminDashboard.tsx`)
  - Advanced user journey analytics tracking
  - Session timeline audit dashboard
  - Funnel analysis with drill-down capabilities
  - Physics drawer for detailed metrics
  - Term-based filtering and segmentation
  - ~172 lines of new admin analytics features

### Enhanced - Type Definitions
- **types/index.ts**
  - Added Friend interface for friend relationships
  - Added FriendSelection interface for course tracking
  - Added updated CourseSelection with friend comparison fields
  - Enhanced UserProfile with friend-related metadata
  - ~41 lines of new type definitions

### Enhanced - Analytics
- **useAnalytics Hook** (`hooks/useAnalytics.ts`)
  - Extended tracking for friend interactions
  - Better session timeline tracking
  - Improved event categorization
  - Enhanced funnel analysis

- **useLandingAnalytics Hook** (`hooks/useLandingAnalytics.ts`)
  - Updated tracking for new user flows
  - Better performance metrics

### Enhanced - Planner Page
- **app/planner/page.tsx**
  - Integrated friends feature into main planner UI
  - Added friend comparison toggle
  - Better tab navigation between plan and friends view
  - Enhanced state management for friend selections
  - ~98 lines of new features

### Removed
- **app/sandbox/page.tsx** (Deprecated)
  - Removed experimental sandbox page
  - Cleaned up ~745 lines of unused code
  - Simplified app routing structure

## [Previous Releases]

### v1.3.0 - Term 1 Timeline & Mobile Improvements
- Stack Term 1 timeline below content on mobile
- Vibrant progress bar fill colors
- Exceeded state indicator for completed terms
- Sync Term 4 schedule with timetable
- Show ABMA (Account Based Marketing) for all users

### v1.2.0 - Advanced Admin Features
- Full admin journey tracking with session timelines
- Physics drawer for analytics deep-dives
- Admin term filtering
- Mobile bottom drawer with analytics tracking

### v1.1.0 - Core Planner Features
- Interactive course selection
- Visual timetable with conflict detection
- Monthly calendar integration
- Supabase authentication and data persistence
- Real-time course saving

## Migration Guide

### For Users
No action required for end users. New features will be available automatically upon deployment.

### For Developers
To apply the latest database migrations:

1. Access your Supabase dashboard
2. Navigate to the SQL Editor
3. Copy and execute the migration from `supabase/migrations/007_friends.sql`
4. Verify the new tables are created:
   - `friends_list` - Friend relationships
   - `friend_selections` - Friend course selections

### Breaking Changes
None in this release.

## Future Roadmap

- [ ] Group planning with multiple friends
- [ ] Course recommendation engine based on friend schedules
- [ ] Shared notes and comments on courses
- [ ] Calendar export functionality
- [ ] Mobile app (React Native)
- [ ] Course prerequisites checker
- [ ] Academic performance tracking
- [ ] Integration with course syllabus PDFs

## Known Issues

None currently reported.

## Contributors

- Tarun Shekhawat (Maintainer)
- Varad Dharap (Admin)
- Yash Kolhe (Admin)
- Apoorv Sharma (Admin)

## Support

For issues, feature requests, or contributions, please reach out to the admin team.
