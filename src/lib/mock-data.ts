import { User, CommunityPost, LeaderboardEntry, StudyPlan } from './types';

export const mockUser: User = {
  id: '1',
  name: 'Alex Chen',
  avatar: '',
  focus: 'Full-Stack Development',
  level: 'Intermediate',
  xp: 4250,
  streak: 12,
  studyHoursToday: 3.5,
  reportsSubmitted: 47,
};

export const mockLeaderboard: LeaderboardEntry[] = [
  { rank: 1, user: { ...mockUser, id: '2', name: 'Sarah K.', xp: 6800, streak: 24, level: 'Advanced' }, weeklyXp: 1450, dailyXp: 280 },
  { rank: 2, user: { ...mockUser, id: '3', name: 'Marcus J.', xp: 5200, streak: 18, level: 'Intermediate' }, weeklyXp: 1200, dailyXp: 250 },
  { rank: 3, user: { ...mockUser, name: 'Alex Chen', xp: 4250, streak: 12 }, weeklyXp: 980, dailyXp: 200 },
  { rank: 4, user: { ...mockUser, id: '4', name: 'Priya M.', xp: 3900, streak: 9, level: 'Intermediate' }, weeklyXp: 870, dailyXp: 180 },
  { rank: 5, user: { ...mockUser, id: '5', name: 'Jordan L.', xp: 3100, streak: 6, level: 'Beginner' }, weeklyXp: 650, dailyXp: 140 },
];

export const mockPosts: CommunityPost[] = [
  {
    id: '1', userId: '2', userName: 'Sarah K.', userAvatar: '',
    type: 'explanation', title: 'Understanding React Server Components',
    content: 'Here\'s my breakdown of how RSC works under the hood and why it matters for performance...',
    topic: 'React', upvotes: 42, comments: 8, timestamp: new Date(Date.now() - 3600000),
  },
  {
    id: '2', userId: '3', userName: 'Marcus J.', userAvatar: '',
    type: 'question', title: 'How to handle async state in Redux Toolkit?',
    content: 'I\'m struggling with createAsyncThunk and managing loading states. Any tips?',
    topic: 'Redux', upvotes: 15, comments: 12, timestamp: new Date(Date.now() - 7200000),
  },
  {
    id: '3', userId: '4', userName: 'Priya M.', userAvatar: '',
    type: 'achievement', title: '🔥 30-day streak achieved!',
    content: 'Just hit my 30-day learning streak! Consistency really does pay off.',
    topic: 'General', upvotes: 89, comments: 23, timestamp: new Date(Date.now() - 14400000),
  },
  {
    id: '4', userId: '5', userName: 'Jordan L.', userAvatar: '',
    type: 'resource', title: 'Best resources for learning TypeScript generics',
    content: 'Compiled a list of the best tutorials and exercises for mastering TypeScript generics...',
    topic: 'TypeScript', upvotes: 56, comments: 7, timestamp: new Date(Date.now() - 28800000),
  },
];

export const mockStudyPlan: StudyPlan[] = [
  {
    id: '1', day: 'Monday',
    blocks: [
      { id: '1', type: 'input', title: 'Watch React Patterns lecture', duration: 45, description: 'Study advanced React patterns', completed: true },
      { id: '2', type: 'breakdown', title: 'Break down Compound Components', duration: 30, description: 'Analyze compound component pattern', completed: true },
      { id: '3', type: 'practice', title: 'Build a Tabs component', duration: 60, description: 'Practice implementing compound components', completed: false },
      { id: '4', type: 'output', title: 'Write a blog post about it', duration: 30, description: 'Explain what you learned', completed: false },
      { id: '5', type: 'review', title: 'Review and flashcards', duration: 15, description: 'Spaced repetition review', completed: false },
    ],
  },
  {
    id: '2', day: 'Tuesday',
    blocks: [
      { id: '6', type: 'input', title: 'Read TypeScript docs on generics', duration: 40, description: 'Study generic types', completed: false },
      { id: '7', type: 'breakdown', title: 'Map out generic utility types', duration: 25, description: 'Break down Partial, Pick, Omit', completed: false },
      { id: '8', type: 'practice', title: 'Solve type challenges', duration: 50, description: 'Work through type-challenges repo', completed: false },
      { id: '9', type: 'output', title: 'Create a typed API client', duration: 40, description: 'Build something with generics', completed: false },
      { id: '10', type: 'review', title: 'Review yesterday + today', duration: 15, description: 'Consolidate learning', completed: false },
    ],
  },
];
