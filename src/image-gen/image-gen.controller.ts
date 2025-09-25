import {
  Controller, Post, Body, UseInterceptors, UploadedFile, Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { GenerateImageDto } from './dto/generate-image.dto';
import { ImageGenService } from './image-gen.service';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { Response } from 'express';

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
    return (res as Response).json({ images });
  }
}
