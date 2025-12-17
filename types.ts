
export interface PromptVar {
  key: string;
  value: string;
}

export interface SavedPrompt {
  id: string;
  title: string;
  description: string;
  systemPrompt: string;
  userPrompt: string;
  variables: Record<string, string>;
  createdAt: number;
  updatedAt: number;
}

export interface ApiConfig {
  id: string;
  name: string;
  baseUrl: string;
  apiKey: string;
  models: string[]; 
}

export type View = 'debug' | 'manage' | 'providers' | 'settings';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface CompletionResponse {
  content: string;
  error?: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface StreamChunk {
  content?: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  error?: string;
}

export interface AppSettings {
  defaultModels?: string[];
}