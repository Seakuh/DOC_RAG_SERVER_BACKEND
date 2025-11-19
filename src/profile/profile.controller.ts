import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ProfileService } from './profile.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { User } from '../common/decorators/user.decorator';
import { CreateProfileDto } from './dto/create-profile.dto';
import {
  UpdateProfileDto,
  AddEventDto,
  AddWorkshopDto,
  RecordActivityDto,
  RecordGameResultDto,
  RecordTournamentDto,
} from './dto/update-profile.dto';

interface JwtPayload {
  userId: string;
  email?: string;
  [key: string]: any;
}

@Controller('profile')
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Post()
  async create(@Body() createProfileDto: CreateProfileDto) {
    return this.profileService.create(createProfileDto);
  }

  @Get()
  async findAll(@Query('limit') limit?: string, @Query('skip') skip?: string) {
    const limitNum = limit ? parseInt(limit, 10) : 50;
    const skipNum = skip ? parseInt(skip, 10) : 0;
    return this.profileService.findAll(limitNum, skipNum);
  }

  @Get('me')
  async getMyProfile(@User() user: JwtPayload) {
    return this.profileService.findByUserId(user.userId);
  }

  @Get('leaderboard')
  async getLeaderboard(@Query('limit') limit?: string) {
    const limitNum = limit ? parseInt(limit, 10) : 50;
    return this.profileService.getLeaderboard(limitNum);
  }

  @Get('user/:userId')
  async findByUserId(@Param('userId') userId: string) {
    return this.profileService.findByUserId(userId);
  }

  @Get(':profileId')
  async findById(@Param('profileId') profileId: string) {
    return this.profileService.findById(profileId);
  }

  @Put('me')
  async updateMyProfile(@User() user: JwtPayload, @Body() updateProfileDto: UpdateProfileDto) {
    return this.profileService.update(user.userId, updateProfileDto);
  }

  @Put('user/:userId')
  async update(@Param('userId') userId: string, @Body() updateProfileDto: UpdateProfileDto) {
    return this.profileService.update(userId, updateProfileDto);
  }

  @Delete('user/:userId')
  async delete(@Param('userId') userId: string) {
    await this.profileService.delete(userId);
    return { message: 'Profile deleted successfully' };
  }

  // ============ Event Management ============

  @Post('me/events')
  async addEventToMyProfile(@User() user: JwtPayload, @Body() addEventDto: AddEventDto) {
    return this.profileService.addParticipatingEvent(user.userId, addEventDto);
  }

  @Put('me/events/:eventId/complete')
  async completeEventForMyProfile(@User() user: JwtPayload, @Param('eventId') eventId: string) {
    return this.profileService.moveEventToPast(user.userId, eventId);
  }

  // ============ Workshop Management ============

  @Post('me/workshops')
  async addWorkshopToMyProfile(@User() user: JwtPayload, @Body() addWorkshopDto: AddWorkshopDto) {
    return this.profileService.addWorkshop(user.userId, addWorkshopDto);
  }

  // ============ Activity Tracking ============

  @Post('me/activity')
  async recordMyActivity(@User() user: JwtPayload, @Body() recordActivityDto: RecordActivityDto) {
    return this.profileService.recordActivity(user.userId, recordActivityDto);
  }

  // ============ Game & Tournament Tracking ============

  @Post('me/games')
  async recordMyGameResult(@User() user: JwtPayload, @Body() recordGameDto: RecordGameResultDto) {
    return this.profileService.recordGameResult(user.userId, recordGameDto);
  }

  @Post('me/tournaments')
  async recordMyTournament(@User() user: JwtPayload, @Body() recordTournamentDto: RecordTournamentDto) {
    return this.profileService.recordTournament(user.userId, recordTournamentDto);
  }

  // ============ Statistics ============

  @Get('statistics/:profileId')
  async getStatistics(@Param('profileId') profileId: string) {
    return this.profileService.getStatistics(profileId);
  }

  @Get('me/statistics')
  async getMyStatistics(@User() user: JwtPayload) {
    const profile = await this.profileService.findByUserId(user.userId);
    return this.profileService.getStatistics(profile._id.toString());
  }

  // ============ Vector Operations (Admin) ============

  @Get('admin/vectors')
  async getAllVectors() {
    return this.profileService.getAllVectors();
  }
}
