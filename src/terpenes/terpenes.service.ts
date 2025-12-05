import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Terpene, TerpeneDocument } from './terpene.schema';
import { CreateTerpeneDto } from './dto/create-terpene.dto';
import { UpdateTerpeneDto } from './dto/update-terpene.dto';
import { QueryTerpeneDto } from './dto/query-terpene.dto';
import { EmbeddingsService } from '../embeddings/embeddings.service';
import { QdrantClient } from '@qdrant/js-client-rest';
import { ConfigService } from '@nestjs/config';
import { LLMService } from '../llm/llm.service';

@Injectable()
export class TerpenesService {
  private readonly logger = new Logger(TerpenesService.name);
  private qdrantClient: QdrantClient;
  private readonly collectionName = 'terpenes';

  constructor(
    @InjectModel(Terpene.name) private terpeneModel: Model<TerpeneDocument>,
    private readonly embeddingsService: EmbeddingsService,
    private readonly configService: ConfigService,
    private readonly llmService: LLMService,
  ) {
    const apiUrl = this.configService.get<string>('QDRANT_API_URL');
    const apiKey = this.configService.get<string>('QDRANT_API_KEY');

    const clientConfig: any = { url: apiUrl };
    if (apiKey) {
      clientConfig.apiKey = apiKey;
    }

    this.qdrantClient = new QdrantClient(clientConfig);
    this.ensureCollection();
  }

  private async ensureCollection(): Promise<void> {
    try {
      const collections = await this.qdrantClient.getCollections();
      const exists = collections.collections.some(
        (collection) => collection.name === this.collectionName,
      );

      if (!exists) {
        await this.qdrantClient.createCollection(this.collectionName, {
          vectors: {
            size: 1536,
            distance: 'Cosine',
          },
        });
        this.logger.log(`Created Qdrant collection: ${this.collectionName}`);
      }
    } catch (error) {
      this.logger.error(`Failed to ensure collection: ${error.message}`);
    }
  }

  async create(createTerpeneDto: CreateTerpeneDto): Promise<Terpene> {
    const terpene = new this.terpeneModel(createTerpeneDto);

    // Generate embedding for semantic search
    const textForEmbedding = `${terpene.name} ${terpene.description} ${terpene.aromas?.join(' ')} ${terpene.effects?.join(' ')}`;
    const embedding = await this.embeddingsService.generateEmbedding(
      textForEmbedding,
    );

    // Store in Qdrant
    const vectorId = `terpene-${Date.now()}`;
    await this.qdrantClient.upsert(this.collectionName, {
      wait: true,
      points: [
        {
          id: vectorId,
          vector: embedding,
          payload: {
            terpeneId: terpene._id.toString(),
            name: terpene.name,
            description: terpene.description,
            aromas: terpene.aromas || [],
            effects: terpene.effects || [],
            medicalBenefits: terpene.medicalBenefits || [],
          },
        },
      ],
    });

    terpene.vectorId = vectorId;
    await terpene.save();

    this.logger.log(`Created terpene: ${terpene.name}`);
    return terpene;
  }

  async findAll(): Promise<Terpene[]> {
    return this.terpeneModel.find({ isActive: true }).populate('relatedStrains').exec();
  }

  async findOne(id: string): Promise<Terpene> {
    const terpene = await this.terpeneModel
      .findById(id)
      .populate('relatedStrains')
      .exec();

    if (!terpene) {
      throw new NotFoundException(`Terpene with ID ${id} not found`);
    }

    return terpene;
  }

  async findByName(name: string): Promise<Terpene> {
    const terpene = await this.terpeneModel
      .findOne({ name: new RegExp(name, 'i'), isActive: true })
      .populate('relatedStrains')
      .exec();

    if (!terpene) {
      throw new NotFoundException(`Terpene ${name} not found`);
    }

    return terpene;
  }

