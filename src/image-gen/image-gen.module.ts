import { Module } from '@nestjs/common';
import { ImageGenController } from './image-gen.controller';
import { ImageGenService } from './image-gen.service';

@Module({
  controllers: [ImageGenController],
  providers: [ImageGenService],
})
export class ImageGenModule {}

