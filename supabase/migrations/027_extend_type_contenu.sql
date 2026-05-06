-- Extend type_contenu CHECK constraint to include platform-specific content types
-- Added: carrousel (Instagram), programme (WhatsApp), short (YouTube), duet (TikTok)

ALTER TABLE posts
  DROP CONSTRAINT IF EXISTS posts_type_contenu_check;

ALTER TABLE posts
  ADD CONSTRAINT posts_type_contenu_check
    CHECK (type_contenu IN (
      'photo', 'video', 'reel', 'story', 'texte', 'annonce', 'citation', 'evenement',
      'carrousel', 'programme', 'short', 'duet'
    ));
