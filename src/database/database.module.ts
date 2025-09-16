import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Strain, StrainSchema } from './strain.schema';
import { StrainService } from './strain.service';

@Module({
  imports: [
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URI') || 'mongodb://localhost:27017/cannabis',
      }),
      inject: [ConfigService],
    }),
    MongooseModule.forFeature([{ name: Strain.name, schema: StrainSchema }]),
  ],
  providers: [StrainService],
  exports: [StrainService, MongooseModule],
})
export class DatabaseModule {}