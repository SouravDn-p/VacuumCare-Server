// Temporary diagnostic: uploads a 1x1 PNG through the compiled CloudinaryService
// using the configured environment, to confirm the fix end to end. Delete when done.
import 'dotenv/config';
import { CloudinaryService } from './dist/src/service/cloudinary/cloudinary.service.js';

const service = new CloudinaryService();
const file = {
  originalname: 'probe.png',
  mimetype: 'image/png',
  buffer: Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
    'base64',
  ),
};

console.log('preset configured:', JSON.stringify(process.env.CLOUDINARY_UPLOAD_PRESET));
try {
  const url = await service.uploadFile(file, 'vacuumCare/probe');
  console.log('SUCCESS, stored URL:', url);
} catch (error) {
  console.log('FAILED:', error.message);
}
