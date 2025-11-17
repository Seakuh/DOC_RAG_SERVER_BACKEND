import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { PersonalityController } from './personality.controller';
import { PersonalityService } from './personality.service';
import { Question, QuestionSchema } from './schemas/question.schema';
import { Profile, ProfileSchema } from './schemas/profile.schema';

@Module({
  imports: [
    ConfigModule,
    MongooseModule.forFeature([
      { name: Question.name, schema: QuestionSchema },
      { name: Profile.name, schema: ProfileSchema },
    ]),
  ],
  controllers: [PersonalityController],
  providers: [PersonalityService],
  exports: [PersonalityService],
})
export class PersonalityModule {}
