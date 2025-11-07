# Debugging File Uploads in AWS Amplify

## Understanding CloudWatch Logs

The logs you're seeing in CloudWatch are Lambda invocation metadata. To find actual application errors and upload information, you need to filter for specific log messages.

## How to Find Upload-Related Logs

### Step 1: Filter for Upload Logs

In the CloudWatch Logs filter bar, use these filters:

1. **Find all upload attempts:**
   ```
   [UPLOAD]
   ```

2. **Find upload errors:**
   ```
   [UPLOAD] ERROR
   ```

3. **Find proxy errors:**
   ```
   [PROXY ERROR]
   ```

4. **Find all errors:**
   ```
   ERROR
   ```

### Step 2: Understanding the Log Messages

After deploying the updated code, you'll see logs like:

**Successful Upload:**
```
[UPLOAD] POST uploads - Content-Type: multipart/form-data; boundary=..., Content-Length: 9375097
[UPLOAD] Body stream obtained, forwarding to Express backend: https://...
[UPLOAD] Forwarding request to Express backend...
[UPLOAD] Express backend responded with status: 200
[UPLOAD] SUCCESS - POST uploads completed in 1234ms, status: 200
```

**Failed Upload:**
```
[UPLOAD] POST uploads - Content-Type: multipart/form-data; boundary=..., Content-Length: 9375097
[UPLOAD] ERROR processing file upload: [error details]
[UPLOAD] Error details: { message: "...", stack: "...", ... }
```

**Proxy Error:**
```
[PROXY ERROR] POST uploads failed after 500ms: [error]
[PROXY ERROR] Error details: { message: "...", stack: "...", path: "uploads", method: "POST" }
```

## Step 3: Check for Common Issues

### Issue 1: Body Size Limit
If you see an error like:
- `Request entity too large`
- `PayloadTooLargeError`
- `413 Request Entity Too Large`

This means Amplify or Next.js is rejecting the request before it reaches your code.

### Issue 2: Missing Body
If you see:
```
[UPLOAD] ERROR: Request body is null or undefined
```

The request body isn't being received, possibly due to Amplify's infrastructure limits.

### Issue 3: Express Backend Error
If you see:
```
[UPLOAD] Express backend responded with status: 400
```
or
```
[UPLOAD] Express backend responded with status: 500
```

The request reached your Express backend but failed there. Check your Express backend logs.

## Step 4: Using CloudWatch Logs Insights

For more advanced queries, use CloudWatch Logs Insights:

1. Click "Logs Insights" in the left sidebar
2. Select your log group: `/aws/amplify/d3jxkz40foxpmx`
3. Use this query to find upload errors:

```sql
fields @timestamp, @message
| filter @message like /\[UPLOAD\]/
| sort @timestamp desc
| limit 50
```

Or to find all errors:

```sql
fields @timestamp, @message
| filter @message like /ERROR/
| sort @timestamp desc
| limit 50
```

## Step 5: Real-Time Monitoring

1. Click "Live Tail" in the left sidebar
2. This shows logs in real-time as they happen
3. Try uploading a file and watch the logs appear

## What to Look For

When you try to upload your 8.94MB file, look for:

1. **Does the request start?** - Look for `[UPLOAD] POST uploads`
2. **Is the body received?** - Look for `Body stream obtained`
3. **Does it reach Express?** - Look for `Express backend responded with status:`
4. **What's the error?** - Look for `[UPLOAD] ERROR` or `[PROXY ERROR]`

## Next Steps

After deploying the updated code with enhanced logging:

1. Deploy to Amplify
2. Try uploading your 8.94MB file
3. Go to CloudWatch Logs
4. Filter for `[UPLOAD]` or `ERROR`
5. Share the error messages you see

This will help identify exactly where the upload is failing.

