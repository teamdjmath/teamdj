ALTER TABLE users
  ADD COLUMN IF NOT EXISTS suspended_from date,
  ADD COLUMN IF NOT EXISTS suspended_until date;
