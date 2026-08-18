import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { createHash } from 'crypto';

type UploadResourceType = 'image' | 'video' | 'raw';

@Injectable()
export class CloudinaryService {
  private readonly cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  private readonly apiKey = process.env.CLOUDINARY_API_KEY?.trim();
  private readonly apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();
  private readonly uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET?.trim();

  async uploadFile(file: Express.Multer.File, folder: string): Promise<string> {
    if (!this.cloudName || !this.uploadPreset) {
      throw new InternalServerErrorException(
        'Cloudinary upload is not configured',
      );
    }
    const resourceType = this.resourceType(file.mimetype);
    const formData = new FormData();
    formData.append(
      'file',
      new Blob([file.buffer], { type: file.mimetype }),
      file.originalname,
    );
    formData.append('upload_preset', this.uploadPreset);
    formData.append('folder', folder);
    if (this.apiKey && this.apiSecret) {
      const timestamp = Math.floor(Date.now() / 1000).toString();
      formData.append('timestamp', timestamp);
      formData.append('api_key', this.apiKey);
      formData.append(
        'signature',
        this.signature({
          folder,
          timestamp,
          upload_preset: this.uploadPreset,
        }),
      );
    }
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${this.cloudName}/${resourceType}/upload`,
      {
        method: 'POST',
        body: formData,
      },
    );
    if (!response.ok) {
      throw new InternalServerErrorException('Cloudinary upload failed');
    }
    const data = (await response.json()) as { secure_url?: string };
    if (!data.secure_url) {
      throw new InternalServerErrorException(
        'Cloudinary did not return a file URL',
      );
    }
    return data.secure_url;
  }

  normalizeUrl(input: string): string {
    const url = this.parseCloudinaryUrl(input);
    if (!url) {
      throw new BadRequestException('A valid Cloudinary URL is required');
    }
    return url.toString();
  }

  private resourceType(mimetype: string): UploadResourceType {
    if (mimetype.startsWith('video/')) return 'video';
    if (mimetype.startsWith('image/')) return 'image';
    return 'raw';
  }

  private parseCloudinaryUrl(input: string): URL | null {
    try {
      const url = new URL(input);
      if (!url.hostname.includes('cloudinary.com')) return null;
      return url;
    } catch {
      return null;
    }
  }

  private signature(params: Record<string, string>) {
    const base = Object.entries(params)
      .filter(([, value]) => Boolean(value))
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join('&');
    return createHash('sha1').update(`${base}${this.apiSecret}`).digest('hex');
  }
}
