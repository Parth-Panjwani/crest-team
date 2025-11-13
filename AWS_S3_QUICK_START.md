# AWS S3 Quick Start Checklist

Use this checklist while setting up S3. For detailed instructions, see `AWS_S3_SETUP_GUIDE.md`.

## ⚡ Quick Setup (5 Steps)

### 1. Create S3 Bucket
- [ ] Go to AWS Console → S3
- [ ] Click "Create bucket"
- [ ] Bucket name: `_________________` (note this!)
- [ ] Region: `_________________` (note this!)
- [ ] Uncheck "Block all public access" (or use presigned URLs)
- [ ] Click "Create bucket"

### 2. Create IAM User
- [ ] Go to AWS Console → IAM → Users
- [ ] Click "Create user"
- [ ] User name: `crest-team-s3-user`
- [ ] Attach policy: `AmazonS3FullAccess`
- [ ] Create user

### 3. Get Access Keys
- [ ] Click on the user → "Security credentials" tab
- [ ] Click "Create access key"
- [ ] Select "Application running outside AWS"
- [ ] Copy **Access Key ID**: `_________________`
- [ ] Copy **Secret Access Key**: `_________________` ⚠️ Save this!

### 4. Add to `server/.env`

```bash
AWS_REGION=_________________
AWS_ACCESS_KEY_ID=_________________
AWS_SECRET_ACCESS_KEY=_________________
S3_BUCKET_NAME=_________________
```

### 5. Test
- [ ] Start backend: `cd server && npm run dev`
- [ ] Try uploading a file in the app
- [ ] Check S3 bucket for uploaded file

## 📋 Values to Fill In

After completing the steps above, you should have:

| Variable | Your Value |
|----------|------------|
| `AWS_REGION` | |
| `AWS_ACCESS_KEY_ID` | |
| `AWS_SECRET_ACCESS_KEY` | |
| `S3_BUCKET_NAME` | |

## ✅ Done!

Once all values are in `server/.env`, file uploads will work!

---

**Detailed Guide:** See `AWS_S3_SETUP_GUIDE.md` for step-by-step instructions with screenshots guidance.


