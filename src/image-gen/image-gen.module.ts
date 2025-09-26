import { Module } from '@nestjs/common';
import { ImageGenController } from './image-gen.controller';
import { ImageGenService } from './image-gen.service';
import { GenerateController } from './generate.controller';
import { ImageModule } from '../image/image.module';
import { BillingModule } from '../billing/billing.module';

@Module({
  imports: [ImageModule, BillingModule],
  controllers: [ImageGenController, GenerateController],
  providers: [ImageGenService],
})
export class ImageGenModule {}
