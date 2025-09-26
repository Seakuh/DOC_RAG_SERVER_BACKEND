import { Body, Controller, Post, UploadedFile, UseInterceptors, BadRequestException, Res } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ImageGenService } from './image-gen.service';
import { ImageService } from '../image/image.service';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { buildStylingPrompt, getAspectRatio } from './prompt.util';
import { Response } from 'express';

@Controller()
export class GenerateController {
  constructor(private readonly svc: ImageGenService, private readonly imageService: ImageService) {}

  /**
   * POST /api/v1/generate
   * Multipart fields:
   * - image: file (optional)
   * - notes: string (optional)
   * - bubbles: JSON string array of bubble IDs (required)
   */
  @Post('generate')
  @UseInterceptors(FileInterceptor('image'))
  async generate(
    @Res() res: Response,
    @Body('bubbles') bubblesJson: string,
    @Body('notes') notes?: string,
    @Body('gender') gender?: string,
    @Body('hairstyleId') hairstyleId?: string,
    @Body('hairstyleLabel') hairstyleLabel?: string,
    @Body('hairColorFrom') hairColorFrom?: string,
    @Body('hairColorTo') hairColorTo?: string,
    @Body('framing') framing?: 'face' | 'full_body' | 'collection' | string,
    @Body('amount') amountRaw?: string,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!bubblesJson) {
      throw new BadRequestException('bubbles is required and must be a JSON array of IDs');
    }

    let bubbles: string[] = [];
    try {
      const parsed = JSON.parse(bubblesJson);
      if (!Array.isArray(parsed) || !parsed.every((x) => typeof x === 'string')) {
        throw new Error('Invalid bubbles format');
      }
      bubbles = parsed as string[];
    } catch {
      throw new BadRequestException('Invalid bubbles JSON');
    }

    const prompt = buildStylingPrompt(bubbles, { notes, gender, hairstyleId, hairstyleLabel, hairColorFrom, hairColorTo, framing });
    const aspectRatio = getAspectRatio(bubbles);
    let amount = framing === 'collection' && amountRaw === undefined ? 3 : 1;
    if (amountRaw !== undefined) {
      const parsed = Number(amountRaw);
      if (!Number.isNaN(parsed) && Number.isFinite(parsed)) {
        amount = Math.max(1, Math.min(8, Math.floor(parsed)));
      }
    }

    let subjectRef: Buffer | undefined;
    if (file) {
      const uploadsDir = path.join(process.cwd(), 'uploads');
      if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
      const ext = path.extname(file.originalname || '') || '.bin';
      const name = crypto.randomBytes(8).toString('hex') + ext;
      const full = path.join(uploadsDir, name);
      fs.writeFileSync(full, file.buffer);
      subjectRef = file.buffer;
    }

    const images = await this.svc.generateImages(prompt, amount, aspectRatio, subjectRef);
    const mirrored: string[] = [];
    for (const url of images) {
      try {
        const m = await this.imageService.mirrorRemoteToGenerated(url);
        mirrored.push(m);
      } catch (e) {
        mirrored.push(url);
      }
    }
    return (res as Response).json({ images: mirrored });
  }
}
