import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// Lazy initialization - these will be set when first used
let s3Client: S3Client | null = null;
let BUCKET_NAME: string | null = null;

function getS3Client(): S3Client {
  if (!s3Client) {
    s3Client = new S3Client({
      region: process.env.AWS_REGION || 'ap-south-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
      },
    });
  }
  return s3Client;
}

function getBucketName(): string {
  if (!BUCKET_NAME) {
    BUCKET_NAME = process.env.S3_BUCKET_NAME || 'crest-team-files';
    if (process.env.NODE_ENV !== 'production') {
      console.log(`📦 S3 Bucket: ${BUCKET_NAME}`);
      console.log(`🌍 S3 Region: ${process.env.AWS_REGION || 'ap-south-1'}`);
      if (!process.env.S3_BUCKET_NAME) {
        console.warn('⚠️  S3_BUCKET_NAME not found in environment, using default: crest-team-files');
      }
    }
  }
  return BUCKET_NAME;
}

/**
 * Generate a presigned URL for uploading a file to S3
 * @param fileType MIME type of the file
 * @param fileName Original file name
 * @param fileSize File size in bytes (optional, for validation)
 * @returns Presigned URL and file key
 */
export async function generatePresignedUploadUrl(
  fileType: string,
  fileName: string,
  fileSize?: number
): Promise<{ uploadUrl: string; key: string }> {
  // Validate file size (max 10MB)
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  if (fileSize && fileSize > MAX_FILE_SIZE) {
    throw new Error('File size exceeds maximum limit of 10MB');
  }

  // Generate unique file key
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 15);
  const fileExtension = fileName.split('.').pop() || '';
  const key = `uploads/${timestamp}-${randomString}.${fileExtension}`;

  const command = new PutObjectCommand({
    Bucket: getBucketName(),
    Key: key,
    ContentType: fileType,
    // CORS headers for browser uploads
    CacheControl: 'max-age=31536000',
    // Optional: Add metadata
    Metadata: {
      originalFileName: fileName,
      uploadedAt: new Date().toISOString(),
    },
  });

  // Generate presigned URL valid for 15 minutes
  const uploadUrl = await getSignedUrl(getS3Client(), command, { expiresIn: 900 });

  return { uploadUrl, key };
}

/**
 * Delete a file from S3
 * @param key S3 object key
 */
export async function deleteFile(key: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: getBucketName(),
    Key: key,
  });

  await getS3Client().send(command);
}

/**
 * Get a presigned URL for downloading/viewing a file from S3
 * @param key S3 object key
 * @param expiresIn Expiration time in seconds (default: 1 hour)
 * @returns Presigned URL
 */
export async function getFileUrl(key: string, expiresIn: number = 3600): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: getBucketName(),
    Key: key,
  });

  return await getSignedUrl(getS3Client(), command, { expiresIn });
}

/**
 * Get the public URL for a file (if bucket is public)
 * Note: This assumes the bucket has public read access or CloudFront distribution
 * @param key S3 object key
 * @returns Public URL
 */
export function getPublicFileUrl(key: string): string {
  const region = process.env.AWS_REGION || 'ap-south-1';
  return `https://${getBucketName()}.s3.${region}.amazonaws.com/${key}`;
}

