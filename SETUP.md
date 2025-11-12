# Quick Setup Guide

Follow these steps to get the application running locally.

## Step 1: Install Dependencies

```bash
# Install frontend dependencies
npm install

# Install backend dependencies
cd server && npm install && cd ..
```

## Step 2: Configure MongoDB

1. Get your MongoDB connection string from MongoDB Atlas or use local MongoDB
2. Copy the example environment file:
   ```bash
   cd server
   cp .env.example .env
   ```
3. Edit `server/.env` and add your MongoDB connection string:
   ```
   MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/
   MONGODB_DB_NAME=crest-team
   ```

## Step 3: Start Development Servers

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

## Step 4: Access the Application

- Open http://localhost:5173 in your browser
- Login with default PIN: `1234` (Admin)

## Default Users

- **Admin**: PIN `1234` (Store Owner)
- **Employee 1**: PIN `5678` (Alice Johnson)
- **Employee 2**: PIN `9012` (Bob Smith)

## Troubleshooting

### Backend won't start
- Check MongoDB connection string in `server/.env`
- Ensure MongoDB is accessible (IP whitelist for Atlas)
- Check if port 3000 is available

### Frontend can't connect to backend
- Ensure backend is running on port 3000
- Check browser console for errors
- Verify `VITE_API_URL` in `.env` (defaults to http://localhost:3000)

### WebSocket not connecting
- Check browser console for WebSocket errors
- Ensure backend WebSocket server started successfully
- Verify user is logged in (WebSocket requires userId)

## Next Steps

- Read [README.md](README.md) for full documentation
- Check [DEPLOYMENT.md](DEPLOYMENT.md) for production deployment
- See [REBUILD_GUIDE.md](REBUILD_GUIDE.md) for architecture details

