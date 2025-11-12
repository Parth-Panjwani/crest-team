# Crest Team - Employee Management System

Modern fullstack employee management system with real-time sync, built with React, Express, WebSocket, and MongoDB.

## 🚀 Features

- ✅ **Real-time Sync** - Live updates across all connected clients via WebSocket
- ✅ **Attendance Tracking** - Check in/out, breaks, manual punches
- ✅ **Leave Management** - Request and approve leaves
- ✅ **Salary Management** - Track salaries, advances, and deductions
- ✅ **Notes/Orders** - Create and manage notes with categories
- ✅ **Staff Management** - Add, edit, and manage employees
- ✅ **Announcements** - Broadcast announcements to all users
- ✅ **Beautiful UI** - Modern, responsive design with Tailwind CSS and Shadcn UI

## 📦 Tech Stack

### Frontend
- React 18 + TypeScript
- Vite
- Tailwind CSS + Shadcn UI
- React Router
- TanStack Query
- Framer Motion

### Backend
- Express.js
- WebSocket (ws)
- MongoDB
- TypeScript

## 🏗️ Project Structure

```
crest-team/
├── server/              # Backend server
│   ├── src/
│   │   ├── index.ts     # Server entry point
│   │   ├── routes/      # API routes
│   │   ├── models/      # Data models
│   │   ├── websocket/   # WebSocket handlers
│   │   └── config/      # Configuration
│   └── package.json
├── src/                 # Frontend React app
│   ├── pages/           # Page components
│   ├── components/      # UI components
│   ├── lib/             # Store and utilities
│   └── hooks/           # React hooks
└── package.json
```

## 🚀 Quick Start

### Prerequisites

- Node.js 20.x
- MongoDB (local or Atlas)

### 1. Install Dependencies

```bash
# Install frontend dependencies
npm install

# Install backend dependencies
cd server && npm install && cd ..
```

### 2. Configure Environment

**Backend:**
```bash
cd server
cp .env.example .env
# Edit .env with your MongoDB connection string
```

**Frontend:**
```bash
cp .env.example .env
# Edit .env if you need to change API URL (defaults to localhost:3000)
```

### 3. Run Development Servers

**Option 1: Run both together (recommended)**
```bash
npm run dev:all
```

**Option 2: Run separately**
```bash
# Terminal 1 - Backend
npm run dev:server

# Terminal 2 - Frontend
npm run dev
```

### 4. Access the Application

- Frontend: http://localhost:5173
- Backend API: http://localhost:3000
- WebSocket: ws://localhost:3000

### Default Login PINs

- **Admin**: `1234` (Store Owner)
- **Employee 1**: `5678` (Alice Johnson)
- **Employee 2**: `9012` (Bob Smith)

## 📝 API Endpoints

All endpoints are under `/api`:

### Authentication
- `POST /api/auth/login` - Login with PIN

### Users
- `GET /api/users` - Get all users
- `GET /api/users/:id` - Get user by ID
- `POST /api/users` - Create user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

### Attendance
- `POST /api/attendance/punch` - Record attendance punch
- `GET /api/attendance/today/:userId` - Get today's attendance
- `GET /api/attendance/history/:userId` - Get attendance history
- `GET /api/attendance/all` - Get all attendance (admin)

### Notes
- `GET /api/notes` - Get all notes
- `POST /api/notes` - Create note
- `PUT /api/notes/:id` - Update note
- `DELETE /api/notes/:id` - Delete note
- `POST /api/notes/:id/restore` - Restore deleted note

### Leaves
- `GET /api/leaves` - Get all leaves
- `POST /api/leaves` - Create leave request
- `PUT /api/leaves/:id` - Update leave status
- `DELETE /api/leaves/:id` - Delete leave

### Salaries
- `GET /api/salaries` - Get salaries
- `POST /api/salaries` - Create salary record
- `PUT /api/salaries/:id` - Update salary
- `DELETE /api/salaries/:id` - Delete salary

### Bootstrap
- `GET /api/bootstrap` - Get all data for initial load

## 🔌 WebSocket

The application uses WebSocket for real-time updates. Connect to:

```
ws://localhost:3000?userId=USER_ID
```

### Message Types

**Client → Server:**
- `ping` - Keep connection alive

**Server → Client:**
- `pong` - Response to ping
- `data-update` - Data has been updated
  ```json
  {
    "type": "data-update",
    "payload": {
      "dataType": "attendance|note|leave|salary|user|announcement",
      "data": { ... }
    }
  }
  ```

## 🚢 Deployment

### Backend Deployment

The backend can be deployed to any Node.js hosting service (Railway, Render, Heroku, etc.):

1. Set environment variables:
   - `MONGODB_URI` - Your MongoDB connection string
   - `MONGODB_DB_NAME` - Database name (default: `crest-team`)
   - `PORT` - Server port (default: 3000)
   - `CLIENT_URL` - Frontend URL for CORS

2. Build and start:
   ```bash
   cd server
   npm run build
   npm start
   ```

### Frontend Deployment

Deploy to Vercel, Netlify, or any static hosting:

1. Set environment variables:
   - `VITE_API_URL` - Your backend API URL
   - `VITE_WS_URL` - Your WebSocket URL (wss:// for production)

2. Build:
   ```bash
   npm run build
   ```

3. Deploy the `dist/` folder

## 🔧 Development

### Scripts

- `npm run dev` - Start frontend dev server
- `npm run dev:server` - Start backend dev server
- `npm run dev:all` - Start both frontend and backend
- `npm run build` - Build frontend
- `npm run build:server` - Build backend
- `npm run build:all` - Build both

### Project Structure

- `/server` - Backend Express server with WebSocket
- `/src` - Frontend React application
- `/public` - Static assets

## 📚 Documentation

- [Backend README](server/README.md)
- [Rebuild Guide](REBUILD_GUIDE.md)

## 🐛 Troubleshooting

### Backend not connecting to MongoDB

- Check your `MONGODB_URI` in `server/.env`
- Ensure MongoDB Atlas IP whitelist includes your IP (or `0.0.0.0/0` for testing)
- Verify network connectivity

### Frontend can't connect to backend

- Ensure backend is running on port 3000
- Check `VITE_API_URL` in `.env`
- Verify CORS settings in backend

### WebSocket not working

- Check WebSocket URL in browser console
- Verify backend WebSocket server is running
- Check firewall/proxy settings

## 📄 License

Private project

## 👥 Contributors

Built for Crest Team
