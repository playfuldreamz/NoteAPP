# Migrating from SQLite to Supabase

This document outlines the process of migrating the NoteAPP from SQLite to Supabase.

## What is Supabase?

Supabase is an open-source Firebase alternative that provides a PostgreSQL database, authentication, instant APIs, real-time subscriptions, and storage. It offers a more scalable and feature-rich alternative to SQLite.

## Migration Steps

### 1. Set Up a Supabase Project

1. Go to [Supabase](https://supabase.com/) and sign up for an account
2. Create a new project
3. Note your project URL and anon key (public API key)

### 2. Configure Environment Variables

Create a `.env` file in the backend directory with the following variables:

```
# Supabase Configuration
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key

# JWT Secret for authentication
JWT_SECRET=your_jwt_secret

# AI API Keys
OPENAI_API_KEY=your_openai_api_key
GEMINI_API_KEY=your_gemini_api_key

# Server Configuration
PORT=5000
```

### 3. Create SQL Functions in Supabase

1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Copy the contents of `backend/database/supabase-functions.sql`
4. Run the SQL to create the necessary functions

### 4. Run the Migration Script

```bash
cd backend
node migrate.js
```

This script will:
1. Create the necessary tables in Supabase
2. Migrate your existing data from SQLite to Supabase

### 5. Test the Application

After migration, run the application to ensure everything works correctly:

```bash
cd backend
npm start
```

## Architecture Changes

### Database Connection

The migration replaces direct SQLite connections with Supabase client connections. A compatibility layer (`db.js`) has been implemented to maintain the same API for database operations.

### Authentication

Authentication now uses Supabase's auth services while maintaining compatibility with the existing JWT-based authentication flow.

### Data Models

Data models have been updated to use UUID primary keys instead of auto-incrementing integers, which is the PostgreSQL standard in Supabase.

## Benefits of Supabase

1. **Scalability**: PostgreSQL is more suitable for production applications with many users
2. **Real-time subscriptions**: Get live updates when data changes
3. **Authentication**: Built-in auth with multiple providers (email, social, etc.)
4. **Storage**: File storage capabilities
5. **Hosting**: No need to manage your own database server
6. **Security**: Row-level security policies for fine-grained access control

## Troubleshooting

### Common Issues

1. **Connection errors**: Ensure your Supabase URL and key are correct in the `.env` file
2. **Migration failures**: Check that your SQLite database exists and is accessible
3. **Authentication issues**: Verify that your JWT_SECRET is properly set

### Getting Help

If you encounter issues, refer to the [Supabase documentation](https://supabase.com/docs) or open an issue in the project repository.

## Future Enhancements

With Supabase in place, consider these future enhancements:

1. Implement real-time updates for collaborative note editing
2. Use Supabase Storage for file attachments
3. Implement row-level security for better data protection
4. Add social authentication options
