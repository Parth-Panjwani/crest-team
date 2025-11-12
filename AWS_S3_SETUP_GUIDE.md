# Amazon S3 Setup Guide

This guide will walk you through setting up AWS S3 for file uploads in your Crest Team application.

## 📋 What You'll Need

- An AWS account (free tier available)
- About 10-15 minutes

## 🎯 Step-by-Step Setup

### Step 1: Create AWS Account (If You Don't Have One)

1. Go to [AWS Sign Up](https://portal.aws.amazon.com/billing/signup)
2. Follow the registration process
3. You'll need a credit card, but the free tier includes:
   - 5 GB of S3 storage
   - 20,000 GET requests
   - 2,000 PUT requests per month

### Step 2: Create S3 Bucket

1. **Log in to AWS Console**

   - Go to [AWS Console](https://console.aws.amazon.com/)
   - Sign in with your credentials

2. **Navigate to S3**

   - In the search bar at the top, type "S3"
   - Click on **S3** service

3. **Create Bucket**

   - Click the **"Create bucket"** button (orange button)
   - Fill in the details:

   **Bucket name:**

   - Choose a unique name (e.g., `crest-team-files` or `spt-employee-hub-files`)
   - Must be globally unique across all AWS accounts
   - Use lowercase letters, numbers, and hyphens only
   - **Note this name** - you'll need it for `S3_BUCKET_NAME`

   **AWS Region:**

   - Choose a region close to your users (e.g., `us-east-1`, `us-west-2`, `eu-west-1`)
   - **Note this region** - you'll need it for `AWS_REGION`
   - Recommended: `us-east-1` (cheapest, most common)

4. **Configure Public Access Settings**

   - **Uncheck** "Block all public access" (or configure specific access)
   - This allows files to be accessed via public URLs
   - Check the acknowledgment checkbox
   - **Alternative:** Keep public access blocked and use presigned URLs (more secure, already implemented)

5. **Bucket Versioning** (Optional)

   - Leave as "Disabled" for now

6. **Default Encryption** (Optional but Recommended)

   - Enable encryption
   - Choose "Amazon S3 managed keys (SSE-S3)"

7. **Click "Create bucket"**

### Step 3: Create IAM User for S3 Access

1. **Navigate to IAM**

   - In AWS Console search bar, type "IAM"
   - Click on **IAM** service

2. **Create User**

   - Click **"Users"** in the left sidebar
   - Click **"Create user"** button

3. **User Details**

   - **User name:** `crest-team-s3-user` (or any name you prefer)
   - Click **"Next"**

4. **Set Permissions**

   - Select **"Attach policies directly"**
   - Search for and select: **"AmazonS3FullAccess"**
   - ⚠️ **For production, create a custom policy with limited permissions** (see "Security Best Practices" below)
   - Click **"Next"**

5. **Review and Create**

   - Review the settings
   - Click **"Create user"**

6. **Get Access Keys**

   - Click on the newly created user
   - Go to **"Security credentials"** tab
   - Scroll to **"Access keys"** section
   - Click **"Create access key"**
   - Select **"Application running outside AWS"**
   - Click **"Next"**
   - Add description (optional): "Crest Team S3 Access"
   - Click **"Create access key"**

7. **Save Credentials** ⚠️ **IMPORTANT**
   - **Access Key ID** - Copy this immediately
   - **Secret Access Key** - Copy this immediately (you won't see it again!)
   - Click **"Done"**

### Step 4: Configure Bucket Permissions (Optional but Recommended)

1. **Go back to S3**

   - Navigate to your bucket
   - Click on the bucket name

2. **Configure CORS** (For web uploads)

   - Go to **"Permissions"** tab
   - Scroll to **"Cross-origin resource sharing (CORS)"**
   - Click **"Edit"**
   - Paste this configuration:

   ```json
   [
     {
       "AllowedHeaders": ["*"],
       "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
       "AllowedOrigins": ["*"],
       "ExposeHeaders": ["ETag"],
       "MaxAgeSeconds": 3000
     }
   ]
   ```

   - Click **"Save changes"**

3. **Bucket Policy** (If you want public read access)

   - Go to **"Permissions"** tab
   - Scroll to **"Bucket policy"**
   - Click **"Edit"**
   - For public read access, use:

   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Sid": "PublicReadGetObject",
         "Effect": "Allow",
         "Principal": "*",
         "Action": "s3:GetObject",
         "Resource": "arn:aws:s3:::YOUR-BUCKET-NAME/*"
       }
     ]
   }
   ```

   - Replace `YOUR-BUCKET-NAME` with your actual bucket name
   - Click **"Save changes"**

   **Note:** If you're using presigned URLs (which you are), you don't need public read access.

### Step 5: Add Credentials to Your `.env` File

1. **Open `server/.env`**

2. **Update these values:**

   ```bash
   AWS_REGION=us-east-1
   AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
   AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
   S3_BUCKET_NAME=crest-team-files
   ```

   Replace with your actual values:

   - `AWS_REGION` - The region you chose when creating the bucket
   - `AWS_ACCESS_KEY_ID` - The Access Key ID from Step 3
   - `AWS_SECRET_ACCESS_KEY` - The Secret Access Key from Step 3
   - `S3_BUCKET_NAME` - Your bucket name from Step 2

3. **Save the file**

### Step 6: Test Your Configuration

1. **Start your backend server:**

   ```bash
   cd server
   npm run dev
   ```

2. **Test file upload:**
   - Try uploading a file in the chat or notes
   - Check the browser console for errors
   - Check S3 bucket - you should see uploaded files in the `uploads/` folder

## 🔒 Security Best Practices

### Option 1: Custom IAM Policy (Recommended for Production)

Instead of `AmazonS3FullAccess`, create a custom policy with limited permissions:

1. **Go to IAM → Policies → Create policy**
2. **Use JSON editor**, paste:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:PutObjectAcl"
      ],
      "Resource": "arn:aws:s3:::YOUR-BUCKET-NAME/*"
    },
    {
      "Effect": "Allow",
      "Action": ["s3:ListBucket"],
      "Resource": "arn:aws:s3:::YOUR-BUCKET-NAME"
    }
  ]
}
```

