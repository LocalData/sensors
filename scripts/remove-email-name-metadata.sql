
-- Scrub the email and name JSON fields from sources.data, so that we don't have
-- personal info in what should be public metadata fields.

-- We create and drop the helper function in a transaction. That way, if the
-- function already exists, we mutate the database with a mystery function, and
-- we won't destructively replace an existing function with a new one. If the
-- function has not been defined (the intended situation), it will only exist
-- temporarily.

BEGIN;
CREATE FUNCTION scrub_field(data json, field TEXT) RETURNS json AS $$
  data[field] = undefined; return data;
$$ LANGUAGE plv8 IMMUTABLE STRICT;
UPDATE sources SET data = scrub_field(data, 'email');
-- UPDATE sources SET data = scrub_field(data, 'name');
DROP FUNCTION scrub_field(json, TEXT);
COMMIT;
