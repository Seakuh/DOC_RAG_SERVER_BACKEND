import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { QdrantClient } from '@qdrant/js-client-rest';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { v4 as uuidv4 } from 'uuid';
import { Question, QuestionDocument } from './schemas/question.schema';
import { Profile, ProfileDocument, Answer } from './schemas/profile.schema';
import { CreateQuestionDto } from './dto/create-question.dto';
import { SubmitAnswersDto } from './dto/submit-answers.dto';
import { ProfileMatchDto } from './dto/profile-match.dto';

@Injectable()
export class PersonalityService {
  private readonly logger = new Logger(PersonalityService.name);
  private qdrantClient: QdrantClient;
  private openai: OpenAI;
  private readonly collectionName = 'personality-profiles';

  constructor(
    @InjectModel(Question.name) private questionModel: Model<QuestionDocument>,
    @InjectModel(Profile.name) private profileModel: Model<ProfileDocument>,
    private readonly configService: ConfigService,
  ) {
    this.initializeClients();
  }

  private async initializeClients() {
    // Initialize Qdrant
    const qdrantUrl = this.configService.get<string>('QDRANT_API_URL', 'http://localhost:6333');
    const qdrantKey = this.configService.get<string>('QDRANT_API_KEY');

    this.qdrantClient = new QdrantClient({
      url: qdrantUrl,
      ...(qdrantKey && { apiKey: qdrantKey }),
    });

    this.logger.log('Qdrant client initialized');

    // Initialize OpenAI
    this.openai = new OpenAI({
      apiKey: this.configService.get<string>('OPENAI_API_KEY'),
    });

    this.logger.log('OpenAI client initialized');

    // Ensure collection exists
    await this.ensureCollection();
  }

  private async ensureCollection() {
    try {
      const collections = await this.qdrantClient.getCollections();
      const exists = collections.collections.some(
        (collection) => collection.name === this.collectionName,
      );

      if (!exists) {
        await this.qdrantClient.createCollection(this.collectionName, {
          vectors: {
            size: 1536, // OpenAI text-embedding-3-small default
            distance: 'Cosine',
          },
        });
        this.logger.log(`Created Qdrant collection: ${this.collectionName}`);
      } else {
        this.logger.log(`Qdrant collection ${this.collectionName} already exists`);
      }
    } catch (error) {
      this.logger.error(`Failed to ensure collection: ${error.message}`);
      throw error;
    }
  }

  // ============ Question Management ============

  async createQuestion(createQuestionDto: CreateQuestionDto): Promise<Question> {
    try {
      const question = new this.questionModel(createQuestionDto);
      await question.save();
      this.logger.log(`Created question: ${question.key}`);
      return question;
    } catch (error) {
      if (error.code === 11000) {
        throw new BadRequestException('Question with this key already exists');
      }
      throw error;
    }
  }

  async getAllQuestions(): Promise<Question[]> {
    return this.questionModel.find({ active: true }).sort({ order: 1 }).exec();
  }

  async getQuestionByKey(key: string): Promise<Question> {
    const question = await this.questionModel.findOne({ key }).exec();
    if (!question) {
      throw new NotFoundException(`Question with key ${key} not found`);
    }
    return question;
  }

  async updateQuestion(key: string, updateData: Partial<CreateQuestionDto>): Promise<Question> {
    const question = await this.questionModel
      .findOneAndUpdate({ key }, { ...updateData, updatedAt: new Date() }, { new: true })
      .exec();

    if (!question) {
      throw new NotFoundException(`Question with key ${key} not found`);
    }

    this.logger.log(`Updated question: ${key}`);
    return question;
  }

  async deleteQuestion(key: string): Promise<void> {
    const result = await this.questionModel.deleteOne({ key }).exec();
    if (result.deletedCount === 0) {
      throw new NotFoundException(`Question with key ${key} not found`);
    }
    this.logger.log(`Deleted question: ${key}`);
  }

  // ============ Profile Management ============

