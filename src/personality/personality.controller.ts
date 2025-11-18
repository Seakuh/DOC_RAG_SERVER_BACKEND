import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { PersonalityService } from './personality.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { User } from '../common/decorators/user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { CreateQuestionDto } from './dto/create-question.dto';
import { SubmitAnswersDto } from './dto/submit-answers.dto';
import { ProfileMatchResponseDto } from './dto/profile-match.dto';
import { PublicStatisticsDto, PrivateStatisticsDto, GlobalStatisticsDto } from './dto/statistics.dto';

interface JwtPayload {
  userId: string;
  email?: string;
  [key: string]: any;
}

@ApiTags('personality')
@Controller('personality')
@UseGuards(JwtAuthGuard)
export class PersonalityController {
  constructor(private readonly personalityService: PersonalityService) {}

  // ============ Question Management (Admin endpoints) ============

  @Post('questions')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new question (Admin)' })
  @ApiResponse({ status: 201, description: 'Question created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async createQuestion(@Body() createQuestionDto: CreateQuestionDto) {
    return this.personalityService.createQuestion(createQuestionDto);
  }

  @Get('questions')
  @Public()
  @ApiOperation({ summary: 'Get all active questions' })
  @ApiResponse({ status: 200, description: 'List of questions' })
  async getAllQuestions() {
    return this.personalityService.getAllQuestions();
  }

  @Get('questions/:key')
  @Public()
  @ApiOperation({ summary: 'Get a specific question by key' })
  @ApiResponse({ status: 200, description: 'Question found' })
  @ApiResponse({ status: 404, description: 'Question not found' })
  async getQuestion(@Param('key') key: string) {
    return this.personalityService.getQuestionByKey(key);
  }

  @Put('questions/:key')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a question (Admin)' })
  @ApiResponse({ status: 200, description: 'Question updated successfully' })
  @ApiResponse({ status: 404, description: 'Question not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async updateQuestion(
    @Param('key') key: string,
    @Body() updateQuestionDto: Partial<CreateQuestionDto>,
  ) {
    return this.personalityService.updateQuestion(key, updateQuestionDto);
  }

  @Delete('questions/:key')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a question (Admin)' })
  @ApiResponse({ status: 200, description: 'Question deleted successfully' })
  @ApiResponse({ status: 404, description: 'Question not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async deleteQuestion(@Param('key') key: string) {
    await this.personalityService.deleteQuestion(key);
    return { message: 'Question deleted successfully' };
  }

  // ============ Profile Management ============

  @Post('answers')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Submit personality questionnaire answers' })
  @ApiResponse({ status: 201, description: 'Answers submitted successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async submitAnswers(@User() user: JwtPayload, @Body() submitAnswersDto: SubmitAnswersDto) {
    return this.personalityService.submitAnswers(user.userId, submitAnswersDto);
  }

  @Get('profile')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get own personality profile' })
  @ApiResponse({ status: 200, description: 'Profile found' })
  @ApiResponse({ status: 404, description: 'Profile not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getOwnProfile(@User() user: JwtPayload) {
    return this.personalityService.getProfile(user.userId);
  }

  @Get('profile/:profileId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a specific profile by ID' })
  @ApiResponse({ status: 200, description: 'Profile found' })
  @ApiResponse({ status: 404, description: 'Profile not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getProfileById(@Param('profileId') profileId: string) {
    return this.personalityService.getProfileById(profileId);
  }

  // ============ Profile Matching ============

  @Get('match')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Find matching profiles for authenticated user' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Maximum number of matches' })
  @ApiResponse({ status: 200, description: 'Matches found', type: ProfileMatchResponseDto })
  @ApiResponse({ status: 404, description: 'Profile not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findMatches(@User() user: JwtPayload, @Query('limit') limit?: string) {
    const matchLimit = limit ? parseInt(limit, 10) : 10;
    const matches = await this.personalityService.findMatches(user.userId, matchLimit);

    return {
      matches,
      totalMatches: matches.length,
    };
  }

  @Get('match/:profileId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Find matching profiles for a specific profile ID' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Maximum number of matches' })
  @ApiResponse({ status: 200, description: 'Matches found', type: ProfileMatchResponseDto })
  @ApiResponse({ status: 404, description: 'Profile not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findMatchesByProfileId(
    @Param('profileId') profileId: string,
    @Query('limit') limit?: string,
  ) {
    const matchLimit = limit ? parseInt(limit, 10) : 10;
    const matches = await this.personalityService.findMatchesByProfileId(profileId, matchLimit);

    return {
      matches,
      totalMatches: matches.length,
    };
  }

  // ============ Statistics Endpoints ============

  @Get('statistics/global')
  @Public()
  @ApiOperation({ summary: 'Get global statistics (public)' })
  @ApiResponse({ status: 200, description: 'Global statistics', type: GlobalStatisticsDto })
  async getGlobalStatistics() {
    return this.personalityService.getGlobalStatistics();
  }

  @Get('statistics/public/:userId')
  @Public()
  @ApiOperation({ summary: 'Get public statistics for a user' })
  @ApiResponse({ status: 200, description: 'Public statistics', type: PublicStatisticsDto })
  @ApiResponse({ status: 404, description: 'Profile not found' })
  async getPublicStatistics(@Param('userId') userId: string) {
    return this.personalityService.getPublicStatistics(userId);
  }

  @Get('statistics/private/:userId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get private statistics for a user (owner or admin only)' })
  @ApiQuery({ name: 'isAdmin', required: false, type: Boolean, description: 'Is admin request' })
  @ApiResponse({ status: 200, description: 'Private statistics', type: PrivateStatisticsDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Profile not found' })
  async getPrivateStatistics(
    @Param('userId') userId: string,
    @User() user: JwtPayload,
    @Query('isAdmin') isAdmin?: string,
  ) {
    const isAdminRequest = isAdmin === 'true';
    return this.personalityService.getPrivateStatistics(userId, user.userId, isAdminRequest);
  }

  @Get('statistics/me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get own private statistics' })
  @ApiResponse({ status: 200, description: 'Private statistics', type: PrivateStatisticsDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Profile not found' })
  async getOwnStatistics(@User() user: JwtPayload) {
    return this.personalityService.getPrivateStatistics(user.userId, user.userId, false);
  }
}
