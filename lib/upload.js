import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Accepts a base64 data URI (from the browser FileReader) and uploads it.
// resourceType 'auto' lets Cloudinary detect image vs audio/video.
export async function uploadMedia(dataUri, folder = 'exam-portal') {
  if (!process.env.CLOUDINARY_CLOUD_NAME) {
    throw new Error('Cloudinary is not configured. Set CLOUDINARY_* env vars.');
  }
  const result = await cloudinary.uploader.upload(dataUri, {
    folder,
    resource_type: 'auto',
  });
  return { url: result.secure_url, publicId: result.public_id };
}

export default cloudinary;
