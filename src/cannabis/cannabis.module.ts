import { Module } from '@nestjs/common';
import { CannabisController } from './cannabis.controller';
import { CannabisService } from './cannabis.service';
import { PineconeModule } from '../pinecone/pinecone.module';
import { EmbeddingsModule } from '../embeddings/embeddings.module';
import { LLMModule } from '../llm/llm.module';

@Module({
  imports: [
    PineconeModule,
    EmbeddingsModule,
    LLMModule,
  ],
  controllers: [CannabisController],
  providers: [CannabisService],
  exports: [CannabisService],
})
export class CannabisModule {}