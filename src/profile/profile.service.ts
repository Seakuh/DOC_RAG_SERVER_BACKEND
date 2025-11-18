import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { QdrantClient } from '@qdrant/js-client-rest';
import { ConfigService } from '@nestjs/config';
import { Profile, ProfileDocument } from './schemas/profile.schema';
import { CreateProfileDto } from './dto/create-profile.dto';
import { UpdateProfileDto, AddEventDto, AddWorkshopDto, RecordActivityDto, RecordGameResultDto, RecordTournamentDto } from './dto/update-profile.dto';

@Injectable()
export class ProfileService {
  private readonly logger = new Logger(ProfileService.name);
  private qdrantClient: QdrantClient;
  private readonly collectionName = 'user-profiles';

  constructor(
    @InjectModel(Profile.name) private profileModel: Model<ProfileDocument>,
    private readonly configService: ConfigService,
  ) {
    const qdrantUrl = this.configService.get<string>('QDRANT_URL', 'http://localhost:6333');
    this.qdrantClient = new QdrantClient({ url: qdrantUrl });
    this.logger.log('Profile Service initialized');
  }

  // ============ CRUD Operations ============

  async create(createProfileDto: CreateProfileDto): Promise<ProfileDocument> {
    try {
      const existingProfile = await this.profileModel.findOne({ userId: createProfileDto.userId });
      if (existingProfile) {
        throw new BadRequestException('Profile already exists for this user');
      }

      const profile = new this.profileModel({
        ...createProfileDto,
        lastActiveDate: new Date(),
      });

      await profile.save();
      this.logger.log(`Profile created for user: ${createProfileDto.userId}`);
      return profile;
    } catch (error) {
      this.logger.error(`Failed to create profile: ${error.message}`);
      throw error;
    }
  }

  async findAll(limit: number = 50, skip: number = 0): Promise<ProfileDocument[]> {
    return this.profileModel.find().limit(limit).skip(skip).sort({ rank: -1 }).exec();
  }

  async findByUserId(userId: string): Promise<ProfileDocument> {
    const profile = await this.profileModel.findOne({ userId }).exec();
    if (!profile) {
      throw new NotFoundException(`Profile not found for user: ${userId}`);
    }
    return profile;
  }

  async findById(profileId: string): Promise<ProfileDocument> {
    const profile = await this.profileModel.findById(profileId).exec();
    if (!profile) {
      throw new NotFoundException(`Profile not found: ${profileId}`);
    }
    return profile;
  }

  async update(userId: string, updateProfileDto: UpdateProfileDto): Promise<ProfileDocument> {
    const profile = await this.profileModel.findOneAndUpdate(
      { userId },
      { ...updateProfileDto, updatedAt: new Date() },
      { new: true },
    ).exec();

    if (!profile) {
      throw new NotFoundException(`Profile not found for user: ${userId}`);
    }

    this.logger.log(`Profile updated for user: ${userId}`);
    return profile;
  }

  async delete(userId: string): Promise<void> {
    const result = await this.profileModel.deleteOne({ userId }).exec();
    if (result.deletedCount === 0) {
      throw new NotFoundException(`Profile not found for user: ${userId}`);
    }
    this.logger.log(`Profile deleted for user: ${userId}`);
  }

  // ============ Event Management ============

  async addParticipatingEvent(userId: string, addEventDto: AddEventDto): Promise<ProfileDocument> {
    const profile = await this.findByUserId(userId);

    if (!profile.participatingEvents.includes(addEventDto.eventId)) {
      profile.participatingEvents.push(addEventDto.eventId);
      await profile.save();
      this.logger.log(`Added event ${addEventDto.eventId} to user ${userId}`);
    }

    return profile;
  }

  async moveEventToPast(userId: string, eventId: string): Promise<ProfileDocument> {
    const profile = await this.findByUserId(userId);

    const index = profile.participatingEvents.indexOf(eventId);
    if (index > -1) {
      profile.participatingEvents.splice(index, 1);
      if (!profile.pastEvents.includes(eventId)) {
        profile.pastEvents.push(eventId);
      }
      await profile.save();
      this.logger.log(`Moved event ${eventId} to past for user ${userId}`);
    }

    return profile;
  }

  // ============ Workshop Management ============

  async addWorkshop(userId: string, addWorkshopDto: AddWorkshopDto): Promise<ProfileDocument> {
    const profile = await this.findByUserId(userId);

    if (!profile.workshopsAttended.includes(addWorkshopDto.workshopId)) {
      profile.workshopsAttended.push(addWorkshopDto.workshopId);
      profile.workshopCompletions.push({
        workshopId: addWorkshopDto.workshopId,
        completedAt: new Date(),
        certificateUrl: addWorkshopDto.certificateUrl,
      });
      await profile.save();
      this.logger.log(`Added workshop ${addWorkshopDto.workshopId} to user ${userId}`);
    }

    return profile;
  }

  // ============ Activity Tracking ============

  async recordActivity(userId: string, recordActivityDto: RecordActivityDto): Promise<ProfileDocument> {
    const profile = await this.findByUserId(userId);

    const dateStr = recordActivityDto.date || new Date().toISOString().split('T')[0];
    const currentCount = profile.activityDays.get(dateStr) || 0;
    profile.activityDays.set(dateStr, currentCount + 1);
    profile.totalActivityDays = profile.activityDays.size;
    profile.lastActiveDate = new Date();

    // Update streaks
    this.updateStreaks(profile);

    await profile.save();
    this.logger.log(`Recorded activity for user ${userId} on ${dateStr}`);
    return profile;
  }

