
-- Add concepts JSONB column to learning_goals to store concept dependency graph
ALTER TABLE public.learning_goals 
ADD COLUMN concepts jsonb DEFAULT '[]'::jsonb;

-- Add a resources JSONB column to store AI-suggested resources per goal
ALTER TABLE public.learning_goals 
ADD COLUMN resources jsonb DEFAULT '[]'::jsonb;
