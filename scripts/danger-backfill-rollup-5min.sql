
-- Backfill the 5-minute rollup table.

-- We find the earliest rollup creation time for each source. If there's none,
-- we use the start time of the transaction.
--
-- For each source, we process all of entries from before that rollup creation
-- time.
--
-- This allows incoming entries to trigger normal upserts and trickly in data to
-- the table, and we can process all of the entries from before that started
-- happening.

DO $func$
DECLARE s record;
BEGIN
  FOR s IN
    SELECT
      sources.source, LEAST(min(rollup_5min."createdAt"), now()) AS ts
    FROM sources
    LEFT OUTER JOIN rollup_5min
    ON sources.source = rollup_5min.source
    GROUP BY sources.source
  LOOP
    RAISE NOTICE 'Processing source %', s.source;
    PERFORM upsert_rollup_5min(get_rollup_fields(data), source, ts)
    FROM entries
    WHERE source = s.source
    AND ts < s.ts;
  END LOOP;
END $func$;
