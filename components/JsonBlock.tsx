import React, { useState, useEffect, useRef } from 'react';
import { Icons } from '../constants';
import { useToast } from '../components/Feedback';
import hljs from 'highlight.js';
import 'highlight.js/styles/github-dark.css';

interface JsonBlockProps {
  jsonData: any;
  rawCode: string;
}

export const JsonBlock: React.FC<JsonBlockProps> = ({ jsonData, rawCode }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [copied, setCopied] = useState(false);
  const codeRef = useRef<HTMLElement>(null);
  const { showToast } = useToast();

  // Apply syntax highlighting
  useEffect(() => {
    if (codeRef.current && jsonData) {
      try {
        const jsonString = JSON.stringify(jsonData, null, 2);
        const result = hljs.highlight(jsonString, { language: 'json' });
        codeRef.current.innerHTML = result.value;
      } catch (e) {
        codeRef.current.textContent = JSON.stringify(jsonData, null, 2);
      }
    }
  }, [jsonData]);

  const handleCopy = () => {
    navigator.clipboard.writeText(JSON.stringify(jsonData, null, 2));
    setCopied(true);
    showToast("JSON copied", "success");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([JSON.stringify(jsonData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const element = document.createElement("a");
    element.href = url;
    element.download = `data-${Date.now()}.json`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    URL.revokeObjectURL(url);
    showToast("JSON downloaded", "success");
  };

  return (
    <div className="my-4 rounded-lg overflow-hidden border border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-[#1c1c1e]">
      {/* Header Toolbar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-gray-100/80 dark:bg-white/[0.02] border-b border-gray-200 dark:border-white/5">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">JSON</span>
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="px-2 py-1 text-[10px] bg-white dark:bg-[#2c2c2e] hover:bg-gray-100 dark:hover:bg-[#3a3a3c] text-gray-600 dark:text-gray-300 rounded-md font-medium border border-gray-200 dark:border-white/10 transition-colors shadow-sm flex items-center gap-1"
          >
            {isCollapsed ? 'Expand' : 'Collapse'}
            <span className={`transition-transform ${isCollapsed ? '' : 'rotate-180'}`}>▼</span>
          </button>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleCopy}
            className="p-1.5 bg-white dark:bg-[#2c2c2e] hover:bg-gray-100 dark:hover:bg-[#3a3a3c] text-gray-500 dark:text-gray-400 rounded-md border border-gray-200 dark:border-white/10 shadow-sm transition-all flex items-center justify-center w-7 h-7"
            title="Copy JSON"
          >
            {copied ? <Icons.Check /> : <Icons.Copy />}
          </button>
          <button
            onClick={handleDownload}
            className="p-1.5 bg-white dark:bg-[#2c2c2e] hover:bg-gray-100 dark:hover:bg-[#3a3a3c] text-gray-500 dark:text-gray-400 rounded-md border border-gray-200 dark:border-white/10 shadow-sm transition-all flex items-center justify-center w-7 h-7"
            title="Download JSON"
          >
            <Icons.Download />
          </button>
        </div>
      </div>

      {/* Content */}
      {!isCollapsed && (
        <pre className="p-4 overflow-x-auto text-xs sm:text-sm leading-relaxed bg-[#0d1117]">
          <code ref={codeRef} className="font-mono hljs language-json" />
        </pre>
      )}
    </div>
  );
};
