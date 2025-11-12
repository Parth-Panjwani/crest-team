# S3 CORS Configuration Guide

## Problem

When uploading files directly from the browser to S3, you'll encounter CORS errors like:

```
Access to fetch at 'https://bucket.s3.region.amazonaws.com/...' from origin 'http://localhost:5174'
has been blocked by CORS policy
```

## Solution: Configure CORS on Your S3 Bucket

### Step 1: Go to AWS S3 Console

1. Navigate to: https://s3.console.aws.amazon.com/
2. Click on your bucket: **employe-hub**

### Step 2: Open Permissions Tab

1. Click on the **Permissions** tab
2. Scroll down to **Cross-origin resource sharing (CORS)**

### Step 3: Add CORS Configuration

Click **Edit** and paste this configuration:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
    "AllowedOrigins": [
      "http://localhost:5173",
      "http://localhost:5174",
      "http://localhost:5175",
      "https://crest-team.vercel.app"
    ],
    "ExposeHeaders": [
      "ETag",
      "x-amz-server-side-encryption",
      "x-amz-request-id",
      "x-amz-id-2"
    ],
    "MaxAgeSeconds": 3000
  }
]
```

### Step 4: Save Changes

Click **Save changes**

## Important Notes

1. **AllowedOrigins**: Add your production domain when deploying
2. **AllowedMethods**: Includes PUT for presigned URL uploads
3. **AllowedHeaders**: `*` allows all headers (you can restrict this for production)
4. **MaxAgeSeconds**: Browser caches CORS preflight for 3000 seconds (50 minutes)

## Verify Configuration

After saving, test by:

1. Opening browser console
2. Trying to upload a file in the chat
3. Check Network tab - CORS errors should be gone

## Alternative: Backend Proxy (More Secure)

If you prefer not to configure CORS, you can proxy uploads through your backend. This is more secure but slower for large files.

Let me know if you want to implement the backend proxy approach instead.
