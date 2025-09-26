import { ListObjectsV2Command, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';

@Injectable()
export class ImageService {
  private readonly s3Client: S3Client;
  private readonly bucketName: string;

  constructor(private configService: ConfigService) {
    const accessKey = this.configService.get<string>('HETZNER_ACCESS_KEY');
    const secretKey = this.configService.get<string>('HETZNER_SECRET_KEY');
    this.bucketName =
      this.configService.get<string>('HETZNER_BUCKET_NAME') || 'imagebucket';

    if (!accessKey || !secretKey) {
      console.error('Missing Hetzner credentials');
    }

    this.s3Client = new S3Client({
      region: 'eu-central-1',
      endpoint: 'https://hel1.your-objectstorage.com',
      credentials: {
        accessKeyId: accessKey,
        secretAccessKey: secretKey,
      },
      forcePathStyle: true,
    });
  }

  async uploadImageFromBuffer(imageBuffer: Buffer): Promise<string> {
    try {
      const fileExtension = 'jpg';
      const fileName = `${uuidv4()}.${fileExtension}`;

      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: `documents/${fileName}`,
        Body: imageBuffer,
        ContentType: 'image/jpeg',
        ACL: 'public-read',
      });

      await this.s3Client.send(command);

      return `https://hel1.your-objectstorage.com/${this.bucketName}/documents/${fileName}`;
    } catch (error) {
      console.error('Failed to upload image:', error);
      throw new Error(`Failed to upload image: ${error.message}`);
    }
  }

  async uploadImage(image: Express.Multer.File): Promise<string> {
    try {
      const fileExtension = image.originalname.split('.').pop() || 'jpg';
      const fileName = `${uuidv4()}.${fileExtension}`;

      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: `documents/${fileName}`,
        Body: image.buffer,
        ContentType: image.mimetype,
        ACL: 'public-read',
      });

      await this.s3Client.send(command);

      return `https://hel1.your-objectstorage.com/${this.bucketName}/documents/${fileName}`;
    } catch (error) {
      console.error('Failed to upload image:', error);
      throw new Error(`Failed to upload image: ${error.message}`);
    }
  }

  async uploadDocument(file: Express.Multer.File): Promise<string> {
    try {
      const fileExtension = file.originalname.split('.').pop() || 'bin';
      const fileName = `${uuidv4()}.${fileExtension}`;

      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: `documents/${fileName}`,
        Body: file.buffer,
        ContentType: file.mimetype,
        ACL: 'public-read',
      });

      await this.s3Client.send(command);

      return `https://hel1.your-objectstorage.com/${this.bucketName}/documents/${fileName}`;
    } catch (error) {
      console.error('Failed to upload document:', error);
      throw new Error(`Failed to upload document: ${error.message}`);
    }
  }

  async uploadGeneratedImageFromBuffer(imageBuffer: Buffer, contentType = 'image/jpeg'): Promise<string> {
    try {
      const fileExtension = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg';
      const fileName = `${uuidv4()}.${fileExtension}`;

      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: `generated/${fileName}`,
        Body: imageBuffer,
        ContentType: contentType,
        ACL: 'public-read',
      });

      await this.s3Client.send(command);

      return `https://hel1.your-objectstorage.com/${this.bucketName}/generated/${fileName}`;
    } catch (error) {
      console.error('Failed to upload generated image:', error);
      throw new Error(`Failed to upload generated image: ${error.message}`);
    }
  }

  async mirrorRemoteToGenerated(url: string): Promise<string> {
    const resp = await axios.get<ArrayBuffer>(url, { responseType: 'arraybuffer' });
    const buf = Buffer.from(resp.data);
    const contentType = resp.headers['content-type'] || 'image/jpeg';
    return this.uploadGeneratedImageFromBuffer(buf, contentType);
  }

  async listGenerated(limit = 20): Promise<string[]> {
    const cmd = new ListObjectsV2Command({ Bucket: this.bucketName, Prefix: 'generated/' });
    const res = await this.s3Client.send(cmd);
    const objects = (res.Contents || [])
      .filter(o => (o.Key || '').startsWith('generated/'))
      .sort((a, b) => {
        const at = a.LastModified?.getTime() || 0;
        const bt = b.LastModified?.getTime() || 0;
        return bt - at;
      })
      .slice(0, Math.max(1, Math.min(100, limit)));

    return objects.map(o => `https://hel1.your-objectstorage.com/${this.bucketName}/${o.Key}`);
  }
}
