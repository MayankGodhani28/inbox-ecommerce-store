import multer from 'multer';
import { Request, Response, NextFunction } from 'express';

// Store files in memory buffer (no disk leakage or orphaned files)
const storage = multer.memoryStorage();

// Allowed image MIME types
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
]);

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB file size limit
    files: 1, // Only 1 file per upload
  },
  fileFilter: (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    if (ALLOWED_MIME_TYPES.has(file.mimetype.toLowerCase())) {
      cb(null, true);
    } else {
      cb(
        new Error(
          `Unsupported file format (${file.mimetype}). Allowed image formats: JPG, PNG, WEBP, GIF, AVIF.`
        )
      );
    }
  },
});

/**
 * Express middleware for single image upload with error handling for file size and MIME validation.
 */
export function singleImageUpload(fieldName = 'image') {
  const multerHandler = upload.single(fieldName);

  return (req: Request, res: Response, next: NextFunction): void => {
    multerHandler(req, res, (err: any) => {
      if (!err) {
        return next();
      }

      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          res.status(413).json({
            error: {
              code: 'FILE_TOO_LARGE',
              message: 'Image size exceeds maximum limit of 10MB.',
            },
          });
          return;
        }
        res.status(400).json({
          error: {
            code: 'UPLOAD_ERROR',
            message: err.message,
          },
        });
        return;
      }

      res.status(400).json({
        error: {
          code: 'INVALID_FILE_TYPE',
          message: err.message || 'Invalid image file provided.',
        },
      });
    });
  };
}
