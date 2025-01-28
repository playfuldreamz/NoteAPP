# API Specification

## Base URL
`http://localhost:5000/api`

## Authentication
- JWT Token based authentication
- Token passed in Authorization header
- Token format: `Bearer {token}`

## Endpoints

### Notes
- `GET /notes/recent` - Get recent notes
  - Response: Array of Note objects
  - Note: { id, title, content, timestamp, tags }

- `GET /notes/all` - Get all notes
  - Response: Array of Note objects

### Transcripts
- `GET /transcripts/recent` - Get recent transcripts
  - Response: Array of Transcript objects
  - Transcript: { id, title, text, date, timestamp, duration, tags? }

- `GET /transcripts/all` - Get all transcripts
  - Response: Array of Transcript objects

### Stats
- `GET /stats` - Get user activity statistics
  - Response: { totalNotes, totalTranscripts, recentActivity }

## Error Responses
- 401 Unauthorized: Invalid or missing token
- 500 Server Error: Internal server error
