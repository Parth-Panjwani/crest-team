import { Router } from 'express';
import { generatePresignedUploadUrl, deleteFile, getFileUrl, getPublicFileUrl } from '../config/s3.js';

const router = Router();

/**
 * Generate presigned URL for file upload
 * POST /api/files/upload-url
 * Body: { fileName: string, fileType: string, fileSize?: number }
 */
router.post('/upload-url', async (req, res) => {
  try {
    const { fileName, fileType, fileSize } = req.body;

    if (!fileName || !fileType) {
      return res.status(400).json({ error: 'fileName and fileType are required' });
    }

    const { uploadUrl, key } = await generatePresignedUploadUrl(fileType, fileName, fileSize);

    res.json({
      uploadUrl,
      key,
      // Also return the public URL for immediate use after upload
      fileUrl: getPublicFileUrl(key),
    });
  } catch (error) {
    console.error('Generate upload URL error:', error);
    if (error instanceof Error && error.message.includes('exceeds maximum limit')) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Delete a file from S3
 * DELETE /api/files/:key
 */
router.delete('/:key', async (req, res) => {
  try {
    const { key } = req.params;
    
    // Decode the key in case it's URL encoded
    const decodedKey = decodeURIComponent(key);
    
    await deleteFile(decodedKey);
    res.json({ success: true, message: 'File deleted successfully' });
  } catch (error) {
    console.error('Delete file error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get a presigned URL for downloading/viewing a file
 * GET /api/files/:key?expiresIn=3600
 */
router.get('/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const expiresIn = req.query.expiresIn ? parseInt(req.query.expiresIn as string, 10) : 3600;
    
    // Decode the key in case it's URL encoded
    const decodedKey = decodeURIComponent(key);
    
    const url = await getFileUrl(decodedKey, expiresIn);
    res.json({ url });
  } catch (error) {
    console.error('Get file URL error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

