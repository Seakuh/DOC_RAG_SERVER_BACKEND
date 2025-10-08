import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AmazonService } from './amazon.service';
import { AmazonController } from './amazon.controller';
import { EmbeddingsModule } from '../embeddings/embeddings.module';
import { PineconeModule } from '../pinecone/pinecone.module';
import { QueryModule } from '../query/query.module';

@Module({
  imports: [ConfigModule, EmbeddingsModule, PineconeModule, QueryModule],
  providers: [AmazonService],
  controllers: [AmazonController],
  exports: [AmazonService],
})
export class AmazonModule {}

