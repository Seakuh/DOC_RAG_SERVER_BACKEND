import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { TerpenesService } from './terpenes.service';
import { CreateTerpeneDto } from './dto/create-terpene.dto';
import { UpdateTerpeneDto } from './dto/update-terpene.dto';
import { QueryTerpeneDto } from './dto/query-terpene.dto';

@ApiTags('Terpenes')
@Controller('api/v1/terpenes')
export class TerpenesController {
  constructor(private readonly terpenesService: TerpenesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new terpene profile' })
  @ApiResponse({
    status: 201,
    description: 'Terpene created successfully',
  })
  create(@Body() createTerpeneDto: CreateTerpeneDto) {
    return this.terpenesService.create(createTerpeneDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all terpene profiles' })
  @ApiResponse({
    status: 200,
    description: 'List of all terpenes',
  })
  findAll() {
    return this.terpenesService.findAll();
  }

  @Get('search')
  @ApiOperation({ summary: 'Search terpenes by name' })
  @ApiQuery({ name: 'name', required: true })
  @ApiResponse({
    status: 200,
    description: 'Terpene found',
  })
  findByName(@Query('name') name: string) {
    return this.terpenesService.findByName(name);
  }

  @Post('query')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Ask questions about terpenes using AI',
    description:
      'Semantic search and AI-powered answers about terpenes from uploaded documents',
  })
  @ApiResponse({
    status: 200,
    description: 'AI-generated answer with sources',
    schema: {
      example: {
        question: 'What are the effects of myrcene?',
        answer:
          'Myrcene is known for its sedating and relaxing effects...',
        sources: [
          {
            name: 'Myrcene',
            score: 0.95,
            description: 'Most abundant terpene in cannabis',
          },
        ],
      },
    },
  })
  query(@Body() queryDto: QueryTerpeneDto) {
    return this.terpenesService.query(queryDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a terpene by ID' })
  @ApiParam({ name: 'id', description: 'Terpene ID' })
  @ApiResponse({
    status: 200,
    description: 'Terpene details',
  })
  findOne(@Param('id') id: string) {
    return this.terpenesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a terpene profile' })
  @ApiParam({ name: 'id', description: 'Terpene ID' })
  @ApiResponse({
    status: 200,
    description: 'Terpene updated successfully',
  })
  update(@Param('id') id: string, @Body() updateTerpeneDto: UpdateTerpeneDto) {
    return this.terpenesService.update(id, updateTerpeneDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete a terpene' })
  @ApiParam({ name: 'id', description: 'Terpene ID' })
  @ApiResponse({
    status: 204,
    description: 'Terpene deleted successfully',
  })
  remove(@Param('id') id: string) {
    return this.terpenesService.remove(id);
  }

  @Post(':terpeneId/strains/:strainId')
  @ApiOperation({ summary: 'Link a cannabis strain to a terpene' })
  @ApiParam({ name: 'terpeneId', description: 'Terpene ID' })
  @ApiParam({ name: 'strainId', description: 'Cannabis Strain ID' })
  @ApiResponse({
    status: 200,
    description: 'Strain linked to terpene successfully',
  })
  addRelatedStrain(
    @Param('terpeneId') terpeneId: string,
    @Param('strainId') strainId: string,
  ) {
    return this.terpenesService.addRelatedStrain(terpeneId, strainId);
  }

  @Delete(':terpeneId/strains/:strainId')
  @ApiOperation({ summary: 'Unlink a cannabis strain from a terpene' })
  @ApiParam({ name: 'terpeneId', description: 'Terpene ID' })
  @ApiParam({ name: 'strainId', description: 'Cannabis Strain ID' })
  @ApiResponse({
    status: 200,
    description: 'Strain unlinked from terpene successfully',
  })
  removeRelatedStrain(
    @Param('terpeneId') terpeneId: string,
    @Param('strainId') strainId: string,
  ) {
    return this.terpenesService.removeRelatedStrain(terpeneId, strainId);
  }
}
