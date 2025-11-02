# Cloudflare R2 Migration Guide

This guide will help you migrate from AWS S3 to Cloudflare R2 for storing PDFs and images.

## Overview

Cloudflare R2 is an S3-compatible object storage service. The codebase has been updated to use R2 instead of AWS S3. Since R2 is S3-compatible, we continue using the AWS SDK but configured for R2 endpoints.

## Prerequisites

- A Cloudflare account
- Access to create R2 buckets and API tokens

## Step 1: Create R2 Bucket

1. Log in to your Cloudflare dashboard
2. Navigate to **R2** in the sidebar
3. Click **Create bucket**
4. Enter a bucket name (e.g., `quiz-tuition-uploads`)
5. Choose a location (select the region closest to your users)
6. Click **Create bucket**

## Step 2: Create API Token

1. In the R2 dashboard, go to **Manage R2 API Tokens**
2. Click **Create API token**
3. Configure the token:
   - **Token name**: `quiz-tuition-api-token` (or any descriptive name)
   - **Permissions**: Select **Object Read & Write**
   - **Bucket**: Select your bucket name
   - **TTL**: Leave empty for no expiration, or set an expiration date
4. Click **Create API token**
5. **Important**: Copy and save the credentials:
   - **Access Key ID**
   - **Secret Access Key**

**Note**: You won't be able to see the Secret Access Key again after creation. Save it securely!

## Step 3: Get Your Account ID

1. In Cloudflare dashboard, select any domain or go to the overview page
2. Your **Account ID** is visible in the URL or in the right sidebar
3. It looks like: `a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6`

Alternatively:

- Go to R2 dashboard → Your bucket → Settings
- The Account ID may be visible there, or check your Cloudflare dashboard URL

## Step 4: Update Environment Variables

Update your `.env` file (or environment configuration) with the following variables:

```env
# Cloudflare R2 Configuration
R2_ACCOUNT_ID=your-account-id-here
R2_ACCESS_KEY_ID=your-access-key-id-here
R2_SECRET_ACCESS_KEY=your-secret-access-key-here
R2_BUCKET=quiz-tuition-uploads
R2_PUBLIC_URL=https://your-custom-domain.com  # Optional: if you set up a custom domain
```

### Remove Old AWS Variables

You can remove or comment out these old AWS variables (they're no longer needed):

```env
# AWS_REGION=ap-south-1  # No longer needed
# S3_BUCKET_UPLOADS=quiz-tuition-uploads-prod  # No longer needed
```

## Step 5: Optional - Configure Custom Domain (Recommended)

If you want to serve files via a custom domain instead of presigned URLs:

1. In your R2 bucket, go to **Settings**
2. Under **Public Access**, click **Connect Domain**
3. Add your domain (e.g., `cdn.yourdomain.com`)
4. Follow Cloudflare's DNS setup instructions
5. Update `R2_PUBLIC_URL` in your `.env` if you want to use public URLs instead of presigned URLs

## Step 6: Configure CORS (if needed)

If your frontend needs to access R2 files directly:

1. Go to your R2 bucket → **Settings**
2. Under **CORS Policy**, add:
   ```json
   [
     {
       "AllowedOrigins": ["https://yourdomain.com", "http://localhost:3000"],
       "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
       "AllowedHeaders": ["*"],
       "ExposeHeaders": ["ETag"],
       "MaxAgeSeconds": 3600
     }
   ]
   ```

## Step 7: Test the Setup

1. Restart your API server
2. Try uploading a file through your application
3. Verify the file appears in your R2 bucket
4. Check that presigned URLs are generated correctly

## Differences from S3

### Cost

- R2 has **no egress fees** (data transfer out is free)
- Storage pricing is similar to S3
- You only pay for storage and operations

### Regions

- R2 uses `"auto"` as the region in the SDK configuration
- Buckets can be placed in different regions during creation

### API Compatibility

- R2 is S3-compatible, so the same AWS SDK works
- Most S3 operations work identically
- Some advanced S3 features may not be available

## Troubleshooting

### Error: "R2_BUCKET is not set in the environment"

- Make sure all R2 environment variables are set
- Check that your `.env` file is being loaded correctly

### Error: "Access Denied" or 403 errors

- Verify your API token has the correct permissions
- Check that the bucket name matches exactly
- Ensure the Access Key ID and Secret Access Key are correct

### Presigned URLs not working

- Verify your R2 bucket is accessible
- Check that the bucket name in the environment matches your actual bucket
- Ensure your API token has read permissions

### Connection timeout

- Verify your Account ID is correct
- Check network connectivity to Cloudflare R2 endpoints
- Ensure your endpoint URL format is: `https://<account-id>.r2.cloudflarestorage.com`

### "NoSuchBucket" error with 404 status

- This usually means the SDK is using virtual-hosted-style URLs (bucket in hostname)
- The code includes `forcePathStyle: true` to fix this - make sure you're using the latest code
- Verify your bucket name matches exactly (case-sensitive)
- Ensure your API token has permissions for the bucket
- Double-check that the bucket actually exists in your Cloudflare dashboard

## Additional Resources

- [Cloudflare R2 Documentation](https://developers.cloudflare.com/r2/)
- [R2 S3 API Compatibility](https://developers.cloudflare.com/r2/api/s3/api/)
- [R2 Pricing](https://developers.cloudflare.com/r2/pricing/)

## Migration Checklist

- [ ] Created R2 bucket
- [ ] Created API token with read/write permissions
- [ ] Retrieved Account ID
- [ ] Updated environment variables
- [ ] Removed old AWS environment variables
- [ ] Tested file upload
- [ ] Tested file download
- [ ] Tested presigned URL generation
- [ ] (Optional) Configured custom domain
- [ ] (Optional) Configured CORS policy
