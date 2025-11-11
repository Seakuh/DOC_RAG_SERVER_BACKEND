import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { QdrantService } from '../qdrant/qdrant.service';
import { EmbeddingsService } from '../embeddings/embeddings.service';
import { GenerateScenariosDto } from './dto/generate-scenarios.dto';
import { AnalyzeProfileDto } from './dto/analyze-profile.dto';
import { SaveProfileDto } from './dto/save-profile.dto';

@Injectable()
export class FredolinService {
  private readonly logger = new Logger(FredolinService.name);
  private openai: OpenAI;
  private readonly collectionName = 'fredolin-profiles';

  constructor(
    private configService: ConfigService,
    private qdrantService: QdrantService,
    private embeddingsService: EmbeddingsService,
  ) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (!apiKey) {
      this.logger.warn('OPENAI_API_KEY not configured');
      throw new Error('OPENAI_API_KEY must be set in environment variables');
    }

    this.openai = new OpenAI({ apiKey });
    this.logger.log('Fredolin Service initialized');
  }

  /**
   * Generate poker scenarios using OpenAI
   */
  async generateScenarios(dto: GenerateScenariosDto): Promise<any[]> {
    const count = dto.count || 8;

    const prompt = `Du bist ein kreativer Poker-Trainer. Erstelle ${count} neue, einzigartige Poker-Szenarien für "Fredolin", einen Poker-Anfänger.

Jedes Szenario soll:
- Eine realistische Poker-Situation beschreiben
- 4 mögliche Aktionen haben (tight, loose, aggressive, passive)
- Unterhaltsam und lehrreich sein
- Verschiedene Aspekte von Poker abdecken (Starthand-Auswahl, Position, Pot Odds, Psychologie, etc.)

WICHTIG: Antworte NUR mit einem gültigen JSON-Array, kein zusätzlicher Text!

Format:
[
  {
    "id": 1,
    "situation": "Kurzer prägnanter Titel (max 20 Zeichen)",
    "description": "Detaillierte Beschreibung der Situation mit Karten (z.B. A♥ K♠) und Board (z.B. 9♦ 5♦ 2♠). 2-3 Sätze.",
    "tightAnswer": "Konservative Aktion (z.B. 'Folden', 'Kleiner Raise')",
    "looseAnswer": "Lockere/riskante Aktion (z.B. 'All-in gehen', 'Callen')",
    "aggressiveAnswer": "Aggressive Aktion (z.B. 'Großer Raise', 'Re-Raise')",
    "passiveAnswer": "Passive Aktion (z.B. 'Check', 'Nur callen')"
  }
]

Erstelle jetzt ${count} verschiedene Szenarien als JSON-Array:`;

    try {
      this.logger.log(`Generating ${count} poker scenarios`);

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'Du bist ein Poker-Trainer. Antworte nur mit gültigem JSON.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.9, // High creativity
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0]?.message?.content || '';
      const parsed = JSON.parse(content);

      // Handle both array and object with scenarios key
      let scenarios = [];
      if (Array.isArray(parsed)) {
        scenarios = parsed;
      } else if (parsed.scenarios && Array.isArray(parsed.scenarios)) {
        scenarios = parsed.scenarios;
      } else {
        throw new Error('Unexpected response format from OpenAI');
      }

      this.logger.log(`Successfully generated ${scenarios.length} scenarios`);
      return scenarios;
    } catch (error) {
      this.logger.error(`Failed to generate scenarios: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to generate scenarios: ${error.message}`);
    }
  }

  /**
   * Analyze user answers and generate poker profile
   */
  async analyzeProfile(dto: AnalyzeProfileDto): Promise<any> {
    const { answers } = dto;

    // Count answer types
    const analysis = {
      tight: 0,
      loose: 0,
      aggressive: 0,
      passive: 0,
    };

    for (const answer of answers) {
      switch (answer.direction) {
        case 'up':
          analysis.tight++;
          break;
        case 'down':
          analysis.loose++;
          break;
        case 'right':
          analysis.aggressive++;
          break;
        case 'left':
          analysis.passive++;
          break;
      }
    }

    const prompt = `Analysiere Fredolins Poker-Entscheidungen und erstelle ein detailliertes Spielerprofil.

Statistik der Entscheidungen:
- Tight (konservativ): ${analysis.tight} von ${answers.length}
- Loose (locker): ${analysis.loose} von ${answers.length}
- Aggressive (aggressiv): ${analysis.aggressive} von ${answers.length}
- Passive (passiv): ${analysis.passive} von ${answers.length}

Szenarien und Antworten:
${answers.map((a) => `${a.scenarioTitle}: ${a.answer} (${a.direction})`).join('\n')}

Erstelle ein Profil im folgenden JSON-Format (EXAKT diese Struktur, keine zusätzlichen Felder):

{
  "name": "Ein kreativer, passender Spielstil-Name (z.B. 'Der Analytische Beobachter', 'Die Mutige Zockerin')",
  "stil": {
    "risikofreude": 0.0-1.0,
    "geduld": 0.0-1.0,
    "aggressivität": 0.0-1.0,
    "anpassungsfähigkeit": 0.0-1.0,
    "bluffneigung": 0.0-1.0
  },
  "beschreibung": "Eine persönliche, motivierende Beschreibung des Spielstils (3-4 Sätze). Sei ermutigend und konstruktiv!",
  "tierMentor": "Ein passendes Pokertier als Mentor (z.B. 'Fredolin das Pokerfrettchen', 'Luna die Luchs-Lady', 'Max der Strategiemops')",
  "empfohleneStrategie": "Eine konkrete Strategie-Empfehlung basierend auf dem Spielstil (1-2 Sätze)"
}

WICHTIG:
- Antworte NUR mit dem JSON-Objekt, kein zusätzlicher Text!
- Werte zwischen 0.0 und 1.0 für die "stil"-Metriken
- Sei kreativ und positiv in der Beschreibung
- Die Beschreibung soll Fredolin helfen, seinen Stil zu verstehen und zu verbessern`;

    try {
      this.logger.log(`Analyzing profile for ${answers.length} answers`);

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'Du bist ein erfahrener Poker-Coach. Antworte nur mit gültigem JSON.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.8,
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0]?.message?.content || '';
      const profile = JSON.parse(content);

      this.logger.log(`Successfully generated poker profile: ${profile.name}`);
      return profile;
    } catch (error) {
      this.logger.error(`Failed to analyze profile: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to analyze profile: ${error.message}`);
    }
  }

  /**
   * Save poker profile to Qdrant vector database
   */
  async saveProfile(dto: SaveProfileDto): Promise<{ success: boolean; id: string }> {
    try {
      // Create text representation of the profile for embedding
      const profileText = this.createProfileText(dto);

      // Generate embedding
      this.logger.log('Generating embedding for profile');
      const embedding = await this.embeddingsService.generateEmbeddings([profileText]);

      if (!embedding || embedding.length === 0 || !embedding[0]) {
        throw new Error('Failed to generate embedding');
      }

      // Generate unique ID
      const profileId = dto.userId || `fredolin-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Prepare payload
      const payload = {
        userId: dto.userId || 'anonymous',
        name: dto.name,
        stil: dto.stil,
        beschreibung: dto.beschreibung,
        tierMentor: dto.tierMentor,
        empfohleneStrategie: dto.empfohleneStrategie,
        answers: dto.answers,
        createdAt: new Date().toISOString(),
        profileText, // Store the text used for embedding
      };

      // Save to Qdrant
      this.logger.log(`Saving profile to Qdrant: ${profileId}`);

      // Use upsertVectors method from QdrantService with custom collection
      await this.qdrantService.upsertVectors(
        [
          {
            id: profileId,
            vector: embedding[0],
            payload,
          },
        ],
        this.collectionName, // Pass the fredolin-profiles collection name
      );

      this.logger.log(`Profile saved successfully: ${profileId}`);
      return { success: true, id: profileId };
    } catch (error) {
      this.logger.error(`Failed to save profile: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to save profile: ${error.message}`);
    }
  }

  /**
   * Create searchable text representation of a poker profile
   */
  private createProfileText(profile: SaveProfileDto): string {
    const parts = [
      `Poker-Spielerprofil: ${profile.name}`,
      `Beschreibung: ${profile.beschreibung}`,
      `Tier-Mentor: ${profile.tierMentor}`,
      `Empfohlene Strategie: ${profile.empfohleneStrategie}`,
      `Risikofreude: ${(profile.stil.risikofreude * 100).toFixed(0)}%`,
      `Geduld: ${(profile.stil.geduld * 100).toFixed(0)}%`,
      `Aggressivität: ${(profile.stil.aggressivität * 100).toFixed(0)}%`,
      `Anpassungsfähigkeit: ${(profile.stil.anpassungsfähigkeit * 100).toFixed(0)}%`,
      `Bluffneigung: ${(profile.stil.bluffneigung * 100).toFixed(0)}%`,
    ];

    // Add answer summary
    const answerSummary = profile.answers.map((a) =>
      `${a.scenarioTitle}: ${a.answer}`
    ).join('. ');
    parts.push(`Entscheidungen: ${answerSummary}`);

    return parts.join('. ');
  }
}
