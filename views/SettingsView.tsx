import React, { useState, useEffect, useRef, useContext } from 'react';
import { StorageService } from '../services/storageService';
import { Icons } from '../constants';
import { useToast, ConfirmModal } from '../components/Feedback';
import { AppSettings } from '../types';
import { ThemeContext } from '../App';

const SettingsView: React.FC = () => {
  const { showToast } = useToast();
  const { theme, toggleTheme } = useContext(ThemeContext);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [settings, setSettings] = useState<AppSettings>(StorageService.getAppSettings());
  const [showImportConfirm, setShowImportConfirm] = useState(false);
  const [pendingImportData, setPendingImportData] = useState<string | null>(null);

  const handleExport = () => {
    try {
      const json = StorageService.exportData();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `prompt-studio-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('Data exported successfully', 'success');
    } catch (e) {
      showToast('Failed to export data', 'error');
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setPendingImportData(content);
      setShowImportConfirm(true);
      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  const confirmImport = () => {
    if (pendingImportData) {
      const result = StorageService.importData(pendingImportData);
      if (result.success) {
        showToast(result.message, 'success');
        // Refresh local settings state if import contained new settings
        setSettings(StorageService.getAppSettings());
      } else {
        showToast(result.message, 'error');
      }
      setShowImportConfirm(false);
      setPendingImportData(null);
    }
  };

  const updateSetting = (key: keyof AppSettings, value: any) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    StorageService.saveAppSettings(newSettings);
  };

  return (
    <div className="p-8 max-w-4xl mx-auto h-full overflow-y-auto bg-gray-50 dark:bg-[#000000] transition-colors duration-200">
      <ConfirmModal 
        isOpen={showImportConfirm}
        title="Import Data"
        message="This will merge imported prompts and providers into your current library. Existing items with the same ID will be overwritten. Do you want to continue?"
        confirmText="Import"
        onConfirm={confirmImport}
        onCancel={() => { setShowImportConfirm(false); setPendingImportData(null); }}
      />

      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Settings</h2>
        <p className="text-sm text-gray-500 mt-1">General application preferences</p>
      </div>

      <div className="space-y-6">
        {/* Appearance */}
        <div className="bg-white dark:bg-[#1c1c1e] border border-gray-200 dark:border-white/5 rounded-2xl p-6 shadow-sm">
           <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
             <Icons.Sun /> Appearance
           </h3>
           
           <div className="flex items-center justify-between">
              <div>
                 <label className="text-sm font-medium text-gray-900 dark:text-gray-200">Theme Mode</label>
                 <p className="text-xs text-gray-500 mt-1">Switch between Light and Dark mode</p>
              </div>
              
              <button 
                onClick={toggleTheme}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${theme === 'dark' ? 'bg-blue-600' : 'bg-gray-200'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition duration-200 ease-in-out ${theme === 'dark' ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
           </div>
        </div>

        {/* Defaults */}
        <div className="bg-white dark:bg-[#1c1c1e] border border-gray-200 dark:border-white/5 rounded-2xl p-6 shadow-sm">
           <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
             <Icons.Server /> Defaults
           </h3>
           
           <div className="space-y-4">
              <div>
                 <label className="block text-sm font-medium text-gray-900 dark:text-gray-200 mb-1">Default Provider Models</label>
                 <p className="text-xs text-gray-500 mb-2">Comma-separated list of models to include when adding a new provider.</p>
                 <input 
                   type="text" 
                   value={settings.defaultModels?.join(', ') || ''}
                   onChange={e => updateSetting('defaultModels', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                   className="w-full bg-gray-50 dark:bg-[#2c2c2e] border border-transparent focus:border-blue-500/50 rounded-xl px-4 py-2.5 text-sm text-gray-900 dark:text-white focus:outline-none transition-all placeholder:text-gray-400 dark:placeholder:text-gray-600"
                   placeholder="gpt-4o, gpt-4o-mini"
                 />
              </div>
           </div>
        </div>

        {/* Data Management */}
        <div className="bg-white dark:bg-[#1c1c1e] border border-gray-200 dark:border-white/5 rounded-2xl p-6 shadow-sm">
           <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
             <Icons.Save /> Data Management
           </h3>
           <p className="text-sm text-gray-500 mb-6">
             Backup your prompts and provider configurations to a JSON file.
           </p>
           
           <div className="flex flex-wrap gap-4">
             <button 
               onClick={handleExport}
               className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400 rounded-xl text-sm font-semibold hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-colors"
             >
               <Icons.Download />
               Export JSON
             </button>
             
             <button 
               onClick={handleImportClick}
               className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 dark:bg-white/5 dark:text-gray-300 rounded-xl text-sm font-semibold hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
             >
               <Icons.Library />
               Import JSON
             </button>
             <input 
               type="file" 
               ref={fileInputRef} 
               onChange={handleFileChange} 
               accept=".json" 
               className="hidden" 
             />
           </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsView;