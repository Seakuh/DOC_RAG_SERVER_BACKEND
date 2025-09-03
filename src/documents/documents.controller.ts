import {
  Controller,
  Post,
  Get,
  Delete,
  Put,
  Param,
  Body,
  UploadedFile,
  UseInterceptors,
  HttpStatus,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { DocumentsService, DocumentInfo } from './documents.service';
import { UploadDocumentDto } from './dto/upload-document.dto';
import { UploadResponseDto } from './dto/upload-response.dto';

@ApiTags('Documents')
@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload and process a document' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Document upload with metadata',
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Document file (PDF, TXT, DOCX, or Image files: JPG, PNG, GIF, BMP, TIFF, WEBP)',
        },
        name: {
          type: 'string',
          description: 'Optional custom name for the document',
        },
        description: {
          type: 'string',
          description: 'Optional description of the document',
        },
        tags: {
          type: 'string',
          description: 'Optional comma-separated tags',
        },
      },
      required: ['file'],
    },
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Document uploaded and processed successfully',
    type: UploadResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid file or parameters',
  })
  async uploadDocument(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }), // 10MB
          new FileTypeValidator({ 
            fileType: /(pdf|txt|docx|jpeg|jpg|png|gif|bmp|tiff|webp|application\/pdf|text\/plain|application\/vnd\.openxmlformats-officedocument\.wordprocessingml\.document|image\/(jpeg|jpg|png|gif|bmp|tiff|webp))$/ 
          }),
        ],
      }),
    )
    file: Express.Multer.File,
    @Body() uploadDto: UploadDocumentDto,
  ): Promise<UploadResponseDto> {
    return this.documentsService.processDocument(
      file,
      uploadDto.name,
      uploadDto.description,
      uploadDto.tags,
    );
  }

  @Get()
  @ApiOperation({ summary: 'Get all documents with metadata' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of all documents',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'doc-123e4567-e89b-12d3-a456-426614174000' },
          filename: { type: 'string', example: 'document.pdf' },
          originalName: { type: 'string', example: 'My Document' },
          fileSize: { type: 'number', example: 1024576 },
          uploadDate: { type: 'string', example: '2024-01-15T10:30:00.000Z' },
          chunks: { type: 'number', example: 15 },
          description: { type: 'string', example: 'Important project document' },
          tags: { type: 'array', items: { type: 'string' }, example: ['project', 'important'] },
          summary: { type: 'string', example: 'This document discusses...' },
        },
      },
    },
  })
  async getDocuments(): Promise<DocumentInfo[]> {
    return this.documentsService.listDocuments();
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get document storage statistics' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Storage statistics',
    schema: {
      type: 'object',
      properties: {
        totalDocuments: { type: 'number', example: 25 },
        totalChunks: { type: 'number', example: 380 },
        totalSize: { type: 'number', example: 52428800 },
        storageStats: { type: 'object', description: 'Pinecone index statistics' },
      },
    },
  })
  async getDocumentStats() {
    return this.documentsService.getDocumentStats();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific document by ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Document information',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Document not found',
  })
  async getDocument(@Param('id') id: string): Promise<DocumentInfo> {
    return this.documentsService.getDocument(id);
  }

  @Put(':id')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Update an existing document' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Updated document with metadata',
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'New document file (PDF, TXT, DOCX, or Image files: JPG, PNG, GIF, BMP, TIFF, WEBP)',
        },
        name: {
          type: 'string',
          description: 'Optional updated name for the document',
        },
        description: {
          type: 'string',
          description: 'Optional updated description',
        },
        tags: {
          type: 'string',
          description: 'Optional updated comma-separated tags',
        },
      },
      required: ['file'],
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Document updated successfully',
    type: UploadResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Document not found',
  })
  async updateDocument(
    @Param('id') id: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }),
          new FileTypeValidator({ 
            fileType: /(pdf|txt|docx|jpeg|jpg|png|gif|bmp|tiff|webp|application\/pdf|text\/plain|application\/vnd\.openxmlformats-officedocument\.wordprocessingml\.document|image\/(jpeg|jpg|png|gif|bmp|tiff|webp))$/ 
          }),
        ],
      }),
    )
    file: Express.Multer.File,
    @Body() uploadDto: UploadDocumentDto,
  ): Promise<UploadResponseDto> {
    return this.documentsService.updateDocument(
      id,
      file,
      uploadDto.name,
      uploadDto.description,
      uploadDto.tags,
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a document and all its chunks' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Document deleted successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Document not found',
  })
  async deleteDocument(@Param('id') id: string): Promise<{ success: boolean }> {
    return this.documentsService.deleteDocument(id);
  }
}