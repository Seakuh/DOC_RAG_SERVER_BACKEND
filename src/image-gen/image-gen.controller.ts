import {
  Controller, Post, Body, UseInterceptors, UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { GenerateImageDto } from './dto/generate-image.dto';
import { ImageGenService } from './image-gen.service';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

@Controller('images')
export class ImageGenController {
  constructor(private readonly svc: ImageGenService) {}

  /**
   * Multipart-Endpoint:
   * - Felder: prompt (string, required), n (optional), aspect_ratio (optional)
   * - Datei: image (optional, Fieldname "image"), wird lokal gespeichert und als file:// URL oder public URL übergeben
   */
  @Post('generate')
  @UseInterceptors(FileInterceptor('image'))
  async generate(
    @Body() dto: GenerateImageDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    let imageUrl: string | undefined;
    if (file) {
      // Speichere temporär in ./uploads und erzeuge eine file:// URL
      const uploadsDir = path.join(process.cwd(), 'uploads');
      if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
      const ext = path.extname(file.originalname || '') || '.bin';
      const name = crypto.randomBytes(8).toString('hex') + ext;
      const full = path.join(uploadsDir, name);
      fs.writeFileSync(full, file.buffer);
      imageUrl = `file://${full}`;
    }

    const urls = await this.svc.generateImages(dto.prompt, dto.n ?? 1, dto.aspect_ratio, imageUrl);
    return { count: urls.length, urls };
  }
}

