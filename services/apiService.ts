import { ApiConfig, CompletionResponse, ChatMessage, StreamChunk } from '../types';

export const ApiService = {
  generate: async (
    config: ApiConfig,
    model: string,
    messages: ChatMessage[]
  ): Promise<CompletionResponse> => {
    // API Key is no longer strictly required (e.g. for Ollama)
    
    try {
      let url = config.baseUrl;
      if (url.endsWith('/')) {
        url = url.slice(0, -1);
      }
      
      // Basic check for OpenAI-compatible path
      if (!url.endsWith('/chat/completions')) {
        url = `${url}/chat/completions`;
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };

      if (config.apiKey) {
        headers['Authorization'] = `Bearer ${config.apiKey}`;
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({
          model: model, // Use specific selected model
          messages: messages,
          temperature: 0.7,
        })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData?.error?.message || `HTTP Error ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '';
      const usage = data.usage;

      return {
        content,
        usage
      };

    } catch (error: any) {
      console.error("API Call Failed", error);
      return {
        content: '',
        error: error.message || 'Unknown error occurred during API call.'
      };
    }
  },

  generateStream: async function* (
    config: ApiConfig,
    model: string,
    messages: ChatMessage[]
  ): AsyncGenerator<StreamChunk, void, unknown> {
    try {
      let url = config.baseUrl;
      if (url.endsWith('/')) url = url.slice(0, -1);
      if (!url.endsWith('/chat/completions')) url = `${url}/chat/completions`;

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (config.apiKey) headers['Authorization'] = `Bearer ${config.apiKey}`;

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model,
          messages,
          temperature: 0.7,
          stream: true
        })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData?.error?.message || `HTTP Error ${response.status}`);
      }

      if (!response.body) throw new Error('No response body');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        
        // Keep the last line in buffer if it's incomplete
        buffer = lines.pop() || ''; 

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed === 'data: [DONE]') continue;
          if (trimmed.startsWith('data: ')) {
            try {
              const json = JSON.parse(trimmed.slice(6));
              const content = json.choices?.[0]?.delta?.content || '';
              // Some providers send usage in a separate chunk or with null choices
              const usage = json.usage;
              
              yield { content, usage };
            } catch (e) {
              // Ignore parse errors for malformed chunks
            }
          }
        }
      }
    } catch (e: any) {
      yield { error: e.message || 'Stream error' };
    }
  },

  fetchModels: async (config: ApiConfig): Promise<{ success: boolean; models?: string[]; error?: string }> => {
    try {
      let url = config.baseUrl;
      if (url.endsWith('/')) url = url.slice(0, -1);
      
      // Attempt to determine models endpoint
      // If user provided full chat path, strip it
      let modelsUrl = url;
      if (modelsUrl.endsWith('/chat/completions')) {
        modelsUrl = modelsUrl.replace('/chat/completions', '/models');
      } else {
        // Assume base path (e.g. .../v1) -> .../v1/models
        modelsUrl = `${modelsUrl}/models`;
      }

      const headers: Record<string, string> = {
         'Content-Type': 'application/json'
      };
      if (config.apiKey) headers['Authorization'] = `Bearer ${config.apiKey}`;

      const response = await fetch(modelsUrl, { method: 'GET', headers });
      
      if (!response.ok) {
        throw new Error(`HTTP Error ${response.status}`);
      }
      
      const data = await response.json();
      let models: string[] = [];

      // OpenAI format: { data: [{ id: "gpt-4" }] }
      if (Array.isArray(data.data)) {
        models = data.data.map((m: any) => m.id);
      } 
      // Ollama format: { models: [{ name: "llama2" }] }
      else if (Array.isArray(data.models)) {
        models = data.models.map((m: any) => m.name);
      }
      else {
        throw new Error("Unrecognized response format");
      }

      return { success: true, models: models.sort() };
    } catch (e: any) {
      console.error(e);
      return { success: false, error: e.message };
    }
  },

  testConnection: async (config: ApiConfig): Promise<{ success: boolean; message: string }> => {
    // Validation: Only require models to be configured
    if (config.models.length === 0) return { success: false, message: 'No models configured' };

    try {
      // Try with the first model in the list
      const modelToTest = config.models[0];
      const result = await ApiService.generate(config, modelToTest, [
        { role: 'user', content: 'Hi' }
      ]);
      
      if (result.error) {
        return { success: false, message: result.error };
      }
      return { success: true, message: 'Connected' };
    } catch (e: any) {
      return { success: false, message: e.message || 'Connection failed' };
    }
  }
};