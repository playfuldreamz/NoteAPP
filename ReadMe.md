# Voice Note Taking App

This repository contains a full-stack web application for taking voice notes. It uses a React frontend, a Node.js/Express backend, and stores notes in a JSON file.

## Features

* Record voice notes directly in the browser.
* Save notes associated with a username.
* View a list of saved notes.
* Basic user authentication (username/password).

## Technologies Used

**Frontend:**

* React
* React Bootstrap
* React Icons
* React Toastify (for notifications)
* Styled Components
* Axios (for HTTP requests)

**Backend:**

* Node.js
* Express.js
* bcrypt (for password hashing)
* jsonwebtoken (for JWT authentication)
* body-parser (for parsing request bodies)
* cors (for enabling Cross-Origin Resource Sharing)
* dotenv (for environment variables)

## Project Structure

```
voice-note-taking-app/
├── backend/
│   ├── data/
│   │   ├── notes.json
│   │   └── users.json
│   ├── package.json
│   ├── package-lock.json
│   └── index.js (main backend file)
├── frontend/
│   ├── public/
│   │   └── manifest.json
│   ├── src/
│   │   ├── App.js (main React component)
│   │   ├── ... other React components and files
│   │   └── index.js (entry point)
│   ├── package.json
│   └── package-lock.json
└── package.json (root package.json)
```

## Setup and Installation

1. **Clone the repository:**

   ```bash
   git clone https://github.com/<your-username>/voice-note-taking-app.git
   ```

2. **Install dependencies:**

   ```bash
   cd voice-note-taking-app
   npm install  # Installs root dependencies (if any)
   cd backend
   npm install
   cd ../frontend
   npm install
   ```

3. **Set up environment variables:**

   Create a `.env` file in the `backend` directory and add the following:

   ```
   JWT_SECRET=<your-secret-key>
   ```

4. **Start the application:**

   Open two terminal windows. In the first, navigate to the `backend` directory and run:

   ```bash
   node index.js
   ```

   In the second, navigate to the `frontend` directory and run:

   ```bash
   npm start
   ```

   This will start the backend server and the frontend development server. The frontend will be served on `http://localhost:3000` by default.

## Usage

1. **Register a new user:**  Provide a username and password.
2. **Log in:** Use your registered credentials.
3. **Start recording:** Click the record button and speak your note.
4. **Save the note:**  The note will be saved to the `notes.json` file.
5. **View notes:**  See a list of your saved notes.

## Future Improvements

* Implement a proper database (e.g., MongoDB, PostgreSQL) instead of using a JSON file for persistent storage.
* Add more robust user authentication and authorization.
* Implement features like editing and deleting notes.
* Improve the UI/UX.
* Add support for different audio formats.
* Deploy the application to a cloud platform.


## Contributing

Contributions are welcome! Please feel free to open issues and pull requests.

## License

This project is licensed under the ISC License.