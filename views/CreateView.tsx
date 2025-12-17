import React, { useState, useEffect, useMemo, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { StorageService } from '../services/storageService';
import { ApiService } from '../services/apiService';
import { TokenService } from '../services/tokenService';
import { SavedPrompt, ApiConfig, AppSettings } from '../types';
import { Icons } from '../constants';
import { useToast, ConfirmModal } from '../components/Feedback';

interface DebugViewProps {
  initialPrompt?: SavedPrompt | null;
  onClearInitial: () => void;
  isVisible: boolean;
}

const CreateView: React.FC<DebugViewProps> = ({ initialPrompt, onClearInitial, isVisible }) => {
  // State
  const [systemPrompt, setSystemPrompt] = useState('');
  const [userPrompt, setUserPrompt] = useState('');
  const [variables, setVariables] = useState<Record<string, string>>({});
  const [output, setOutput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usage, setUsage] = useState<any>(null);
  
  // Output View Mode
  const [viewMode, setViewMode] = useState<'preview' | 'raw'>('preview');
  
  // UI State
  // Initialize based on screen width: Open on desktop, Closed on mobile
  const [isVariablesPanelOpen, setIsVariablesPanelOpen] = useState(() => 
    typeof window !== 'undefined' ? window.innerWidth >= 768 : true
  );
  
  // Prevent transition animation on initial render
  const [isTransitionEnabled, setIsTransitionEnabled] = useState(false);

  const { showToast } = useToast();

  // Config & App Settings
  const [configs, setConfigs] = useState<ApiConfig[]>([]);
  const [selectedModelKey, setSelectedModelKey] = useState<string>('');

  // Token Counts
  const [tokenCounts, setTokenCounts] = useState({
    sysRaw: 0, sysResolved: 0,
    userRaw: 0, userResolved: 0
  });

  // Save Modal
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveTitle, setSaveTitle] = useState('');
  const [saveDesc, setSaveDesc] = useState('');
  const [pendingSave, setPendingSave] = useState<{title: string, desc: string} | null>(null);
  const [showDuplicateTitleModal, setShowDuplicateTitleModal] = useState(false);
  const [currentId, setCurrentId] = useState<string | null>(null);

  // Export Modal
  const [showExportModal, setShowExportModal] = useState(false);
  const [includeCredentials, setIncludeCredentials] = useState(false);
  const [exportedCode, setExportedCode] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);
  
  // Overwrite Confirmation
  const [showOverwriteModal, setShowOverwriteModal] = useState(false);
  const [pendingPrompt, setPendingPrompt] = useState<SavedPrompt | null>(null);

  // Output Ref for auto-scroll
  const outputEndRef = useRef<HTMLDivElement>(null);

  // Enable transitions after mount
  useEffect(() => {
    const timer = setTimeout(() => setIsTransitionEnabled(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // Initialize Configs & Reload when visible
  useEffect(() => {
    if (isVisible) {
      const loadedConfigs = StorageService.getConfigs();
      setConfigs(loadedConfigs);
      
      // Try to load last used model, or ensure current selection is valid
      const savedModelKey = StorageService.getActiveModel();
      
      // If we already have a selection that is valid in the new configs, keep it
      // Otherwise fallback to saved or default
      if (!selectedModelKey || !isValidModelKey(selectedModelKey, loadedConfigs)) {
          if (savedModelKey && isValidModelKey(savedModelKey, loadedConfigs)) {
            setSelectedModelKey(savedModelKey);
          } else {
            // Fallback: Pick the first available model from the first config
            if (loadedConfigs.length > 0 && loadedConfigs[0].models.length > 0) {
              const defaultKey = `${loadedConfigs[0].id}:${loadedConfigs[0].models[0]}`;
              setSelectedModelKey(defaultKey);
              StorageService.setActiveModel(defaultKey);
            }
          }
      }
    }
  }, [isVisible]);

  // Real-time Token Calculation
  useEffect(() => {
    const sysRes = TokenService.resolveVariables(systemPrompt, variables);
    const userRes = TokenService.resolveVariables(userPrompt, variables);

    setTokenCounts({
      sysRaw: TokenService.estimate(systemPrompt),
      sysResolved: TokenService.estimate(sysRes),
      userRaw: TokenService.estimate(userPrompt),
      userResolved: TokenService.estimate(userRes)
    });
  }, [systemPrompt, userPrompt, variables]);

  const isValidModelKey = (key: string, currentConfigs: ApiConfig[]) => {
    const [pid, mid] = key.split(':');
    const p = currentConfigs.find(c => c.id === pid);
    return p && p.models.includes(mid);
  }

  const handleModelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newKey = e.target.value;
    setSelectedModelKey(newKey);
    StorageService.setActiveModel(newKey);
  };

  // Initialize Prompt (Handle loading from Library)
  useEffect(() => {
    if (initialPrompt) {
      // Check if current editor has content that would be lost
      // Content is considered "unsaved" if it differs from what's currently loaded (currentId)
      // If currentId is null, any content is "unsaved" if not empty.
      
      const hasContent = systemPrompt.trim() !== '' || userPrompt.trim() !== '';
      
      // If we are editing a prompt (currentId is set), we need to check if content changed from saved state?
      // Actually, simplest check: if there is content and we are trying to load a DIFFERENT ID (or new one), warn.
      const isDifferentId = initialPrompt.id !== currentId;
      
      // But wait, if I am editing prompt A, and I click prompt A again in library, nothing should happen or just reload.
      // If I am editing prompt A, and click prompt B, and prompt A has unsaved changes... 
      // Current logic doesn't track "dirty" state perfectly, it just checks if there is content.
      // If I just saved prompt A, hasContent is true. Loading prompt B would trigger warning? 
      // Yes, currently it triggers warning even if I just saved. Ideally we should track `isDirty`.
      // But for now, let's stick to the requested logic: "If create page content is not empty... remind".
      // But if I just saved, it shouldn't warn.
      // Let's assume if I just saved, I might not want to lose it? No, if it's saved, it's safe.
      
      // Let's check if the current content matches the prompt in storage?
      // That's expensive.
      // Let's rely on a simplistic heuristic: 
      // If we have content, and it's a different ID, warn.
      // The user complaint implies the warning might NOT be showing up or showing up incorrectly.
      // "If create page content is not empty... remind whether to overwrite or save first"
      
      if (hasContent && isDifferentId) {
        setPendingPrompt(initialPrompt);
        setShowOverwriteModal(true);
      } else if (hasContent && !isDifferentId) {
         // Case: User clicked on the SAME prompt in library that they are currently editing.
         // In this case, maybe they want to revert changes?
         // If I am editing prompt A, and I changed it (unsaved), and I click prompt A in library...
         // Should I warn "You have unsaved changes, do you want to revert to saved version?"
         // Current behavior: It does NOTHING (else branch loadPrompt reloads it, effectively reverting without warning if we just call loadPrompt).
         // Actually, if !isDifferentId, it means initialPrompt.id === currentId.
         // If I have unsaved changes, calling loadPrompt will overwrite them with the saved version.
         // So we SHOULD warn here too if the content is different from what is in the library?
         // Comparing content is hard without deep check.
         // BUT, the user said: "Clicking library saved prompt to edit, still no warning".
         // This implies they might be in a state where they HAVE content (maybe a new unsaved prompt, or another prompt), and they click a library item.
         
         // Wait, if I am in "Create New" mode (currentId is null), and I type something.
         // Then I click a prompt in Library.
         // initialPrompt.id is "123". currentId is null. isDifferentId is true.
         // hasContent is true.
         // So it SHOULD warn.
         
         // What if I am editing prompt A (currentId="123"). I type garbage.
         // I click prompt B (id="456").
         // isDifferentId is true. hasContent is true.
         // It SHOULD warn.
         
         // What if I am editing prompt A (currentId="123"). I type garbage.
         // I click prompt A (id="123") again?
         // isDifferentId is false.
         // It goes to else -> loadPrompt. Reverts changes immediately.
         // User might want a warning here too? "You have unsaved changes..."
         
         // Let's check if the content in editor is different from the content in initialPrompt (which is the saved version).
         const contentChanged = 
            systemPrompt !== initialPrompt.systemPrompt || 
            userPrompt !== initialPrompt.userPrompt ||
            JSON.stringify(variables) !== JSON.stringify(initialPrompt.variables);
            
         if (contentChanged) {
             setPendingPrompt(initialPrompt);
             setShowOverwriteModal(true);
         } else {
             loadPrompt(initialPrompt);
         }
      } else {
        loadPrompt(initialPrompt);
      }
      onClearInitial();
    }
  }, [initialPrompt, onClearInitial, systemPrompt, userPrompt, currentId, variables]);

  const loadPrompt = (prompt: SavedPrompt) => {
    setSystemPrompt(prompt.systemPrompt);
    setUserPrompt(prompt.userPrompt);
    setVariables(prompt.variables);
    setCurrentId(prompt.id);
    setSaveTitle(prompt.title);
    setSaveDesc(prompt.description);
  };

  // Parse Variables
  const detectedVariables = useMemo(() => {
    const regex = /\{([^}]+)\}/g;
    const combined = systemPrompt + userPrompt;
    const found = new Set<string>();
    let match;
    while ((match = regex.exec(combined)) !== null) {
      found.add(match[1]);
    }
    return Array.from(found);
  }, [systemPrompt, userPrompt]);

  // Sync variables (Persistent Session)
  useEffect(() => {
    setVariables(prev => {
      // Keep existing variables (memory), only initialize new ones
      const next: Record<string, string> = { ...prev };
      detectedVariables.forEach(v => {
        if (next[v] === undefined) {
          next[v] = '';
        }
      });
      return next;
    });
  }, [detectedVariables]);

  // Parse Output for <think> blocks (Streaming friendly)
  const parsedOutput = useMemo(() => {
    if (!output) return { thought: null, content: '' };
    
    // Strict check: Must start with <think> tag to be considered a thinking model
    if (!output.trimStart().startsWith('<think>')) {
       return { thought: null, content: output };
    }
    
    const thinkStart = 0;
    const thinkEnd = output.indexOf('</think>');
    
    if (thinkEnd === -1) {
      // Thinking is ongoing or incomplete
      // Assume everything after <think> is thought
      const thought = output.slice(7).trim(); // 7 is len of <think>
      return { thought, content: '' };
    }
    
    // Thinking block is closed
    const thought = output.slice(7, thinkEnd).trim();
    const content = output.slice(thinkEnd + 8).trim();
    
    return { thought, content };
  }, [output]);

  // Custom Pre component for Code Blocks
  const PreBlock = ({ children, ...props }: any) => {
    const [wrapped, setWrapped] = useState(false);
    const [copied, setCopied] = useState(false);

    // Extract code content
    let codeContent = '';
    let isJson = false;
    
    if (React.isValidElement(children)) {
        const childProps = (children.props as any);
        const className = childProps.className || '';
        if (className.includes('language-json')) {
            isJson = true;
        }
        if (Array.isArray(childProps.children)) {
            codeContent = childProps.children.join('');
        } else {
            codeContent = childProps.children?.toString() || '';
        }
    } else if (typeof children === 'string') {
        codeContent = children;
    }

    const handleCopy = () => {
        navigator.clipboard.writeText(codeContent);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };
    
    return (
        <div className="relative group/pre my-4 rounded-lg overflow-hidden border border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-[#1c1c1e]">
             {/* Sticky Toolbar */}
             <div className="sticky top-0 right-0 z-20 flex justify-end w-full h-0 overflow-visible pointer-events-none">
                 <div className="flex flex-col gap-1.5 p-2 opacity-0 group-hover/pre:opacity-100 transition-opacity duration-200 pointer-events-auto items-end">
                     <button 
                        onClick={handleCopy}
                        className="p-1.5 bg-white dark:bg-[#2c2c2e] hover:bg-gray-100 dark:hover:bg-[#3a3a3c] text-gray-500 dark:text-gray-400 rounded-md border border-gray-200 dark:border-white/10 shadow-sm transition-all flex items-center justify-center w-7 h-7"
                        title="Copy code"
                     >
                        {copied ? <Icons.Check /> : <Icons.Copy />}
                     </button>
                     
                     {isJson && (
                        <button 
                            onClick={() => setWrapped(!wrapped)}
                            className="px-2 py-1 h-7 text-[10px] bg-white dark:bg-[#2c2c2e] hover:bg-gray-100 dark:hover:bg-[#3a3a3c] text-gray-600 dark:text-gray-300 rounded-md font-sans font-medium border border-gray-200 dark:border-white/10 transition-colors shadow-sm whitespace-nowrap flex items-center justify-center"
                        >
                            {wrapped ? 'Scroll' : 'Wrap'}
                        </button>
                     )}
                 </div>
             </div>

             <pre 
                {...props} 
                className={`${props.className || ''} ${wrapped ? '!whitespace-pre-wrap !break-all' : '!overflow-x-auto'} relative p-4 !bg-transparent !m-0 !border-0`}
             >
                {children}
             </pre>
        </div>
    );
  };

  const handleRun = async () => {
    if (!systemPrompt.trim() && !userPrompt.trim()) {
      showToast("Please enter a system or user prompt", "error");
      return;
    }

    setIsLoading(true);
    setError(null);
    setOutput('');
    setUsage(null);

    const [providerId, modelName] = selectedModelKey.split(':');
    const config = configs.find(c => c.id === providerId);
    
    if (!config) {
      setError("No provider selected");
      setIsLoading(false);
      return;
    }

    const finalSystem = TokenService.resolveVariables(systemPrompt, variables);
    const finalUser = TokenService.resolveVariables(userPrompt, variables);
    const messages = [
        { role: 'system' as const, content: finalSystem },
        { role: 'user' as const, content: finalUser }
    ];

    try {
      // Streaming implementation
      const stream = ApiService.generateStream(config, modelName, messages);
      let fullContent = '';
      
      for await (const chunk of stream) {
        if (chunk.error) {
          setError(chunk.error);
          break;
        }
        
        if (chunk.content) {
          fullContent += chunk.content;
          setOutput(fullContent);
        }
        
        if (chunk.usage) {
          setUsage(chunk.usage);
        }
      }

    } catch (err: any) {
      setError(err.message);
      showToast("Error connecting to API", "error");
    } finally {
      setIsLoading(false);
      // Optional: scroll to bottom on finish
      setTimeout(() => outputEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Only allow Ctrl+Enter (Windows/Linux) or Cmd+Enter (Mac)
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleRun();
    }
  };

  const handleSave = () => {
    if (!saveTitle.trim()) {
      showToast("Please enter a title", "error");
      return;
    }

    // Check for duplicate title
    const allPrompts = StorageService.getPrompts();
    const existing = allPrompts.find(p => p.title.toLowerCase() === saveTitle.trim().toLowerCase());
    
    // If exists and ID is different (meaning we are creating new or saving as new on top of someone else), warn.
    // Or if currentId is null (new prompt) and title exists.
    if (existing) {
       setPendingSave({ title: saveTitle, desc: saveDesc });
       setShowDuplicateTitleModal(true);
       return;
    }

    executeSave(null);
  };

  const executeSave = (idToUse: string | null) => {
    const finalId = idToUse || crypto.randomUUID();
    
    const newPrompt: SavedPrompt = {
      id: finalId,
      title: saveTitle,
      description: saveDesc,
      systemPrompt,
      userPrompt,
      variables,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    StorageService.savePrompt(newPrompt);
    setCurrentId(newPrompt.id);
    setShowSaveModal(false);
    setShowDuplicateTitleModal(false);
    setPendingSave(null);
    showToast("Prompt saved successfully", "success");
  };
  
  const handleConfirmOverwrite = () => {
    if (pendingSave) {
        // Find the existing prompt ID to overwrite
        const allPrompts = StorageService.getPrompts();
        const existing = allPrompts.find(p => p.title.toLowerCase() === pendingSave.title.trim().toLowerCase());
        if (existing) {
            executeSave(existing.id);
        } else {
            // Should not happen, but fallback to new
            executeSave(null);
        }
    }
  };
  
  const handleSaveAndLoad = () => {
      // Force save with current title or a default one if new
      const originalTitle = saveTitle;
      if (!saveTitle.trim()) {
          setSaveTitle(`Untitled ${new Date().toLocaleTimeString()}`);
      }
      
      // We need to execute save synchronously-ish
      // Reuse handleSave logic but modified for the modal context
      const titleToUse = saveTitle.trim() || `Untitled ${new Date().toLocaleTimeString()}`;
      
      const newPrompt: SavedPrompt = {
        id: currentId || crypto.randomUUID(),
        title: titleToUse,
        description: saveDesc,
        systemPrompt,
        userPrompt,
        variables,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      StorageService.savePrompt(newPrompt);
      showToast("Previous work saved", "success");
      
      // Then load
      if (pendingPrompt) loadPrompt(pendingPrompt);
      setShowOverwriteModal(false);
      setPendingPrompt(null);
  };

  const handleExport = () => {
    const [providerId, modelName] = selectedModelKey.split(':');
    const config = configs.find(c => c.id === providerId);
    
    const varsString = detectedVariables.map(v => `    "${v}": "${variables[v] || ''}"`).join(',\n');
    
    const code = `
import os
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate

# Configuration
${includeCredentials && config ? `api_key = "${config.apiKey}"` : `api_key = os.environ.get("OPENAI_API_KEY", "YOUR_API_KEY")`}
${includeCredentials && config ? `base_url = "${config.baseUrl}"` : `base_url = "https://api.openai.com/v1"`}
model_name = "${modelName || 'gpt-4o'}"

# Initialize LLM
llm = ChatOpenAI(
    model=model_name,
    api_key=api_key,
    base_url=base_url
)

# Define Prompt Template
prompt = ChatPromptTemplate.from_messages([
    ("system", """${systemPrompt.replace(/"/g, '\\"')}"""),
    ("user", """${userPrompt.replace(/"/g, '\\"')}""")
])

# Create Chain
chain = prompt | llm

# Execute
response = chain.invoke({
${varsString}
})

print(response.content)
`.trim();

    setExportedCode(code);
    setShowExportModal(true);
    setCopiedCode(false);
  };

  const handleDownloadCode = () => {
    const element = document.createElement("a");
    const file = new Blob([exportedCode], {type: 'text/x-python'});
    element.href = URL.createObjectURL(file);
    const fileName = saveTitle ? `${saveTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.py` : 'prompt_studio_export.py';
    element.download = fileName;
    document.body.appendChild(element); 
    element.click();
    document.body.removeChild(element);
    showToast("File downloaded", "success");
  };

  useEffect(() => {
    if (showExportModal) {
      handleExport();
    }
  }, [includeCredentials, showExportModal]);

  const handleCopyFullPrompt = () => {
    const finalSystem = TokenService.resolveVariables(systemPrompt, variables);
    const finalUser = TokenService.resolveVariables(userPrompt, variables);
    const fullPrompt = `${finalSystem}\n\n---\n\n${finalUser}`;
    
    navigator.clipboard.writeText(fullPrompt);
    showToast("Full prompt copied to clipboard", "success");
  };

  return (
    <div className="flex h-full relative">
      <ConfirmModal
        isOpen={showOverwriteModal}
        title="Unsaved Content"
        message="The editor contains unsaved changes. Do you want to overwrite it with the selected prompt?"
        confirmText="Overwrite"
        cancelText="Cancel"
        neutralText="Check Current"
        isDestructive={true}
        onConfirm={() => {
          if (pendingPrompt) loadPrompt(pendingPrompt);
          setShowOverwriteModal(false);
          setPendingPrompt(null);
        }}
        onCancel={() => {
          setShowOverwriteModal(false);
          setPendingPrompt(null);
          // Also clear initial prompt so we don't loop
          onClearInitial(); 
        }}
        onNeutral={() => {
          // Just close modal, let user see current content
          setShowOverwriteModal(false);
          setPendingPrompt(null);
          onClearInitial();
        }}
      />

      {/* Left Column: Editor & Output */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden transition-colors duration-200">
        <header className="flex-shrink-0 min-h-16 border-b border-gray-200 dark:border-white/5 flex flex-wrap gap-4 justify-between items-center px-6 py-3 bg-white/80 dark:bg-[#0a0a0a]/50 backdrop-blur-sm sticky top-0 z-10 transition-colors duration-200">
          
          {/* Config Selection */}
          <div className="flex items-center gap-3 max-w-full">
             <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-white/5 rounded-lg border border-transparent hover:border-gray-300 dark:hover:border-white/10 transition-all group relative w-64">
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${isLoading ? 'bg-yellow-400 animate-pulse' : 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]'}`}></span>
                <select 
                  value={selectedModelKey} 
                  onChange={handleModelChange}
                  className="bg-transparent border-none text-sm font-medium text-gray-700 dark:text-gray-200 focus:outline-none appearance-none pr-6 cursor-pointer w-full truncate"
                >
                  {configs.map(c => (
                    <optgroup key={c.id} label={c.name} className="text-black">
                      {c.models.map(m => (
                        <option key={`${c.id}:${m}`} value={`${c.id}:${m}`}>{m}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
                <div className="absolute right-2 pointer-events-none text-gray-500">
                  <Icons.ChevronDown />
                </div>
             </div>
          </div>

          <div className="flex gap-2 flex-shrink-0 ml-auto items-center">
            <button 
              onClick={() => {
                 setSaveTitle(currentId ? saveTitle : ''); 
                 setShowSaveModal(true);
              }}
              className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 border border-gray-200 dark:border-white/5 text-gray-700 dark:text-gray-200 rounded-lg text-xs font-medium transition-all active:scale-95"
            >
              <Icons.Save /> 
              <span className="hidden sm:inline">Save</span>
            </button>
            <button 
              onClick={() => {
                setIncludeCredentials(false);
                setShowExportModal(true);
              }}
              className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 border border-gray-200 dark:border-white/5 text-gray-700 dark:text-gray-200 rounded-lg text-xs font-medium transition-all active:scale-95"
            >
              <Icons.Code /> 
              <span className="hidden sm:inline">Export</span>
            </button>
            <div className="w-px h-6 bg-gray-200 dark:bg-white/10 mx-1"></div>
            <button
              onClick={() => setIsVariablesPanelOpen(!isVariablesPanelOpen)}
              className={`p-2 rounded-lg transition-colors relative text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/5 ${isVariablesPanelOpen ? 'bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-200' : ''}`}
              title={isVariablesPanelOpen ? "Close Variables Panel" : "Open Variables Panel"}
            >
              {isVariablesPanelOpen ? <Icons.PanelRightClose /> : <Icons.PanelRightOpen />}
              {detectedVariables.length > 0 && !isVariablesPanelOpen && (
                 <span className="absolute top-1 right-1 w-2 h-2 bg-blue-500 rounded-full"></span>
              )}
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth bg-gray-50 dark:bg-[#000000] [scrollbar-gutter:stable]">
          {/* System Prompt */}
          <div className="group">
            <div className="flex justify-between items-end mb-2">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide ml-1 transition-colors group-focus-within:text-blue-500">System Context</label>
              <div className="text-[10px] flex gap-2 text-gray-400 dark:text-gray-600 font-mono">
                <span title="Est. tokens (raw text)">Raw: {tokenCounts.sysRaw}</span>
                <span className="text-gray-300 dark:text-gray-700">|</span>
                <span title="Est. tokens (variables replaced)" className="text-blue-500 dark:text-blue-400">Res: {tokenCounts.sysResolved}</span>
              </div>
            </div>
            <div className="relative">
              <textarea
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="You are a helpful AI..."
                className="w-full min-h-[16rem] bg-white dark:bg-[#1c1c1e] border border-gray-200 dark:border-white/5 rounded-xl p-4 text-sm font-mono text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-colors shadow-sm resize-y placeholder:text-gray-400 dark:placeholder:text-gray-600"
              />
            </div>
          </div>

          {/* User Prompt */}
          <div className="group">
            <div className="flex justify-between items-end mb-2">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide ml-1 transition-colors group-focus-within:text-blue-500">User Prompt</label>
              <div className="text-[10px] flex gap-2 text-gray-400 dark:text-gray-600 font-mono">
                 <span title="Est. tokens (raw text)">Raw: {tokenCounts.userRaw}</span>
                 <span className="text-gray-300 dark:text-gray-700">|</span>
                 <span title="Est. tokens (variables replaced)" className="text-green-600 dark:text-green-400">Res: {tokenCounts.userResolved}</span>
              </div>
            </div>
            <div className="relative">
              <textarea
                value={userPrompt}
                onChange={(e) => setUserPrompt(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="What is the meaning of {life}?"
                className="w-full min-h-[8rem] bg-white dark:bg-[#1c1c1e] border border-gray-200 dark:border-white/5 rounded-xl p-4 text-sm font-mono text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-colors shadow-sm resize-y placeholder:text-gray-400 dark:placeholder:text-gray-600"
              />
            </div>
          </div>

          {/* Action */}
          <div className="flex justify-between pb-8 md:pb-0 items-center gap-4">
             <button
               onClick={handleCopyFullPrompt}
               className="flex items-center gap-2 text-xs font-medium text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
               title="Copy System + User Prompt"
             >
               <Icons.Copy />
               <span className="hidden sm:inline">Copy Full Prompt</span>
             </button>

             <div className="flex items-center gap-4">
               <span className="text-xs text-gray-400 dark:text-gray-500 hidden sm:inline-block">
                 Press Ctrl + Enter to run
               </span>
               <button
                onClick={handleRun}
                disabled={isLoading}
                className={`px-8 py-3 rounded-xl font-semibold text-sm transition-all shadow-lg active:scale-95 flex items-center gap-2 ${
                  isLoading 
                  ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed' 
                  : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/20'
                }`}
               >
                 {isLoading ? (
                   <span className="flex items-center gap-2">
                     <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                     Generating...
                   </span>
                 ) : (
                   <><Icons.Play /> Run Prompt</>
                 )}
               </button>
             </div>
          </div>

          {/* Output Area */}
          <div className="pt-2 pb-12 md:pb-2">
             {(output || error) && (
               <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                 <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-3 px-1 gap-2">
                    <div className="flex items-center gap-3">
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Model Response</label>
                      {usage && (
                        <span className="text-[10px] text-gray-500 bg-gray-200 dark:bg-white/5 px-2 py-1 rounded-full border border-transparent dark:border-white/5">
                          {usage.total_tokens} tokens
                        </span>
                      )}
                    </div>

                    {!error && (
                      <div className="flex items-center gap-2 bg-gray-100 dark:bg-white/5 p-1 rounded-lg">
                        <button
                          onClick={() => setViewMode('preview')}
                          className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                            viewMode === 'preview' 
                            ? 'bg-white dark:bg-[#2c2c2e] text-blue-600 dark:text-blue-400 shadow-sm' 
                            : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                          }`}
                        >
                          Preview
                        </button>
                        <button
                          onClick={() => setViewMode('raw')}
                          className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                            viewMode === 'raw' 
                            ? 'bg-white dark:bg-[#2c2c2e] text-blue-600 dark:text-blue-400 shadow-sm' 
                            : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                          }`}
                        >
                          Raw
                        </button>
                      </div>
                    )}
                 </div>
                 
                 {error && (
                   <div className="p-4 bg-red-50 border border-red-200 dark:bg-red-500/10 dark:border-red-500/20 rounded-xl text-red-600 dark:text-red-200 text-sm flex gap-3 items-start">
                     <svg className="w-5 h-5 flex-shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                     <div>{error}</div>
                   </div>
                 )}

                 {output && !error && (
                   <div className="relative group">
                      <div className="bg-white dark:bg-[#151516] border border-gray-200 dark:border-white/5 rounded-xl p-5 shadow-sm min-h-[4rem] relative">
                        <button 
                          onClick={() => {
                             navigator.clipboard.writeText(output);
                             showToast("Raw output copied", "success");
                          }}
                          className="absolute top-3 right-3 p-2 bg-gray-100/50 dark:bg-[#2c2c2e]/50 hover:bg-blue-600 dark:hover:bg-blue-600 rounded-lg text-gray-500 dark:text-gray-400 hover:text-white transition-colors border border-gray-200 dark:border-white/10 opacity-0 group-hover:opacity-100 focus:opacity-100"
                          title="Copy Raw Output"
                        >
                          <Icons.Copy />
                        </button>

                        {viewMode === 'raw' ? (
                           <pre className="whitespace-pre-wrap font-mono text-xs sm:text-sm text-gray-700 dark:text-gray-300 leading-6 break-words">
                             {output}
                           </pre>
                        ) : (
                          <div className="prose prose-sm max-w-none dark:prose-invert">
                            {/* Thinking Block */}
                            {parsedOutput.thought && (
                              <details open className="mb-6 bg-gray-50 dark:bg-[#1c1c1e] border border-gray-100 dark:border-white/5 rounded-lg overflow-hidden group/think">
                                <summary className="px-4 py-2.5 cursor-pointer flex items-center gap-2 text-xs font-semibold text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors bg-gray-50/50 dark:bg-white/[0.02]">
                                  <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse"></span>
                                  Reasoning Process
                                  <span className="ml-auto text-[10px] opacity-50 group-open/think:rotate-180 transition-transform">▼</span>
                                </summary>
                                <div className="px-4 py-3 border-t border-gray-100 dark:border-white/5 bg-white dark:bg-[#151516]">
                                  <pre className="whitespace-pre-wrap font-mono text-xs text-gray-600 dark:text-gray-400 leading-relaxed opacity-90">
                                    {parsedOutput.thought}
                                  </pre>
                                </div>
                              </details>
                            )}
                            
                            {/* Final Answer */}
                            <div className="font-sans text-sm text-gray-800 dark:text-gray-200 leading-7">
                               <ReactMarkdown 
                                 remarkPlugins={[remarkGfm]}
                                 components={{
                                   pre: PreBlock
                                 }}
                               >
                                 {parsedOutput.content || '...'}
                               </ReactMarkdown>
                            </div>
                          </div>
                        )}
                      </div>
                   </div>
                 )}
               </div>
             )}
             <div ref={outputEndRef} className="h-4" />
          </div>
        </div>
      </div>

      {/* Right Column: Variables */}
      <div 
        className={`
          ${isTransitionEnabled ? 'transition-all duration-300 ease-in-out' : ''} 
          bg-white dark:bg-[#121212] z-30 shadow-2xl flex flex-col
          md:border-l border-gray-200 dark:border-white/5
          ${isVariablesPanelOpen ? 'translate-x-0' : 'translate-x-full md:w-0 md:translate-x-0'}
          fixed inset-0 md:relative md:inset-auto
          ${isVariablesPanelOpen ? 'md:w-80' : 'md:w-0'}
        `}
      >
        <div className="h-16 flex items-center justify-between px-6 border-b border-gray-200 dark:border-white/5 bg-white dark:bg-[#121212] md:min-w-[20rem]">
          <h3 className="font-semibold text-gray-900 dark:text-gray-200 text-sm">Variables</h3>
          <button 
            onClick={() => setIsVariablesPanelOpen(false)}
            className="md:hidden p-2 text-gray-500"
          >
            <Icons.PanelRightClose />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 space-y-6 md:min-w-[20rem]">
          {detectedVariables.length === 0 ? (
             <div className="flex flex-col items-center justify-center h-48 text-center text-gray-500 space-y-3">
               <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-white/5 flex items-center justify-center text-gray-400 dark:text-gray-500">
                 <span className="text-xl font-mono">{"{ }"}</span>
               </div>
               <p className="text-xs">
                 Add <code className="bg-gray-100 dark:bg-white/10 px-1 py-0.5 rounded text-gray-700 dark:text-gray-300">{`{variable}`}</code><br/> to your prompts to see inputs here.
               </p>
             </div>
          ) : (
            detectedVariables.map(v => (
              <div key={v} className="animate-in slide-in-from-right-4 duration-300">
                <label className="block text-xs font-medium text-blue-500 dark:text-blue-400 mb-2 font-mono flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                  {v}
                </label>
                <textarea
                  value={variables[v] || ''}
                  onChange={(e) => setVariables({...variables, [v]: e.target.value})}
                  className="w-full h-24 bg-gray-50 dark:bg-[#1c1c1e] border border-gray-200 dark:border-white/5 rounded-xl p-3 text-sm text-gray-900 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500/50 resize-none transition-all placeholder:text-gray-400 dark:placeholder:text-gray-600"
                  placeholder={`Value for ${v}...`}
                />
              </div>
            ))
          )}
        </div>
      </div>

      {/* Save Modal */}
      {showSaveModal && (
        <div className="absolute inset-0 bg-black/20 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#1c1c1e] border border-gray-200 dark:border-white/10 rounded-2xl w-[90%] md:w-[28rem] p-6 shadow-2xl scale-100 animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Save Prompt</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1.5 ml-1">Title</label>
                <input 
                  value={saveTitle}
                  onChange={e => setSaveTitle(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-[#2c2c2e] border border-transparent focus:border-blue-500/50 rounded-xl px-4 py-2.5 text-gray-900 dark:text-white focus:outline-none transition-colors text-sm"
                  placeholder="e.g. Code Reviewer"
                  autoFocus
                />
              </div>
              
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1.5 ml-1">Description (Optional)</label>
                <textarea 
                  value={saveDesc}
                  onChange={e => setSaveDesc(e.target.value)}
                  className="w-full h-24 bg-gray-50 dark:bg-[#2c2c2e] border border-transparent focus:border-blue-500/50 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:outline-none resize-none transition-colors text-sm"
                  placeholder="What is this prompt useful for?"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-8">
              <button 
                onClick={() => setShowSaveModal(false)}
                className="px-4 py-2 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleSave}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-medium shadow-lg shadow-blue-900/20 transition-all active:scale-95"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={showDuplicateTitleModal}
        title="Duplicate Title"
        message={`A prompt with the title "${pendingSave?.title}" already exists. Do you want to overwrite it?`}
        confirmText="Overwrite"
        cancelText="Cancel"
        isDestructive={true}
        onConfirm={handleConfirmOverwrite}
        onCancel={() => setShowDuplicateTitleModal(false)}
      />

      {/* Export Code Modal */}
      {showExportModal && (
        <div className="absolute inset-0 bg-black/20 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#1c1c1e] border border-gray-200 dark:border-white/10 rounded-2xl w-[95%] h-[80vh] md:w-[50rem] md:h-[80vh] md:max-h-[85vh] p-6 shadow-2xl scale-100 animate-in zoom-in-95 duration-200 flex flex-col">
            <div className="flex justify-between items-start mb-4 flex-shrink-0">
               <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Export to Code</h3>
                  <p className="text-xs text-gray-500 mt-1">Generate a LangChain Python script for this prompt.</p>
               </div>
               <button onClick={() => setShowExportModal(false)} className="text-gray-400 hover:text-gray-900 dark:hover:text-white">✕</button>
            </div>

            <div className="mb-4 flex-shrink-0">
              <label className="flex items-center gap-2 cursor-pointer group p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                <input 
                  type="checkbox" 
                  checked={includeCredentials} 
                  onChange={e => setIncludeCredentials(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <div className="text-sm">
                   <span className="font-medium text-gray-700 dark:text-gray-300">Include API Credentials</span>
                   <p className="text-xs text-red-500 dark:text-red-400">Warning: Do not share code with real API keys.</p>
                </div>
              </label>
            </div>
            
            <div className="relative flex-1 bg-gray-50 dark:bg-[#0a0a0a] rounded-xl border border-gray-200 dark:border-white/10 overflow-hidden flex flex-col">
               <textarea 
                 value={exportedCode}
                 readOnly
                 className="flex-1 w-full bg-transparent p-4 font-mono text-xs text-gray-800 dark:text-gray-300 focus:outline-none resize-none whitespace-pre overflow-auto"
               />
               <button 
                 onClick={() => {
                   navigator.clipboard.writeText(exportedCode);
                   setCopiedCode(true);
                   setTimeout(() => setCopiedCode(false), 2000);
                 }}
                 className="absolute top-3 right-3 p-2 bg-white dark:bg-[#2c2c2e] border border-gray-200 dark:border-white/10 rounded-lg shadow-sm hover:shadow-md transition-all text-gray-600 dark:text-gray-300 z-10"
               >
                 {copiedCode ? <Icons.Check /> : <Icons.Copy />}
               </button>
            </div>

            <div className="flex justify-end gap-3 mt-6 flex-shrink-0">
              <button 
                onClick={() => setShowExportModal(false)}
                className="px-4 py-2 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white text-sm font-medium transition-colors"
              >
                Close
              </button>
              <button 
                onClick={handleDownloadCode}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-medium shadow-lg shadow-blue-900/20 transition-all active:scale-95 flex items-center gap-2"
              >
                <Icons.Download />
                Download
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreateView;