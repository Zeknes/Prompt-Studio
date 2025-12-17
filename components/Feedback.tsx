import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Icons } from '../constants';

// --- Toast System ---

export type ToastType = 'success' | 'error' | 'info';

interface ToastMessage {
  id: string;
  type: ToastType;
  text: string;
}

interface ToastContextType {
  showToast: (text: string, type?: ToastType) => void;
}

export const ToastContext = createContext<ToastContextType>({ showToast: () => {} });

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = (text: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, text, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`
              pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border animate-in slide-in-from-right-10 fade-in duration-300
              ${toast.type === 'success' ? 'bg-white dark:bg-[#1c1c1e] border-green-200 dark:border-green-500/20 text-green-700 dark:text-green-400' : ''}
              ${toast.type === 'error' ? 'bg-white dark:bg-[#1c1c1e] border-red-200 dark:border-red-500/20 text-red-700 dark:text-red-400' : ''}
              ${toast.type === 'info' ? 'bg-white dark:bg-[#1c1c1e] border-blue-200 dark:border-blue-500/20 text-blue-700 dark:text-blue-400' : ''}
            `}
          >
            <span className={`
              flex items-center justify-center w-6 h-6 rounded-full 
              ${toast.type === 'success' ? 'bg-green-100 dark:bg-green-500/20' : ''}
              ${toast.type === 'error' ? 'bg-red-100 dark:bg-red-500/20' : ''}
              ${toast.type === 'info' ? 'bg-blue-100 dark:bg-blue-500/20' : ''}
            `}>
              {toast.type === 'success' && <Icons.CheckCircle />}
              {toast.type === 'error' && <Icons.AlertCircle />}
              {toast.type === 'info' && <Icons.Activity />}
            </span>
            <span className="text-sm font-medium">{toast.text}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => useContext(ToastContext);

// --- Confirmation Modal ---

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  neutralText?: string;
  isDestructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  onNeutral?: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  neutralText,
  isDestructive = false,
  onConfirm,
  onCancel,
  onNeutral
}) => {
  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 bg-black/20 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] animate-in fade-in duration-200 p-4">
      <div className="bg-white dark:bg-[#1c1c1e] border border-gray-200 dark:border-white/10 rounded-2xl w-full max-w-sm p-6 shadow-2xl scale-100 animate-in zoom-in-95 duration-200">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{title}</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 leading-relaxed">
          {message}
        </p>
        <div className="flex flex-col sm:flex-row justify-end gap-3">
          {onNeutral && neutralText && (
             <button
              onClick={onNeutral}
              className="px-4 py-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg text-sm font-medium transition-colors sm:mr-auto"
            >
              {neutralText}
            </button>
          )}
          <div className="flex justify-end gap-3 w-full sm:w-auto">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg text-sm font-medium transition-colors"
            >
              {cancelText}
            </button>
            <button
              onClick={onConfirm}
              className={`px-4 py-2 text-white rounded-lg text-sm font-medium shadow-sm transition-all active:scale-95 ${
                isDestructive
                  ? 'bg-red-600 hover:bg-red-500 shadow-red-500/20'
                  : 'bg-blue-600 hover:bg-blue-500 shadow-blue-500/20'
              }`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};