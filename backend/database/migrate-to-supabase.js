require('dotenv').config();
const supabase = require('./supabase');

/**
 * This script creates all the necessary tables in Supabase
 * to migrate from SQLite to Supabase
 */
async function createTables() {
  try {
    console.log('Starting Supabase migration...');

    // Create users table
    console.log('Creating users table...');
    const { error: usersError } = await supabase.rpc('create_users_table', {
      sql: `
        CREATE TABLE IF NOT EXISTS public.users (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          username TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `
    });
    
    if (usersError) throw usersError;

    // Create notes table
    console.log('Creating notes table...');
    const { error: notesError } = await supabase.rpc('create_notes_table', {
      sql: `
        CREATE TABLE IF NOT EXISTS public.notes (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          content TEXT,
          title TEXT,
          transcript TEXT,
          summary TEXT,
          user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
          timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_notes_user_id ON public.notes(user_id);
      `
    });
    
    if (notesError) throw notesError;

    // Create tags table
    console.log('Creating tags table...');
    const { error: tagsError } = await supabase.rpc('create_tags_table', {
      sql: `
        CREATE TABLE IF NOT EXISTS public.tags (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          name TEXT UNIQUE NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `
    });
    
    if (tagsError) throw tagsError;

    // Create item_tags join table
    console.log('Creating item_tags table...');
    const { error: itemTagsError } = await supabase.rpc('create_item_tags_table', {
      sql: `
        CREATE TABLE IF NOT EXISTS public.item_tags (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          item_id UUID NOT NULL,
          item_type TEXT NOT NULL CHECK(item_type IN ('note', 'transcript')),
          tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(item_id, item_type, tag_id)
        );
        CREATE INDEX IF NOT EXISTS idx_item_tags_item ON public.item_tags(item_id, item_type);
        CREATE INDEX IF NOT EXISTS idx_item_tags_tag ON public.item_tags(tag_id);
      `
    });
    
    if (itemTagsError) throw itemTagsError;

    // Create transcription_settings table
    console.log('Creating transcription_settings table...');
    const { error: transcriptionSettingsError } = await supabase.rpc('create_transcription_settings_table', {
      sql: `
        CREATE TABLE IF NOT EXISTS public.transcription_settings (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
          provider_id TEXT NOT NULL,
          api_key TEXT,
          language TEXT NOT NULL DEFAULT 'en',
          settings TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(user_id, provider_id)
        );
        CREATE INDEX IF NOT EXISTS idx_transcription_settings_user_id 
          ON public.transcription_settings(user_id);
      `
    });
    
    if (transcriptionSettingsError) throw transcriptionSettingsError;

    // Create app_settings table
    console.log('Creating app_settings table...');
    const { error: appSettingsError } = await supabase.rpc('create_app_settings_table', {
      sql: `
        CREATE TABLE IF NOT EXISTS public.app_settings (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          provider TEXT NOT NULL,
          api_key TEXT NOT NULL,
          is_active BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `
    });
    
    if (appSettingsError) throw appSettingsError;

    // Create user_settings table
    console.log('Creating user_settings table...');
    const { error: userSettingsError } = await supabase.rpc('create_user_settings_table', {
      sql: `
        CREATE TABLE IF NOT EXISTS public.user_settings (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
          provider TEXT NOT NULL,
          api_key TEXT NOT NULL,
          is_active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON public.user_settings(user_id);
      `
    });
    
    if (userSettingsError) throw userSettingsError;

    // Create transcripts table
    console.log('Creating transcripts table...');
    const { error: transcriptsError } = await supabase.rpc('create_transcripts_table', {
      sql: `
        CREATE TABLE IF NOT EXISTS public.transcripts (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          text TEXT,
          title TEXT,
          summary TEXT,
          user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
          date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          duration INTEGER,
          FOREIGN KEY(user_id) REFERENCES public.users(id)
        );
        CREATE INDEX IF NOT EXISTS idx_transcripts_user_id ON public.transcripts(user_id);
      `
    });
    
    if (transcriptsError) throw transcriptsError;

    // Create user_tags table
    console.log('Creating user_tags table...');
    const { error: userTagsError } = await supabase.rpc('create_user_tags_table', {
      sql: `
        CREATE TABLE IF NOT EXISTS public.user_tags (
          user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
          tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (user_id, tag_id)
        );
      `
    });
    
    if (userTagsError) throw userTagsError;

    // Create action_items table
    console.log('Creating action_items table...');
    const { error: actionItemsError } = await supabase.rpc('create_action_items_table', {
      sql: `
        CREATE TABLE IF NOT EXISTS public.action_items (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          content TEXT NOT NULL,
          source_id UUID NOT NULL,
          source_type TEXT CHECK(source_type IN ('note', 'transcript')) NOT NULL,
          deadline TEXT,
          priority TEXT CHECK(priority IN ('high', 'medium', 'low')) NOT NULL,
          status TEXT CHECK(status IN ('pending', 'completed', 'cancelled')) DEFAULT 'pending',
          confidence REAL NOT NULL,
          metadata TEXT,
          user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_action_items_user_id ON public.action_items(user_id);
        CREATE INDEX IF NOT EXISTS idx_action_items_source ON public.action_items(source_id, source_type);
      `
    });
    
    if (actionItemsError) throw actionItemsError;

    // Create links table
    console.log('Creating links table...');
    const { error: linksError } = await supabase.rpc('create_links_table', {
      sql: `
        CREATE TABLE IF NOT EXISTS public.links (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          source_id UUID NOT NULL,
          source_type TEXT NOT NULL CHECK(source_type IN ('note', 'transcript')),
          target_id UUID NOT NULL,
          target_type TEXT NOT NULL CHECK(target_type IN ('note', 'transcript')),
          link_text TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(source_id, source_type, target_id, target_type)
        );
        CREATE INDEX IF NOT EXISTS idx_links_source ON public.links(source_id, source_type);
        CREATE INDEX IF NOT EXISTS idx_links_target ON public.links(target_id, target_type);
      `
    });
    
    if (linksError) throw linksError;

    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
  }
}

// Run the migration
createTables();