  async submitAnswers(userId: string, submitAnswersDto: SubmitAnswersDto): Promise<Profile> {
    try {
      // Check if profile already exists
      const existingProfile = await this.profileModel.findOne({ userId }).exec();
      if (existingProfile) {
        // Update existing profile
        return this.updateProfile(userId, submitAnswersDto);
      }

      // Validate that all answered questions exist
      const questionKeys = submitAnswersDto.answers.map(a => a.questionKey);
      const questions = await this.questionModel.find({ key: { $in: questionKeys } }).exec();

      if (questions.length !== questionKeys.length) {
        throw new BadRequestException('Some questions do not exist');
      }

      // Generate descriptive text from answers
      const generatedText = await this.generateProfileText(submitAnswersDto.answers, questions);
      this.logger.log(`Generated profile text (${generatedText.length} chars)`);

      // Generate embedding vector
      const embedding = await this.generateEmbedding(generatedText);
      this.logger.log(`Generated embedding vector (${embedding.length} dimensions)`);

      // Generate unique vector ID
      const vectorId = uuidv4();

      // Store vector in Qdrant
      await this.qdrantClient.upsert(this.collectionName, {
        wait: true,
        points: [
          {
            id: vectorId,
            vector: embedding,
            payload: {
              userId,
              createdAt: new Date().toISOString(),
            },
          },
        ],
      });
      this.logger.log(`Stored vector in Qdrant: ${vectorId}`);

      // Create profile in MongoDB
      const profile = new this.profileModel({
        userId,
        answers: submitAnswersDto.answers,
        vectorId,
        generatedText,
        createdAt: new Date(),
      });
      await profile.save();

      this.logger.log(`Created profile for user: ${userId}`);
      return profile;
    } catch (error) {
      this.logger.error(`Failed to submit answers: ${error.message}`);
      throw error;
    }
  }

  async updateProfile(userId: string, submitAnswersDto: SubmitAnswersDto): Promise<Profile> {
    try {
      const profile = await this.profileModel.findOne({ userId }).exec();
      if (!profile) {
        throw new NotFoundException(`Profile for user ${userId} not found`);
      }

      // Validate questions
      const questionKeys = submitAnswersDto.answers.map(a => a.questionKey);
      const questions = await this.questionModel.find({ key: { $in: questionKeys } }).exec();

      if (questions.length !== questionKeys.length) {
        throw new BadRequestException('Some questions do not exist');
      }

      // Generate new text and embedding
      const generatedText = await this.generateProfileText(submitAnswersDto.answers, questions);
      const embedding = await this.generateEmbedding(generatedText);

      // Update vector in Qdrant
      await this.qdrantClient.upsert(this.collectionName, {
        wait: true,
        points: [
          {
            id: profile.vectorId,
            vector: embedding,
            payload: {
              userId,
              updatedAt: new Date().toISOString(),
            },
          },
        ],
      });

      // Update profile in MongoDB
      profile.answers = submitAnswersDto.answers;
      profile.generatedText = generatedText;
      profile.updatedAt = new Date();
      await profile.save();

      this.logger.log(`Updated profile for user: ${userId}`);
      return profile;
    } catch (error) {
      this.logger.error(`Failed to update profile: ${error.message}`);
      throw error;
    }
  }

  async getProfile(userId: string): Promise<Profile> {
    const profile = await this.profileModel.findOne({ userId }).exec();
    if (!profile) {
      throw new NotFoundException(`Profile for user ${userId} not found`);
    }
    return profile;
  }

  async getProfileById(profileId: string): Promise<Profile> {
    const profile = await this.profileModel.findById(profileId).exec();
    if (!profile) {
      throw new NotFoundException(`Profile with ID ${profileId} not found`);
    }
    return profile;
  }

  // ============ Profile Matching ============