  async update(id: string, updateTerpeneDto: UpdateTerpeneDto): Promise<Terpene> {
    const terpene = await this.terpeneModel
      .findByIdAndUpdate(id, updateTerpeneDto, { new: true })
      .populate('relatedStrains')
      .exec();

    if (!terpene) {
      throw new NotFoundException(`Terpene with ID ${id} not found`);
    }

    // Update vector if content changed
    if (
      updateTerpeneDto.name ||
      updateTerpeneDto.description ||
      updateTerpeneDto.aromas ||
      updateTerpeneDto.effects
    ) {
      const textForEmbedding = `${terpene.name} ${terpene.description} ${terpene.aromas?.join(' ')} ${terpene.effects?.join(' ')}`;
      const embedding = await this.embeddingsService.generateEmbedding(
        textForEmbedding,
      );

      if (terpene.vectorId) {
        await this.qdrantClient.upsert(this.collectionName, {
          wait: true,
          points: [
            {
              id: terpene.vectorId,
              vector: embedding,
              payload: {
                terpeneId: terpene._id.toString(),
                name: terpene.name,
                description: terpene.description,
                aromas: terpene.aromas || [],
                effects: terpene.effects || [],
                medicalBenefits: terpene.medicalBenefits || [],
              },
            },
          ],
        });
      }
    }

    this.logger.log(`Updated terpene: ${terpene.name}`);
    return terpene;
  }

  async remove(id: string): Promise<void> {
    const terpene = await this.terpeneModel.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true },
    );

    if (!terpene) {
      throw new NotFoundException(`Terpene with ID ${id} not found`);
    }

    this.logger.log(`Soft deleted terpene: ${terpene.name}`);
  }

  async query(queryDto: QueryTerpeneDto): Promise<any> {
    const { question, topK = 5 } = queryDto;

    // Generate embedding for the question
    const questionEmbedding = await this.embeddingsService.generateEmbedding(question);

    // Search in Qdrant
    const searchResults = await this.qdrantClient.search(this.collectionName, {
      vector: questionEmbedding,
      limit: topK,
      with_payload: true,
    });

    // Build context from results
    const context = searchResults
      .map((result: any) => {
        const payload = result.payload;
        return `Terpene: ${payload.name}\nDescription: ${payload.description}\nAromas: ${payload.aromas?.join(', ')}\nEffects: ${payload.effects?.join(', ')}\nMedical Benefits: ${payload.medicalBenefits?.join(', ')}`;
      })
      .join('\n\n');

    // Use LLM to generate answer
    const systemPrompt = `You are a cannabis terpene expert. Answer questions about terpenes based on the provided context. Be informative, accurate, and helpful.`;

    const userPrompt = `Context about terpenes:\n${context}\n\nQuestion: ${question}\n\nProvide a detailed answer based on the context above.`;

    const answer = await this.llmService.generateSimpleResponse(userPrompt, systemPrompt);

    return {
      question,
      answer,
      sources: searchResults.map((result: any) => ({
        name: result.payload.name,
        score: result.score,
        description: result.payload.description,
      })),
    };
  }

  async addRelatedStrain(terpeneId: string, strainId: string): Promise<Terpene> {
    const terpene = await this.terpeneModel.findById(terpeneId);

    if (!terpene) {
      throw new NotFoundException(`Terpene with ID ${terpeneId} not found`);
    }

    if (!terpene.relatedStrains.includes(strainId as any)) {
      terpene.relatedStrains.push(strainId as any);
      await terpene.save();
    }

    return terpene.populate('relatedStrains');
  }

  async removeRelatedStrain(terpeneId: string, strainId: string): Promise<Terpene> {
    const terpene = await this.terpeneModel.findById(terpeneId);

    if (!terpene) {
      throw new NotFoundException(`Terpene with ID ${terpeneId} not found`);
    }

    terpene.relatedStrains = terpene.relatedStrains.filter(
      (id) => id.toString() !== strainId,
    );
    await terpene.save();

    return terpene.populate('relatedStrains');
  }
}
