import React, { useState, useEffect } from 'react';
import { StorageService } from '../services/storageService';
import { ApiService } from '../services/apiService';
import { ApiConfig } from '../types';
import { Icons } from '../constants';
import { useToast, ConfirmModal } from '../components/Feedback';

type TestStatus = 'idle' | 'loading' | 'success' | 'error';

interface TestResult {
  status: TestStatus;
  message: string;
}

const ProvidersView: React.FC = () => {
  const [configs, setConfigs] = useState<ApiConfig[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ApiConfig>({
    id: '', name: '', baseUrl: '', apiKey: '', models: []
  });
  const [newModelName, setNewModelName] = useState('');
  
  const [testResults, setTestResults] = useState<Record<string, TestResult>>({});
  const [isGlobalTesting, setIsGlobalTesting] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  
  // Model Fetching State
  const [isFetchingModels, setIsFetchingModels] = useState(false);
  const [fetchedModels, setFetchedModels] = useState<string[]>([]);
  
  // API Key Visibility
  const [showApiKey, setShowApiKey] = useState(false);

  const { showToast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    const loaded = StorageService.getConfigs();
    setConfigs(loaded);
  };

  const handleSave = () => {
    // API Key is optional (e.g. for Ollama)
    if (!form.name || !form.baseUrl || form.models.length === 0) {
      showToast('Name, Base URL, and at least one model are required.', 'error');
      return;
    }

    let newConfigs = [...configs];
    const existingIndex = newConfigs.findIndex(c => c.id === form.id);

    if (existingIndex >= 0) {
      newConfigs[existingIndex] = form;
    } else {
      newConfigs.push({ ...form, id: crypto.randomUUID() });
    }

    StorageService.saveConfigs(newConfigs);
    setConfigs(newConfigs);
    setEditingId(null);
    setFetchedModels([]);
    showToast('Provider configuration saved.', 'success');
    
    setTestResults(prev => {
      const next = { ...prev };
      delete next[form.id];
      return next;
    });
  };

  const confirmDelete = () => {
    if (deleteId) {
      const newConfigs = configs.filter(c => c.id !== deleteId);
      StorageService.saveConfigs(newConfigs);
      setConfigs(newConfigs);
      setDeleteId(null);
      showToast("Provider deleted", "success");
    }
  };

  // Helper to fetch models for a given config object (separate from form state)
  const fetchModelsForConfig = async (config: ApiConfig) => {
      if (!config.baseUrl) return;
      setIsFetchingModels(true);
      setFetchedModels([]); // Clear previous
      
      const result = await ApiService.fetchModels(config);
      
      setIsFetchingModels(false);
      
      if (result.success && result.models) {
        setFetchedModels(result.models);
      } 
      // Silently fail or log if auto-fetch fails during open, user can retry manually
  };

  const startEdit = (config: ApiConfig) => {
    setForm({ ...config });
    setEditingId(config.id);
    setFetchedModels([]);
    setNewModelName('');
    setShowApiKey(false);
    
    // Auto-fetch models
    fetchModelsForConfig(config);
  };

  const startNew = () => {
    const defaultModels = StorageService.getAppSettings().defaultModels;
    setForm({
      id: crypto.randomUUID(),
      name: 'New Provider',
      baseUrl: 'https://api.openai.com/v1',
      apiKey: '',
      models: defaultModels || []
    });
    setEditingId('new');
    setFetchedModels([]);
    setNewModelName('');
    setShowApiKey(false);
  };

  const addModel = (modelName: string) => {
    const name = modelName.trim();
    if(name && !form.models.includes(name)) {
      setForm(prev => ({
        ...prev,
        models: [...prev.models, name]
      }));
    }
    setNewModelName('');
  };

  const removeModel = (modelToRemove: string) => {
    setForm(prev => ({
      ...prev,
      models: prev.models.filter(m => m !== modelToRemove)
    }));
  };

  const handleFetchModels = async () => {
    if (!form.baseUrl) {
      showToast('Please enter a Base URL first', 'error');
      return;
    }
    
    setIsFetchingModels(true);
    setFetchedModels([]);
    
    const result = await ApiService.fetchModels(form);
    
    setIsFetchingModels(false);
    
    if (result.success && result.models) {
      setFetchedModels(result.models);
      showToast(`Found ${result.models.length} models`, 'success');
    } else {
      showToast(`Failed to fetch: ${result.error}`, 'error');
    }
  };

  const runTest = async (config: ApiConfig) => {
    setTestResults(prev => ({ ...prev, [config.id]: { status: 'loading', message: 'Testing...' } }));
    const result = await ApiService.testConnection(config);
    setTestResults(prev => ({ 
      ...prev, 
      [config.id]: { 
        status: result.success ? 'success' : 'error', 
        message: result.message 
      } 
    }));
  };

  const handleTestAll = async () => {
    setIsGlobalTesting(true);
    const promises = configs.map(async (config) => {
      await runTest(config);
    });
    await Promise.all(promises);
    setIsGlobalTesting(false);
  };
  
  const getComputedUrl = (baseUrl: string) => {
    if (!baseUrl) return '';
    let url = baseUrl.trim();
    if (url.endsWith('/')) url = url.slice(0, -1);
    if (!url.endsWith('/chat/completions')) {
      url = `${url}/chat/completions`;
    }
    return url;
  };
  
  const copyApiKey = () => {
    navigator.clipboard.writeText(form.apiKey);
    showToast('API Key copied', 'success');
  };

  // Filter available models based on input and exclusion of already selected models
  const filteredAvailableModels = fetchedModels
    .filter(m => !form.models.includes(m))
    .filter(m => m.toLowerCase().includes(newModelName.toLowerCase()));

  return (
    <div className="p-8 max-w-4xl mx-auto h-full overflow-y-auto bg-gray-50 dark:bg-[#000000] transition-colors duration-200">
      <ConfirmModal 
        isOpen={!!deleteId}
        title="Delete Provider"
        message="Are you sure you want to remove this provider configuration? This cannot be undone."
        confirmText="Delete"
        isDestructive={true}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteId(null)}
      />

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-8 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Providers</h2>
          <p className="text-sm text-gray-500 mt-1">Configure API connections and models</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
            <button 
            onClick={handleTestAll}
            disabled={isGlobalTesting}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-white/5 hover:bg-gray-200 dark:hover:bg-white/10 px-4 py-2 rounded-lg text-sm font-semibold transition"
          >
            <Icons.Activity />
            {isGlobalTesting ? 'Testing...' : 'Test All'}
          </button>
          <button 
            onClick={startNew}
            className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-semibold transition shadow-lg shadow-blue-500/20"
          >
            + Add Provider
          </button>
        </div>
      </div>

      {/* Edit Modal Overlay */}
      {editingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
           <div className="bg-white dark:bg-[#1c1c1e] w-full max-w-2xl rounded-2xl shadow-2xl max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200 border border-gray-200 dark:border-white/10">
              <div className="flex justify-between items-center p-6 border-b border-gray-100 dark:border-white/5 flex-shrink-0">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{editingId === 'new' ? 'New Configuration' : 'Edit Configuration'}</h3>
                <button onClick={() => setEditingId(null)} className="text-gray-500 hover:text-gray-900 dark:hover:text-white transition">✕</button>
              </div>

              <div className="p-6 overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-500 mb-1.5 ml-1">Name</label>
                    <input 
                      type="text" 
                      value={form.name} 
                      onChange={e => setForm({...form, name: e.target.value})}
                      className="w-full bg-gray-50 dark:bg-[#2c2c2e] border border-transparent focus:border-blue-500/50 rounded-xl px-4 py-2.5 text-sm text-gray-900 dark:text-white focus:outline-none transition-all placeholder:text-gray-400 dark:placeholder:text-gray-600"
                      placeholder="e.g., OpenAI Production"
                    />
                  </div>
                  <div>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-500 mb-1.5 ml-1">API Key <span className="text-gray-400 dark:text-gray-600 font-normal">(Optional)</span></label>
                      <div className="relative">
                        <input 
                          type={showApiKey ? "text" : "password"}
                          value={form.apiKey} 
                          onChange={e => setForm({...form, apiKey: e.target.value})}
                          className="w-full bg-gray-50 dark:bg-[#2c2c2e] border border-transparent focus:border-blue-500/50 rounded-xl pl-4 pr-16 py-2.5 text-sm text-gray-900 dark:text-white focus:outline-none transition-all placeholder:text-gray-400 dark:placeholder:text-gray-600 font-mono"
                          placeholder="sk-..."
                        />
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                           <button 
                             onClick={() => setShowApiKey(!showApiKey)}
                             className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors rounded-lg"
                             title={showApiKey ? "Hide API Key" : "Show API Key"}
                           >
                             {showApiKey ? <Icons.EyeOff /> : <Icons.Eye />}
                           </button>
                           <button 
                             onClick={copyApiKey}
                             className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors rounded-lg"
                             title="Copy API Key"
                           >
                             <Icons.Copy />
                           </button>
                        </div>
                      </div>
                  </div>
                </div>

                <div className="mb-5">
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-500 mb-1.5 ml-1">Base URL</label>
                  <input 
                    type="text" 
                    value={form.baseUrl} 
                    onChange={e => setForm({...form, baseUrl: e.target.value})}
                    className="w-full bg-gray-50 dark:bg-[#2c2c2e] border border-transparent focus:border-blue-500/50 rounded-xl px-4 py-2.5 text-sm text-gray-900 dark:text-white focus:outline-none transition-all placeholder:text-gray-400 dark:placeholder:text-gray-600 font-mono"
                    placeholder="https://api.openai.com/v1"
                  />
                  {form.baseUrl && (
                    <div className="mt-2 ml-1 text-xs font-mono text-gray-400 dark:text-gray-500 break-all">
                      <span className="font-semibold text-gray-500 dark:text-gray-400">Request URL: </span>
                      {getComputedUrl(form.baseUrl)}
                    </div>
                  )}
                </div>

                <div className="mb-2">
                  <div className="flex justify-between items-end mb-2">
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-500 ml-1">Models</label>
                    <button 
                      onClick={handleFetchModels}
                      disabled={isFetchingModels || !form.baseUrl}
                      className="text-xs bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 px-2 py-1 rounded hover:bg-blue-100 dark:hover:bg-blue-500/20 transition disabled:opacity-50 flex items-center gap-1"
                    >
                      {isFetchingModels ? (
                        <span className="animate-spin w-3 h-3 border-2 border-current border-t-transparent rounded-full"/>
                      ) : (
                        <Icons.Refresh />
                      )}
                      Refresh Models
                    </button>
                  </div>

                  <div className="bg-gray-50 dark:bg-[#2c2c2e] border border-transparent rounded-xl p-3 mb-2 flex flex-wrap gap-2 min-h-[3rem]">
                      {form.models.map(m => (
                        <span key={m} className="inline-flex items-center gap-1 bg-white dark:bg-[#1c1c1e] text-gray-800 dark:text-gray-200 text-xs px-2 py-1 rounded-md shadow-sm border border-gray-200 dark:border-white/10">
                          {m}
                          <button onClick={() => removeModel(m)} className="text-gray-400 hover:text-red-500"><Icons.X /></button>
                        </span>
                      ))}
                      {form.models.length === 0 && <span className="text-xs text-gray-400 italic p-1">No models added</span>}
                  </div>
                  
                  <div className="flex gap-2">
                      <input 
                        type="text" 
                        value={newModelName}
                        onChange={e => setNewModelName(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && addModel(newModelName)}
                        className="flex-1 bg-gray-50 dark:bg-[#2c2c2e] border border-transparent focus:border-blue-500/50 rounded-xl px-4 py-2 text-sm text-gray-900 dark:text-white focus:outline-none"
                        placeholder="Add model ID manually..."
                      />
                      <button onClick={() => addModel(newModelName)} className="bg-gray-200 dark:bg-[#3a3a3c] hover:bg-gray-300 dark:hover:bg-[#4a4a4c] text-gray-800 dark:text-white px-3 py-2 rounded-xl transition-colors">
                        <Icons.Plus />
                      </button>
                  </div>
                  
                  {/* Filtered Available Models Suggestions */}
                  {filteredAvailableModels.length > 0 && (
                     <div className="mt-3 p-3 bg-gray-50 dark:bg-[#2c2c2e] rounded-xl border border-gray-100 dark:border-white/5 animate-in fade-in slide-in-from-top-2">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-xs font-medium text-gray-600 dark:text-gray-300">Available Models ({filteredAvailableModels.length})</span>
                        </div>
                        <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                           {filteredAvailableModels.slice(0, 50).map(m => (
                             <button
                               key={m}
                               onClick={() => addModel(m)}
                               className="text-[10px] px-2 py-1 rounded-md border transition-colors bg-white dark:bg-[#1c1c1e] border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 hover:border-blue-300 dark:hover:border-blue-500/50"
                             >
                               {m}
                             </button>
                           ))}
                           {filteredAvailableModels.length > 50 && (
                             <span className="text-[10px] px-2 py-1 text-gray-400 italic">...and {filteredAvailableModels.length - 50} more</span>
                           )}
                        </div>
                     </div>
                  )}
                </div>
              </div>

              <div className="p-6 border-t border-gray-100 dark:border-white/5 flex gap-3 flex-shrink-0 justify-end bg-gray-50/50 dark:bg-white/[0.02]">
                  <button onClick={() => setEditingId(null)} className="bg-transparent hover:bg-gray-200 dark:hover:bg-white/10 text-gray-600 dark:text-gray-300 px-5 py-2.5 rounded-xl text-sm font-medium transition-colors">Cancel</button>
                  <button onClick={handleSave} className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2.5 rounded-xl text-sm font-semibold shadow-lg shadow-blue-900/20 transition-all active:scale-95">Save Config</button>
              </div>
           </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4">
        {configs.map(config => {
          const result = testResults[config.id];
          return (
            <div 
              key={config.id}
              className={`relative bg-white dark:bg-[#1c1c1e] border rounded-2xl p-5 transition-all duration-200 ${
                result?.status === 'success' 
                  ? 'border-green-200 dark:border-green-500/20' 
                  : result?.status === 'error'
                    ? 'border-red-200 dark:border-red-500/20'
                    : 'border-gray-200 dark:border-white/5'
              }`}
            >
              <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-gray-900 dark:text-white text-lg truncate">{config.name}</h3>
                    {result?.status === 'loading' && <span className="animate-spin text-blue-500"><Icons.Activity /></span>}
                    {result?.status === 'success' && <span className="text-green-500" title="Connected"><Icons.CheckCircle /></span>}
                    {result?.status === 'error' && <span className="text-red-500" title="Connection Failed"><Icons.AlertCircle /></span>}
                  </div>
                  <div className="text-xs text-gray-500 font-mono mb-3 truncate">{new URL(config.baseUrl).hostname}</div>
                  
                  <div className="flex flex-wrap gap-2 mb-2">
                    {config.models.map(m => (
                      <span key={m} className="bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-300 text-xs px-2 py-1 rounded border border-gray-200 dark:border-white/5">
                        {m}
                      </span>
                    ))}
                  </div>
                  
                  {result?.status === 'error' && (
                    <div className="mt-2 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 px-3 py-2 rounded-lg break-words">
                      Error: {result.message}
                    </div>
                  )}

                  {result?.status === 'success' && (
                    <div className="mt-2 text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-500/10 px-3 py-2 rounded-lg break-words">
                      {result.message}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-shrink-0 self-start">
                   <button 
                    onClick={() => runTest(config)}
                    disabled={result?.status === 'loading'}
                    className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition-colors"
                    title="Test Connection"
                  >
                    <Icons.Refresh />
                  </button>
                  <button 
                    onClick={() => startEdit(config)}
                    className="p-2 text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors"
                    title="Edit"
                  >
                    <Icons.Edit />
                  </button>
                  <button 
                    onClick={() => setDeleteId(config.id)}
                    className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                    title="Delete"
                  >
                    <Icons.Trash />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ProvidersView;