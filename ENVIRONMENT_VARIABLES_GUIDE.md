# Environment Variables Setup Guide

This guide will help you set up all the required environment variables for the Crest Team application.

## 📋 Table of Contents

1. [Backend Environment Variables](#backend-environment-variables)
2. [Frontend Environment Variables](#frontend-environment-variables)
3. [Setup Instructions](#setup-instructions)
4. [Testing Your Configuration](#testing-your-configuration)

---

## 🔧 Backend Environment Variables

Create a `.env` file in the `server/` directory with the following variables:

### MongoDB Configuration

```bash
# MongoDB Connection
MONGODB_URI=mongodb://localhost:27017
# OR for MongoDB Atlas (cloud):
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/?retryWrites=true&w=majority

MONGODB_DB_NAME=crest-team
```

**How to get:**

- **Local MongoDB**: Use `mongodb://localhost:27017` (default)
- **MongoDB Atlas**:
  1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
  2. Create a free cluster
  3. Click "Connect" → "Connect your application"
  4. Copy the connection string
  5. Replace `<password>` with your database password

### Firebase Admin SDK (Backend)

```bash
# Firebase Admin SDK Credentials
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour-Private-Key-Here\n-----END PRIVATE KEY-----\n"
```

**How to get:**

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project (or create a new one)
3. Go to **Project Settings** (gear icon) → **Service Accounts**
4. Click **Generate New Private Key**
5. Download the JSON file
6. Extract values:
   - `project_id` → `FIREBASE_PROJECT_ID`
   - `client_email` → `FIREBASE_CLIENT_EMAIL`
   - `private_key` → `FIREBASE_PRIVATE_KEY` (keep the quotes and `\n` characters)

### AWS S3 Configuration

```bash
# AWS S3 for File Uploads
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key-id
AWS_SECRET_ACCESS_KEY=your-secret-access-key
S3_BUCKET_NAME=crest-team-files
```

**How to get:**

1. Go to [AWS Console](https://console.aws.amazon.com/)
2. Navigate to **IAM** → **Users** → Create a new user (or use existing)
3. Attach policy: `AmazonS3FullAccess` (or create custom policy for specific bucket)
4. Go to **Security Credentials** tab
5. Click **Create Access Key**
6. Copy `Access Key ID` → `AWS_ACCESS_KEY_ID`
7. Copy `Secret Access Key` → `AWS_SECRET_ACCESS_KEY`
8. Create S3 Bucket:
   - Go to **S3** → **Create bucket**
   - Choose a unique name → `S3_BUCKET_NAME`
   - Select region → `AWS_REGION`
   - Configure permissions (recommended: Block public access OFF if you want public URLs)

### Server Configuration

```bash
# Server Port (optional, defaults to 3000)
PORT=3000

# CORS Configuration (optional)
CLIENT_URL=https://your-frontend-domain.com
ALLOWED_ORIGINS=https://your-frontend-domain.com,https://another-domain.com

# Node Environment
NODE_ENV=production
# OR for development:
# NODE_ENV=development
```

---

## 🎨 Frontend Environment Variables

Create a `.env` file in the root directory (same level as `package.json`) with the following variables:

### API Configuration

```bash
# API Base URL (optional - leave empty for same-origin requests)
# For local development with separate backend:
VITE_API_URL=http://localhost:3000

# For production on Vercel (same domain), leave empty:
# VITE_API_URL=

# WebSocket URL (optional - only if using external WebSocket server)
VITE_WS_URL=ws://localhost:3000
```

**Note:** If both frontend and backend are on the same domain (e.g., Vercel), leave `VITE_API_URL` empty to use relative URLs.

### Firebase Client SDK (Frontend)

```bash
# Firebase Web App Configuration
VITE_FIREBASE_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789012
VITE_FIREBASE_APP_ID=1:123456789012:web:abcdef1234567890

# Firebase VAPID Key (for Web Push Notifications)
VITE_FIREBASE_VAPID_KEY=BGXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

**How to get:**

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Go to **Project Settings** (gear icon) → **General** tab
4. Scroll down to **Your apps** section
5. Click **Web** icon (`</>`) to add a web app (or use existing)
6. Copy the config values:
   - `apiKey` → `VITE_FIREBASE_API_KEY`
   - `authDomain` → `VITE_FIREBASE_AUTH_DOMAIN`
   - `projectId` → `VITE_FIREBASE_PROJECT_ID`
   - `storageBucket` → `VITE_FIREBASE_STORAGE_BUCKET`
   - `messagingSenderId` → `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `appId` → `VITE_FIREBASE_APP_ID`
7. For VAPID Key:
   - Go to **Project Settings** → **Cloud Messaging** tab
   - Scroll to **Web configuration** section
   - Click **Generate key pair** under "Web Push certificates"
   - Copy the key → `VITE_FIREBASE_VAPID_KEY`

---

## 📝 Setup Instructions

### Step 1: Create Backend `.env` File

```bash
cd server
touch .env
```

Add all backend variables listed above.

### Step 2: Create Frontend `.env` File

```bash
# From project root
touch .env
```

Add all frontend variables listed above.

### Step 3: For Vercel Deployment

#### Backend Environment Variables:

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add all backend variables (without `VITE_` prefix)
4. Make sure to select the correct environment (Production, Preview, Development)

#### Frontend Environment Variables:

1. In the same Vercel project (or separate frontend project)
2. Add all frontend variables (with `VITE_` prefix)
3. Vercel will automatically inject these during build

### Step 4: For Local Development

#### Backend:

```bash
cd server
npm install
# Make sure .env file exists with all variables
npm run dev
```

#### Frontend:

```bash
# From project root
npm install
# Make sure .env file exists with all variables
npm run dev
```

---

## ✅ Testing Your Configuration

### Test MongoDB Connection:

```bash
cd server
npm run dev
# Look for: "✅ Connected to database: crest-team"
```

### Test Firebase:

1. Open browser console
2. Look for: "✅ Firebase client initialized"
3. Check for notification permission prompt

### Test S3:

1. Try uploading a file in chat or notes
2. Check browser console for errors
3. Verify file appears in S3 bucket

### Test API:

1. Open browser DevTools → Network tab
2. Navigate to the app
3. Check if API calls succeed (status 200)

---

## 🔒 Security Best Practices

1. **Never commit `.env` files to Git**

   - Already in `.gitignore`
   - Double-check before committing

2. **Use different credentials for development and production**

   - Create separate Firebase projects
   - Use separate S3 buckets
   - Use separate MongoDB databases

3. **Rotate credentials regularly**

   - Especially AWS keys and Firebase private keys

4. **Use environment-specific values**
   - Development: local MongoDB, test S3 bucket
   - Production: MongoDB Atlas, production S3 bucket

---

## 🆘 Troubleshooting

### MongoDB Connection Issues:

- Check if MongoDB is running: `mongosh` or check MongoDB Compass
- Verify connection string format
- Check firewall/network settings for MongoDB Atlas

### Firebase Issues:

- Verify all keys are correct (no extra spaces)
- Check Firebase project is active
- Ensure billing is enabled (for some features)

### S3 Upload Issues:

- Verify AWS credentials are correct
- Check bucket permissions
- Verify bucket name matches exactly
- Check region matches

### API Connection Issues:

- Verify `VITE_API_URL` is correct
- Check CORS settings in backend
- Verify backend server is running

---

## 📚 Quick Reference

### Minimum Required for Basic Functionality:

- ✅ MongoDB (local or Atlas)
- ✅ Backend `.env` with MongoDB variables

### For Full Features:

- ✅ MongoDB
- ✅ Firebase (for push notifications)
- ✅ AWS S3 (for file uploads)
- ✅ All environment variables configured

---

## 💡 Example `.env` Files

### `server/.env` (Backend)

```bash
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB_NAME=crest-team
FIREBASE_PROJECT_ID=my-project-12345
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-abc123@my-project-12345.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n"
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
S3_BUCKET_NAME=crest-team-files
PORT=3000
NODE_ENV=development
```

### `.env` (Frontend - Root)

```bash
VITE_API_URL=http://localhost:3000
VITE_FIREBASE_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
VITE_FIREBASE_AUTH_DOMAIN=my-project-12345.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=my-project-12345
VITE_FIREBASE_STORAGE_BUCKET=my-project-12345.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789012
VITE_FIREBASE_APP_ID=1:123456789012:web:abcdef1234567890
VITE_FIREBASE_VAPID_KEY=BGXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

---

**Need Help?** Check the console logs for specific error messages and verify each service is properly configured.
