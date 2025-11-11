import {
  Controller,
  Post,
  Body,
  UploadedFiles,
  UseInterceptors,
  HttpCode,
  HttpStatus,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { QdrantUploadService } from './qdrant-upload.service';
import { UploadToQdrantDto } from './dto/upload-to-qdrant.dto';

@ApiTags('Qdrant')
@Controller('qdrant')
export class QdrantUploadController {
  private readonly logger = new Logger(QdrantUploadController.name);

  constructor(private readonly qdrantUploadService: QdrantUploadService) {}

  @Post('upload')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FilesInterceptor('files', 10, {
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, callback) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          callback(
            null,
            `${file.fieldname}-${uniqueSuffix}${extname(file.originalname)}`,
          );
        },
      }),
      fileFilter: (req, file, callback) => {
        const allowedTypes = [
          'application/pdf',
          'image/jpeg',
          'image/png',
          'image/jpg',
          'image/gif',
          'image/bmp',
          'image/tiff',
          'image/webp',
          'text/plain',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ];

        if (allowedTypes.includes(file.mimetype)) {
          callback(null, true);
        } else {
          callback(
            new BadRequestException(
              `File type ${file.mimetype} not supported. Allowed: PDF, images (JPG, PNG, GIF, BMP, TIFF, WEBP), TXT, DOCX`,
            ),
            false,
          );
        }
      },
      limits: {
        fileSize: 50 * 1024 * 1024, // 50MB max file size
      },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Upload files to Qdrant collection',
    description:
      'Upload PDFs, images (with OCR), or text files to a specified Qdrant collection. Files are processed, embedded, and stored as vectors.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['collectionName', 'files'],
      properties: {
        collectionName: {
          type: 'string',
          description: 'Name of the Qdrant collection',
          example: 'my-documents',
        },
        vectorDimension: {
          type: 'number',
          description: 'Vector dimension (default: 1536 for text-embedding-3-small)',
          example: 1536,
          default: 1536,
        },
        tags: {
          type: 'string',
          description: 'Optional comma-separated tags',
          example: 'legal, contracts, 2024',
        },
        files: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
          description: 'Files to upload (max 10, 50MB each)',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Files successfully processed and uploaded to Qdrant',
    schema: {
      example: {
        success: true,
        collectionName: 'my-documents',
        filesProcessed: 3,
        vectorsCreated: 15,
        details: [
          {
            filename: 'contract.pdf',
            fileType: 'application/pdf',
            chunks: 5,
            vectorsCreated: 5,
          },
          {
            filename: 'invoice.jpg',
            fileType: 'image/jpeg',
            ocrApplied: true,
            chunks: 2,
            vectorsCreated: 2,
          },
        ],
        processingTime: 4532,
        timestamp: '2025-11-11T10:30:00.000Z',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request or unsupported file type',
  })
  async uploadToQdrant(
    @UploadedFiles() files: Express.Multer.File[],
    @Body() dto: UploadToQdrantDto,
  ) {
    const startTime = Date.now();

    this.logger.log(
      `Received upload request for collection: ${dto.collectionName} with ${files?.length || 0} files`,
    );

    if (!files || files.length === 0) {
      throw new BadRequestException('No files provided');
    }

    const result = await this.qdrantUploadService.processAndUploadFiles(
      files,
      dto,
    );

    const processingTime = Date.now() - startTime;

    this.logger.log(
      `Upload completed: ${result.vectorsCreated} vectors created in ${processingTime}ms`,
    );

    return {
      ...result,
      processingTime,
      timestamp: new Date().toISOString(),
    };
  }
}
