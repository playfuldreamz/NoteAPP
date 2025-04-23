# NoteApp

This repository contains a full-stack web application for taking and organizing notes. It uses a Next.js frontend, a Node.js/Express backend, and stores notes in a SQLite database.

## Features

* Create and save text notes and voice recordings
* Edit notes and transcripts with formatting preservation
* Automatic title generation using AI
* View and organize saved notes and transcripts
* User authentication
* Dark mode support
* Download transcripts in multiple formats (TXT, JSON, PDF)
* Semantic search across notes and transcripts with configurable embedding providers
* Voice insights and analytics
* Forward and backward linking between notes
* Secure API key management with validation and masking
* Event-based architecture for consistent state management

## Technologies Used

**Frontend:**
* Next.js
* TypeScript
* Tailwind CSS
* React Icons
* React Toastify

**Backend:**
* Node.js
* Express.js
* Better-SQLite3 (high-performance SQLite library)
* JWT authentication
* OpenAI/Gemini integration for AI features
* Xenova local embedding model (no API key required)
* Vector embeddings for semantic search

## Setup and Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/<your-username>/NoteApp.git
   ```

2. **Install dependencies:**
   ```bash
   cd NoteApp
   npm install
   cd backend
   npm install
   cd ../frontend
   npm install
   ```

3. **Set up environment variables:**

   Create a `.env` file in the `backend` directory and add:
   ```
   JWT_SECRET=<your-secret-key>
   OPENAI_API_KEY=<your-openai-key> # Required for OpenAI provider
   GEMINI_API_KEY=<your-gemini-key> # Required for Gemini provider
   DEFAULT_AI_PROVIDER=openai # Fallback provider if none is set
   ```

4. **AI Configuration:**

   The app supports two AI providers for note title generation:
   
   - OpenAI (requires OPENAI_API_KEY)
   - Gemini (requires GEMINI_API_KEY)

   To configure the active provider:
   1. Set the required API keys in your .env file
   2. The system will use the provider specified in the database
   3. If no provider is set, it falls back to DEFAULT_AI_PROVIDER
   4. You can change the active provider via the API:
      - GET /api/ai/config - Get current provider
      - PUT /api/ai/config - Update provider (body: { provider: "openai"|"gemini" })

5. **Start the application:**
   ```bash
   # In one terminal
   cd backend
   npm start

   # In another terminal
   cd frontend
   npm run dev
   ```

## Bi-directional Linking

The application supports powerful bi-directional linking between notes and transcripts, allowing you to create a personal knowledge graph.

### Forward Links

- Create links by using the `[[Title of Note]]` syntax in your content
- Links are automatically detected and processed when saving notes or transcripts
- Clicking on a link navigates directly to the referenced note or transcript
- If multiple items share the same title, the most recently updated one is linked

### Backlinks

- The system automatically tracks all references to your notes and transcripts
- Backlinks panel shows all content that links to the current item
- Helps discover relationships and connections between your ideas
- Provides context for how information is connected across your knowledge base

### Use Cases

- Create a personal wiki with interconnected notes
- Reference transcripts from summary notes
- Build topic clusters around key concepts
- Track related ideas across different content types

## Semantic Search

The application includes semantic search functionality that allows you to find notes and transcripts based on meaning rather than just keywords.

### How It Works

- Notes and transcripts are automatically converted to vector embeddings when created or updated
- Search queries are also converted to embeddings
- Results are ranked by semantic similarity (cosine similarity)
- This enables finding content even when exact keywords aren't present

### Embedding Providers

The application supports multiple embedding providers that can be configured per user:

- **Xenova (Default)**: Uses the local Xenova/all-MiniLM-L6-v2 model
  - Runs completely locally - no API key required
  - Provides 384-dimensional embeddings
  - Ideal for privacy and offline use

- **OpenAI**: Uses OpenAI's text-embedding models
  - Requires an OPENAI_API_KEY in your .env file or user settings
  - Provides high-quality embeddings but requires internet connection

Users can select their preferred provider in the AI Settings menu, with changes applying only to their own content. When changing providers, embeddings will need to be regenerated.

### Backfilling Embeddings

If you have existing notes and transcripts without embeddings (created before this feature was added), you can generate embeddings for them using the backfill script:

```bash
cd backend/scripts
node backfill_embeddings.js
```

This script:
- Processes all notes and transcripts without existing embeddings
- Generates vector embeddings using the configured embedding provider (Xenova by default)
- Stores the embeddings in the database for future searches
- Shows progress as it processes items
- Handles errors gracefully and provides a detailed summary
- Can be run multiple times to update embeddings if content changes

## Database Migrations

The application includes a database migration system to manage schema changes:

### Running Migrations

```bash
cd backend/database/migrations
node runner.js
```

### How Migrations Work

- The system tracks applied migrations in a database table
- Only runs migrations that haven't been applied yet
- Migrations are applied in sequential order based on filename
- Each migration is idempotent (safe to run multiple times)

### Available Migrations

- `001_add_summary_fields.js`: Adds summary columns to notes and transcripts tables
- `002_add_links_table.js`: Creates tables for forward/backward linking between notes
- `003_add_embedding_table.js`: Adds tables for storing vector embeddings for semantic search
- `004_add_embedding_config.js`: Adds embedding provider configuration to user settings

### Creating New Migrations

To create a new migration, add a file to the migrations folder following the naming pattern:
```
NNN_descriptive_name.js
```

Each migration should export:
```javascript
module.exports = {
  up: function() {
    // Code to apply the change
    return Promise...
  },
  down: function() {
    // Code to reverse the change
    return Promise...
  },
  description: 'Brief description'
};
```

## Usage

1. Register a new user or log in
2. Create new notes or record voice transcripts
3. Notes and transcripts will automatically get AI-generated titles
4. Edit content directly in the modal view with preserved formatting
5. View and organize your saved notes and transcripts
6. Configure your preferred AI providers in Settings
7. Download transcripts in your preferred format:
   - Click the download icon next to any transcript
   - Select format (TXT, JSON, or PDF)
   - Choose whether to include metadata
   - Download will start automatically

## API Key Management

The application provides a secure API key management system:

- Keys can be stored in user settings or environment variables
- The UI clearly indicates which source is being used (user or env)
- API keys are masked for security in the UI
- Keys are validated before saving to ensure they work
- Detailed error messages help troubleshoot API key issues

## Content Editing

The application supports full editing capabilities for both notes and transcripts:

- Edit content directly in the modal view
- Formatting is preserved when saving
- Copy button for easy content sharing
- Cancel button to discard changes
- Real-time updates across the application via the event bus system

## Event-Based Architecture

The application uses an event bus system for state management:

- Components communicate without direct references
- UI stays in sync with backend data regardless of where actions originate
- Works with modals that stay open after saving
- Reduces prop drilling and callback complexity
- Provides a consistent pattern for state synchronization

## Future Improvements

* Improve mobile app support
* Add collaborative editing features
* Implement real-time synchronization
* Enhance AI integration with more providers
* Add export/import functionality for all data
* Implement advanced visualization for note connections

## Contributing

Contributions are welcome! Please feel free to open issues and pull requests.

## License

This project is licensed under the ISC License.
