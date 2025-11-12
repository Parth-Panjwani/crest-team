# AWS S3 Setup - Super Simple Steps

If the AWS Console looks confusing, follow these exact steps:

## 🎯 Step 1: Go to S3 (Use Search)

1. Go to: https://console.aws.amazon.com/
2. **At the very top**, you'll see a search bar
3. Type: `S3`
4. Press Enter or click on "S3" from the dropdown
5. You should see a page with "Buckets" and an orange "Create bucket" button

## 🎯 Step 2: Create Bucket

1. Click the orange **"Create bucket"** button
2. Fill in the form that appears:

   **Bucket name:**
   - Type: `crest-team-files` (or any unique name)
   - Must be all lowercase, no spaces
   - Write this down! → This is your `S3_BUCKET_NAME`

   **AWS Region:**
   - Look for a dropdown that says "AWS Region" or "Region"
   - It might be near the top or middle of the form
   - Select: `US East (N. Virginia) us-east-1` (or any region)
   - Write this down! → This is your `AWS_REGION`

3. Scroll down and click **"Create bucket"** (at the bottom)

**✅ Done!** You now have:
- Bucket name: `_________________`
- Region: `_________________`

## 🎯 Step 3: Go to IAM (Use Search)

1. **At the top**, use the search bar again
2. Type: `IAM`
3. Press Enter or click "IAM" from dropdown
4. You should see a page with "Users" in the left sidebar

## 🎯 Step 4: Create IAM User

1. Click **"Users"** in the left sidebar (or the big "Users" button)
2. Click **"Create user"** button (top right)
3. **User name:** Type `crest-team-s3-user`
4. Click **"Next"**
5. Under "Set permissions", select **"Attach policies directly"**
6. In the search box, type: `S3`
7. Check the box next to **"AmazonS3FullAccess"**
8. Click **"Next"**
9. Click **"Create user"**

## 🎯 Step 5: Get Access Keys

1. Click on the user you just created (`crest-team-s3-user`)
2. Click the **"Security credentials"** tab
3. Scroll down to **"Access keys"** section
4. Click **"Create access key"**
5. Select: **"Application running outside AWS"**
6. Click **"Next"**
7. (Optional) Add description: "For Crest Team app"
8. Click **"Create access key"**
9. **IMPORTANT:** Copy both values immediately:
   - **Access key ID** → This is `AWS_ACCESS_KEY_ID`
   - **Secret access key** → This is `AWS_SECRET_ACCESS_KEY`
10. Click **"Done"**

**⚠️ WARNING:** You won't see the Secret access key again! Save it now.

## 🎯 Step 6: Add to server/.env

Open `server/.env` and update these lines:

```bash
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
S3_BUCKET_NAME=crest-team-files
```

Replace with YOUR actual values from Steps 2 and 5.

## ✅ That's It!

After adding the 4 values to `server/.env`, file uploads will work!

---

## 🆘 Still Can't Find It?

### If you can't find the search bar:
- Make sure you're logged into AWS Console
- The search bar is always at the very top of the page
- It might say "Search for services, features, and more"

### If the page looks different:
- AWS updates their UI sometimes
- **Always use the search bar** - it's the most reliable way
- Type exactly: `S3` or `IAM`

### Direct Links (Always Work):
- **S3:** https://s3.console.aws.amazon.com/s3/buckets
- **IAM Users:** https://console.aws.amazon.com/iamv2/home#/users

---

**Need more help?** Describe what you see on your screen and I'll guide you!

