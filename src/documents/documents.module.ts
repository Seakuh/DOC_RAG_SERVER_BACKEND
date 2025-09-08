import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { EmbeddingsModule } from '../embeddings/embeddings.module';
import { PineconeModule } from '../pinecone/pinecone.module';
import { LLMModule } from '../llm/llm.module';
import { ImageModule } from '../image/image.module';

@Module({
  imports: [
    MulterModule.register({
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
      },
    }),
    EmbeddingsModule,
    PineconeModule,
    LLMModule,
    ImageModule,
  ],
  controllers: [DocumentsController],
  providers: [DocumentsService],
  exports: [DocumentsService],
})
export class DocumentsModule {}