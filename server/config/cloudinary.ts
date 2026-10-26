import { v2 as cloudinary, UploadApiResponse, UploadApiErrorResponse } from 'cloudinary';

/**
 * Configure Cloudinary instance from environment variables.
 * Supports individual keys (CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET)
 * or full connection string (CLOUDINARY_URL).
 */
export function configureCloudinary(): void {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();
  const cloudinaryUrl = process.env.CLOUDINARY_URL?.trim();

  if (cloudinaryUrl) {
    cloudinary.config({
      cloudinary_url: cloudinaryUrl,
      secure: true,
    });
  } else if (cloudName && apiKey && apiSecret) {
    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
      secure: true,
    });
  }
}

/**
 * Checks whether required Cloudinary credentials have been provided in the environment.
 */
export function isCloudinaryConfigured(): boolean {
  if (process.env.CLOUDINARY_URL && process.env.CLOUDINARY_URL.trim() !== '') {
    return true;
  }
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();
  return Boolean(cloudName && apiKey && apiSecret);
}

export interface CloudinaryUploadOptions {
  folder?: string;
  publicId?: string;
  tags?: string[];
}

export interface CloudinaryUploadResult {
  url: string;
  publicId: string;
  format: string;
  width: number;
  height: number;
  bytes: number;
}

/**
 * Upload an in-memory image buffer directly to Cloudinary via upload_stream.
 * Ensures images are optimized with automatic quality and format conversion.
 */
export async function uploadImageToCloudinary(
  buffer: Buffer,
  options: CloudinaryUploadOptions = {}
): Promise<CloudinaryUploadResult> {
  if (!isCloudinaryConfigured()) {
    throw new Error(
      'Cloudinary is not configured. Please add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET to your .env file.'
    );
  }

  configureCloudinary();

  return new Promise<CloudinaryUploadResult>((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: options.folder || 'inbox-products',
        public_id: options.publicId,
        resource_type: 'image',
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif'],
        transformation: [
          { width: 1200, height: 1200, crop: 'limit' },
          { quality: 'auto', fetch_format: 'auto' },
        ],
        tags: options.tags || ['inbox_store_product'],
      },
      (error: UploadApiErrorResponse | undefined, result: UploadApiResponse | undefined) => {
        if (error || !result) {
          return reject(
            new Error(
              error?.message || 'Upload to Cloudinary failed with an empty response'
            )
          );
        }

        resolve({
          url: result.secure_url || result.url,
          publicId: result.public_id,
          format: result.format,
          width: result.width,
          height: result.height,
          bytes: result.bytes,
        });
      }
    );

    uploadStream.end(buffer);
  });
}
