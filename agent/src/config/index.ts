import { z } from 'zod';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const configSchema = z.object({
  // API Keys
  geminiApiKey: z.string().optional(),
  
  // Server Configuration
  apiPort: z.number().default(3000),
  nodeEnv: z.enum(['development', 'production', 'test']).default('development'),
  
  // Logging
  logLevel: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
});

const rawConfig = {
  geminiApiKey: process.env.GEMINI_API_KEY,
  apiPort: parseInt(process.env.API_PORT || '3000', 10),
  nodeEnv: (process.env.NODE_ENV as 'development' | 'production' | 'test') || 'development',
  logLevel: (process.env.LOG_LEVEL as 'error' | 'warn' | 'info' | 'debug') || 'info',
};

export const config = configSchema.parse(rawConfig);

export type Config = z.infer<typeof configSchema>;

// Validation function to check required environment variables
export function validateConfig(): void {
  const errors: string[] = [];
  
  if (!config.geminiApiKey) {
    errors.push('GEMINI_API_KEY must be provided');
  }
  
  if (errors.length > 0) {
    throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
  }
}
