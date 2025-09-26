import {
  Controller, Post, Body, UseInterceptors, UploadedFile, Res, Get, Query,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { GenerateImageDto } from './dto/generate-image.dto';
import { ImageGenService } from './image-gen.service';
import { ImageService } from '../image/image.service';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { Response } from 'express';

@Controller('images')
export class ImageGenController {
  constructor(private readonly svc: ImageGenService, private readonly imageService: ImageService) {}

  /**
   * Multipart-Endpoint:
   * - Felder: prompt (string, required), n (optional), aspect_ratio (optional)
   * - Datei: image (optional, Fieldname "image"), wird lokal gespeichert und als file:// URL oder public URL übergeben
   */
  @Post('generate')
  @UseInterceptors(FileInterceptor('image'))
  async generate(
    @Res() res: Response,
    @Body() dto: GenerateImageDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    let subjectRef: Buffer | undefined;
    if (file) {
      // Optional: lokal speichern (nicht erforderlich für Replicate)
      const uploadsDir = path.join(process.cwd(), 'uploads');
      if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
      const ext = path.extname(file.originalname || '') || '.bin';
      const name = crypto.randomBytes(8).toString('hex') + ext;
      const full = path.join(uploadsDir, name);
      fs.writeFileSync(full, file.buffer);
      subjectRef = file.buffer;
    }

    const images = await this.svc.generateImages(dto.prompt, dto.n ?? 1, dto.aspect_ratio, subjectRef);
    // Mirror generated images to image server (S3) and return those URLs
    const mirrored: string[] = [];
    for (const url of images) {
      try {
        const m = await this.imageService.mirrorRemoteToGenerated(url);
        mirrored.push(m);
      } catch (e) {
        // fallback to original url if mirroring fails
        mirrored.push(url);
      }
    }
    return (res as Response).json({ images: mirrored });
  }

  /**
   * Liefert die neuesten generierten Bilder in zufälliger Reihenfolge (aus dem Image-Server).
   * Query: limit (optional, default 20, max 100)
   */
  @Get('latest-random')
  async latestRandom(@Res() res: Response, @Query('limit') limitRaw?: string) {
    let limit = 20;
    if (limitRaw !== undefined) {
      const n = Number(limitRaw);
      if (!Number.isNaN(n) && Number.isFinite(n)) {
        limit = Math.max(1, Math.min(100, Math.floor(n)));
      }
    }

    const list = await this.imageService.listGenerated(limit);
    // Shuffle
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }
    return res.json({ images: list });
  }

  /**
   * Liefert 20 zufällige generierte Bilder (Sampling aus den zuletzt hochgeladenen).
   */
  @Get('random')
  async random20(@Res() res: Response) {
    const pool = await this.imageService.listGenerated(100);
    // Shuffle and take first 20
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    const images = pool.slice(0, Math.min(20, pool.length));
    return res.json({ images });
  }
}
