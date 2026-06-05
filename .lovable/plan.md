## LearnFlow AI Workspace + Navigation Redesign

A comprehensive transformation across 14 areas. Below is what I'll build, grouped by deliverable.

### 1. Global AI Assistant (always-on)

- `src/contexts/AIAssistantContext.tsx` — global provider holding:
  - chats array, active chat id, drawer open state, minimized state, selected mode
  - persisted to `localStorage` so navigation never resets state
  - `sendMessage`, `newChat`, `renameChat`, `deleteChat`, `pinChat`, `toggleFavorite`
- `src/components/ai/FloatingAIButton.tsx` — fixed bottom-right, purple glow, pulse, glassmorphism. Hidden on `/ai` page. Sits above the notification inbox.
- `src/components/ai/AIDrawer.tsx` — right-side Sheet (450–500px desktop / full-screen mobile), embeds the shared `<ChatWorkspace>` in compact mode. Minimize collapses to floating button without losing state.
- Mounted once inside `Layout.tsx` so it persists across all authenticated routes.

### 2. Dedicated `/ai` Page

- `src/pages/AIWorkspace.tsx` (route `/ai`) — full three-pane workspace:
  - **Left rail**: New Chat, search, chat history grouped by Today / Yesterday / Previous 7 / Older, pin/favorite/rename/delete, plus secondary nav (Saved, Quizzes, Flashcards, Session Reviews) that map to existing assistant tabs.
  - **Main**: `<ChatWorkspace>` (mode selector, quick action cards on empty, message list, composer).
  - **Right panel** (desktop ≥xl only): user learning context — streak, XP, focus hours, active goals, recent sessions, quick actions. Sourced via new `useLearningContext` hook.
- Old `/assistant` route redirects to `/ai`; existing tabbed tools (Reflection / Explain / Quiz / Flashcards / Resources / History) remain accessible via the left rail's "Tools" section.

### 3. Modern Chat UI (`src/components/ai/ChatWorkspace.tsx` + subcomponents)

- `ModeSelector` — 8 modes (Explain, Quiz, Flashcards, Study Coach, Resource Finder, Session Review, Goal Planner, Roadmap) with icon + description, each mapped to a system prompt.
- `QuickActionCards` — shown when chat is empty.
- `EmptyState` — "Welcome back, {name}" + streak/XP/focus/goals progress + suggested actions.
- `MessageList` — markdown rendering (`react-markdown` already installed), code blocks, timestamps, copy + regenerate buttons, typing indicator, skeletons.
- `ChatComposer` — auto-growing textarea, multiline, "+" upload menu (PDF/DOCX/TXT/MD/images) with action chooser (Summarize / Explain / Quiz / Flashcards / Key Concepts / Study Plan), uploaded files render as chips above input.
- Wires into existing `supabase/functions/ai-assistant/index.ts` (mode-aware). File contents are read client-side (text/markdown) or referenced by name for binary types (architecture-ready; actual binary parsing deferred).

### 4. Learning Context

- `src/hooks/useLearningContext.ts` — aggregates goals, recent sessions, reflections, focus score, streak, XP, completed concepts, mentor feedback into a single object the AI mode prompts can consume. Used by right panel + injected as system context when chatting.

### 5. Sidebar Redesign (collapse/expand)

- Refactor `src/components/AppSidebar.tsx`:
  - Collapsed (72px) vs expanded (256px) with smooth width transition
  - Header toggle button (PanelLeftClose/Open icon)
  - Tooltips when collapsed
  - Active route highlighting preserved
- `src/contexts/SidebarContext.tsx` — `collapsed` state persisted in `localStorage` (`learnflow:sidebar:collapsed`)
- `Layout.tsx` main margin shifts between `lg:ml-64` and `lg:ml-[72px]` reactively.
- Mobile drawer (`MobileTopBar`) unchanged behavior; tablet uses overlay drawer pattern already in place.

### 6. Chat history storage

- `localStorage` key `learnflow:ai:chats` — array of `{ id, title, pinned, favorite, mode, messages, createdAt, updatedAt }`.
- No DB migration needed for this pass (architecture-ready; can promote to Supabase later without UI changes).

### 7. Performance / SPA

- AI provider mounted once in `Layout` → drawer + state survive route changes.
- Sidebar context above `Layout` so collapse persists across pages.
- React Query already configured with `refetchOnWindowFocus: false`.

### Files created
- `src/contexts/AIAssistantContext.tsx`
- `src/contexts/SidebarContext.tsx`
- `src/hooks/useLearningContext.ts`
- `src/components/ai/FloatingAIButton.tsx`
- `src/components/ai/AIDrawer.tsx`
- `src/components/ai/ChatWorkspace.tsx`
- `src/components/ai/ChatComposer.tsx`
- `src/components/ai/MessageList.tsx`
- `src/components/ai/ModeSelector.tsx`
- `src/components/ai/QuickActions.tsx`
- `src/components/ai/EmptyState.tsx`
- `src/components/ai/ChatHistorySidebar.tsx`
- `src/components/ai/LearningContextPanel.tsx`
- `src/pages/AIWorkspace.tsx`
- `src/lib/ai-modes.ts`

### Files edited
- `src/App.tsx` — add `/ai` route, wrap with `SidebarProvider` + `AIAssistantProvider`, alias `/assistant` to `/ai`
- `src/components/Layout.tsx` — mount `FloatingAIButton` + `AIDrawer`, react to sidebar collapse
- `src/components/AppSidebar.tsx` — collapsible behavior, tooltips, persisted state, add `/ai` entry
- `src/components/AppSidebar.tsx` navItems updated; existing `/assistant` link renamed to "AI Assistant" → `/ai`

### Out of scope (explicit)
- No new Supabase tables this pass — chats persist in `localStorage` so we don't block on schema design; the AI provider exposes the same surface so a DB swap later is mechanical.
- Binary file parsing (PDF/DOCX) is wired in the UI (chips, upload menu, actions) but uses filename + size as context; OCR/extraction can be added later as an edge function.
- Existing `/assistant` tabbed page kept and reachable from the left rail "Tools" group so no functionality is lost.

Once approved I'll implement all of the above in one pass.