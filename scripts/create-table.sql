CREATE TABLE entries (source character(25), ts timestamptz, data json);
CREATE INDEX ON entries (source);
CREATE INDEX ON entries (ts);