# Netflix-Style Movie App

This project is a MERN-style Netflix-inspired movie application with:

- a Netflix-themed landing screen and intro aesthetic
- login and signup interface at the start
- role-based access for admin and normal users
- movie browsing, search, trending rows, and list sections
- backend API endpoints for authentication and movie/admin data

## Features

- Netflix-inspired dark theme and hero section
- Secure login with JWT token auth
- User accounts stored in MongoDB with bcrypt-hashed passwords
- Movies stored in MongoDB with poster and playable video URLs
- Configurable initial administrator account
- No mock data or demo accounts

## Project structure

- `client/` — React + Vite frontend
- `server/` — Express backend API

## Run locally

1. Install dependencies:
   npm run install:all
2. Copy `server/.env.example` to `server/.env` and set `MONGO_URI`, `JWT_SECRET`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD`. MongoDB must be available; the server exits with an error if it cannot connect.
3. Seed the initial administrator:
   npm run seed:admin
4. Start the app:
   npm run dev
5. Open the frontend in the browser:
   http://localhost:5173

The backend API runs on:
http://localhost:5000

Set `CLIENT_URL` to the frontend origin when it is not `http://localhost:5173`. `npm run seed:admin` creates the configured admin if it does not already exist. New signups can only create regular user accounts.

Admins upload MP4/WebM video files and JPG/PNG/WebP poster images in the movie manager. Files are stored under `server/uploads/`, served by the API for posters, and streamed with byte-range support for playback. The upload directory is ignored by Git.

The frontend uses `/login` and `/signup` for authentication, `/browse` for browsing and search, `/watch/:id` for playback, and `/admin`, `/admin/movies`, and `/admin/users` for administration. Configure `VITE_API_URL` in the client environment if the API is not at `http://localhost:5000/api`.
