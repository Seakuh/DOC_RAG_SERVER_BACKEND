import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { QdrantClient } from '@qdrant/js-client-rest';
import { EmbeddingsService } from '../embeddings/embeddings.service';
import { UploadToQdrantDto } from './dto/upload-to-qdrant.dto';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as pdf from 'pdf-parse';
import * as mammoth from 'mammoth';
import sharp from 'sharp';
import Tesseract from 'tesseract.js';

export interface FileProcessingResult {
  filename: string;
  fileType: string;
  chunks: number;
  vectorsCreated: number;
  ocrApplied?: boolean;
  error?: string;
}

@Injectable()
export class QdrantUploadService {
  private readonly logger = new Logger(QdrantUploadService.name);
  private client: QdrantClient;

  constructor(
    private readonly configService: ConfigService,
    private readonly embeddingsService: EmbeddingsService,
  ) {
    const apiKey = this.configService.get<string>('QDRANT_API_KEY');
    const apiUrl = this.configService.get<string>('QDRANT_API_URL');

    if (!apiUrl) {
      throw new Error('QDRANT_API_URL must be configured');
    }

    if (!apiKey) {
      this.logger.warn('QDRANT_API_KEY not set - using Qdrant without authentication');
    }

    this.client = new QdrantClient({
      url: apiUrl,
      ...(apiKey && { apiKey }), // Only add apiKey if present
    });

    this.logger.log('Qdrant Upload Service initialized');
  }

  async processAndUploadFiles(
    files: Express.Multer.File[],
    dto: UploadToQdrantDto,
  ): Promise<{
    success: boolean;
    collectionName: string;
    filesProcessed: number;
    vectorsCreated: number;
    details: FileProcessingResult[];
  }> {
    const { collectionName, vectorDimension = 1536, tags } = dto;

    // Ensure collection exists
    await this.ensureCollection(collectionName, vectorDimension);

    const details: FileProcessingResult[] = [];
    let totalVectors = 0;
    let filesProcessed = 0;

    for (const file of files) {
      try {
        this.logger.log(
          `Processing file: ${file.originalname} (${file.mimetype})`,
        );

        const result = await this.processFile(file, collectionName, tags);
        details.push(result);
        totalVectors += result.vectorsCreated;
        filesProcessed++;

        // Clean up uploaded file
        await fs.unlink(file.path).catch((err) =>
          this.logger.warn(`Failed to delete temp file: ${err.message}`),
        );
      } catch (error) {
        this.logger.error(
          `Failed to process file ${file.originalname}: ${error.message}`,
          error.stack,
        );
        details.push({
          filename: file.originalname,
          fileType: file.mimetype,
          chunks: 0,
          vectorsCreated: 0,
          error: error.message,
        });
      }
    }

    return {
      success: true,
      collectionName,
      filesProcessed,
      vectorsCreated: totalVectors,
      details,
    };
  }

  private async processFile(
    file: Express.Multer.File,
    collectionName: string,
    tags?: string,
  ): Promise<FileProcessingResult> {
    let extractedText = '';
    let ocrApplied = false;

    // Extract text based on file type
    if (file.mimetype === 'application/pdf') {
      extractedText = await this.extractTextFromPDF(file.path);
    } else if (
      file.mimetype ===
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ) {
      extractedText = await this.extractTextFromDOCX(file.path);
    } else if (file.mimetype === 'text/plain') {
      extractedText = await fs.readFile(file.path, 'utf-8');
    } else if (file.mimetype.startsWith('image/')) {
      extractedText = await this.extractTextFromImage(file.path);
      ocrApplied = true;
    } else {
      throw new BadRequestException(`Unsupported file type: ${file.mimetype}`);
    }

    if (!extractedText || extractedText.trim().length === 0) {
      throw new Error('No text could be extracted from file');
    }

    this.logger.log(
      `Extracted ${extractedText.length} characters from ${file.originalname}`,
    );

    // Chunk text
    const chunks = this.chunkText(extractedText, 700, 100);
    this.logger.log(`Created ${chunks.length} chunks from ${file.originalname}`);

    // Generate embeddings for each chunk
    const vectors = await Promise.all(
      chunks.map(async (chunk, index) => {
        const embedding = await this.embeddingsService.generateEmbedding(chunk);
        return {
          id: `${file.filename}-chunk-${index}`,
          vector: embedding,
          payload: {
            filename: file.originalname,
            fileType: file.mimetype,
            chunkIndex: index,
            totalChunks: chunks.length,
            text: chunk,
            tags: tags || '',
            uploadedAt: new Date().toISOString(),
          },
        };
      }),
    );

    // Upsert to Qdrant
    await this.upsertToCollection(collectionName, vectors);

    return {
      filename: file.originalname,
      fileType: file.mimetype,
      chunks: chunks.length,
      vectorsCreated: vectors.length,
      ocrApplied,
    };
  }

