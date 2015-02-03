
DROP FUNCTION IF EXISTS rollup_agg_reduce(json, json);
DROP FUNCTION IF EXISTS rollup_agg_map(json);
DROP FUNCTION IF EXISTS get_rollup_fields(json);
DROP AGGREGATE IF EXISTS rollup_agg (json);
DROP FUNCTION IF EXISTS upsert_rollup_reduce_5_min(json, character(25), TIMESTAMP WITH TIME ZONE);
DROP FUNCTION IF EXISTS rollup_5min_row() CASCADE;
DROP FUNCTION IF EXISTS rollup_pick(json, TEXT ARRAY, TEXT);
DROP TRIGGER IF EXISTS rollup_5min_trigger ON entries;
DROP FUNCTION IF EXISTS rollup_pick(json, TEXT ARRAY, TEXT);

DROP TABLE IF EXISTS rollup_5min;
