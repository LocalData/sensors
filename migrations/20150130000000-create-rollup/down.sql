
DROP FUNCTION IF EXISTS update_rollup_aggregate(json, json, json, text);
DROP FUNCTION IF EXISTS get_rollup_fields(json);
DROP FUNCTION IF EXISTS upsert_rollup_5min(json, character(25), TIMESTAMP WITH TIME ZONE);
DROP FUNCTION IF EXISTS rollup_5min_row() CASCADE;