  private async extractTextFromPDF(filePath: string): Promise<string> {
    try {
      const dataBuffer = await fs.readFile(filePath);
      const data = await pdf(dataBuffer);
      return data.text;
    } catch (error) {
      this.logger.error(`PDF extraction error: ${error.message}`);
      throw new Error(`Failed to extract text from PDF: ${error.message}`);
    }
  }

  private async extractTextFromDOCX(filePath: string): Promise<string> {
    try {
      const buffer = await fs.readFile(filePath);
      const result = await mammoth.extractRawText({ buffer });
      return result.value;
    } catch (error) {
      this.logger.error(`DOCX extraction error: ${error.message}`);
      throw new Error(`Failed to extract text from DOCX: ${error.message}`);
    }
  }

  private async extractTextFromImage(filePath: string): Promise<string> {
    try {
      // Preprocess image with Sharp for better OCR
      const processedImagePath = `${filePath}-processed.png`;
      await sharp(filePath)
        .greyscale()
        .normalize()
        .sharpen()
        .toFile(processedImagePath);

      // Perform OCR with Tesseract
      const {
        data: { text },
      } = await Tesseract.recognize(processedImagePath, 'eng+deu', {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            this.logger.debug(`OCR progress: ${Math.round(m.progress * 100)}%`);
          }
        },
      });

      // Clean up processed image
      await fs.unlink(processedImagePath).catch(() => {});

      return text;
    } catch (error) {
      this.logger.error(`OCR error: ${error.message}`);
      throw new Error(`Failed to extract text from image: ${error.message}`);
    }
  }

  private chunkText(
    text: string,
    chunkSize: number = 700,
    overlap: number = 100,
  ): string[] {
    const chunks: string[] = [];
    let start = 0;

    while (start < text.length) {
      const end = Math.min(start + chunkSize, text.length);
      chunks.push(text.slice(start, end));
      start += chunkSize - overlap;
    }

    return chunks.filter((chunk) => chunk.trim().length > 0);
  }

  private async ensureCollection(
    collectionName: string,
    vectorDimension: number,
  ): Promise<void> {
    try {
      const collections = await this.client.getCollections();
      const exists = collections.collections.some(
        (collection) => collection.name === collectionName,
      );

      if (!exists) {
        await this.client.createCollection(collectionName, {
          vectors: {
            size: vectorDimension,
            distance: 'Cosine',
          },
        });
        this.logger.log(
          `Created collection: ${collectionName} (dimension: ${vectorDimension})`,
        );
      } else {
        this.logger.log(`Collection ${collectionName} already exists`);
      }
    } catch (error) {
      this.logger.error(
        `Failed to ensure collection: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  private async upsertToCollection(
    collectionName: string,
    vectors: Array<{
      id: string;
      vector: number[];
      payload: Record<string, any>;
    }>,
  ): Promise<void> {
    try {
      const points = vectors.map((v) => ({
        id: v.id,
        vector: v.vector,
        payload: v.payload,
      }));

      await this.client.upsert(collectionName, {
        wait: true,
        points,
      });

      this.logger.log(
        `Upserted ${points.length} vectors to collection ${collectionName}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to upsert vectors: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
