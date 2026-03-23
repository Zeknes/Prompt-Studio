
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
  images?: ImageAttachment[];
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

export interface ImageAttachment {
  id: string;
  base64: string;
  mimeType: string;
  originalSize: number;
  compressedSize: number;
  width: number;
  height: number;
}

export type MessageContent =
  | string
  | Array<
      | { type: 'text'; text: string }
      | { type: 'image_url'; image_url: { url: string } }
    >;

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: MessageContent;
}