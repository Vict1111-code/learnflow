export interface User {
  id: string;
  name: string;
  avatar: string;
  focus: string;
  level: 'Beginner' | 'Intermediate' | 'Advanced' | 'Master';
  xp: number;
  streak: number;
  studyHoursToday: number;
  reportsSubmitted: number;
}

export interface StudySession {
  id: string;
  userId: string;
  startTime: Date;
  endTime?: Date;
  duration: number;
  topic: string;
  block: LearningBlock;
}

export type GoalType = 'skill' | 'concept' | 'topic' | 'subject' | 'habit';
export type MasteryLevel = 'awareness' | 'understanding' | 'application' | 'mastery';
export type TimeAvailability = '1-2' | '3-5' | '6-8' | 'custom';
export type DurationUnit = 'day' | 'week' | 'month' | 'year';
export type LearningBlock = 'input' | 'breakdown' | 'practice' | 'output' | 'review';

export interface PlanDuration {
  value: number;
  unit: DurationUnit;
}

export interface LearningGoal {
  goalType: GoalType;
  description: string;
  masteryLevel: MasteryLevel;
  timeAvailability: TimeAvailability;
  customHours?: number;
}

export interface DailyReport {
  id: string;
  userId: string;
  date: string;
  studied: string;
  understood: string;
  explanation: string;
  exercises: string;
  confusingConcepts: string;
  xpEarned: number;
  timestamp: Date;
}

export interface CommunityPost {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  type: 'question' | 'explanation' | 'achievement' | 'resource';
  title: string;
  content: string;
  topic: string;
  upvotes: number;
  comments: number;
  timestamp: Date;
}

export interface LeaderboardEntry {
  rank: number;
  user: User;
  weeklyXp: number;
  dailyXp: number;
}

export interface StudyPlan {
  id: string;
  day: string;
  blocks: StudyBlock[];
}

export interface StudyBlock {
  id: string;
  type: LearningBlock;
  title: string;
  duration: number;
  description: string;
  completed: boolean;
}
