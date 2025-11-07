# R2 CORS Configuration for Direct Uploads

## Problem

When uploading directly to R2 from the browser, you're getting:
- **CORS error**: Browser blocks cross-origin requests
- **403 error**: R2 rejects the request due to missing CORS configuration

This happens because your frontend domain (e.g., `main.d3jxkz40foxpmx.amplifyapp.com`) is different from R2's domain (`<account-id>.r2.cloudflarestorage.com`).

## Solution: Configure CORS on R2 Bucket

### Step 1: Go to Your R2 Bucket Settings

1. Log in to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Navigate to **R2** → Your bucket (e.g., `quiz-tuition-uploads`)
3. Click on **Settings** tab

### Step 2: Add CORS Policy

1. Scroll down to **CORS Policy** section
2. Click **Edit CORS Policy** or **Add CORS Policy**
3. Paste the following JSON configuration:

```json
[
  {
    "AllowedOrigins": [
      "https://main.d3jxkz40foxpmx.amplifyapp.com",
      "http://localhost:3000",
      "http://localhost:3001"
    ],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag", "Content-Length"],
    "MaxAgeSeconds": 3600
  }
]
```

### Step 3: Update AllowedOrigins

Replace `https://main.d3jxkz40foxpmx.amplifyapp.com` with your actual frontend domain(s):

- **AWS Amplify**: `https://main.d3jxkz40foxpmx.amplifyapp.com` (or your custom domain)
- **Vercel**: `https://your-project.vercel.app` (or your custom domain)
- **Local development**: `http://localhost:3000`, `http://localhost:3001`

**Important**: Include ALL domains where your frontend is hosted!

### Step 4: Save the CORS Policy

1. Click **Save** or **Update**
2. Wait a few seconds for the changes to propagate

### Step 5: Test the Upload

1. Try uploading a file again
2. The CORS error should be resolved
3. The 403 error should also be fixed

## CORS Policy Explanation

- **AllowedOrigins**: Domains that can make requests to R2 (your frontend domains)
- **AllowedMethods**: HTTP methods allowed (PUT for uploads, GET for downloads)
- **AllowedHeaders**: Headers the browser can send (`*` means all headers)
- **ExposeHeaders**: Headers R2 can send back to the browser
- **MaxAgeSeconds**: How long browsers cache the CORS policy (3600 = 1 hour)

## Troubleshooting

### Still Getting CORS Errors?

1. **Verify your frontend domain is in AllowedOrigins**
   - Check the exact domain in your browser's address bar
   - Make sure it matches exactly (including `https://`)

2. **Check for typos in the CORS policy**
   - JSON must be valid
   - No trailing commas
   - Proper quotes

3. **Clear browser cache**
   - CORS policies are cached by browsers
   - Try incognito/private mode

4. **Wait for propagation**
   - CORS changes can take a few seconds to propagate
   - Wait 10-30 seconds and try again

### Still Getting 403 Errors?

1. **Verify API token permissions**
   - Token must have "Object Read & Write" permissions
   - Check token hasn't expired

2. **Check bucket name**
   - Ensure bucket name matches exactly
   - Case-sensitive

3. **Verify presigned URL is valid**
   - Check URL hasn't expired (default: 1 hour)
   - Regenerate if needed

## Example: Multiple Domains

If you have multiple frontend domains (production, staging, local):

```json
[
  {
    "AllowedOrigins": [
      "https://main.d3jxkz40foxpmx.amplifyapp.com",
      "https://your-custom-domain.com",
      "https://staging.your-domain.com",
      "http://localhost:3000",
      "http://localhost:3001"
    ],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag", "Content-Length"],
    "MaxAgeSeconds": 3600
  }
]
```

## Security Note

- Only include domains you control in `AllowedOrigins`
- Don't use `*` for `AllowedOrigins` in production (security risk)
- Use specific domains for better security

