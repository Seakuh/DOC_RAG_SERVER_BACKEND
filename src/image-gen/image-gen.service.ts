import { Injectable } from '@nestjs/common';
import Replicate = require('replicate');

@Injectable()
export class ImageGenService {
  private readonly replicate: any;

  constructor() {
    const token = process.env.REPLICATE_API_TOKEN;
    if (!token) {
      throw new Error('Missing REPLICATE_API_TOKEN');
    }
    this.replicate = new (Replicate as any)({ auth: token, fileEncodingStrategy: 'upload' });
  }

  /**
   * Generiert Bilder via minimax/image-01.
   * @param prompt Prompt-Text
   * @param n Anzahl Bilder (Default 1)
   * @param aspect_ratio Optionales Seitenverhältnis, z. B. "3:4"
   * @param imageUrl Optional: URL zu einem Referenzbild (falls img2img vom Modell unterstützt)
   */
  async generateImages(
    prompt: string,
    n = 1,
    aspect_ratio?: string,
    subjectReference?: string | Buffer,
  ) {
    const inputBase: Record<string, any> = {
      prompt,
      prompt_optimizer: true,
    };
    if (aspect_ratio) inputBase.aspect_ratio = aspect_ratio;
    // subject_reference: Referenzbild, falls vom Modell unterstützt
    if (subjectReference) inputBase.subject_reference = subjectReference;

    // minimax/image-01 liefert i. d. R. ein Array von Outputs (Datei-Objekte/URLs).
    // Wir rufen das Modell n-mal auf, wenn n > 1 (retries/parallel sind möglich, hier der Einfachheit nach seriell).
    const urls: string[] = [];
    for (let i = 0; i < n; i++) {
      const input = { ...inputBase, number_of_images: 1 };
      const output: any = await this.replicate.run('minimax/image-01', { input });
      // Output kann je nach Runner ein Array aus Datei-Objekten oder direkt URLs sein.
      // Wir normalisieren auf URLs:
      if (Array.isArray(output)) {
        for (const item of output) {
          // item.url oder item (falls bereits URL-String)
          const u = typeof item === 'string' ? item : (typeof (item as any)?.url === 'function' ? (item as any).url() : (item as any)?.url);
          if (u) urls.push(u);
        }
      }
    }
    return urls;
  }
}
