import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PineconeConfigService {
  private readonly logger = new Logger(PineconeConfigService.name);

  constructor(private configService: ConfigService) {}

  validateConfiguration(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    const apiKey = this.configService.get<string>('PINECONE_API_KEY');
    const indexName = this.configService.get<string>('PINECONE_INDEX_NAME');
    const environment = this.configService.get<string>('PINECONE_ENVIRONMENT');
    Logger.log(`PINECONE_API_KEY: ${apiKey}`);
    Logger.log(`PINECONE_INDEX_NAME: ${indexName}`);
    Logger.log(`PINECONE_ENVIRONMENT: ${environment}`);

    if (!apiKey || apiKey === 'your_pinecone_api_key_here') {
      errors.push('PINECONE_API_KEY is missing or not configured');
    }

    if (!indexName) {
      errors.push('PINECONE_INDEX_NAME is missing');
    }

    if (!environment) {
      errors.push('PINECONE_ENVIRONMENT is missing (e.g., us-east-1-aws, us-west1-gcp-free)');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  getConfiguration() {
    return {
      apiKey: this.configService.get<string>('PINECONE_API_KEY'),
      indexName: this.configService.get<string>('PINECONE_INDEX_NAME'),
      environment: this.configService.get<string>('PINECONE_ENVIRONMENT', 'us-east-1-aws'),
    };
  }

  getCommonEnvironments() {
    return [
      'us-east-1-aws',
      'us-west1-gcp-free',
      'us-west4-gcp',
      'eu-west1-gcp',
      'asia-southeast1-gcp',
    ];
  }

  getSetupInstructions(): string {
    return `
🔧 Pinecone Setup Instructions:

1. Create a Pinecone account at https://app.pinecone.io/
2. Create a new index with these settings:
   - Name: listings (or your preferred name)
   - Dimensions: 1536 (for OpenAI text-embedding-ada-002)
   - Metric: cosine
   - Pod Type: starter (for free tier)
   
3. Get your API key from the Pinecone console
4. Note your environment (shown in the console)

5. Update your .env file:
   PINECONE_API_KEY=your_actual_api_key
   PINECONE_INDEX_NAME=listings
   PINECONE_ENVIRONMENT=your_environment
    `;
  }
}
