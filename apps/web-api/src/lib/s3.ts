import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import env from '../env';

// Create S3 client
export const s3Client = new S3Client({
  endpoint: env.S3_ENDPOINT,
  region: env.S3_REGION,
  credentials: {
    accessKeyId: env.S3_ACCESS_KEY,
    secretAccessKey: env.S3_SECRET_KEY,
  },
  forcePathStyle: true, // Required for MinIO
});

// Upload file to S3
export async function uploadToS3(
  key: string,
  data: Buffer | string,
  contentType: string = 'application/octet-stream'
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: env.S3_BUCKET,
    Key: key,
    Body: data,
    ContentType: contentType,
  });

  await s3Client.send(command);
  return `${env.S3_ENDPOINT}/${env.S3_BUCKET}/${key}`;
}

// Upload screenshot
export async function uploadScreenshot(
  accountId: number,
  timestamp: string,
  imageBuffer: Buffer
): Promise<string> {
  const key = `screenshots/${accountId}/${timestamp}.png`;
  return uploadToS3(key, imageBuffer, 'image/png');
}

// Upload DOM snapshot
export async function uploadDOMSnapshot(
  accountId: number,
  timestamp: string,
  domData: string
): Promise<string> {
  const key = `dom_snapshots/${accountId}/${timestamp}.json`;
  return uploadToS3(key, domData, 'application/json');
}

// Get presigned URL for reading
export async function getPresignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: env.S3_BUCKET,
    Key: key,
  });

  return getSignedUrl(s3Client, command, { expiresIn });
}

// Delete file from S3
export async function deleteFromS3(key: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: env.S3_BUCKET,
    Key: key,
  });

  await s3Client.send(command);
}

// Archive old logs (move to archive folder)
export async function archiveLogs(date: string): Promise<void> {
  // This would require listing objects and moving them
  // Implementation depends on specific archiving strategy
  console.log(`Archiving logs for date: ${date}`);
}

// Health check for S3
export async function checkS3Health(): Promise<boolean> {
  try {
    // Try to list objects in bucket
    const command = new ListObjectsV2Command({
      Bucket: env.S3_BUCKET,
      MaxKeys: 1,
    });
    
    await s3Client.send(command);
    return true;
  } catch (error) {
    console.error('S3 health check failed:', error);
    return false;
  }
}
