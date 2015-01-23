
DROP FUNCTION rollup_agg_reduce(json, json);
DROP FUNCTION rollup_agg_map(json);
DROP FUNCTION get_rollup_fields(json);
DROP AGGREGATE rollup_agg (json);
DROP FUNCTION upsert_rollup_reduce_5_min(json, character(25), TIMESTAMP WITH TIME ZONE);
DROP FUNCTION rollup_5min_row();
DROP FUNCTION rollup_pick(json, TEXT ARRAY, TEXT);
DROP TRIGGER rollup_5min_trigger;
DROP FUNCTION rollup_pick(json, TEXT ARRAY, TEXT);

DROP TABLE rollup_5min;
