import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  private readonly startTime = Date.now();

  getHello() {
    return {
      message: 'RAG Backend API is running!',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      uptime: (Date.now() - this.startTime) / 1000,
    };
  }

  getVersion() {
    return {
      version: '1.0.0',
      name: 'RAG Backend',
      description: 'NestJS RAG Backend with Pinecone and OpenAI integration',
      author: 'Your Name',
      node_version: process.version,
    };
  }
}