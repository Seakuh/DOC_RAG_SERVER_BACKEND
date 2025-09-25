import { Body, Controller, Post, UploadedFile, UseInterceptors, BadRequestException, Res } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ImageGenService } from './image-gen.service';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { buildPrompt, getAspectRatio } from './prompt.util';
import { Response } from 'express';

@Controller()
export class GenerateController {
  constructor(private readonly svc: ImageGenService) {}

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

    const prompt = buildPrompt(bubbles, notes);
    const aspectRatio = getAspectRatio(bubbles);

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

    const images = await this.svc.generateImages(prompt, 1, aspectRatio, subjectRef);
    return (res as Response).json({ images });
  }
}
