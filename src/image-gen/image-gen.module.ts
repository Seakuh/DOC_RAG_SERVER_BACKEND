import { Module } from '@nestjs/common';
import { ImageGenController } from './image-gen.controller';
import { ImageGenService } from './image-gen.service';
import { GenerateController } from './generate.controller';

@Module({
  controllers: [ImageGenController, GenerateController],
  providers: [ImageGenService],
})
export class ImageGenModule {}
