# How to Get Firebase VAPID Key

The VAPID key is required for web push notifications. Here's how to get it:

## Steps:

1. **Go to Firebase Console**
   - Visit: https://console.firebase.google.com/
   - Select your project: **spt-employee-hub**

2. **Navigate to Cloud Messaging Settings**
   - Click the **gear icon** (⚙️) next to "Project Overview"
   - Select **Project Settings**
   - Click on the **Cloud Messaging** tab

3. **Generate Web Push Certificate**
   - Scroll down to the **Web configuration** section
   - Look for **Web Push certificates**
   - If you see a key pair already, copy the **Key pair** value
   - If not, click **Generate key pair** button
   - Copy the generated key (it will look like: `BG...` - a long string)

4. **Add to `.env` file**
   - Open `.env` in the root directory
   - Replace `YOUR_VAPID_KEY_FROM_FIREBASE_CONSOLE` with the copied key
   - Save the file

## Example:
```bash
VITE_FIREBASE_VAPID_KEY=BGXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

## Note:
- The VAPID key is a long string (usually starts with `BG`)
- Make sure there are no spaces or line breaks
- Keep it secure - don't commit it to public repositories

After adding the VAPID key, your Firebase configuration will be complete!