  private updateStreaks(profile: ProfileDocument): void {
    const sortedDates = Array.from(profile.activityDays.keys()).sort();
    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 1;

    for (let i = 0; i < sortedDates.length; i++) {
      if (i > 0) {
        const prevDate = new Date(sortedDates[i - 1]);
        const currDate = new Date(sortedDates[i]);
        const diffDays = Math.floor((currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
          tempStreak++;
        } else {
          longestStreak = Math.max(longestStreak, tempStreak);
          tempStreak = 1;
        }
      }
    }

    longestStreak = Math.max(longestStreak, tempStreak);

    // Calculate current streak
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    if (profile.activityDays.has(today) || profile.activityDays.has(yesterday)) {
      currentStreak = tempStreak;
    } else {
      currentStreak = 0;
    }

    profile.currentStreak = currentStreak;
    profile.longestStreak = longestStreak;
  }

  // ============ Game & Tournament Tracking ============

  async recordGameResult(userId: string, recordGameDto: RecordGameResultDto): Promise<ProfileDocument> {
    const profile = await this.findByUserId(userId);

    profile.totalGamesPlayed += 1;
    if (recordGameDto.won) {
      profile.totalWins += 1;
    }
    if (recordGameDto.hoursPlayed) {
      profile.totalHoursPlayed += recordGameDto.hoursPlayed;
    }

    await profile.save();
    await this.recordActivity(userId, {});
    this.logger.log(`Recorded game result for user ${userId}`);
    return profile;
  }

  async recordTournament(userId: string, recordTournamentDto: RecordTournamentDto): Promise<ProfileDocument> {
    const profile = await this.findByUserId(userId);

    profile.tournamentParticipations += 1;
    if (recordTournamentDto.won) {
      if (!profile.tournamentsWon.includes(recordTournamentDto.tournamentId)) {
        profile.tournamentsWon.push(recordTournamentDto.tournamentId);
      }
    }

    await profile.save();
    await this.recordActivity(userId, {});
    this.logger.log(`Recorded tournament for user ${userId}`);
    return profile;
  }

  // ============ Statistics ============

  async getStatistics(profileId: string) {
    const profile = await this.findById(profileId);

    const winRate = profile.totalGamesPlayed > 0
      ? (profile.totalWins / profile.totalGamesPlayed) * 100
      : 0;

    const tournamentWinRate = profile.tournamentParticipations > 0
      ? (profile.tournamentsWon.length / profile.tournamentParticipations) * 100
      : 0;

    return {
      profileId: profile.id,
      userId: profile.userId,
      username: profile.username,
      rank: profile.rank,
      statistics: {
        games: {
          totalPlayed: profile.totalGamesPlayed,
          totalWins: profile.totalWins,
          winRate: Math.round(winRate * 100) / 100,
          totalHoursPlayed: profile.totalHoursPlayed,
        },
        tournaments: {
          totalParticipations: profile.tournamentParticipations,
          totalWins: profile.tournamentsWon.length,
          winRate: Math.round(tournamentWinRate * 100) / 100,
          tournamentsWon: profile.tournamentsWon,
        },
        events: {
          participating: profile.participatingEvents.length,
          past: profile.pastEvents.length,
          total: profile.participatingEvents.length + profile.pastEvents.length,
        },
        workshops: {
          attended: profile.workshopsAttended.length,
          completions: profile.workshopCompletions,
        },
        activity: {
          totalDays: profile.totalActivityDays,
          currentStreak: profile.currentStreak,
          longestStreak: profile.longestStreak,
          lastActive: profile.lastActiveDate,
        },
      },
      testResults: profile.testResults,
      weights: profile.weights,
    };
  }

  // ============ Vector Operations (Admin) ============

  async getAllVectors() {
    try {
      const profiles = await this.profileModel.find({ vectorId: { $exists: true, $ne: null } }).exec();

      const vectors = await Promise.all(
        profiles.map(async (profile) => {
          try {
            const vectorData = await this.qdrantClient.retrieve(this.collectionName, {
              ids: [profile.vectorId],
              with_vector: true,
              with_payload: true,
            });

            return {
              profileId: profile._id,
              userId: profile.userId,
              username: profile.username,
              vectorId: profile.vectorId,
              vector: vectorData[0]?.vector || null,
              payload: vectorData[0]?.payload || null,
            };
          } catch (error) {
            this.logger.warn(`Failed to retrieve vector for profile ${profile.userId}: ${error.message}`);
            return {
              profileId: profile._id,
              userId: profile.userId,
              username: profile.username,
              vectorId: profile.vectorId,
              vector: null,
              payload: null,
              error: error.message,
            };
          }
        }),
      );

      return {
        total: vectors.length,
        vectors,
      };
    } catch (error) {
      this.logger.error(`Failed to get all vectors: ${error.message}`);
      throw error;
    }
  }

  async getLeaderboard(limit: number = 50) {
    return this.profileModel
      .find({ isActive: true })
      .sort({ rank: -1, totalWins: -1 })
      .limit(limit)
      .select('userId username rank totalWins totalGamesPlayed tournamentParticipations avatar')
      .exec();
  }
}
