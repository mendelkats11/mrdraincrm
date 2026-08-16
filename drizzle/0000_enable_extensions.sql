-- Required for the GIN trigram indexes used by global/partial search
-- (docs/ARCHITECTURE.md §18, docs/IMPLEMENTATION_PLAN.md §6.3).
CREATE EXTENSION IF NOT EXISTS pg_trgm;
