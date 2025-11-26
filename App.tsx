
import React, { useState } from 'react';
import { Shield, Image as ImageIcon, Music, FileText, Terminal, Activity, Lock } from 'lucide-react';
import { StegoInterface } from './components/StegoInterface';
import { StegoMode } from './types';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<StegoMode>('image');

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-200 font-sans">
      {/* Top Security Banner */}
      <div className="bg-emerald-900/20 border-b border-emerald-900/30 px-4 py-1 flex justify-between items-center text-[10px] uppercase tracking-widest text-emerald-500 font-mono">
        <span>UNCLASSIFIED // INTERNAL USE ONLY</span>
        <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> SYSTEM ONLINE</span>
      </div>

      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm">
        <div className="container mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 border border-emerald-500/30 bg-emerald-500/10 rounded-sm">
              <Shield className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold font-mono tracking-tight text-white">
                SecOps<span className="text-emerald-500">Stego</span>Tool
              </h1>
              <p className="text-xs text-slate-500 font-mono">v1.1-build.894</p>
            </div>
          </div>
          
          <div className="flex items-center gap-6 text-xs font-mono text-slate-400">
             <div className="flex items-center gap-2">
               <Activity className="w-4 h-4 text-emerald-500" />
               <span>AES-GCM-256: ACTIVE</span>
             </div>
             <div className="flex items-center gap-2">
               <Lock className="w-4 h-4 text-emerald-500" />
               <span>NO_SERVER_LOGS</span>
             </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-6 py-8 max-w-6xl">
        
        <div className="grid grid-cols-12 gap-8">
          {/* Sidebar / Tabs */}
          <div className="col-span-12 md:col-span-3 space-y-2">
            <p className="text-xs font-mono text-slate-500 uppercase tracking-wider mb-4 px-2">Operation Mode</p>
            <TabButton 
              active={activeTab === 'image'} 
              onClick={() => setActiveTab('image')} 
              icon={<ImageIcon className="w-4 h-4" />}
              label="IMG_STEGO"
              desc="LSB Injection"
            />
            <TabButton 
              active={activeTab === 'audio'} 
              onClick={() => setActiveTab('audio')} 
              icon={<Music className="w-4 h-4" />}
              label="AUDIO_STEGO"
              desc="WAV PCM 16-bit"
            />
            <TabButton 
              active={activeTab === 'pdf'} 
              onClick={() => setActiveTab('pdf')} 
              icon={<FileText className="w-4 h-4" />}
              label="PDF_META"
              desc="Subject Injection"
            />
          </div>

          {/* Content Area */}
          <div className="col-span-12 md:col-span-9">
            <div className="bg-slate-900 border border-slate-800 rounded-sm shadow-2xl relative min-h-[600px] flex flex-col">
               {/* Terminal Header */}
               <div className="bg-slate-800/50 border-b border-slate-800 px-4 py-2 flex items-center justify-between">
                 <div className="flex items-center gap-2">
                   <Terminal className="w-4 h-4 text-slate-500" />
                   <span className="text-xs font-mono text-slate-400">/bin/stego_ops/{activeTab}</span>
                 </div>
                 <div className="flex gap-1.5">
                   <div className="w-3 h-3 rounded-full bg-slate-700"></div>
                   <div className="w-3 h-3 rounded-full bg-slate-700"></div>
                   <div className="w-3 h-3 rounded-full bg-slate-700"></div>
                 </div>
               </div>

               <div className="p-6 md:p-8 flex-1">
                 <StegoInterface mode={activeTab} />
               </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-4">
        <div className="container mx-auto px-6 flex justify-between items-center text-xs text-slate-600 font-mono">
          <p>SEC_OPS_TOOLKIT // ACCESS LEVEL 3</p>
          <p>NO DATA LEAVES THIS DEVICE</p>
        </div>
      </footer>
    </div>
  );
};

const TabButton: React.FC<{ 
  active: boolean; 
  onClick: () => void; 
  icon: React.ReactNode; 
  label: string;
  desc: string;
  special?: boolean;
}> = ({ active, onClick, icon, label, desc, special }) => (
  <button
    onClick={onClick}
    className={`
      w-full flex items-center justify-between px-4 py-3 rounded-sm border-l-2 transition-all duration-200 group
      ${active 
        ? 'bg-slate-800/50 border-emerald-500 text-emerald-400' 
        : 'bg-transparent border-transparent text-slate-400 hover:bg-slate-900 hover:text-slate-200 hover:border-slate-700'
      }
      ${special && !active ? 'text-purple-400 hover:text-purple-300' : ''}
    `}
  >
    <div className="flex items-center gap-3">
      {icon}
      <div className="flex flex-col items-start">
        <span className="font-bold font-mono text-sm">{label}</span>
      </div>
    </div>
    <span className="text-[10px] font-mono opacity-50 hidden xl:block">{desc}</span>
  </button>
);

export default App;
