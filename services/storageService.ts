import { ApiConfig, SavedPrompt, AppSettings } from '../types';
import { DEFAULT_SETTINGS } from '../constants';

const KEYS = {
  PROMPTS: 'ps_prompts',
  PROVIDERS: 'ps_settings', 
  ACTIVE_PROVIDER: 'ps_active_setting_id',
  ACTIVE_MODEL: 'ps_active_model_id',
  THEME: 'ps_theme',
  APP_SETTINGS: 'ps_app_settings'
};

// Legacy keys for migration
const LEGACY_KEYS = {
  PROMPTS: 'pf_prompts',
  PROVIDERS: 'pf_settings',
  ACTIVE_PROVIDER: 'pf_active_setting_id',
  ACTIVE_MODEL: 'pf_active_model_id',
  THEME: 'pf_theme',
  APP_SETTINGS: 'pf_app_settings'
};

const DEFAULT_APP_SETTINGS: AppSettings = {
};

// Migration helper
const migrateData = () => {
  if (typeof window === 'undefined') return;
  
  // Check if we have legacy data but no new data
  const hasLegacyPrompts = !!localStorage.getItem(LEGACY_KEYS.PROMPTS);
  const hasNewPrompts = !!localStorage.getItem(KEYS.PROMPTS);
  
  if (hasLegacyPrompts && !hasNewPrompts) {
    console.log('Migrating storage from pf_ to ps_ prefix...');
    
    const keysToMigrate = [
      { old: LEGACY_KEYS.PROMPTS, new: KEYS.PROMPTS },
      { old: LEGACY_KEYS.PROVIDERS, new: KEYS.PROVIDERS },
      { old: LEGACY_KEYS.ACTIVE_PROVIDER, new: KEYS.ACTIVE_PROVIDER },
      { old: LEGACY_KEYS.ACTIVE_MODEL, new: KEYS.ACTIVE_MODEL },
      { old: LEGACY_KEYS.THEME, new: KEYS.THEME },
      { old: LEGACY_KEYS.APP_SETTINGS, new: KEYS.APP_SETTINGS },
    ];

    keysToMigrate.forEach(({ old, new: newKey }) => {
      const value = localStorage.getItem(old);
      if (value !== null) {
        localStorage.setItem(newKey, value);
        // Optional: Remove old key? 
        // Keeping it for safety for now, or remove to ensure clean state?
        // Let's remove it to avoid confusion or double migration
        localStorage.removeItem(old);
      }
    });
  }
};

// Run migration immediately
migrateData();

export const StorageService = {
  // --- Prompts ---
  getPrompts: (): SavedPrompt[] => {
    try {
      const data = localStorage.getItem(KEYS.PROMPTS);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('Failed to load prompts', e);
      return [];
    }
  },

  savePrompt: (prompt: SavedPrompt): void => {
    const prompts = StorageService.getPrompts();
    const index = prompts.findIndex(p => p.id === prompt.id);
    if (index >= 0) {
      prompts[index] = prompt;
    } else {
      prompts.unshift(prompt);
    }
    localStorage.setItem(KEYS.PROMPTS, JSON.stringify(prompts));
  },

  deletePrompt: (id: string): void => {
    const prompts = StorageService.getPrompts().filter(p => p.id !== id);
    localStorage.setItem(KEYS.PROMPTS, JSON.stringify(prompts));
  },

  getPromptById: (id: string): SavedPrompt | undefined => {
    return StorageService.getPrompts().find(p => p.id === id);
  },

  // --- Providers (Previously Configs) ---
  getConfigs: (): ApiConfig[] => {
    try {
      const data = localStorage.getItem(KEYS.PROVIDERS);
      if (!data) return [DEFAULT_SETTINGS];
      const parsed = JSON.parse(data);
      return parsed.map((c: any) => ({
        ...c,
        models: Array.isArray(c.models) ? c.models : (c.model ? [c.model] : ['gpt-4o'])
      }));
    } catch (e) {
      return [DEFAULT_SETTINGS];
    }
  },

  saveConfigs: (configs: ApiConfig[]): void => {
    localStorage.setItem(KEYS.PROVIDERS, JSON.stringify(configs));
  },

  getActiveConfigId: (): string => {
    return localStorage.getItem(KEYS.ACTIVE_PROVIDER) || 'default';
  },

  setActiveConfigId: (id: string): void => {
    localStorage.setItem(KEYS.ACTIVE_PROVIDER, id);
  },
  
  getActiveModel: (): string => {
    return localStorage.getItem(KEYS.ACTIVE_MODEL) || '';
  },

  setActiveModel: (model: string): void => {
    localStorage.setItem(KEYS.ACTIVE_MODEL, model);
  },

  // --- App Settings ---
  getAppSettings: (): AppSettings => {
    try {
      const data = localStorage.getItem(KEYS.APP_SETTINGS);
      return data ? { ...DEFAULT_APP_SETTINGS, ...JSON.parse(data) } : DEFAULT_APP_SETTINGS;
    } catch {
      return DEFAULT_APP_SETTINGS;
    }
  },

  saveAppSettings: (settings: AppSettings): void => {
    localStorage.setItem(KEYS.APP_SETTINGS, JSON.stringify(settings));
  },
  
  // --- Theme ---
  getTheme: (): 'light' | 'dark' => {
    return (localStorage.getItem(KEYS.THEME) as 'light' | 'dark') || 'dark';
  },
  
  saveTheme: (theme: 'light' | 'dark'): void => {
    localStorage.setItem(KEYS.THEME, theme);
  },

  // --- Import / Export ---
  exportData: (): string => {
    const data = {
      version: 1,
      prompts: StorageService.getPrompts(),
      providers: StorageService.getConfigs(),
      appSettings: StorageService.getAppSettings(),
      timestamp: Date.now()
    };
    return JSON.stringify(data, null, 2);
  },

  importData: (jsonString: string): { success: boolean; message: string } => {
    try {
      const data = JSON.parse(jsonString);
      if (!data.version || !data.prompts || !data.providers) {
        return { success: false, message: 'Invalid file format' };
      }

      // Merge Prompts (Overwrite if ID exists, else add)
      const currentPrompts = StorageService.getPrompts();
      const newPrompts = data.prompts as SavedPrompt[];
      const promptMap = new Map(currentPrompts.map(p => [p.id, p]));
      
      newPrompts.forEach(p => promptMap.set(p.id, p));
      const mergedPrompts = Array.from(promptMap.values()).sort((a, b) => b.updatedAt - a.updatedAt);
      
      localStorage.setItem(KEYS.PROMPTS, JSON.stringify(mergedPrompts));
      localStorage.setItem(KEYS.PROVIDERS, JSON.stringify(data.providers));
      
      if (data.appSettings) {
        localStorage.setItem(KEYS.APP_SETTINGS, JSON.stringify(data.appSettings));
      }

      return { success: true, message: `Imported ${newPrompts.length} prompts and configurations.` };
    } catch (e: any) {
      return { success: false, message: e.message || 'Failed to parse JSON' };
    }
  }
};