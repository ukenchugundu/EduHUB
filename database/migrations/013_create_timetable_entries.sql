-- Create recurring timetable entries table
CREATE TABLE IF NOT EXISTS timetable_entries (
    id SERIAL PRIMARY KEY,
    batch_id INTEGER NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
    faculty_id INTEGER NOT NULL REFERENCES auth_users(auth_user_id),
    weekday INTEGER NOT NULL CHECK (weekday BETWEEN 1 AND 7),
    subject VARCHAR(255) NOT NULL,
    topic VARCHAR(255),
    room VARCHAR(100),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    created_by INTEGER REFERENCES auth_users(auth_user_id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(batch_id, weekday, start_time)
);

CREATE INDEX IF NOT EXISTS idx_timetable_entries_batch_weekday
    ON timetable_entries(batch_id, weekday, start_time);

CREATE INDEX IF NOT EXISTS idx_timetable_entries_faculty_weekday
    ON timetable_entries(faculty_id, weekday, start_time);
