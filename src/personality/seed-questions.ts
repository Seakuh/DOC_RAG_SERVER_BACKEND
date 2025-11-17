/**
 * Seed script for initial personality questions
 *
 * Run this script with:
 * npx ts-node src/personality/seed-questions.ts
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { PersonalityService } from './personality.service';
import { Logger } from '@nestjs/common';

const logger = new Logger('SeedQuestions');

const initialQuestions = [
  {
    key: 'ich_suche',
    question: 'Ich suche:',
    type: 'multiple_choice',
    options: [
      'Kontakte allgemein',
      'Sponsoren',
      'Mitarbeiter / Personal',
      'Finanzierung',
      'Sparringspartner',
      'Beteiligungen',
      'Investitionsmöglichkeiten',
      'Gleichgesinnte Pokerfreunde',
      'Einen Partner fürs Leben',
    ],
    active: true,
    order: 1,
  },
  {
    key: 'einsatz_von_poker_als_lehrmethode',
    question: 'Einsatz von Poker als Lehrmethode für:',
    type: 'multiple_choice',
    options: [
      'Verhandlungsführung',
      'Vertrieb / Sales / Einkauf',
      'Personalwesen / HR',
      'Strengten Women Leadership',
      'Entscheidungskompetenz',
      'Finance',
      'Marketing / PR',
      'Incentives / Events / Kundenbindung',
      'Mindset / Werte + Ziele',
      'Data Science / AI',
      'Cultural Change',
      'Sonstiges',
    ],
    active: true,
    order: 2,
  },
  {
    key: 'parallel_biz_poker',
    question: 'Hier sehe ich Parallelen zwischen meinem Business und dem Pokerspiel:',
    type: 'text',
    options: [''], // Text questions don't need options but the schema requires it
    active: true,
    order: 3,
  },
];

async function seed() {
  try {
    logger.log('Starting question seed...');

    const app = await NestFactory.createApplicationContext(AppModule);
    const personalityService = app.get(PersonalityService);

    let created = 0;
    let skipped = 0;

    for (const questionData of initialQuestions) {
      try {
        await personalityService.createQuestion(questionData);
        logger.log(`✓ Created question: ${questionData.key}`);
        created++;
      } catch (error) {
        if (error.message?.includes('already exists')) {
          logger.log(`⊘ Skipped (already exists): ${questionData.key}`);
          skipped++;
        } else {
          logger.error(`✗ Failed to create question ${questionData.key}:`, error.message);
        }
      }
    }

    logger.log('\n=== Seed Summary ===');
    logger.log(`Created: ${created}`);
    logger.log(`Skipped: ${skipped}`);
    logger.log(`Total questions: ${created + skipped}`);

    await app.close();
    logger.log('Seed completed successfully!');
    process.exit(0);
  } catch (error) {
    logger.error('Seed failed:', error);
    process.exit(1);
  }
}

seed();
