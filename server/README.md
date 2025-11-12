# Crest Team - Backend Server

Fullstack backend server with Express, WebSocket, and MongoDB.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Copy `.env.example` to `.env` and configure:
```bash
cp .env.example .env
```

3. Set your MongoDB connection string in `.env`:
```
MONGODB_URI=your_mongodb_connection_string
MONGODB_DB_NAME=crest-team
```

## Development

Run the development server:
```bash
npm run dev
```

The server will start on:
- HTTP API: http://localhost:3000
- WebSocket: ws://localhost:3001

## Production

Build and run:
```bash
npm run build
npm start
```

## API Endpoints

- `POST /api/auth/login` - User login
- `GET /api/users` - Get all users
- `GET /api/users/:id` - Get user by ID
- `POST /api/users` - Create user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user
- `GET /api/bootstrap` - Get all data for initial load
- And more...

## WebSocket

Connect to `ws://localhost:3001?userId=USER_ID` for real-time updates.

Message types:
- `data-update` - Data has been updated
- `pong` - Response to ping

