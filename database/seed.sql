-- Sample data so the app isn't empty. Run AFTER schema.sql.
-- Safe to run once. Running it twice adds the rows twice.

INSERT INTO sites (name, location, contractor) VALUES
    ('Kuching Waterfront Tower',      'Kuching',  'Borneo Builders Sdn Bhd'),
    ('Miri Coastal Highway Bridge',   'Miri',     'Rajang Engineering'),
    ('Sibu Community Hospital Annex', 'Sibu',     'Kenyalang Construction'),
    ('Bintulu Port Warehouse',        'Bintulu',  'Hornbill Infra Works');

INSERT INTO inspections (site_id, inspector, category, result, notes, inspected_on) VALUES
    ((SELECT id FROM sites WHERE name = 'Kuching Waterfront Tower'),      'Aisyah Rahman', 'safety',     'pass', 'Scaffolding and guardrails in good condition.',            CURRENT_DATE - 14),
    ((SELECT id FROM sites WHERE name = 'Kuching Waterfront Tower'),      'Daniel Ling',   'structural', 'fail', 'Hairline cracks on level 3 column C4. Re-inspect in 7 days.', CURRENT_DATE - 6),
    ((SELECT id FROM sites WHERE name = 'Kuching Waterfront Tower'),      'Aisyah Rahman', 'electrical', 'pass', 'Temporary DB boards earthed and labelled.',                 CURRENT_DATE - 2),
    ((SELECT id FROM sites WHERE name = 'Miri Coastal Highway Bridge'),   'Jason Anak Jimbun', 'structural', 'pass', 'Pier 2 rebar spacing matches drawings.',              CURRENT_DATE - 10),
    ((SELECT id FROM sites WHERE name = 'Miri Coastal Highway Bridge'),   'Jason Anak Jimbun', 'safety',     'fail', 'Two workers without harness at deck edge.',           CURRENT_DATE - 3),
    ((SELECT id FROM sites WHERE name = 'Sibu Community Hospital Annex'), 'Mei Ling Wong', 'plumbing',   'pass', 'Pressure test on level 1 water lines passed.',             CURRENT_DATE - 5),
    ((SELECT id FROM sites WHERE name = 'Bintulu Port Warehouse'),        'Farid Osman',   'electrical', 'fail', 'Exposed cabling near loading bay 2.',                      CURRENT_DATE - 1);
