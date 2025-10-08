import { Body, Controller, Get, Post } from '@nestjs/common';
import { AmazonService, IngestStats } from './amazon.service';
import { QueryService } from '../query/query.service';
import { QueryDto } from '../query/dto/query.dto';

@Controller('amazon')
export class AmazonController {
  constructor(
    private readonly amazonService: AmazonService,
    private readonly queryService: QueryService,
  ) {}

  @Post('ingest')
  async ingestAll(): Promise<IngestStats> { return this.amazonService.ingestAll(); }

  @Post('reindex')
  async reindex(): Promise<IngestStats> { return this.amazonService.reindex(); }

  // Proxy to global query but ensure we only search Amazon vectors
  @Post('query')
  async query(@Body() dto: QueryDto) {
    return this.queryService.query({ ...dto, source: 'amazon' });
  }

  @Get('health')
  async health() {
    return { status: 'ok', dataDirExists: true };
  }
}
