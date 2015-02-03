
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
DECLARE
s record;
foo record;
BEGIN
  FOR s IN
    WITH m AS (
      SELECT
      sources.source,
      LEAST(min(r.created_at), now()) AS tlimit
      FROM sources
      LEFT OUTER JOIN rollup_5min r
      ON sources.source = r.source
      GROUP BY sources.source
      ORDER BY sources.source
    )
    SELECT
    m.source,
    m.tlimit,
    e.tmin,
    e.tmax
    FROM m,
    LATERAL (
      SELECT
      min(ts) AS tmin,
      max(ts) AS tmax
      FROM entries
      WHERE entries.source = m.source
      AND ts < m.tlimit
    ) e
  LOOP
    RAISE NOTICE
      '% Processing source %, entry_count=% % % %',
      clock_timestamp(),
      s.source,
      (SELECT COUNT(*) FROM entries WHERE source = s.source AND ts >= s.tmin  AND ts < s.tmax),
      s.tmin, s.tmax, s.tlimit;
    PERFORM upsert_rollup_reduce_5min(g.data, s.source, g.t)
    FROM (
      SELECT
      rollup_agg(rollup_agg_map(entries.data)) AS data,
      to_timestamp((EXTRACT(EPOCH FROM entries.ts)::INTEGER / 300) * 300) AS t
      FROM entries
      WHERE source = s.source
      AND ts >= s.tmin
      AND ts < s.tmax
      GROUP BY t ORDER BY t
    ) g;
  END LOOP;
END $func$;
