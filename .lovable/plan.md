# LearnFlow: Phases 4-9 Implementation Plan

This is a large-scale expansion covering Study Sessions, Proof-of-Work, Gamification, Community, Analytics, and Portfolio/Mentor features. The plan is organized into sequential phases with clear deliverables.

---

## Phase 4: Study Sessions and Focus Tracking

add study session history

### Database Changes

- Add columns to `study_sessions`: `goal_id (uuid)`, `concept_id (text)`, `notes (text)`, `interruptions (integer default 0)`, `target_duration_seconds (integer)`
- Create `focus_integrity_scores` table: `id`, `user_id`, `score (numeric)`, `consistency_score`, `completion_rate`, `interruption_score`, `proof_quality_score`, `calculated_at`, with RLS for user-only access
- Create a database function `calculate_focus_integrity(p_user_id uuid)` that computes the score from session data and report quality

### Frontend Changes

- **StudyTimer.tsx**: Add goal/concept selector dropdowns (populated from user's active goals and concepts), Pomodoro presets (25/50/90 min), interruption counter button, notes textarea, and target duration display with circular progress ring
- **Dashboard (Index.tsx)**: Add a Focus Integrity Score gauge component (circular SVG gauge with score 0-100), recent activity feed section showing last 5 actions (sessions, reports, posts)
- **New component**: `FocusGauge.tsx` -- animated circular gauge displaying the Focus Integrity Score

### Backend Changes

- Update `database.ts`: Add `startStudySession` to accept goal_id, concept_id, notes, target_duration; add `getRecentActivity` function; add `getFocusIntegrityScore` function

---

## Phase 5: Proof-of-Work and Explain-to-Unlock

### Database Changes

- Create `proof_submissions` table: `id`, `user_id`, `goal_id (uuid)`, `concept_id (text)`, `submission_type (text)` (explanation/example/exercise/help), `content (text)`, `ai_feedback (text)`, `quality_score (integer 0-100)`, `xp_earned (integer)`, `created_at`; RLS: users manage their own
- Add trigger `add_xp_on_proof` to award XP on insert

### New Edge Function: `evaluate-proof`

- Accepts: `{ content, concept, submissionType, goalDescription }`
- Uses Lovable AI (gemini-2.5-flash) to evaluate quality of explanation/exercise
- Returns: `{ qualityScore (0-100), feedback (string), xpAwarded (number) }`
- Tool calling to extract structured output (qualityScore, feedback, suggestions)

### Frontend Changes

- **DailyReport.tsx**: Overhaul into a full Proof-of-Work page with:
  - Goal and concept selectors
  - Tabbed submission types: Explanation, Example Rewrite, Exercise, Help-a-peer
  - AI feedback display section after submission
  - Submission history list with past proofs and scores
- **Explain-to-Unlock logic in GoalDetail.tsx**: Modify concept unlock to require proof submissions instead of just block completion. A concept's status changes to "completed" only when the user has submitted a qualifying proof (quality score >= 50) for that concept
- **New component**: `ProofHistory.tsx` -- displays past proof submissions with scores and feedback

---

## Phase 6: Gamification and Dashboard

### Database Changes

- Create `xp_transactions` table: `id`, `user_id`, `amount (integer)`, `source (text)` (proof/session/help/streak), `reference_id (uuid)`, `created_at`; RLS: users view their own
- Create `badges` table: `id`, `name`, `description`, `icon (text)`, `requirement_type (text)`, `requirement_value (integer)`, `created_at`
- Create `user_badges` table: `id`, `user_id`, `badge_id (uuid references badges)`, `earned_at`; RLS: users view their own
- Add `streak_insurance (integer default 0)` column to `profiles`
- Seed initial badges via migration: "First Proof", "7-Day Streak", "Helper (10 peer helps)", "100 XP", "1000 XP", "Concept Master (5 concepts completed)", etc.

### Backend Changes

- Update `add_xp_to_user` function to also insert into `xp_transactions`
- Create function `check_and_award_badges(p_user_id uuid)` to scan for newly earned badges
- Update streak logic: if streak breaks and user has streak_insurance > 0, decrement insurance instead of resetting streak
- Helping peers (answering community questions) awards 2x XP and earns streak insurance

### Frontend Changes

- **Dashboard (Index.tsx)**: Complete redesign with:
  - Active goals overview cards with progress bars
  - XP bar with level name and progress to next level
  - Streak counter with fire animation and insurance indicator
  - Focus Integrity Score gauge
  - Recent activity feed (last sessions, proofs, badges earned)
  - Quick action buttons: Start Session, Submit Proof, View Plans, Browse Community
- **New component**: `BadgeGrid.tsx` -- displays earned and locked badges with unlock conditions
- **Leaderboard.tsx**: Redesign ranking to use composite score: `(xp * 0.3) + (streak * 20 * 0.2) + (consistency_score * 0.25) + (proofs_submitted * 10 * 0.25)`. Add columns for streak, consistency, and proofs count. Create a new database function `get_enhanced_leaderboard()` that computes this composite ranking

---

## Phase 7: Community and Collaboration

### Database Changes

- Add `concept_id (text)` and `goal_id (uuid)` columns to `community_posts` to tie posts to specific concepts
- Add `user_id -> profiles` join capability for displaying poster names/avatars
- Add `is_helpful (boolean default false)` and `is_answer (boolean default false)` to `post_comments`
- Create trigger: when a comment is marked as helpful, award 2x XP to the commenter and increment their streak_insurance

### Frontend Changes

- **Community.tsx**: Enhance with:
  - Concept/goal tag on posts showing which concept the question relates to
  - Comment/reply system under each post (currently missing reply UI)
  - "Mark as Helpful" button on answers (post author can mark)
  - XP indicator showing "+2x XP for helping"
  - Filter by concept/goal
  - Poster name and avatar display (join with profiles)

---

## Phase 8: Analytics and Intelligence

### Database Changes

- No new tables needed; analytics are computed from existing `proof_submissions.confusing_concepts`, `daily_reports.confusing_concepts`, and `study_sessions`

### New Edge Function: `suggest-resources`

- Accepts: `{ goalId, conceptId, confusionPatterns, masteryLevel }`
- Uses Lovable AI to suggest 5-8 free learning resources with real URLs
- Returns: `{ resources: [{ title, url, type, description, relevance }] }`

### Frontend Changes

- **New page**: `Analytics.tsx` (route `/analytics`)
  - Confusion Heatmap: grid/treemap visualization using recharts showing most-confused topics extracted from proof submissions and daily reports
  - Bottleneck identification: list of concepts where user is stuck (locked concepts with failed proof attempts)
  - Trend charts: line charts showing XP over time, study hours over time, proof quality over time
- **New component**: `ConfusionHeatmap.tsx` -- recharts-based treemap colored by confusion frequency
- **GoalDetail.tsx and DailyReport.tsx**: Add contextual resource suggestions section that calls `suggest-resources` edge function
- Add Analytics link to sidebar navigation

---

## Phase 9: Portfolio and Mentor Dashboard

### Database Changes

- Create `mentor_links` table: `id`, `mentor_id (uuid)`, `mentee_id (uuid)`, `status (text)` (pending/active/declined), `created_at`; RLS: mentors and mentees can view their own links
- Create `portfolio_entries` table: `id`, `user_id`, `entry_type (text)` (goal_completed/explanation/exercise/collaboration), `title (text)`, `content (text)`, `metadata (jsonb)`, `created_at`; RLS: owner can manage, public read for shared portfolios
- Add `is_public (boolean default false)` to `profiles` for portfolio sharing

### Frontend Changes

- **New page**: `Portfolio.tsx` (route `/portfolio`)
  - Summary stats: goals completed, explanations written, exercises solved, peer helps, focus score
  - Timeline of achievements and milestones
  - Exportable view (print-friendly CSS for PDF export via browser print)
  - Shareable link toggle (makes portfolio public)
- **New page**: `MentorDashboard.tsx` (route `/mentor`)
  - Mentor view: list of linked mentees with their progress, focus scores, recent proofs, confusions
  - Student view: request mentor link, see mentor feedback
  - Top performers section showing highest-ranked learners
  - Simple mentor-student linking via invite code or username search
- Add Portfolio and Mentor links to sidebar navigation

---

## Navigation Updates

- Add to `AppSidebar.tsx`: Analytics, Portfolio, Mentor Dashboard links
- Update `App.tsx` with new routes: `/analytics`, `/portfolio`, `/mentor`

---

## Implementation Order

1. Phase 4 (Sessions + Focus Score) -- foundation for tracking
2. Phase 5 (Proof-of-Work + Explain-to-Unlock) -- core progression mechanic
3. Phase 6 (Gamification + Dashboard) -- ties everything together visually
4. Phase 7 (Community enhancements) -- social features
5. Phase 8 (Analytics) -- insight layer
6. Phase 9 (Portfolio + Mentor) -- advanced features

Each phase builds on the previous one. Phase 4 and 5 provide the data that Phase 6's dashboard visualizes. Phase 7 feeds into the XP/badge system from Phase 6. Phase 8 analyzes data from all prior phases. Phase 9 aggregates everything into exportable/mentoring views.

---

## Technical Notes

- All new tables include RLS policies restricting access to authenticated users and their own data
- Edge functions use `verify_jwt = false` in config.toml with manual JWT validation in code
- AI evaluations use Lovable AI gateway (`google/gemini-2.5-flash`) via tool calling for structured output
- XP transactions create an audit trail; the existing `add_xp_to_user` function is updated to log transactions
- Focus Integrity Score is recalculated on each dashboard load (or cached with a 1-hour TTL via `calculated_at`)
- Leaderboard composite score uses a security definer function to prevent data leakage
- Portfolio export uses CSS `@media print` for PDF generation via browser's native print dialog