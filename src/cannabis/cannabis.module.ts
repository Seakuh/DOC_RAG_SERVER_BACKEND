import { Module } from '@nestjs/common';
import { CannabisController } from './cannabis.controller';
import { CannabisService } from './cannabis.service';
import { PineconeModule } from '../pinecone/pinecone.module';
import { EmbeddingsModule } from '../embeddings/embeddings.module';
import { LLMModule } from '../llm/llm.module';
import { CogneeModule } from '../cognee/cognee.module';
import { QdrantModule } from '../qdrant/qdrant.module';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [
    PineconeModule,
    EmbeddingsModule,
    LLMModule,
    CogneeModule,
    QdrantModule,
    DatabaseModule,
  ],
  controllers: [CannabisController],
  providers: [CannabisService],
  exports: [CannabisService],
})
export class CannabisModule {}