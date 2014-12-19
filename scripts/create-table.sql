CREATE TABLE entries (source character(25), ts timestamptz, data json);
CREATE INDEX ON entries (source);
CREATE INDEX ON entries (ts);

CREATE TABLE sources (source character(25) PRIMARY KEY, token text UNIQUE, data json);