import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AmazonService } from './amazon.service';
import { AmazonController } from './amazon.controller';
import { EmbeddingsModule } from '../embeddings/embeddings.module';
import { QdrantModule } from '../qdrant/qdrant.module';
import { QueryModule } from '../query/query.module';

@Module({
  imports: [ConfigModule, EmbeddingsModule, QdrantModule, QueryModule],
  providers: [AmazonService],
  controllers: [AmazonController],
  exports: [AmazonService],
})
export class AmazonModule {}
