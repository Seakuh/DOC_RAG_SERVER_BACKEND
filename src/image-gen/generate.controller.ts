import { Body, Controller, Post, UploadedFile, UseInterceptors, BadRequestException, Res, Req } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ImageGenService } from './image-gen.service';
import { ImageService } from '../image/image.service';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { buildStylingPrompt, getAspectRatio } from './prompt.util';
import { Request, Response } from 'express';
import { BillingService } from '../billing/billing.service';
import { Throttle } from '@nestjs/throttler';

@Controller()
export class GenerateController {
  constructor(
    private readonly svc: ImageGenService,
    private readonly imageService: ImageService,
    private readonly billing: BillingService,
  ) {}

  /**
   * POST /api/v1/generate
   * Multipart fields:
   * - image: file (optional)
   * - notes: string (optional)
   * - bubbles: JSON string array of bubble IDs (required)
   */
  @Post('generate')
  @Throttle({ short: { limit: 2, ttl: 1000 }, medium: { limit: 20, ttl: 60000 } })
  @UseInterceptors(FileInterceptor('image'))
  async generate(
    @Req() req: Request,
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

    // Identify client and enforce token balance
    const clientId = (() => {
      const val = (req.headers['x-client-id'] || req.headers['X-Client-Id']) as string | undefined;
      try {
        return this.billing.validateClientIdOrThrow(val);
      } catch {
        throw new BadRequestException('Invalid X-Client-Id');
      }
    })();
    this.billing.ensureClient(clientId, 1);

    // Reserve tokens before generation; refund if generation fails
    try {
      await this.billing.reserveTokens(clientId, amount);
    } catch (e) {
      if ((e as Error).message === 'INSUFFICIENT_TOKENS') {
        return res.status(402).json({ error: 'INSUFFICIENT_TOKENS' });
      }
      throw e;
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
    try {
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
      const tokens = this.billing.getTokens(clientId);
      return (res as Response).json({ images: mirrored, tokens });
    } catch (err) {
      await this.billing.refundTokens(clientId, amount);
      throw err;
    }
  }
}
