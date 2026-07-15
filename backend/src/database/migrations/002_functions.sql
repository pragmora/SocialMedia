-- 002_functions.sql — Helper functions for SocialFlow
-- Ejecutar en Supabase SQL Editor después de 001_init.sql

-- Delete a comment scoped to workspace + author
CREATE OR REPLACE FUNCTION delete_comment(
  p_comment_id UUID,
  p_author_id UUID,
  p_workspace_id UUID
)
RETURNS void AS $$
BEGIN
  DELETE FROM comments c
  USING content_items ci
  WHERE c.id = p_comment_id
    AND c.author_id = p_author_id
    AND ci.id = c.content_item_id
    AND ci.workspace_id = p_workspace_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'comment not found' USING ERRCODE = 'P0002';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
