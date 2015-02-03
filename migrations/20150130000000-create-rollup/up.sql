
CREATE EXTENSION IF NOT EXISTS plv8;

CREATE TABLE rollup_5min (
  source character(25),
  ts timestamptz,
  created_at timestamptz,
  updated_at timestamptz,
  data json
) WITH (fillfactor=75);
CREATE UNIQUE INDEX rollup_source_ts_idx ON rollup_5min(source,ts);

-- State transition function for the custom aggregation
CREATE OR REPLACE FUNCTION rollup_agg_reduce(memo json, data json) RETURNS json AS $$
  if (memo === null) {
    memo = {};
  }
  var keys = Object.keys(data);
  var len = keys.length;
  var i;
  var key;
  for (i = 0; i < len; i += 1) {
    key = keys[i];
    var input = data[key];
    var prev = memo[key];
    if (prev === undefined) {
      memo[key] = input;
    } else {
      var oldCount = prev[0];
      var count = input[0];
      memo[key] = [
        oldCount + count,
        (prev[1] * oldCount + input[1] * count) / (oldCount + count),
        Math.max(prev[2], input[2]),
        Math.min(prev[3], input[3]),
        prev[4] + input[4]
      ];
    }
  }
  return memo;
$$ LANGUAGE plv8 IMMUTABLE STRICT;

CREATE OR REPLACE FUNCTION rollup_agg_map(data json) RETURNS json AS $$
  var mapped = {};
  var keys = Object.keys(data);
  var len = keys.length;
  var i;
  var key;
  for (i = 0; i < len; i += 1) {
    key = keys[i];
    var tmp = data[key];
    var input = parseFloat(tmp);
    if (!isNaN(input) && Object.prototype.toString.call(tmp) !== '[object Array]') {
      mapped[key] = [1, input, input, input, input * input];
    }
  }
  return mapped;
$$ LANGUAGE plv8 IMMUTABLE STRICT;

-- Custom aggregation for assembling the mean for each field into JSON
CREATE AGGREGATE rollup_agg (json) (
  SFUNC = rollup_agg_reduce,
  STYPE = json,
  INITCOND = '{}'
);

CREATE OR REPLACE FUNCTION get_rollup_fields(data json) RETURNS json AS $$
  /*
   * Return a copy of the input that only contains fields appropriate for
   * aggregate calculations (things besides Array that parse to a float)
   */
  var ret = {};
  var keys = Object.keys(data);
  keys.forEach(function (key) {
    var val = data[key];
    var float = parseFloat(val);
    if (!isNaN(float) && Object.prototype.toString.call(val) !== '[object Array]') {
      ret[key] = float;
    }
  });
  return ret;
$$ LANGUAGE plv8 IMMUTABLE STRICT;

CREATE OR REPLACE FUNCTION upsert_rollup_reduce_5min(input json, source_id character(25), t TIMESTAMP WITH TIME ZONE) RETURNS VOID AS $$
/*
 * Use exception-catching and looping to hack an upsert that makes the
 * incremental changes to the rollup_5min table
 */
BEGIN
  LOOP
    /* Try to update */
    UPDATE rollup_5min
    SET
      data = rollup_agg_reduce(data, input),
      updated_at = now()
    WHERE source = source_id
    AND ts = to_timestamp(trunc(EXTRACT(EPOCH FROM t) / 300) * 300);
    IF FOUND THEN
      RETURN;
    END IF;
    /*
     * Otherwise, try to insert
     * If another insert beat us to it, we get a unique-key failure
     * If someone else inserts the same key concurrently,
     * we could get a unique-key failure
     */
    BEGIN
      INSERT INTO rollup_5min
      (source, ts, data, updated_at, created_at)
      SELECT
        source_id AS source,
        to_timestamp(trunc(EXTRACT(EPOCH FROM t) / 300) * 300) AS ts,
        rollup_agg_reduce('{}'::json, input) AS data,
        now() AS updated_at,
        t AS created_at
      ;
      RETURN;
    EXCEPTION WHEN unique_violation THEN
    /* Loop to try the UPDATE again. */
    END;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Triggerable function
CREATE OR REPLACE FUNCTION rollup_5min_row() RETURNS TRIGGER AS $$
BEGIN
PERFORM upsert_rollup_reduce_5min(rollup_agg_map(NEW.data), NEW.source, NEW.ts);
RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Define an after-trigger for inserts on the entries table
CREATE TRIGGER rollup_5min_trigger AFTER INSERT ON entries
  FOR EACH ROW EXECUTE PROCEDURE rollup_5min_row();

CREATE OR REPLACE FUNCTION rollup_pick(data json, fields TEXT ARRAY, type TEXT) RETURNS json AS $$
  var ret = {};
  var len = fields.length;
  var i;
  var field;
  for (i = 0; i < len; i += 1) {
    field = fields[i];
    switch (type) {
      case 'count':
        ret[field] = data[field][0];
        break;
      case 'mean':
        ret[field] = data[field][1];
        break;
      case 'max':
        ret[field] = data[field][2];
        break;
      case 'min':
        ret[field] = data[field][3];
        break;
      case 'sumsq':
        ret[field] = data[field][4];
        break;
    }
  }
  return ret;
$$ LANGUAGE plv8 IMMUTABLE STRICT;
