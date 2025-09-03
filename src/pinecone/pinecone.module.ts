import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PineconeService } from './pinecone.service';
import { PineconeConfigService } from './pinecone-config.service';
import { PineconeController } from './pinecone.controller';

@Module({
  imports: [ConfigModule],
  controllers: [PineconeController],
  providers: [PineconeService, PineconeConfigService],
  exports: [PineconeService, PineconeConfigService],
})
export class PineconeModule {}