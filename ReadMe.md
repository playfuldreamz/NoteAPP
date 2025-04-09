# NoteApp

This repository contains a full-stack web application for taking and organizing notes. It uses a Next.js frontend, a Node.js/Express backend, and stores notes in a SQLite database.

## Features

* Create and save text notes
* Automatic title generation using AI
* View and organize saved notes
* User authentication
* Dark mode support
* Download transcripts in multiple formats (TXT, JSON, PDF)

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
* SQLite
* JWT authentication
* OpenAI/Gemini integration

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
2. Create new notes
3. Notes will automatically get AI-generated titles
4. View and organize your saved notes
5. Download transcripts in your preferred format:
   - Click the download icon next to any transcript
   - Select format (TXT, JSON, or PDF)
   - Choose whether to include metadata
   - Download will start automatically

## Future Improvements

* Add note editing functionality
* Implement note categorization/tagging
* Add search functionality
* Improve AI title generation options
* Add mobile app support

## Contributing

Contributions are welcome! Please feel free to open issues and pull requests.

## License

This project is licensed under the ISC License.
