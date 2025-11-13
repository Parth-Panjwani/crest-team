# Quick Environment Setup

Based on your provided credentials, here's exactly what to put in your `.env` files:

## 📝 Backend `.env` File (`server/.env`)

Copy and paste this into `server/.env`:

```bash
# MongoDB Configuration
MONGODB_URI=mongodb+srv://theparthpanjwani_db_user:ttU8dSAeMrmR4Jsq@employee.aqhw6uk.mongodb.net/
MONGODB_DB_NAME=crest-team

# Firebase Admin SDK (Backend)
FIREBASE_PROJECT_ID=spt-employee-hub
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@spt-employee-hub.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQChiXf+w24hdqFq\nvVlGWGciTWMk3VsAy+0PWhlb8jMMI8YRa3xKPHhdo1/MsDqZBRWzjRPuNzH5xAuW\nkBnR3qbrgKEeZhsF90qjVHVSfg9ccC7l0dtZ5b2T5XnBz6LsROxKj61P+5pHxLT9\nCKuPUE3nvYvmEIuenEbUIEsxZ6MLNRXsdaViLFFibEU98+3T1TP2l57uDaoVopm0\num1LnCR3YB7X1V52kUgWzVuVBYq3NIJUjU4In1xt6xqNzi6fs7iPZ58GMkGusy0n\nbVAStD8YvqRX0x9+ty2HveWX8jdQsX7g+dHj/ySZuqihbxM+xGk3Dc3W3jj1Dv2S\n6egknGDnAgMBAAECggEABtc7/Zcsr7UZLiWnDmk3jpj3FzxaiClRgaJI7+zxmguC\nEnARDXZU0t5UhlPD7TiR1TM5L+tvwCWpufd9jP/pUv4+JsUNd3wj9j4Fv1MSm5p3\nLD/t7gmZInHjbS45yLQYgeFB5k6SBTvlGWL1ZPZf/jbcNFCfxZiwx3cS7K7Bp8S1\nKhK3Rxj4+aNVR+9dC798nNeCOk2WEdbAmxds+ZjFgfwHfHrmIZYeUeg0AXXtiqjD\nOcfBCk1hK681wySCPloTWSyplotFnxfgmholw4mdNbxT9W1mvOVKyZbTo5NQVWtW\ndp29B6qyyLJ9GIdVZGUxk+Nw+JqAsQWDjhi8D/qbLQKBgQDNBmTIgVCQZFnKR5fi\nAJ/5X1ZDQ6JzdZ+NYls3NeC/H0CAEW8WE3veSsmciY+hBw8+kt9SPklREp/d+gf1\nY6d01qBkNilOFye4kNNfEUeZfFgFksN1BUQJA7HwutNzCscl+O6EVf8jd3wbvZP+\npR9/r7w/SrYVynt2/THAVZ8jbQKBgQDJsx013jTbo8X7IcjsrwHUtRcohBjO7xrM\nbUAgcHQ8Z8mstYKn+3zjppUqKQeelvtkPbEtAjOfFjyTSJs5RGYv4VYvSIbpB5qO\n6WCS3SA6ssxxNmDULDBo22u2wxYeHr5aVXSgw6ZRgSkwfx20gQ3gr4pMMIgUZia1\nPC/AEIYNIwKBgQC8XPptKDmPX1MLP/lvvyk6n/eN9u6ia1d6OvoY4Fwq25iT0PCh\ndKciFM3kDpIx3F2KHMAmPGl5ncXY1+VF8xefhax4RTZvs2Bf9lbsCeEhR5dLD4qZ\n0YuvSIDL7allEWrkHS9tz+CHgjg4+FSm6Kfm1Nr7vzVJEe2a5YY28bMyhQKBgDCF\nrGNHH4QvM/OkPwfhWhlnrziJ/sXZc6L2LVUgeHYHqdaom9P5hiPl8UCBOloGjFej\nF7pyKyT8Xno4H095ivO9y9P4KKxqrd3vetIZ7CTy2ofpwwWH0+WF07XV3L5GOxjU\nMghyyNIWtmf6TJUd7s68rBKEIlh18p3q6rnTv8vtAoGBAIPU5bimT+9hIzOWpq/z\nlBUmDPHi1jIalbO4fWZlgghN5v6Tw8dxkkf3d1dOhRTzNPwCg/kKpef5wAsd4X/r\nf+jxrWv6NVy3D6IMaXjgMETEMMRjMzIBB6rW3TA7GER3ioWKooEDluo+DsO2uCk/\nw3d6rWcVDdmbaEtvh87rLlbg\n-----END PRIVATE KEY-----\n"

# AWS S3 Configuration (REQUIRED for file uploads - you need to set this up)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-aws-access-key-id
AWS_SECRET_ACCESS_KEY=your-aws-secret-access-key
S3_BUCKET_NAME=crest-team-files

# Server Configuration
PORT=3000
NODE_ENV=development
```

