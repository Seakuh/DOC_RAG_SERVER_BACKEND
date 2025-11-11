import { Module } from '@nestjs/common';
import { FredolinController } from './fredolin.controller';
import { FredolinService } from './fredolin.service';
import { QdrantModule } from '../qdrant/qdrant.module';
import { EmbeddingsModule } from '../embeddings/embeddings.module';

@Module({
  imports: [QdrantModule, EmbeddingsModule],
  controllers: [FredolinController],
  providers: [FredolinService],
  exports: [FredolinService],
})
export class FredolinModule {}
