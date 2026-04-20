-- This script runs automatically on first container startup
-- (via Docker's /docker-entrypoint-initdb.d/ mechanism).
-- It enables the pgvector extension so the 'vector' type is available
-- for all subsequent migrations.
CREATE EXTENSION IF NOT EXISTS vector;