  async findMatches(userId: string, limit: number = 10): Promise<ProfileMatchDto[]> {
    try {
      // Get user's profile
      let userProfile;
      try {
        userProfile = await this.getProfile(userId);
      } catch (error) {
        if (error instanceof NotFoundException) {
          this.logger.warn(`No profile found for user ${userId}`);
          return []; // Return empty array if no profile exists
        }
        throw error;
      }

      // Check if profile text exists
      if (!userProfile.generatedText || userProfile.generatedText.trim().length === 0) {
        this.logger.warn(`Profile for user ${userId} has no generated text yet`);
        return []; // Return empty array if no profile text exists
      }

      // Generate embedding from the profile text (avoids UUID retrieve issue)
      const userVector = await this.generateEmbedding(userProfile.generatedText);
      this.logger.log(`Generated search vector for user ${userId}`);

      // Search for similar vectors
      const searchResults = await this.qdrantClient.search(this.collectionName, {
        vector: userVector,
        limit: limit + 1, // +1 because user's own profile will be included
        with_payload: true,
      });

      // Filter out user's own profile and map to DTOs
      const matches: ProfileMatchDto[] = [];

      for (const result of searchResults) {
        const matchedUserId = result.payload?.userId as string;

        // Skip user's own profile
        if (matchedUserId === userId) {
          continue;
        }

        // Get the full profile from MongoDB
        const matchedProfile = await this.profileModel.findOne({ userId: matchedUserId }).exec();

        if (matchedProfile) {
          matches.push({
            profileId: matchedProfile._id.toString(),
            userId: matchedUserId,
            score: result.score,
            generatedText: matchedProfile.generatedText,
          });
        }
      }

      this.logger.log(`Found ${matches.length} matches for user ${userId}`);
      return matches.slice(0, limit); // Ensure we return exactly 'limit' matches
    } catch (error) {
      this.logger.error(`Failed to find matches: ${error.message}`);
      throw error;
    }
  }

  async findMatchesByProfileId(profileId: string, limit: number = 10): Promise<ProfileMatchDto[]> {
    try {
      const profile = await this.getProfileById(profileId);
      return this.findMatches(profile.userId, limit);
    } catch (error) {
      this.logger.error(`Failed to find matches by profile ID: ${error.message}`);
      throw error;
    }
  }

  // ============ Helper Methods ============

  private async generateProfileText(answers: Answer[], questions: Question[]): Promise<string> {
    try {
      // Build a structured representation of the answers
      let answerText = 'Profil-Antworten:\n\n';

      for (const answer of answers) {
        const question = questions.find(q => q.key === answer.questionKey);
        if (question) {
          answerText += `Frage: ${question.question}\n`;

          if (Array.isArray(answer.answer)) {
            answerText += `Antworten: ${answer.answer.join(', ')}\n\n`;
          } else {
            answerText += `Antwort: ${answer.answer}\n\n`;
          }
        }
      }

      // Use LLM to generate a coherent profile summary
      const response = await this.openai.chat.completions.create({
        model: this.configService.get<string>('OPENAI_MODEL', 'gpt-4o-mini'),
        messages: [
          {
            role: 'system',
            content: `Du bist ein Experte für Persönlichkeitsanalyse. Erstelle eine prägnante und aussagekräftige Zusammenfassung des Benutzerprofils basierend auf den gegebenen Antworten.

Die Zusammenfassung sollte:
1. Die wichtigsten Charakteristika der Person hervorheben
2. Ihre Ziele und Interessen klar darstellen
3. In 3-5 prägnanten Sätzen formuliert sein
4. Objektiv und professionell sein

Schreibe die Zusammenfassung in der dritten Person ("Diese Person sucht...", "Sie interessiert sich für...").`,
          },
          {
            role: 'user',
            content: answerText,
          },
        ],
        max_tokens: 300,
        temperature: 0.7,
      });

      return response.choices[0]?.message?.content || answerText;
    } catch (error) {
      this.logger.error(`Failed to generate profile text: ${error.message}`);
      // Fallback: return structured answer text
      return answers.map(a => {
        const value = Array.isArray(a.answer) ? a.answer.join(', ') : a.answer;
        return `${a.questionKey}: ${value}`;
      }).join('\n');
    }
  }

  private async generateEmbedding(text: string): Promise<number[]> {
    try {
      const embeddingModel = this.configService.get<string>(
        'EMBEDDING_MODEL',
        'text-embedding-3-small',
      );

      const response = await this.openai.embeddings.create({
        model: embeddingModel,
        input: text,
        dimensions: 1536, // Match Qdrant collection size
      });

      return response.data[0].embedding;
    } catch (error) {
      this.logger.error(`Failed to generate embedding: ${error.message}`);
      throw error;
    }
  }
}
