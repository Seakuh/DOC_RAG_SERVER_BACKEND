import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { QdrantService } from './qdrant.service';
import { VectorizationService } from './vectorization.service';
import { QdrantUploadService } from './qdrant-upload.service';
import { QdrantUploadController } from './qdrant-upload.controller';
import { EmbeddingsModule } from '../embeddings/embeddings.module';

@Module({
  imports: [ConfigModule, EmbeddingsModule],
  controllers: [QdrantUploadController],
  providers: [QdrantService, VectorizationService, QdrantUploadService],
  exports: [QdrantService, VectorizationService, QdrantUploadService],
})
export class QdrantModule {}