import React, { useState, useEffect } from 'react';
import { StorageService } from '../services/storageService';
import { TokenService } from '../services/tokenService';
import { SavedPrompt } from '../types';
import { Icons } from '../constants';
import { useToast, ConfirmModal } from '../components/Feedback';

interface ManageViewProps {
  onEdit: (prompt: SavedPrompt) => void;
}

const LibraryView: React.FC<ManageViewProps> = ({ onEdit }) => {
  const [prompts, setPrompts] = useState<SavedPrompt[]>([]);
  const [search, setSearch] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  
  const { showToast } = useToast();

  useEffect(() => {
    setPrompts(StorageService.getPrompts());
  }, []);

  const handleDeleteClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setDeleteId(id);
  };

  const confirmDelete = () => {
    if (deleteId) {
      StorageService.deletePrompt(deleteId);
      setPrompts(StorageService.getPrompts());
      showToast("Prompt deleted", "success");
      setDeleteId(null);
    }
  };

  const filteredPrompts = prompts.filter(p => 
    p.title.toLowerCase().includes(search.toLowerCase()) || 
    p.description.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-8 h-full overflow-hidden flex flex-col bg-gray-50 dark:bg-[#000000] transition-colors duration-200">
      <ConfirmModal 
        isOpen={!!deleteId}
        title="Delete Prompt"
        message="Are you sure you want to permanently delete this prompt? This action cannot be undone."
        confirmText="Delete"
        isDestructive={true}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteId(null)}
      />

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-8 flex-shrink-0 gap-4 sm:gap-0">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Library</h2>
          <p className="text-sm text-gray-500 mt-1">Manage your saved prompts</p>
        </div>
        <div className="relative group w-full sm:w-auto">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-4 w-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          </div>
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-white dark:bg-[#1c1c1e] border border-gray-200 dark:border-white/5 rounded-xl pl-10 pr-4 py-2 text-sm w-full sm:w-64 text-gray-900 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all placeholder:text-gray-400 dark:placeholder:text-gray-600 shadow-sm"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 pb-10">
        {filteredPrompts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <div className="w-16 h-16 bg-white dark:bg-[#1c1c1e] rounded-2xl flex items-center justify-center mb-4 border border-gray-200 dark:border-white/5 shadow-sm">
              <Icons.Library />
            </div>
            <p className="text-lg font-medium text-gray-600 dark:text-gray-400">No prompts found</p>
            <p className="text-sm mt-2 text-gray-500 dark:text-gray-600">Create one in the Debugger tab.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filteredPrompts.map(prompt => {
              const estTokens = TokenService.estimate(prompt.systemPrompt + prompt.userPrompt);
              return (
                <div 
                  key={prompt.id} 
                  onClick={() => onEdit(prompt)}
                  className="bg-white dark:bg-[#1c1c1e] border border-gray-200 dark:border-white/5 rounded-2xl p-5 hover:border-blue-300 dark:hover:border-white/10 hover:shadow-xl dark:hover:bg-[#252527] transition-all duration-200 cursor-pointer group flex flex-col h-64 relative overflow-hidden shadow-sm"
                >
                  {/* Decorative gradient blob */}
                  <div className="absolute -right-10 -top-10 w-24 h-24 bg-blue-100 dark:bg-blue-500/10 rounded-full blur-2xl group-hover:bg-blue-200 dark:group-hover:bg-blue-500/20 transition-all"></div>

                  <div className="flex justify-between items-start mb-2 relative z-10">
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate pr-6 text-base">{prompt.title}</h3>
                    <button 
                      onClick={(e) => handleDeleteClick(e, prompt.id)}
                      className="text-gray-400 hover:text-red-500 dark:hover:text-red-400 p-1 rounded-md hover:bg-gray-100 dark:hover:bg-white/5 opacity-0 group-hover:opacity-100 transition-all absolute right-0 -top-1"
                    >
                      <Icons.Trash />
                    </button>
                  </div>
                  
                  <p className="text-xs text-gray-500 dark:text-gray-500 mb-4 line-clamp-2 h-8 leading-relaxed relative z-10">
                    {prompt.description || "No description provided."}
                  </p>
                  
                  <div className="flex-1 bg-gray-50 dark:bg-black/20 rounded-xl p-3 mb-4 overflow-hidden border border-gray-100 dark:border-white/5 relative z-10">
                    <div className="text-[10px] text-gray-500 dark:text-gray-400 font-mono leading-relaxed opacity-80">
                      <div className="flex gap-2 mb-1">
                        <span className="text-blue-500 dark:text-blue-400 font-bold uppercase text-[9px]">SYS</span> 
                        <span className="truncate">{prompt.systemPrompt}</span>
                      </div>
                      <div className="flex gap-2">
                        <span className="text-green-600 dark:text-green-400 font-bold uppercase text-[9px]">USR</span> 
                        <span className="truncate">{prompt.userPrompt}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-[10px] text-gray-500 mt-auto pt-3 border-t border-gray-100 dark:border-white/5 relative z-10">
                    <span className="font-medium">{new Date(prompt.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                    <div className="flex gap-2">
                      <div className="flex items-center gap-1 bg-gray-100 dark:bg-white/5 px-2 py-1 rounded-md">
                        <span>~{estTokens} tks</span>
                      </div>
                      <div className="flex items-center gap-1 bg-gray-100 dark:bg-white/5 px-2 py-1 rounded-md">
                        <span>{Object.keys(prompt.variables).length} vars</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default LibraryView;