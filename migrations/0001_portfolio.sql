-- Additive, namespaced portfolio storage. This migration never changes an
-- existing portfolio document or any unrelated application table.
CREATE TABLE IF NOT EXISTS rr_portfolio_content (
  namespace TEXT PRIMARY KEY NOT NULL,
  revision INTEGER NOT NULL CHECK (revision >= 0),
  document TEXT NOT NULL CHECK (length(CAST(document AS BLOB)) < 1799900)
);

CREATE TABLE IF NOT EXISTS rr_portfolio_sessions (
  token_hash TEXT PRIMARY KEY NOT NULL CHECK (length(token_hash) = 64),
  csrf_token TEXT NOT NULL CHECK (length(csrf_token) = 43),
  credential_fingerprint TEXT NOT NULL CHECK (length(credential_fingerprint) = 64),
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS rr_portfolio_sessions_expiry
  ON rr_portfolio_sessions (expires_at);

CREATE TABLE IF NOT EXISTS rr_portfolio_login_buckets (
  bucket_key TEXT PRIMARY KEY NOT NULL,
  window_start INTEGER NOT NULL,
  attempts INTEGER NOT NULL CHECK (attempts >= 0)
);
CREATE INDEX IF NOT EXISTS rr_portfolio_login_bucket_expiry
  ON rr_portfolio_login_buckets (window_start);

CREATE TABLE IF NOT EXISTS rr_portfolio_media (
  id TEXT PRIMARY KEY NOT NULL,
  mime TEXT NOT NULL CHECK (mime IN ('image/png', 'image/jpeg', 'image/webp')),
  bytes BLOB NOT NULL CHECK (length(bytes) <= 1000000),
  width INTEGER NOT NULL CHECK (width BETWEEN 64 AND 5000),
  height INTEGER NOT NULL CHECK (height BETWEEN 64 AND 5000),
  created_at INTEGER NOT NULL,
  CHECK (width * height <= 16000000)
);