3. Replace `YOUR-BUCKET-NAME` with your bucket name
4. Name the policy: `CrestTeamS3Policy`
5. Attach this policy to your IAM user instead of `AmazonS3FullAccess`

### Option 2: Use Presigned URLs (Already Implemented)

Your application already uses presigned URLs, which is secure:

- Files are uploaded directly to S3 from the browser
- No need to expose AWS credentials to the frontend
- URLs expire after a set time (15 minutes for uploads)

## 📊 Cost Estimation

### Free Tier (First 12 Months)

- 5 GB storage
- 20,000 GET requests
- 2,000 PUT requests
- **Total: $0/month**

### After Free Tier

- Storage: ~$0.023 per GB/month
- Requests: ~$0.0004 per 1,000 requests
- **Estimated cost for small team: $1-5/month**

## 🧪 Troubleshooting

### Issue: "Access Denied" Error

**Solution:**

1. Check IAM user has correct permissions
2. Verify Access Key ID and Secret Access Key are correct
3. Check bucket name matches exactly (case-sensitive)
4. Verify region matches

### Issue: "Bucket Not Found"

**Solution:**

1. Verify bucket name is correct (no typos)
2. Check region matches
3. Ensure bucket exists in AWS Console

### Issue: CORS Errors in Browser

**Solution:**

1. Go to S3 bucket → Permissions → CORS
2. Add the CORS configuration from Step 4
3. Make sure your frontend domain is in AllowedOrigins

### Issue: Files Not Uploading

**Solution:**

1. Check backend logs for errors
2. Verify presigned URL is being generated
3. Check file size (max 10MB in code)
4. Verify S3 bucket permissions

## 📝 Quick Reference

### Your S3 Configuration Should Look Like:

```bash
# In server/.env
AWS_REGION=us-east-1                    # Your bucket region
AWS_ACCESS_KEY_ID=AKIA...              # From IAM user
AWS_SECRET_ACCESS_KEY=wJalr...         # From IAM user (secret!)
S3_BUCKET_NAME=crest-team-files        # Your bucket name
```

### File Structure in S3:

```
your-bucket-name/
  └── uploads/
      ├── 1234567890-abc123.jpg        # Images
      ├── 1234567891-def456.webm       # Voice notes
      └── 1234567892-ghi789.pdf        # Documents
```

## ✅ Verification Checklist

- [ ] AWS account created
- [ ] S3 bucket created with unique name
- [ ] IAM user created with S3 access
- [ ] Access keys generated and saved
- [ ] Credentials added to `server/.env`
- [ ] CORS configured (if needed)
- [ ] Test upload successful

## 🚀 Next Steps After Setup

1. **Test file upload** in your app
2. **Monitor AWS costs** in AWS Console → Billing
3. **Set up billing alerts** (optional but recommended)
4. **Review security settings** periodically

## 💡 Pro Tips

1. **Use different buckets for dev/prod**

   - `crest-team-files-dev`
   - `crest-team-files-prod`

2. **Set up lifecycle policies** to delete old files:

   - S3 → Your bucket → Management → Lifecycle rules
   - Auto-delete files older than 90 days (optional)

3. **Enable versioning** for important files:

   - S3 → Your bucket → Properties → Versioning

4. **Monitor usage:**
   - AWS Console → CloudWatch → Metrics
   - Track storage and request usage

---

**Need Help?** Check AWS documentation or AWS Support for specific issues.
