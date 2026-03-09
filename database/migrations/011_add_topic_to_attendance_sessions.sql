-- Add topic column to attendance_sessions table
ALTER TABLE attendance_sessions ADD COLUMN IF NOT EXISTS topic VARCHAR(255);

-- Create index for topic queries
CREATE INDEX IF NOT EXISTS idx_attendance_sessions_topic ON attendance_sessions(topic);

