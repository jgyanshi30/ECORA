-- CLAUDE.md §8: TreatmentRecommendations — editable-by-admin, keyed off the
-- 15 verified debris classes. Stored as data (not switch logic) so admins can
-- edit recommendations without a deploy. The rows below are the suggested
-- starting mapping from CLAUDE.md §8 — real operational default config
-- required for the app to function, not fabricated demo statistics (CLAUDE.md
-- §0 does not apply to this reference/config data).
--
-- The web app must always render these with a label that they are
-- operational recommendations requiring admin verification, not automatic
-- instructions (CLAUDE.md §8).
CREATE TABLE treatment_recommendations (
  class_name  TEXT PRIMARY KEY REFERENCES debris_classes (class_name),
  recommendation TEXT NOT NULL,
  updated_by  UUID REFERENCES users (id),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO treatment_recommendations (class_name, recommendation) VALUES
  ('plastic',     'Collection, segregation, transfer to authorised plastic-waste facility'),
  ('pbag',        'Collection, segregation, transfer to authorised plastic-waste facility'),
  ('pbottle',     'Collection, segregation, transfer to authorised plastic-waste facility'),
  ('can',         'Safe recovery, segregation, recycling'),
  ('metal',       'Safe recovery, segregation, recycling'),
  ('net',         'Specialist retrieval — entanglement/wildlife risk, do not remove by hand'),
  ('electronics', 'Hazardous handling, authorised e-waste processing'),
  ('cellphone',   'Hazardous handling, authorised e-waste processing'),
  ('gbottle',     'Protective handling (sharp-edge risk), glass recycling'),
  ('tire',        'Mechanical recovery, transfer to authorised recycler'),
  ('Mask',        'Treat as potential biohazard — protective handling, isolate before disposal'),
  ('glove',       'Treat as potential biohazard — protective handling, isolate before disposal'),
  ('misc',        'Manual inspection, category-specific disposal after review'),
  ('rod',         'Manual inspection, category-specific disposal after review'),
  ('sunglasses',  'Manual inspection, category-specific disposal after review');
