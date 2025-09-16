import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { QdrantService } from './qdrant.service';
import { VectorizationService } from './vectorization.service';
import { EmbeddingsModule } from '../embeddings/embeddings.module';

@Module({
  imports: [ConfigModule, EmbeddingsModule],
  providers: [QdrantService, VectorizationService],
  exports: [QdrantService, VectorizationService],
})
export class QdrantModule {}