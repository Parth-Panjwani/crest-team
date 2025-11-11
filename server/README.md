# Crest Team Server

Backend server with real-time WebSocket support for the Crest Team management app.

## Setup

1. Install dependencies:
```bash
cd server
npm install
```

2. Start the server:
```bash
npm run dev
```

The server will run on `http://localhost:3001` by default.

## Features

- RESTful API for all data operations
- Real-time updates via WebSocket (Socket.io)
- SQLite database for data persistence
- Automatic data synchronization across all clients

## API Endpoints

- `GET /api/users` - Get all users
- `POST /api/users` - Create user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user
- `POST /api/auth/login` - Login with PIN
- `POST /api/attendance/punch` - Record attendance punch
- `GET /api/attendance/today/:userId` - Get today's attendance
- `GET /api/attendance/history/:userId` - Get attendance history
- And more...

## Real-time Events

The server broadcasts the following events:
- `attendance:updated` - When attendance is updated
- `user:created`, `user:updated`, `user:deleted` - User changes
- `note:created`, `note:updated`, `note:deleted` - Note changes
- `leave:created`, `leave:updated` - Leave changes
- `salary:updated`, `salary:deleted` - Salary changes
- `announcement:created`, `announcement:updated` - Announcement changes

