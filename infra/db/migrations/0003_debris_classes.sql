-- Reference table for the 15 confirmed YOLO26 debris classes (CLAUDE.md §6).
-- This is required structural reference data (Detections/TreatmentRecommendations
-- FK against it), not demo/sample data — it is seeded here, not in infra/db/seed.
-- Verified directly against services/inference/models/best.onnx embedded metadata
-- (`names` property) at build time — do not hand-edit without re-verifying against
-- the model file, and keep in sync with packages/shared/src/debris-classes.ts and
-- services/inference/app/constants.py.
CREATE TABLE debris_classes (
  class_id   SMALLINT PRIMARY KEY,
  class_name TEXT NOT NULL UNIQUE
);

INSERT INTO debris_classes (class_id, class_name) VALUES
  (0,  'Mask'),
  (1,  'can'),
  (2,  'cellphone'),
  (3,  'electronics'),
  (4,  'gbottle'),
  (5,  'glove'),
  (6,  'metal'),
  (7,  'misc'),
  (8,  'net'),
  (9,  'pbag'),
  (10, 'pbottle'),
  (11, 'plastic'),
  (12, 'rod'),
  (13, 'sunglasses'),
  (14, 'tire');
