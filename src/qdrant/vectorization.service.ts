import { Injectable, Logger } from '@nestjs/common';
import { QdrantService } from './qdrant.service';
import { EmbeddingsService } from '../embeddings/embeddings.service';

export interface StrainDocument {
  _id?: string;
  id?: string;
  name: string;
  type: 'indica' | 'sativa' | 'hybrid';
  description: string;
  thc?: number;
  cbd?: number;
  effects: string[];
  flavors?: string[];
  medical?: string[];
  genetics?: string;
  breeder?: string;
}

@Injectable()
export class VectorizationService {
  private readonly logger = new Logger(VectorizationService.name);

  constructor(
    private readonly qdrantService: QdrantService,
    private readonly embeddingsService: EmbeddingsService,
  ) {}

  async vectorizeStrains(strains: StrainDocument[]): Promise<void> {
    try {
      this.logger.log(`Starting vectorization of ${strains.length} strains`);

      const vectors = [];

      for (let i = 0; i < strains.length; i++) {
        const strain = strains[i];
        try {
          const strainText = this.createStrainEmbeddingText(strain);
          const embedding = await this.embeddingsService.generateEmbedding(strainText);

          const pointId = i + 1;

          vectors.push({
            id: pointId,
            vector: embedding,
            payload: {
              name: strain.name,
              type: strain.type,
              description: strain.description || '',
              thc: strain.thc,
              cbd: strain.cbd,
              effects: strain.effects || [],
              flavors: strain.flavors || [],
              medical: strain.medical || [],
              genetics: strain.genetics || '',
              breeder: strain.breeder || '',
              originalId: String(strain._id || strain.id),
              createdAt: new Date().toISOString(),
            },
          });

          this.logger.log(`Vectorized strain: ${strain.name} with ID: ${pointId}`);
        } catch (error) {
          this.logger.error(`Failed to vectorize strain ${strain.name}: ${error.message}`);
        }
      }

      if (vectors.length > 0) {
        await this.qdrantService.upsertVectors(vectors);
        this.logger.log(`Successfully vectorized ${vectors.length} strains in Qdrant`);
      }
    } catch (error) {
      this.logger.error(`Failed to vectorize strains: ${error.message}`, error.stack);
      throw error;
    }
  }

  async findSimilarStrains(
    moodDescription: string,
    maxResults: number = 5,
  ): Promise<any[]> {
    try {
      this.logger.log(`Finding strains for mood: "${moodDescription.substring(0, 50)}..."`);

      // Create enhanced search query
      const searchQuery = this.createMoodBasedQuery(moodDescription);

      // Generate embedding for mood
      const queryEmbedding = await this.embeddingsService.generateEmbedding(searchQuery);

      // Search in Qdrant
      const results = await this.qdrantService.searchVectors(
        queryEmbedding,
        maxResults,
      );

      // Format results
      const formattedResults = results.map((result) => ({
        id: result.id,
        name: result.payload?.name,
        type: result.payload?.type,
        description: result.payload?.description,
        thc: result.payload?.thc,
        cbd: result.payload?.cbd,
        effects: result.payload?.effects,
        flavors: result.payload?.flavors,
        medical: result.payload?.medical,
        genetics: result.payload?.genetics,
        similarity: Math.round(result.score * 100) / 100,
        createdAt: result.payload?.createdAt,
      }));

      this.logger.log(`Found ${formattedResults.length} similar strains`);
      return formattedResults;
    } catch (error) {
      this.logger.error(`Failed to find similar strains: ${error.message}`, error.stack);
      throw error;
    }
  }

  private createStrainEmbeddingText(strain: StrainDocument): string {
    const parts = [
      `Cannabis strain: ${strain.name}`,
      `Type: ${strain.type}`,
      `Description: ${strain.description}`,
      `Effects: ${strain.effects.join(', ')}`,
    ];

    if (strain.thc) parts.push(`THC: ${strain.thc}%`);
    if (strain.cbd) parts.push(`CBD: ${strain.cbd}%`);
    if (strain.flavors?.length) parts.push(`Flavors: ${strain.flavors.join(', ')}`);
    if (strain.medical?.length) parts.push(`Medical uses: ${strain.medical.join(', ')}`);
    if (strain.genetics) parts.push(`Genetics: ${strain.genetics}`);
    if (strain.breeder) parts.push(`Breeder: ${strain.breeder}`);

    return parts.join('. ');
  }

  private createMoodBasedQuery(moodDescription: string): string {
    // Analyze mood to create optimized search query
    const moodLower = moodDescription.toLowerCase();
    const parts = [
      `User mood: ${moodDescription}`,
    ];

    // Add effect keywords based on mood
    if (moodLower.includes('stress') || moodLower.includes('gestresst')) {
      parts.push('Effects: relaxed, calm, stress-relief');
    }
    if (moodLower.includes('energie') || moodLower.includes('wach')) {
      parts.push('Effects: energetic, uplifted, focused');
    }
    if (moodLower.includes('entspann') || moodLower.includes('relax')) {
      parts.push('Effects: relaxed, calm, sleepy');
    }
    if (moodLower.includes('kreativ') || moodLower.includes('creative')) {
      parts.push('Effects: creative, focused, euphoric');
    }
    if (moodLower.includes('fröhlich') || moodLower.includes('happy')) {
      parts.push('Effects: happy, euphoric, giggly');
    }

    // Add strain type suggestions based on mood
    if (moodLower.includes('abend') || moodLower.includes('schlafen')) {
      parts.push('Type: indica');
    } else if (moodLower.includes('tag') || moodLower.includes('produktiv')) {
      parts.push('Type: sativa');
    }

    return parts.join('. ');
  }
}