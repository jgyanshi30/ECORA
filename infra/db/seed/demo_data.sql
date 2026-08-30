-- =============================================================================
-- DEMO DATA — for local development / manual testing ONLY.
-- Never run this against a staging or production database.
-- Every row here is synthetic. CLAUDE.md §0 requires that anything the UI
-- renders from this data be visibly labeled "Demo data" / "Sample data" —
-- this file's job is only to give Phase 2 (the Next.js app) something to
-- query against locally; it is not auto-applied by docker-entrypoint-initdb.d.
--
-- Apply manually after `docker compose up`:
--   docker compose exec -T db psql -U user -d ecora -f /seed/demo_data.sql
-- =============================================================================

INSERT INTO model_versions (id, version, runtime, model_path, class_map, is_active)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'yolo26s-underwater-v1',
  'onnx',
  '/models/best.onnx',
  '{"0":"Mask","1":"can","2":"cellphone","3":"electronics","4":"gbottle","5":"glove","6":"metal","7":"misc","8":"net","9":"pbag","10":"pbottle","11":"plastic","12":"rod","13":"sunglasses","14":"tire"}'::jsonb,
  TRUE
);

INSERT INTO users (id, email, password_hash, role, full_name, phone) VALUES
  ('00000000-0000-0000-0000-000000000010', 'demo.citizen@example.com', '$2b$12$demoDemoDemoDemoDemoDeOhashOnlyNotARealHash', 'citizen', '[DEMO] Asha Verma', '+91-90000-00001'),
  ('00000000-0000-0000-0000-000000000011', 'demo.admin@example.com',   '$2b$12$demoDemoDemoDemoDemoDeOhashOnlyNotARealHash', 'admin',   '[DEMO] Admin User', '+91-90000-00002');

INSERT INTO locations (id, geog, accuracy_meters, locality, city, district, state, pin_code, consent_given, consent_captured_at) VALUES
  ('00000000-0000-0000-0000-000000000020', ST_SetSRID(ST_MakePoint(72.8347, 18.9220), 4326)::geography, 8.5, 'Colaba Waterfront', 'Mumbai', 'Mumbai City', 'Maharashtra', '400005', TRUE, now()),
  ('00000000-0000-0000-0000-000000000021', ST_SetSRID(ST_MakePoint(80.2785, 13.0569), 4326)::geography, 12.0, 'Marina Beach', 'Chennai', 'Chennai', 'Tamil Nadu', '600001', TRUE, now());

INSERT INTO complaints (id, complaint_number, citizen_id, location_id, status, description) VALUES
  ('00000000-0000-0000-0000-000000000030', 'CLN-20260815-DEM0A1', '00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000020', 'UNDER_REVIEW', '[DEMO] Sample complaint — plastic debris near the waterfront.'),
  ('00000000-0000-0000-0000-000000000031', 'CLN-20260820-DEM0B2', '00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000021', 'RESOLVED', '[DEMO] Sample complaint — fishing net entanglement hazard, since cleared.');

INSERT INTO status_history (complaint_id, from_status, to_status, changed_by, note) VALUES
  ('00000000-0000-0000-0000-000000000030', NULL, 'SUBMITTED', '00000000-0000-0000-0000-000000000010', '[DEMO] Initial submission'),
  ('00000000-0000-0000-0000-000000000030', 'SUBMITTED', 'AI_ANALYSIS_PENDING', NULL, '[DEMO] Queued for inference'),
  ('00000000-0000-0000-0000-000000000030', 'AI_ANALYSIS_PENDING', 'UNDER_REVIEW', NULL, '[DEMO] Inference complete'),
  ('00000000-0000-0000-0000-000000000031', NULL, 'SUBMITTED', '00000000-0000-0000-0000-000000000010', '[DEMO] Initial submission'),
  ('00000000-0000-0000-0000-000000000031', 'SUBMITTED', 'RESOLVED', '00000000-0000-0000-0000-000000000011', '[DEMO] Fast-forwarded for demo purposes');

INSERT INTO public_updates (complaint_id, message, created_by) VALUES
  ('00000000-0000-0000-0000-000000000030', '[DEMO] Your report was received and is under review.', NULL),
  ('00000000-0000-0000-0000-000000000031', '[DEMO] This issue has been resolved. Thank you for reporting it.', '00000000-0000-0000-0000-000000000011');

INSERT INTO risk_assessments (complaint_id, risk_level, score, factor_breakdown) VALUES
  ('00000000-0000-0000-0000-000000000030', 'MEDIUM', 45.0, '{"note": "[DEMO] placeholder factor breakdown — real scoring module lands with the risk-scoring service", "category_weight": 20, "object_count_weight": 10, "location_sensitivity_weight": 15}'::jsonb);
