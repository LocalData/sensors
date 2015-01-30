
CREATE EXTENSION IF NOT EXISTS plv8;

CREATE OR REPLACE FUNCTION update_rollup_aggregate(agg json, counts json, data json, type text) RETURNS json AS $$
  /*
   * Calculate the specified type of aggregation (mean, count, max, min,
   * sumsq=sum of squares) for each field of the new data using the new data
   * point, the old aggregate value, and the old counts
   */
  var keys = Object.keys(data);

  keys.forEach(function (key) {
    var oldCount = counts[key];
    var val = data[key];
    var count;
    if (oldCount === undefined) {
      if (type === 'count') {
        agg[key] = 1;
      } else if (type === 'sumsq') {
        agg[key] = val * val;
      } else {
        agg[key] = val;
      }
    } else {
      count = oldCount + 1;
      if (type === 'mean') {
        agg[key] = ((agg[key] * oldCount) + val) / (count);
      } else if (type === 'count') {
        agg[key] = count;
      } else if (type === 'max') {
        agg[key] = Math.max(agg[key], val);
      } else if (type === 'min') {
        agg[key] = Math.min(agg[key], val);
      } else if (type === 'sumsq') {
        agg[key] += val * val;
      }
    }
  });

  return agg;
$$ LANGUAGE plv8 IMMUTABLE STRICT;

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

CREATE OR REPLACE FUNCTION upsert_rollup_5min(data json, source_id character(25), t TIMESTAMP WITH TIME ZONE) RETURNS VOID AS $$
-- Use exception-catching and looping to hack an upsert that makes the
-- incremental changes to the rollup_5min table
BEGIN
  LOOP
    -- Try to update
    UPDATE rollup_5min
    SET
      mean = update_rollup_aggregate(mean, count, data, 'mean'),
      count = update_rollup_aggregate(count, count, data, 'count'),
      max = update_rollup_aggregate(max, count, data, 'max'),
      min = update_rollup_aggregate(min, count, data, 'min'),
      sumsq = update_rollup_aggregate(sumsq, count, data, 'sumsq'),
      "updatedAt" = now()
    WHERE source = source_id
    AND ts = to_timestamp(trunc(EXTRACT(EPOCH FROM t) / 300) * 300);
    IF FOUND THEN
      RETURN;
    END IF;
    -- Otherwise, try to insert
    -- If another insert beat us to it, we get a unique-key failure
    -- If someone else inserts the same key concurrently,
    -- we could get a unique-key failure
    BEGIN
      INSERT INTO rollup_5min
      (source, ts, mean, count, max, min, sumsq, "updatedAt", "createdAt")
      SELECT
        source_id AS source,
        to_timestamp(trunc(EXTRACT(EPOCH FROM t) / 300) * 300) AS ts,
        update_rollup_aggregate('{}'::json, '{}'::json, data, 'mean') AS mean,
        update_rollup_aggregate('{}'::json, '{}'::json, data, 'count') AS count,
        update_rollup_aggregate('{}'::json, '{}'::json, data, 'max') AS max,
        update_rollup_aggregate('{}'::json, '{}'::json, data, 'min') AS min,
        update_rollup_aggregate('{}'::json, '{}'::json, data, 'sumsq') AS sumsq,
        now() AS "updatedAt",
        t AS "createdAt"
      ;
      RETURN;
    EXCEPTION WHEN unique_violation THEN
    -- Loop to try the UPDATE again.
    END;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Triggerable function
CREATE OR REPLACE FUNCTION rollup_5min_row() RETURNS TRIGGER AS $$
BEGIN
PERFORM upsert_rollup_5min(get_rollup_fields(NEW.data), NEW.source, NEW.ts);
RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Define an after-trigger for inserts on the entries table
CREATE TRIGGER rollup_5min_trigger AFTER INSERT ON entries
  FOR EACH ROW EXECUTE PROCEDURE rollup_5min_row();
