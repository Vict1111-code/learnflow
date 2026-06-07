## LearnFlow Refinement Plan

A refinement pass — not a rewrite. Preserves existing branding (dark/purple, glassmorphism), data model, and feature set. Work is organized into 7 phases so we can ship and validate incrementally.

### Phase 1 — Information Architecture & Navigation
- Collapse primary sidebar to 7 entries: **Dashboard, Study, Goals, Analysis, Community, AI Assistant, Profile**.
- Move **Mentorship** under Profile (tab) and link from Community sidebar.
- Move **Leaderboard, Achievements, Memory, Portfolio, Daily Report** into nested sections inside their parents (Analysis / Profile / Study).
- Keep `SidebarContext` (already persists collapsed state in localStorage) and verify it never resets on route change.
- Mobile: convert sidebar to Sheet/drawer with hamburger in `MobileTopBar`.
- Active route highlighting and tooltips in collapsed mode (already partially in place — polish).

### Phase 2 — Dashboard refocus ("What should I do today?")
Trim widgets to 6 sections in this order:
1. Welcome header (name, streak, XP, level)
2. Today's Goals (active goals + progress bars)
3. Active Session card (Resume / Start)
4. Progress Snapshot (focus hours, goals completed, recent activity)
5. Community Highlights (trending posts, groups)
6. Quick Actions (Start Session, Ask AI, Create Goal, View Analysis)

Remove duplicated widgets, increase whitespace, single-column on mobile, 2-col tablet, 3-col desktop.

### Phase 3 — Study system & session persistence (critical)
- Introduce `StudySessionContext` mounted in `Layout` that holds: `activeSessionId`, `startedAt`, `elapsedSeconds`, `topic`, `goalId`, `notes`, `interruptions`, `isPaused`.
- Persist to `localStorage` key `learnflow:active-session` on every tick + write-through to `study_sessions` row in Supabase every 30s.
- On mount: hydrate from localStorage → reconcile with Supabase open row (`ended_at IS NULL`).
- Survives refresh, tab switch, navigation. Timer ticks via `requestAnimationFrame` driven from `startedAt + Date.now()` (not interval state) so backgrounded tabs stay accurate.
- Reflections modal already exists — add explicit save confirmation and tag with goal_id.
- **Learning Memory**: new search page under Study (`/study/memory`) with full-text search across `study_sessions.topic/notes`, `session_reflections.learned/challenged/revise`, `daily_reports`. Uses Supabase `ilike` with debounced query and grouped results.

### Phase 4 — AI Assistant trim & polish
- Reduce modes from 8 → **3 (Explain, Quiz Generator, Session Review)**. Keep underlying edge function intact; just hide the others from `ai-modes.ts`.
- Floating button + drawer already implemented — verify they persist on every authenticated route and don't reset on navigation.
- `/ai` workspace: keep three-pane layout; ensure chat history (localStorage) survives reloads.
- File upload "+" button: accept PDF/DOCX/TXT/MD/Images; for PDFs/DOCX use a lightweight client extractor (`pdfjs-dist` text, `mammoth` for docx) and send extracted text as context. Images sent as base64 (model supports vision). Action chips: Summarize / Explain / Generate Quiz / Extract Concepts.

### Phase 5 — Community trim
- Remove `Resources`, `Code Snippets`, `Achievement Posts` categories from filters / create-post dialog.
- Keep: Questions, Study Logs, Projects, Study Groups.
- Polish upvotes / helpful / solved / trending sidebar.

### Phase 6 — Analysis as Learning Intelligence Center
Tabbed structure: **Overview · Trends · Focus · Goals · Roadmap · Insights**
- Overview: focus hours, sessions, goals, streak, XP cards
- Trends: weekly/monthly chart + GitHub-style consistency heatmap (already partly built — promote)
- Focus: avg focus score, productive hours histogram, distraction trend
- Goals: per-goal progress %, time spent, completion forecast
- Roadmap: SkillTree component (existing) — keep as signature feature
- Insights: AI-generated weekly summary + gap list (calls existing AI edge function)

### Phase 7 — Polish: Landing / Auth / SEO / Perf
- Landing: tighten sections (Hero, Features, How It Works, Community, AI, Testimonials, Pricing, FAQ, CTA), wire buttons (Login → `/login`, Get Started → `/signup`).
- Auth flow already correct (signup → verify-email → onboarding → dashboard) — audit `ProtectedRoute` gating and Resend wiring.
- SEO: update `index.html` title `LearnFlow — Build Consistency. Master Skills.`, meta description, OG/Twitter tags, JSON-LD `SoftwareApplication`.
- Perf: audit unnecessary re-renders (memoize heavy lists), prevent `AuthContext` reloads on tab focus (already fixed), confirm no SWR/polling thrash.
- Accessibility sweep: aria-labels on icon-only buttons, `h-dvh` over `h-screen`, single `<main>`, tap targets ≥44px.

### Out of scope this pass
- New database tables (everything fits existing schema).
- Mentorship redesign beyond relocation.
- Payment/Pricing implementation (Landing section is marketing only).
- Advanced AI personalization (architecture prep only — context already piped via `useLearningContext`).

### Technical notes
- All work in `src/` — no schema changes needed.
- New files (~15): `StudySessionContext.tsx`, `LearningMemory.tsx` page, study/AI helper hooks, refined Analysis tab components, file-upload util.
- Edited files (~25): `AppSidebar.tsx`, `Layout.tsx`, `App.tsx` routes, `Dashboard` (`Index.tsx`), `StudyTimer.tsx`, `Community.tsx`, `Analytics.tsx`, `Landing.tsx`, `index.html`, `ai-modes.ts`, etc.
- No new dependencies for Phases 1–3, 5–7. Phase 4 adds `pdfjs-dist` + `mammoth` for client-side file extraction.

### Suggested rollout order
Phase 1 → 2 → 3 (highest user impact: nav + dashboard + no lost sessions) → 5 → 6 → 4 → 7.

### Questions before I start
1. Confirm the 7-item nav list above (any item you want kept at top level that I moved to a nested section?).
2. AI Assistant: OK to hide the 5 extra modes (Flashcards, Study Coach, Resource Finder, Goal Planner, Roadmap) without deleting them, so they can come back later?
3. File upload extractors: OK to add `pdfjs-dist` + `mammoth` (~600KB combined gzipped, lazy-loaded only on `/ai`)?
4. Should Phase 7 also include a real OG image (I can generate one), or keep current placeholder?
