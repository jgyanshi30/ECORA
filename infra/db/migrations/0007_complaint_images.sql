-- CLAUDE.md §5, §11: ComplaintImages — storage_key only, never a public URL.
-- Signed, time-limited URLs are minted by the app layer at read time.
CREATE TABLE complaint_images (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id  UUID NOT NULL REFERENCES complaints (id) ON DELETE CASCADE,
  image_type    TEXT NOT NULL CHECK (image_type IN ('original', 'annotated')),
  storage_key   TEXT NOT NULL,
  mime_type     TEXT NOT NULL CHECK (mime_type IN ('image/jpeg', 'image/png', 'image/webp')),
  size_bytes    BIGINT NOT NULL CHECK (size_bytes > 0),
  width_px      INTEGER,
  height_px     INTEGER,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_complaint_images_complaint_id ON complaint_images (complaint_id);
