import { Injectable, Logger } from '@nestjs/common';
import { EmbeddingsService, TextChunk } from '../embeddings/embeddings.service';
import { PineconeService } from '../pinecone/pinecone.service';
import * as fs from 'fs';
import * as path from 'path';

export interface IngestStats {
  filesProcessed: number;
  chunksCreated: number;
  vectorsUpserted: number;
  errors: Array<{ file: string; error: string }>;
}

@Injectable()
export class AmazonService {
  private readonly logger = new Logger(AmazonService.name);
  private readonly rootDir = path.resolve(process.cwd(), 'AMAZON_DATA');

  constructor(
    private readonly embeddingsService: EmbeddingsService,
    private readonly pineconeService: PineconeService,
  ) {}

  async ingestAll(): Promise<IngestStats> {
    const stats: IngestStats = {
      filesProcessed: 0,
      chunksCreated: 0,
      vectorsUpserted: 0,
      errors: [],
    };

    if (!fs.existsSync(this.rootDir)) {
      throw new Error(`AMAZON_DATA directory not found at: ${this.rootDir}`);
    }

    const files = this.walkFiles(this.rootDir).filter(f => this.isSupportedFile(f));
    this.logger.log(`Found ${files.length} supported Amazon export files`);

    for (const absFile of files) {
      const relFile = path.relative(this.rootDir, absFile);
      try {
        const text = await this.readFileAsText(absFile);
        if (!text.trim()) continue;

        // Prefix each chunk with a small file context marker to help the LLM
        const prefixedText = `Amazon file: ${relFile}\n\n${text}`;
        const chunks: TextChunk[] = this.embeddingsService.chunkText(
          prefixedText,
          700,
          100,
          'amazon',
        );

        if (!chunks.length) continue;

        // Create embeddings in batches
        const embeddings = await this.embeddingsService.generateBatchEmbeddings(
          chunks.map(c => c.text),
        );

        const vectors = embeddings.map((values, i) => ({
          id: this.buildVectorId(relFile, chunks[i].metadata.chunk_index),
          values,
          metadata: {
            ...chunks[i].metadata,
            // Keep source as a high-level filter value
            source: 'amazon',
            // Persist file reference for traceability
            file: relFile,
            text: chunks[i].text,
          } as any,
        }));

        await this.pineconeService.upsert(vectors);

        stats.filesProcessed += 1;
        stats.chunksCreated += chunks.length;
        stats.vectorsUpserted += vectors.length;
      } catch (error: any) {
        this.logger.error(`Failed to ingest file ${relFile}: ${error.message}`);
        stats.errors.push({ file: relFile, error: error.message });
      }
    }

    this.logger.log(
      `Ingestion completed: ${stats.filesProcessed} files, ${stats.chunksCreated} chunks, ${stats.vectorsUpserted} vectors`,
    );
    return stats;
  }

  async reindex(): Promise<IngestStats> {
    // Remove previous amazon vectors and ingest again
    await this.pineconeService.deleteBySource('amazon');
    return this.ingestAll();
  }

  private isSupportedFile(filePath: string): boolean {
    const ext = path.extname(filePath).toLowerCase();
    return ['.csv', '.json', '.txt'].includes(ext);
  }

  private walkFiles(dir: string): string[] {
    const results: string[] = [];
    const list = fs.readdirSync(dir);
    for (const file of list) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      if (stat && stat.isDirectory()) {
        results.push(...this.walkFiles(fullPath));
      } else {
        results.push(fullPath);
      }
    }
    return results;
  }

  private async readFileAsText(filePath: string): Promise<string> {
    const ext = path.extname(filePath).toLowerCase();
    const raw = fs.readFileSync(filePath, 'utf8');

    try {
      if (ext === '.json') {
        // Pretty-print JSON for better chunking
        const obj = JSON.parse(raw);
        return this.stringifyJson(obj);
      }

      if (ext === '.csv') {
        // Keep header and rows as plain text; normalize whitespace
        return raw
          .split(/\r?\n/)
          .map(line => line.trim())
          .filter(Boolean)
          .join('\n');
      }

      // For .txt just return as-is
      return raw;
    } catch (e) {
      // Fallback to raw if parsing fails
      return raw;
    }
  }

  private stringifyJson(obj: any): string {
    try {
      return JSON.stringify(obj, null, 2);
    } catch {
      return String(obj);
    }
  }

  private buildVectorId(relFile: string, chunkIndex: number): string {
    // Stable id pattern to allow dedup/deletes if needed
    const safe = relFile.replace(/[^a-zA-Z0-9_-]/g, '_');
    return `amazon:${safe}:${chunkIndex}`;
  }
}
