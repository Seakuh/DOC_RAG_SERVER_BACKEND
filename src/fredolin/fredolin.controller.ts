import { Controller, Post, Body, HttpCode, HttpStatus, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { FredolinService } from './fredolin.service';
import { GenerateScenariosDto } from './dto/generate-scenarios.dto';
import { AnalyzeProfileDto } from './dto/analyze-profile.dto';
import { SaveProfileDto } from './dto/save-profile.dto';

@ApiTags('fredolin')
@Controller('api/v1/fredolin')
export class FredolinController {
  private readonly logger = new Logger(FredolinController.name);

  constructor(private readonly fredolinService: FredolinService) {}

  @Post('scenarios')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Generate poker scenarios',
    description: 'Generate AI-powered poker decision scenarios for the Fredolin game',
  })
  @ApiResponse({
    status: 200,
    description: 'Scenarios generated successfully',
    schema: {
      example: [
        {
          id: 1,
          situation: 'Pocket Aces!',
          description:
            'Fredolin kann sein Glück kaum fassen - er hat A♥ A♠ bekommen, die beste Starthand!',
          tightAnswer: 'Kleinen Raise machen',
          looseAnswer: 'All-in gehen',
          aggressiveAnswer: 'Großen Raise machen',
          passiveAnswer: 'Nur callen und hoffen',
        },
      ],
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid request or OpenAI error' })
  async generateScenarios(@Body() dto: GenerateScenariosDto) {
    this.logger.log(`Generating ${dto.count || 8} scenarios`);
    return this.fredolinService.generateScenarios(dto);
  }

  @Post('analyze-profile')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Analyze poker profile',
    description: 'Analyze user answers and generate a personalized poker playing style profile',
  })
  @ApiResponse({
    status: 200,
    description: 'Profile analyzed successfully',
    schema: {
      example: {
        name: 'Der Analytische Beobachter',
        stil: {
          risikofreude: 0.35,
          geduld: 0.9,
          aggressivität: 0.45,
          anpassungsfähigkeit: 0.75,
          bluffneigung: 0.4,
        },
        beschreibung:
          'Du spielst Poker wie ein Schachspieler – ruhig, geduldig, kontrolliert...',
        tierMentor: 'Fredolin das Pokerfrettchen',
        empfohleneStrategie: 'Tight-Aggressive Light – spiele selektiv...',
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid request or analysis failed' })
  async analyzeProfile(@Body() dto: AnalyzeProfileDto) {
    this.logger.log(`Analyzing profile with ${dto.answers.length} answers`);
    return this.fredolinService.analyzeProfile(dto);
  }

  @Post('save-profile')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Save poker profile',
    description: 'Save user poker profile to Qdrant vector database for similarity search',
  })
  @ApiResponse({
    status: 201,
    description: 'Profile saved successfully',
    schema: {
      example: {
        success: true,
        id: 'fredolin-1234567890-abc123',
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Failed to save profile' })
  async saveProfile(@Body() dto: SaveProfileDto) {
    this.logger.log(`Saving profile: ${dto.name}`);
    return this.fredolinService.saveProfile(dto);
  }
}