## 🎨 Frontend `.env` File (Root `.env`)

**⚠️ IMPORTANT:** You still need to get Firebase Web App config from Firebase Console.

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select project: **spt-employee-hub**
3. Go to **Project Settings** (gear icon) → **General** tab
4. Scroll to **Your apps** section
5. If you don't have a web app, click **Add app** → **Web** (`</>`)
6. Copy the config values

Then create `.env` in the root directory with:

```bash
# API Configuration (Leave empty if frontend/backend on same domain)
VITE_API_URL=
# OR for local development with separate backend:
# VITE_API_URL=http://localhost:3000

# WebSocket URL (Optional)
VITE_WS_URL=

# Firebase Web App Configuration (Get from Firebase Console)
VITE_FIREBASE_API_KEY=AIzaSy... (from Firebase Console)
VITE_FIREBASE_AUTH_DOMAIN=spt-employee-hub.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=spt-employee-hub
VITE_FIREBASE_STORAGE_BUCKET=spt-employee-hub.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=... (from Firebase Console)
VITE_FIREBASE_APP_ID=... (from Firebase Console)

# Firebase VAPID Key (for Web Push Notifications)
# Get from: Firebase Console → Project Settings → Cloud Messaging → Web Push certificates
VITE_FIREBASE_VAPID_KEY=BG... (generate key pair in Firebase Console)
```

## 🚀 Quick Setup Commands

Run these commands to set up your environment:

