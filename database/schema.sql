-- SiteCheck database schema
-- Run this in pgAdmin: right-click the "sitecheck" database > Query Tool > open this file > Execute (F5)

CREATE TABLE IF NOT EXISTS sites (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(120) NOT NULL,
    location    VARCHAR(120) NOT NULL,
    contractor  VARCHAR(120) NOT NULL DEFAULT '',
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS inspections (
    id            SERIAL PRIMARY KEY,
    site_id       INTEGER      NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    inspector     VARCHAR(120) NOT NULL,
    category      VARCHAR(20)  NOT NULL,
    result        VARCHAR(10)  NOT NULL,
    notes         TEXT         NOT NULL DEFAULT '',
    inspected_on  DATE         NOT NULL DEFAULT CURRENT_DATE,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT inspections_category_check CHECK (category IN ('safety', 'structural', 'electrical', 'plumbing')),
    CONSTRAINT inspections_result_check   CHECK (result IN ('pass', 'fail'))
);

CREATE INDEX IF NOT EXISTS ix_inspections_site_id ON inspections (site_id);
