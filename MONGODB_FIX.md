# MongoDB Connection Fix

## Current Issue
MongoDB SSL/TLS connection errors: `ERR_SSL_TLSV1_ALERT_INTERNAL_ERROR`

## Possible Causes

1. **IP Whitelist Issue** (Most Common)
   - Your IP address is not whitelisted in MongoDB Atlas
   - Solution: Go to MongoDB Atlas → Network Access → Add your current IP (or 0.0.0.0/0 for testing)

2. **Network/Firewall**
   - Corporate firewall blocking MongoDB connections
   - Solution: Check firewall settings or use a VPN

3. **MongoDB Cluster Status**
   - Cluster might be initializing or having issues
   - Solution: Check MongoDB Atlas dashboard for cluster status

4. **Connection String**
   - Password might have special characters that need URL encoding
   - Solution: Verify connection string is correct

## Quick Fixes

### 1. Check MongoDB Atlas Network Access
1. Go to https://cloud.mongodb.com
2. Select your cluster
3. Go to "Network Access"
4. Click "Add IP Address"
5. Add your current IP or `0.0.0.0/0` (allows all IPs - less secure)

### 2. Verify Connection String
The connection string should be:
```
mongodb+srv://username:password@cluster.mongodb.net/
```

Make sure:
- Username and password are correct
- No extra spaces
- Special characters in password are URL-encoded

### 3. Test Connection
Run this to test:
```bash
node -e "const {MongoClient} = require('mongodb'); const client = new MongoClient('YOUR_URI'); client.connect().then(() => console.log('✅ Connected')).catch(e => console.error('❌', e.message));"
```

## Updated Code
I've added:
- Better SSL/TLS connection options
- More specific error messages
- Connection timeout settings
- Retry logic

Try restarting `npm run dev:api` after fixing the IP whitelist.

