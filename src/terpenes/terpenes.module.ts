import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { TerpenesService } from './terpenes.service';
import { TerpenesController } from './terpenes.controller';
import { Terpene, TerpeneSchema } from './terpene.schema';
import { EmbeddingsModule } from '../embeddings/embeddings.module';
import { LLMModule } from '../llm/llm.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Terpene.name, schema: TerpeneSchema }]),
    ConfigModule,
    EmbeddingsModule,
    LLMModule,
  ],
  controllers: [TerpenesController],
  providers: [TerpenesService],
  exports: [TerpenesService],
})
export class TerpenesModule {}
