-- Add duration fields to learning_goals table
ALTER TABLE public.learning_goals 
ADD COLUMN IF NOT EXISTS duration_value integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS duration_unit text DEFAULT 'week';

-- Update existing records to have default values
UPDATE public.learning_goals 
SET duration_value = 1, duration_unit = 'week' 
WHERE duration_value IS NULL;