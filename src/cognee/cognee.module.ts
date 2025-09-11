import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MulterModule } from '@nestjs/platform-express';
import { CogneeService } from './cognee.service';
import { CogneeController } from './cognee.controller';
import * as fs from 'fs';
import * as path from 'path';

// Ensure upload directory exists
const uploadDir = path.join(process.cwd(), 'uploads', 'temp');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

@Module({
  imports: [
    ConfigModule,
    MulterModule.register({
      dest: uploadDir,
    })
  ],
  controllers: [CogneeController],
  providers: [CogneeService],
  exports: [CogneeService], // Export service for use in other modules
})
export class CogneeModule {}