import React, { useState } from 'react';
import { Wand2, Download, AlertTriangle, Key, Terminal } from 'lucide-react';
import { generateCoverImage } from '../services/geminiService';

interface Props {
  onSelectImage: (file: File) => void;
}

export const AICoverGenerator: React.FC<Props> = ({ onSelectImage }) => {
  const [prompt, setPrompt] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!prompt) return;
    if (!apiKey && !process.env.API_KEY) {
      setError("API_KEY_MISSING: Credentials required for remote generation.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setGeneratedImage(null);

    try {
      const imageData = await generateCoverImage(prompt, apiKey);
      setGeneratedImage(imageData);
    } catch (err: any) {
      setError(err.message || "GENERATION_FAILURE: Verify network/credentials.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUseImage = async () => {
    if (!generatedImage) return;

    try {
      const res = await fetch(generatedImage);
      const blob = await res.blob();
      const file = new File([blob], "generated_asset_cover.png", { type: "image/png" });
      onSelectImage(file);
    } catch (e) {
      setError("ASSET_TRANSFER_FAILED");
    }
  };

  return (
    <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 h-full">
      
      {/* Input Section */}
      <div className="flex flex-col justify-center space-y-6">
        <div>
          <h2 className="text-xl font-bold font-mono text-emerald-400 flex items-center gap-2">
             <Wand2 className="w-5 h-5" />
             ASSET_GENERATOR_PROTOCOL
          </h2>
          <p className="text-xs text-slate-500 font-mono mt-1">
            Construct innocuous cover assets using Gemini-2.5-Flash.
          </p>
        </div>

        {/* API Key */}
        {!process.env.API_KEY && (
           <div className="space-y-1">
             <label className="text-[10px] font-bold text-slate-400 font-mono uppercase">
               API Credentials
             </label>
             <div className="flex items-center gap-2 bg-slate-950 border border-slate-700 p-2">
                <Key className="w-4 h-4 text-slate-500" />
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="INSERT_KEY_HERE"
                  className="bg-transparent border-none focus:ring-0 text-slate-300 text-xs font-mono w-full"
                />
             </div>
           </div>
        )}

        {/* Prompt */}
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-400 font-mono uppercase">
            Asset Parameters (Prompt)
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
              placeholder="> e.g. Ordinary landscape, mundane texture..."
              className="flex-1 p-3 bg-slate-950 border border-slate-700 focus:border-emerald-500 outline-none text-slate-300 text-xs font-mono"
            />
          </div>
        </div>

        <button
          onClick={handleGenerate}
          disabled={isLoading || !prompt}
          className="w-full py-3 bg-purple-900/20 border border-purple-500/50 text-purple-400 hover:bg-purple-900/40 hover:text-purple-300 font-mono text-xs font-bold uppercase transition-all flex items-center justify-center gap-2"
        >
          {isLoading ? <span className="animate-spin">/</span> : <Terminal className="w-4 h-4" />}
          {isLoading ? 'EXECUTING REMOTE GENERATION...' : 'INITIATE GENERATION'}
        </button>

        {error && (
          <div className="p-3 bg-red-950/20 border border-red-900/50 text-red-400 text-xs font-mono flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            {error}
          </div>
        )}
      </div>

      {/* Preview Section */}
      <div className="bg-black/50 border border-slate-800 flex items-center justify-center p-4 relative">
        <div className="absolute top-2 left-2 text-[10px] text-slate-600 font-mono">PREVIEW_MONITOR</div>
        
        {generatedImage ? (
           <div className="relative group w-full aspect-square max-w-[300px]">
              <img src={generatedImage} alt="Asset" className="w-full h-full object-cover border border-slate-700" />
              <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                 <button 
                   onClick={handleUseImage}
                   className="px-4 py-2 bg-emerald-600 text-white font-mono text-xs hover:bg-emerald-500"
                 >
                   [ IMPORT_TO_STEGO ]
                 </button>
              </div>
           </div>
        ) : (
           <div className="text-center opacity-20">
              <div className="w-24 h-24 border-2 border-dashed border-slate-500 mx-auto mb-2 flex items-center justify-center">
                 <Wand2 className="w-8 h-8" />
              </div>
              <p className="font-mono text-xs">NO_SIGNAL</p>
           </div>
        )}
      </div>

    </div>
  );
};