import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import CreateView from './views/CreateView';
import LibraryView from './views/LibraryView';
import ProvidersView from './views/ProvidersView';
import SettingsView from './views/SettingsView';
import { View, SavedPrompt } from './types';
import { StorageService } from './services/storageService';
import { ToastProvider } from './components/Feedback';

// Simple context for Theme
export const ThemeContext = React.createContext<{
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}>({ theme: 'dark', toggleTheme: () => {} });

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>('debug');
  const [promptToEdit, setPromptToEdit] = useState<SavedPrompt | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>(StorageService.getTheme());

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    StorageService.saveTheme(theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const handleEditPrompt = (prompt: SavedPrompt) => {
    setPromptToEdit(prompt);
    setCurrentView('debug');
  };

  const handleClearInitial = () => {
    setPromptToEdit(null);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      <ToastProvider>
        <div className="flex h-screen bg-gray-50 dark:bg-[#050505] text-gray-900 dark:text-gray-200 font-sans transition-colors duration-200 flex-col md:flex-row">
          <Sidebar currentView={currentView} onChangeView={setCurrentView} />
          
          <main className="flex-1 min-w-0 bg-white dark:bg-[#000000] h-full relative overflow-hidden transition-colors duration-200 mb-16 md:mb-0">
            {/* 
               We persist DebugView using display:none so that unsaved content 
               is not lost when navigating to Library/Settings and back.
            */}
            <div className={`h-full w-full ${currentView === 'debug' ? 'block' : 'hidden'}`}>
              <CreateView 
                initialPrompt={promptToEdit} 
                onClearInitial={handleClearInitial} 
                isVisible={currentView === 'debug'}
              />
            </div>
            
            {currentView === 'manage' && (
              <LibraryView onEdit={handleEditPrompt} />
            )}
            
            {currentView === 'providers' && (
              <ProvidersView />
            )}

            {currentView === 'settings' && (
              <SettingsView />
            )}
          </main>
        </div>
      </ToastProvider>
    </ThemeContext.Provider>
  );
};

export default App;