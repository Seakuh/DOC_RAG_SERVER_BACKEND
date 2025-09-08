import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';
import * as pdfParse from 'pdf-parse';
import * as mammoth from 'mammoth';
import * as sharp from 'sharp';
import { createWorker } from 'tesseract.js';
import { EmbeddingsService } from '../embeddings/embeddings.service';
import { PineconeService, DocumentMetadata } from '../pinecone/pinecone.service';
import { LLMService } from '../llm/llm.service';
import { ImageService } from '../image/image.service';
import { UploadResponseDto } from './dto/upload-response.dto';

export interface DocumentInfo {
  id: string;
  filename: string;
  originalName: string;
  fileSize: number;
  uploadDate: string;
  chunks: number;
  description?: string;
  tags?: string[];
  summary?: string;
  fileUrl?: string;
}

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);
  private readonly documentsStore = new Map<string, DocumentInfo>();

  constructor(
    private embeddingsService: EmbeddingsService,
    private pineconeService: PineconeService,
    private llmService: LLMService,
    private imageService: ImageService,
  ) {}

  async processDocument(
    file: Express.Multer.File,
    name?: string,
    description?: string,
    tags?: string
  ): Promise<UploadResponseDto> {
    const startTime = Date.now();
    const documentId = `doc-${uuidv4()}`;

    try {
      this.validateFile(file);

      let fileUrl: string | undefined;
      try {
        fileUrl = await this.imageService.uploadDocument(file);
        this.logger.log(`Uploaded file to Hetzner: ${fileUrl}`);
      } catch (error) {
        this.logger.warn(`Failed to upload file to Hetzner: ${error.message}`);
      }

      const text = await this.extractText(file);
      if (!text.trim()) {
        throw new BadRequestException('Extracted text is empty');
      }

      const chunks = this.embeddingsService.chunkText(
        text,
        700,
        100,
        file.originalname
      );

      const embeddings = await this.embeddingsService.generateBatchEmbeddings(
        chunks.map(chunk => chunk.text)
      );

      const vectors = chunks.map((chunk, index) => ({
        id: `${documentId}_chunk-${index}`,
        values: embeddings[index],
        metadata: {
          ...chunk.metadata,
          text: chunk.text,
          document_id: documentId,
          total_chunks: chunks.length,
        },
      }));

      await this.pineconeService.upsert(vectors);

      let summary: string | undefined;
      try {
        summary = await this.llmService.summarizeDocument(
          text.substring(0, 3000),
          name || file.originalname
        );
      } catch (error) {
        this.logger.warn('Failed to generate document summary:', error);
      }

      const documentInfo: DocumentInfo = {
        id: documentId,
        filename: file.originalname,
        originalName: name || file.originalname,
        fileSize: file.size,
        uploadDate: new Date().toISOString(),
        chunks: chunks.length,
        description,
        tags: tags ? tags.split(',').map(tag => tag.trim()) : undefined,
        summary,
        fileUrl,
      };

      this.documentsStore.set(documentId, documentInfo);

      const duration = Date.now() - startTime;
      this.logger.log(`Processed document '${file.originalname}' in ${duration}ms`);

      return {
        success: true,
        documentId,
        chunks: chunks.length,
        fileSize: file.size,
        filename: file.originalname,
        summary,
      };

    } catch (error) {
      this.logger.error(`Failed to process document '${file.originalname}':`, error);
      throw error;
    }
  }

  async updateDocument(
    documentId: string,
    file: Express.Multer.File,
    name?: string,
    description?: string,
    tags?: string
  ): Promise<UploadResponseDto> {
    const existingDoc = this.documentsStore.get(documentId);
    if (!existingDoc) {
      throw new NotFoundException('Document not found');
    }

    await this.pineconeService.deleteBySource(existingDoc.filename);

    const result = await this.processDocument(file, name, description, tags);
    
    this.documentsStore.delete(documentId);
    
    return result;
  }

  async deleteDocument(documentId: string): Promise<{ success: boolean }> {
    const document = this.documentsStore.get(documentId);
    if (!document) {
      throw new NotFoundException('Document not found');
    }

    try {
      await this.pineconeService.deleteBySource(document.filename);
      this.documentsStore.delete(documentId);

      this.logger.log(`Deleted document '${document.filename}' (ID: ${documentId})`);

      return { success: true };
    } catch (error) {
      this.logger.error(`Failed to delete document '${documentId}':`, error);
      throw error;
    }
  }

  async listDocuments(): Promise<DocumentInfo[]> {
    return Array.from(this.documentsStore.values()).sort(
      (a, b) => new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime()
    );
  }

  async getDocument(documentId: string): Promise<DocumentInfo> {
    const document = this.documentsStore.get(documentId);
    if (!document) {
      throw new NotFoundException('Document not found');
    }
    return document;
  }

  async getDocumentStats(): Promise<{
    totalDocuments: number;
    totalChunks: number;
    totalSize: number;
    storageStats: any;
  }> {
    const documents = Array.from(this.documentsStore.values());
    const totalDocuments = documents.length;
    const totalChunks = documents.reduce((sum, doc) => sum + doc.chunks, 0);
    const totalSize = documents.reduce((sum, doc) => sum + doc.fileSize, 0);

    let storageStats;
    try {
      storageStats = await this.pineconeService.getStats();
    } catch (error) {
      this.logger.warn('Failed to get Pinecone stats:', error);
      storageStats = null;
    }

    return {
      totalDocuments,
      totalChunks,
      totalSize,
      storageStats,
    };
  }

  private validateFile(file: Express.Multer.File): void {
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = [
      'application/pdf',
      'text/plain',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/bmp',
      'image/tiff',
      'image/webp'
    ];

    if (!file) {
      throw new BadRequestException('No file provided');
    }

    if (file.size > maxSize) {
      throw new BadRequestException('File size exceeds 10MB limit');
    }

    if (!allowedTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        'Unsupported file type. Allowed types: PDF, TXT, DOCX, JPG, PNG, GIF, BMP, TIFF, WEBP'
      );
    }
  }

  private async extractText(file: Express.Multer.File): Promise<string> {
    try {
      switch (file.mimetype) {
        case 'application/pdf':
          return await this.extractPdfText(file.buffer);
        case 'text/plain':
          return file.buffer.toString('utf-8');
        case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
          return await this.extractDocxText(file.buffer);
        case 'image/jpeg':
        case 'image/jpg':
        case 'image/png':
        case 'image/gif':
        case 'image/bmp':
        case 'image/tiff':
        case 'image/webp':
          return await this.extractImageText(file.buffer, file.mimetype);
        default:
          throw new BadRequestException('Unsupported file type');
      }
    } catch (error) {
      this.logger.error('Failed to extract text:', error);
      throw new BadRequestException('Failed to extract text from file');
    }
  }

  private async extractPdfText(buffer: Buffer): Promise<string> {
    try {
      const data = await pdfParse(buffer);
      return data.text;
    } catch (error) {
      throw new Error(`PDF parsing failed: ${error.message}`);
    }
  }

  private async extractDocxText(buffer: Buffer): Promise<string> {
    try {
      const result = await mammoth.extractRawText({ buffer });
      return result.value;
    } catch (error) {
      throw new Error(`DOCX parsing failed: ${error.message}`);
    }
  }

  private async extractImageText(buffer: Buffer, mimetype: string): Promise<string> {
    try {
      this.logger.log(`Starting OCR text extraction for image type: ${mimetype}`);
      
      // Preprocess image with Sharp for better OCR results
      let processedBuffer = buffer;
      try {
        processedBuffer = await sharp(buffer)
          .resize(null, 1000, { 
            withoutEnlargement: true,
            fit: 'inside'
          })
          .normalize()
          .sharpen()
          .grayscale()
          .png()
          .toBuffer();
      } catch (sharpError) {
        this.logger.warn('Image preprocessing failed, using original buffer:', sharpError);
      }

      // Create Tesseract worker
      const worker = await createWorker('deu+eng', 1, {
        logger: m => {
          if (m.status === 'recognizing text') {
            this.logger.debug(`OCR Progress: ${Math.round(m.progress * 100)}%`);
          }
        }
      });

      try {
        // Perform OCR
        const { data: { text } } = await worker.recognize(processedBuffer);
        
        await worker.terminate();

        // Clean up extracted text
        const cleanedText = text
          .replace(/\n\s*\n/g, '\n')  // Remove excessive line breaks
          .replace(/[^\w\s\.\,\!\?\-\(\)\[\]\{\}\:;äöüÄÖÜß]/g, ' ')  // Keep basic punctuation and German chars
          .replace(/\s+/g, ' ')  // Normalize whitespace
          .trim();

        if (!cleanedText || cleanedText.length < 10) {
          throw new Error('OCR extraction resulted in insufficient text content');
        }

        this.logger.log(`OCR extraction completed successfully. Extracted ${cleanedText.length} characters.`);
        return cleanedText;

      } catch (ocrError) {
        await worker.terminate();
        throw ocrError;
      }

    } catch (error) {
      this.logger.error('Image text extraction failed:', error);
      throw new Error(`Image OCR failed: ${error.message}`);
    }
  }
}