```bash
# 1. Create backend .env file
cat > server/.env << 'EOF'
MONGODB_URI=mongodb+srv://theparthpanjwani_db_user:ttU8dSAeMrmR4Jsq@employee.aqhw6uk.mongodb.net/
MONGODB_DB_NAME=crest-team
FIREBASE_PROJECT_ID=spt-employee-hub
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@spt-employee-hub.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQChiXf+w24hdqFq\nvVlGWGciTWMk3VsAy+0PWhlb8jMMI8YRa3xKPHhdo1/MsDqZBRWzjRPuNzH5xAuW\nkBnR3qbrgKEeZhsF90qjVHVSfg9ccC7l0dtZ5b2T5XnBz6LsROxKj61P+5pHxLT9\nCKuPUE3nvYvmEIuenEbUIEsxZ6MLNRXsdaViLFFibEU98+3T1TP2l57uDaoVopm0\num1LnCR3YB7X1V52kUgWzVuVBYq3NIJUjU4In1xt6xqNzi6fs7iPZ58GMkGusy0n\nbVAStD8YvqRX0x9+ty2HveWX8jdQsX7g+dHj/ySZuqihbxM+xGk3Dc3W3jj1Dv2S\n6egknGDnAgMBAAECggEABtc7/Zcsr7UZLiWnDmk3jpj3FzxaiClRgaJI7+zxmguC\nEnARDXZU0t5UhlPD7TiR1TM5L+tvwCWpufd9jP/pUv4+JsUNd3wj9j4Fv1MSm5p3\nLD/t7gmZInHjbS45yLQYgeFB5k6SBTvlGWL1ZPZf/jbcNFCfxZiwx3cS7K7Bp8S1\nKhK3Rxj4+aNVR+9dC798nNeCOk2WEdbAmxds+ZjFgfwHfHrmIZYeUeg0AXXtiqjD\nOcfBCk1hK681wySCPloTWSyplotFnxfgmholw4mdNbxT9W1mvOVKyZbTo5NQVWtW\ndp29B6qyyLJ9GIdVZGUxk+Nw+JqAsQWDjhi8D/qbLQKBgQDNBmTIgVCQZFnKR5fi\nAJ/5X1ZDQ6JzdZ+NYls3NeC/H0CAEW8WE3veSsmciY+hBw8+kt9SPklREp/d+gf1\nY6d01qBkNilOFye4kNNfEUeZfFgFksN1BUQJA7HwutNzCscl+O6EVf8jd3wbvZP+\npR9/r7w/SrYVynt2/THAVZ8jbQKBgQDJsx013jTbo8X7IcjsrwHUtRcohBjO7xrM\nbUAgcHQ8Z8mstYKn+3zjppUqKQeelvtkPbEtAjOfFjyTSJs5RGYv4VYvSIbpB5qO\n6WCS3SA6ssxxNmDULDBo22u2wxYeHr5aVXSgw6ZRgSkwfx20gQ3gr4pMMIgUZia1\nPC/AEIYNIwKBgQC8XPptKDmPX1MLP/lvvyk6n/eN9u6ia1d6OvoY4Fwq25iT0PCh\ndKciFM3kDpIx3F2KHMAmPGl5ncXY1+VF8xefhax4RTZvs2Bf9lbsCeEhR5dLD4qZ\n0YuvSIDL7allEWrkHS9tz+CHgjg4+FSm6Kfm1Nr7vzVJEe2a5YY28bMyhQKBgDCF\nrGNHH4QvM/OkPwfhWhlnrziJ/sXZc6L2LVUgeHYHqdaom9P5hiPl8UCBOloGjFej\nF7pyKyT8Xno4H095ivO9y9P4KKxqrd3vetIZ7CTy2ofpwwWH0+WF07XV3L5GOxjU\nMghyyNIWtmf6TJUd7s68rBKEIlh18p3q6rnTv8vtAoGBAIPU5bimT+9hIzOWpq/z\nlBUmDPHi1jIalbO4fWZlgghN5v6Tw8dxkkf3d1dOhRTzNPwCg/kKpef5wAsd4X/r\nf+jxrWv6NVy3D6IMaXjgMETEMMRjMzIBB6rW3TA7GER3ioWKooEDluo+DsO2uCk/\nw3d6rWcVDdmbaEtvh87rLlbg\n-----END PRIVATE KEY-----\n"
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-aws-access-key-id
AWS_SECRET_ACCESS_KEY=your-aws-secret-access-key
S3_BUCKET_NAME=crest-team-files
PORT=3000
NODE_ENV=development
EOF

# 2. Create frontend .env file (you'll need to fill in Firebase Web config)
cat > .env << 'EOF'
VITE_API_URL=
VITE_FIREBASE_PROJECT_ID=spt-employee-hub
VITE_FIREBASE_AUTH_DOMAIN=spt-employee-hub.firebaseapp.com
# Add other Firebase Web config values from Firebase Console
EOF
```

## ✅ Still Need to Configure

1. **AWS S3** (for file uploads):
   - Go to [AWS Console](https://console.aws.amazon.com/)
   - Create IAM user with S3 access
   - Create S3 bucket
   - Add credentials to `server/.env`

2. **Firebase Web App Config** (for frontend):
   - Go to Firebase Console → Project Settings → General
   - Add Web app if not exists
   - Copy config values to root `.env`

3. **Firebase VAPID Key** (for push notifications):
   - Firebase Console → Project Settings → Cloud Messaging
   - Generate Web Push certificate key pair
   - Add to root `.env` as `VITE_FIREBASE_VAPID_KEY`

## 🧪 Test Your Setup

After configuring:

```bash
# Test backend
cd server
npm run dev
# Should see: "✅ Connected to database: crest-team"
# Should see: "✅ Firebase Admin SDK initialized"

# Test frontend (in another terminal)
npm run dev
# Check browser console for Firebase initialization
```


