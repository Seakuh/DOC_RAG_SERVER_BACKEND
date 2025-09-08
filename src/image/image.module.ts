import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ImageService } from './image.service';

@Module({
  imports: [ConfigModule],
  providers: [ImageService],
  exports: [ImageService],
})
export class ImageModule {}