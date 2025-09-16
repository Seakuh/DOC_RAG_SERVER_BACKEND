import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Strain, StrainDocument } from './strain.schema';

@Injectable()
export class StrainService {
  private readonly logger = new Logger(StrainService.name);

  constructor(
    @InjectModel(Strain.name) private strainModel: Model<StrainDocument>,
  ) {}

  async findAll(): Promise<Strain[]> {
    try {
      const strains = await this.strainModel.find().exec();
      this.logger.log(`Found ${strains.length} strains in MongoDB`);
      return strains;
    } catch (error) {
      this.logger.error(`Failed to fetch strains from MongoDB: ${error.message}`, error.stack);
      throw error;
    }
  }

  async findById(id: string): Promise<Strain | null> {
    try {
      return await this.strainModel.findById(id).exec();
    } catch (error) {
      this.logger.error(`Failed to find strain by id ${id}: ${error.message}`, error.stack);
      throw error;
    }
  }

  async create(strainData: Partial<Strain>): Promise<Strain> {
    try {
      const createdStrain = new this.strainModel(strainData);
      const result = await createdStrain.save();
      this.logger.log(`Created new strain: ${result.name}`);
      return result;
    } catch (error) {
      this.logger.error(`Failed to create strain: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getStrainStats(): Promise<{
    totalCount: number;
    byType: Record<string, number>;
  }> {
    try {
      const totalCount = await this.strainModel.countDocuments();
      const byType = await this.strainModel.aggregate([
        {
          $group: {
            _id: '$type',
            count: { $sum: 1 }
          }
        }
      ]);

      const typeStats = byType.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {});

      return {
        totalCount,
        byType: typeStats
      };
    } catch (error) {
      this.logger.error(`Failed to get strain stats: ${error.message}`, error.stack);
      throw error;
    }
  }
}