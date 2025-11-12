# Firebase Private Key Setup for Vercel

## ✅ Cleaned Private Key (No Extra Whitespace)

Copy this **entire** value and paste it into Vercel's `FIREBASE_PRIVATE_KEY` environment variable:

```
-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQChiXf+w24hdqFq\nvVlGWGciTWMk3VsAy+0PWhlb8jMMI8YRa3xKPHhdo1/MsDqZBRWzjRPuNzH5xAuW\nkBnR3qbrgKEeZhsF90qjVHVSfg9ccC7l0dtZ5b2T5XnBz6LsROxKj61P+5pHxLT9\nCKuPUE3nvYvmEIuenEbUIEsxZ6MLNRXsdaViLFFibEU98+3T1TP2l57uDaoVopm0\num1LnCR3YB7X1V52kUgWzVuVBYq3NIJUjU4In1xt6xqNzi6fs7iPZ58GMkGusy0n\nbVAStD8YvqRX0x9+ty2HveWX8jdQsX7g+dHj/ySZuqihbxM+xGk3Dc3W3jj1Dv2S\n6egknGDnAgMBAAECggEABtc7/Zcsr7UZLiWnDmk3jpj3FzxaiClRgaJI7+zxmguC\nEnARDXZU0t5UhlPD7TiR1TM5L+tvwCWpufd9jP/pUv4+JsUNd3wj9j4Fv1MSm5p3\nLD/t7gmZInHjbS45yLQYgeFB5k6SBTvlGWL1ZPZf/jbcNFCfxZiwx3cS7K7Bp8S1\nKhK3Rxj4+aNVR+9dC798nNeCOk2WEdbAmxds+ZjFgfwHfHrmIZYeUeg0AXXtiqjD\nOcfBCk1hK681wySCPloTWSyplotFnxfgmholw4mdNbxT9W1mvOVKyZbTo5NQVWtW\ndp29B6qyyLJ9GIdVZGUxk+Nw+JqAsQWDjhi8D/qbLQKBgQDNBmTIgVCQZFnKR5fi\nAJ/5X1ZDQ6JzdZ+NYls3NeC/H0CAEW8WE3veSsmciY+hBw8+kt9SPklREp/d+gf1\nY6d01qBkNilOFye4kNNfEUeZfFgFksN1BUQJA7HwutNzCscl+O6EVf8jd3wbvZP+\npR9/r7w/SrYVynt2/THAVZ8jbQKBgQDJsx013jTbo8X7IcjsrwHUtRcohBjO7xrM\nbUAgcHQ8Z8mstYKn+3zjppUqKQeelvtkPbEtAjOfFjyTSJs5RGYv4VYvSIbpB5qO\n6WCS3SA6ssxxNmDULDBo22u2wxYeHr5aVXSgw6ZRgSkwfx20gQ3gr4pMMIgUZia1\nPC/AEIYNIwKBgQC8XPptKDmPX1MLP/lvvyk6n/eN9u6ia1d6OvoY4Fwq25iT0PCh\ndKciFM3kDpIx3F2KHMAmPGl5ncXY1+VF8xefhax4RTZvs2Bf9lbsCeEhR5dLD4qZ\n0YuvSIDL7allEWrkHS9tz+CHgjg4+FSm6Kfm1Nr7vzVJEe2a5YY28bMyhQKBgDCF\nrGNHH4QvM/OkPwfhWhlnrziJ/sXZc6L2LVUgeHYHqdaom9P5hiPl8UCBOloGjFej\nF7pyKyT8Xno4H095ivO9y9P4KKxqrd3vetIZ7CTy2ofpwwWH0+WF07XV3L5GOxjU\nMghyyNIWtmf6TJUd7s68rBKEIlh18p3q6rnTv8vtAoGBAIPU5bimT+9hIzOWpq/z\nlBUmDPHi1jIalbO4fWZlgghN5v6Tw8dxkkf3d1dOhRTzNPwCg/kKpef5wAsd4X/r\nf+jxrWv6NVy3D6IMaXjgMETEMMRjMzIBB6rW3TA7GER3ioWKooEDluo+DsO2uCk/\nw3d6rWcVDdmbaEtvh87rLlbg\n-----END PRIVATE KEY-----\n
```

## 📋 Step-by-Step Instructions

### 1. Go to Vercel Environment Variables

- Open your Vercel project dashboard
- Go to **Settings** → **Environment Variables**

### 2. Add/Update FIREBASE_PRIVATE_KEY

- Click **Add New** (or edit existing)
- **Key:** `FIREBASE_PRIVATE_KEY`
- **Value:** Copy the entire key from above (starts with `-----BEGIN PRIVATE KEY-----\n` and ends with `-----END PRIVATE KEY-----\n`)
- **Important:**
  - ✅ Include the `\n` characters (they represent newlines)
  - ✅ No quotes needed in Vercel
  - ✅ No extra spaces before or after
  - ✅ Select all three environments: Production, Preview, Development

### 3. Verify Other Firebase Variables

Make sure these are also set:

- `FIREBASE_PROJECT_ID` = `spt-employee-hub`
- `FIREBASE_CLIENT_EMAIL` = `firebase-adminsdk-fbsvc@spt-employee-hub.iam.gserviceaccount.com`

### 4. Redeploy

- After adding/updating variables, **redeploy** your project
- Go to **Deployments** → Click **⋯** on latest deployment → **Redeploy**

## 🔍 Verification

After redeploying, check the function logs:

1. Go to **Deployments** → Latest deployment
2. Click on the function execution
3. Look for: `✅ Firebase Admin SDK initialized successfully`

If you see `⚠️  Firebase credentials not configured`, check:

- Variables are added to the correct environment
- No extra spaces or quotes
- Key includes `\n` characters (not actual newlines)

## ✅ What I Fixed

1. **Added `.trim()`** to remove leading/trailing whitespace from all Firebase env vars
2. **Improved error logging** to show which variables are missing
3. **Better Firebase initialization** that checks for existing app
4. **Early initialization** in the handler to ensure Firebase is ready

The code now automatically trims any whitespace from the environment variables, so even if there are extra spaces, it will work correctly.
