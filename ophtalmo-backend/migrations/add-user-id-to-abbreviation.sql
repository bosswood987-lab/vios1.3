-- Migration to add user_id column to abbreviation table
-- This adds proper user relationship instead of just created_by string

-- Add user_id column
ALTER TABLE abbreviation 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES user_table(id) ON DELETE CASCADE;

-- Create index for user_id for faster filtering
CREATE INDEX IF NOT EXISTS idx_abbreviation_user_id ON abbreviation(user_id);

-- Update existing records to set user_id based on created_by email
-- This is optional and only for existing data migration
UPDATE abbreviation a
SET user_id = u.id
FROM user_table u
WHERE a.created_by = u.email 
  AND a.user_id IS NULL
  AND a.created_by IS NOT NULL
  AND a.created_by != 'system';

-- Note: Records with created_by='system' will have NULL user_id (they are global)
