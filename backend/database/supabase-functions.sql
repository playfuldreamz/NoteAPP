-- Function to execute dynamic SQL
CREATE OR REPLACE FUNCTION execute_sql(sql text, params jsonb DEFAULT '[]'::jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
BEGIN
  EXECUTE sql INTO result USING params;
  RETURN result;
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('error', SQLERRM);
END;
$$;

-- Function to create users table
CREATE OR REPLACE FUNCTION create_users_table(sql text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE sql;
END;
$$;

-- Function to create notes table
CREATE OR REPLACE FUNCTION create_notes_table(sql text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE sql;
END;
$$;

-- Function to create tags table
CREATE OR REPLACE FUNCTION create_tags_table(sql text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE sql;
END;
$$;

-- Function to create item_tags table
CREATE OR REPLACE FUNCTION create_item_tags_table(sql text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE sql;
END;
$$;

-- Function to create transcription_settings table
CREATE OR REPLACE FUNCTION create_transcription_settings_table(sql text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE sql;
END;
$$;

-- Function to create app_settings table
CREATE OR REPLACE FUNCTION create_app_settings_table(sql text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE sql;
END;
$$;

-- Function to create user_settings table
CREATE OR REPLACE FUNCTION create_user_settings_table(sql text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE sql;
END;
$$;

-- Function to create transcripts table
CREATE OR REPLACE FUNCTION create_transcripts_table(sql text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE sql;
END;
$$;

-- Function to create user_tags table
CREATE OR REPLACE FUNCTION create_user_tags_table(sql text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE sql;
END;
$$;

-- Function to create action_items table
CREATE OR REPLACE FUNCTION create_action_items_table(sql text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE sql;
END;
$$;

-- Function to create links table
CREATE OR REPLACE FUNCTION create_links_table(sql text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE sql;
END;
$$;
