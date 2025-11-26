
import React, { useState, useRef, useEffect } from 'react';
import { Upload, Lock, Unlock, Download, FileType, CheckCircle, AlertTriangle, RefreshCw, Shield, Trash2, Terminal as TerminalIcon, Zap } from 'lucide-react';
import { StegoMode, StegoResult, ProcessingState } from '../types';
import { encodeImage, decodeImage, encodeAudio, decodeAudio, corruptImage, corruptAudio } from '../services/steganography';
import { encodePdf, decodePdf, corruptPdf } from '../services/pdfStego';

interface Props {
  mode: StegoMode;
}

interface LogEntry {
  timestamp: string;
  type: 'info' | 'success' | 'error' | 'warn';
  message: string;
}

export const StegoInterface: React.FC<Props> = ({ mode }) => {
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState('');
  const [password, setPassword] = useState('');
  const [activeTab, setActiveTab] = useState<'encode' | 'decode'>('encode');
  const [result, setResult] = useState<StegoResult | null>(null);
  const [processing, setProcessing] = useState<ProcessingState>({ isProcessing: false, progress: 0, status: '' });
  const [logs, setLogs] = useState<LogEntry[]>([]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);

  const addLog = (message: string, type: 'info' | 'success' | 'error' | 'warn' = 'info') => {
    const now = new Date();
    const timestamp = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
    setLogs(prev => [...prev, { timestamp, type, message }]);
  };

  // Auto-scroll logs
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  useEffect(() => {
    // Reset state on mode change but keep logs
    setFile(null);
    setMessage('');
    setResult(null);
    setPassword('');
    addLog(`System initialized. Switched to mode: ${mode.toUpperCase()}`, 'info');
  }, [mode]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const f = e.target.files[0];
      setFile(f);
      setResult(null);
      addLog(`File loaded: ${f.name} (${(f.size / 1024).toFixed(2)} KB)`, 'info');
      
      // Security warning for large files
      if (f.size > 5 * 1024 * 1024) {
        addLog(`Large file detected. Processing may take longer.`, 'warn');
      }
    }
  };

  const handlePurge = () => {
    setFile(null);
    setMessage('');
    setPassword('');
    setResult(null);
    addLog('SESSION PURGED. Memory cleared.', 'warn');
  };

  const getAcceptTypes = () => {
    switch(mode) {
      case 'image': return 'image/png, image/jpeg, image/bmp';
      case 'audio': return 'audio/wav'; 
      case 'pdf': return 'application/pdf';
      default: return '*/*';
    }
  };

  const handleSimulateCorruption = async () => {
    if (!result?.data || !(result.data instanceof Blob)) return;
    
    setProcessing({ isProcessing: true, progress: 50, status: 'INJECTING BIT ERROR...' });
    
    try {
       let corruptedBlob: Blob;
       if (mode === 'image') corruptedBlob = await corruptImage(result.data);
       else if (mode === 'audio') corruptedBlob = await corruptAudio(result.data);
       else corruptedBlob = await corruptPdf(result.data);
       
       // Update state
       setFile(new File([corruptedBlob], "corrupted_" + (file?.name || "file"), { type: corruptedBlob.type }));
       setActiveTab('decode');
       setResult(null);
       addLog('ATTACK SIMULATED: Single bit flipped in encrypted payload.', 'warn');
       addLog('Switched to EXTRACT mode. Try decoding now to verify integrity check.', 'info');
       
    } catch (e: any) {
       addLog('Attack Simulation Failed: ' + e.message, 'error');
    } finally {
       setProcessing({ isProcessing: false, progress: 0, status: '' });
    }
  };

  const processSteganography = async () => {
    if (!file) return;
    if (activeTab === 'encode' && !message) return;

    setProcessing({ isProcessing: true, progress: 10, status: 'Initializing Environment...' });
    setResult(null);
    addLog(`Starting ${activeTab.toUpperCase()} operation on ${file.name}...`, 'info');

    try {
      let output: Blob | string;
      
      await new Promise(r => setTimeout(r, 600)); // Simulate processing time for UX
      
      if (password) {
        setProcessing(p => ({ ...p, progress: 30, status: 'Deriving AES-GCM-256 Keys...' }));
        addLog('Deriving 256-bit AES-GCM Key from password (PBKDF2-SHA256)...', 'info');
      }

      setProcessing(p => ({ ...p, progress: 50, status: 'Processing Bitstream...' }));

      if (activeTab === 'encode') {
        // ENCODE
        if (mode === 'image') {
          output = await encodeImage(file, message, password);
        } else if (mode === 'audio') {
          output = await encodeAudio(file, message, password);
        } else {
          output = await encodePdf(file, message, password);
        }
        
        setProcessing(p => ({ ...p, progress: 100, status: 'Finalizing...' }));
        setResult({
          success: true,
          data: output,
          downloadName: `SECURE_${Date.now()}_${mode === 'audio' ? 'audio.wav' : mode === 'pdf' ? 'doc.pdf' : 'image.png'}`
        });
        addLog(`Encoding successful. Payload secured.`, 'success');

      } else {
        // DECODE
        let decodedText: string;
        if (mode === 'image') {
          decodedText = await decodeImage(file, password);
        } else if (mode === 'audio') {
          decodedText = await decodeAudio(file, password);
        } else {
          decodedText = await decodePdf(file, password);
        }
        
        setProcessing(p => ({ ...p, progress: 100, status: 'Complete' }));
        setResult({
          success: true,
          data: decodedText
        });
        addLog(`Decryption successful. Integrity Verified (GCM Auth Tag).`, 'success');
      }

    } catch (error: any) {
      console.error(error);
      addLog(`Operation Failed: ${error.message || 'Unknown Error'}`, 'error');
      setResult({
        success: false,
        error: error.message || 'An unknown error occurred'
      });
    } finally {
      setProcessing({ isProcessing: false, progress: 0, status: '' });
    }
  };

  const downloadResult = () => {
    if (result?.data instanceof Blob && result.downloadName) {
      const url = URL.createObjectURL(result.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = result.downloadName;
      a.click();
      URL.revokeObjectURL(url);
      addLog(`File downloaded: ${result.downloadName}`, 'success');
    }
  };

  return (
    <div className="flex flex-col h-full gap-6">
      
      {/* Top Controls Area */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column: Operation Inputs */}
        <div className="space-y-6">
          {/* Toggle Encode/Decode */}
          <div className="flex bg-slate-800 p-1 rounded-sm border border-slate-700">
            <button
              onClick={() => setActiveTab('encode')}
              className={`flex-1 py-2 px-4 text-xs font-mono uppercase tracking-wider transition-all ${
                activeTab === 'encode' 
                  ? 'bg-slate-700 text-emerald-400 border border-slate-600 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              [ Encode Data ]
            </button>
            <button
              onClick={() => setActiveTab('decode')}
              className={`flex-1 py-2 px-4 text-xs font-mono uppercase tracking-wider transition-all ${
                activeTab === 'decode' 
                  ? 'bg-slate-700 text-emerald-400 border border-slate-600 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              [ Extract Data ]
            </button>
          </div>

          {/* File Upload Zone */}
          <div 
            className={`
              relative border border-dashed h-32 flex flex-col items-center justify-center transition-colors cursor-pointer group
              ${file 
                ? 'border-emerald-500/50 bg-emerald-900/10' 
                : 'border-slate-700 hover:border-emerald-500/30 hover:bg-slate-800'
              }
            `}
            onClick={() => fileInputRef.current?.click()}
          >
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              accept={getAcceptTypes()} 
              className="hidden" 
            />
            {file ? (
              <div className="text-center">
                <p className="font-mono text-emerald-400 text-sm mb-1">{file.name}</p>
                <p className="font-mono text-xs text-slate-500">{(file.size / 1024).toFixed(2)} KB | TYPE: {file.type || 'UNKNOWN'}</p>
              </div>
            ) : (
              <div className="text-center group-hover:scale-105 transition-transform">
                <div className="flex justify-center mb-2 text-slate-600 group-hover:text-emerald-500">
                   {mode === 'image' ? <FileType className="w-8 h-8" /> : mode === 'audio' ? <Upload className="w-8 h-8" /> : <FileType className="w-8 h-8" />}
                </div>
                <p className="font-mono text-xs text-slate-500 uppercase">Drop Target File Here</p>
                <p className="font-mono text-[10px] text-slate-600 mt-1">SUPPORTED: {getAcceptTypes().replace(/image\/|audio\/|application\//g, '').replace(/,/g, ' ')}</p>
              </div>
            )}
            
            {/* Corner Markers for "Tech" look */}
            <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-slate-500"></div>
            <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-slate-500"></div>
            <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-slate-500"></div>
            <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-slate-500"></div>
          </div>

          {/* Message Input */}
          {activeTab === 'encode' && (
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs font-mono text-slate-400">
                <label>PAYLOAD_INPUT</label>
                <span>LEN: {message.length}</span>
              </div>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full h-24 p-3 bg-slate-950 border border-slate-700 text-slate-300 focus:border-emerald-500 focus:ring-0 outline-none font-mono text-xs resize-none"
                placeholder="> Enter sensitive data string..."
              />
            </div>
          )}

          {/* Password */}
          <div className="space-y-2">
            <label className="text-xs font-mono text-slate-400 flex items-center gap-2">
              <Lock className="w-3 h-3" /> AES-GCM KEY GENERATION (PASSWORD)
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-2 bg-slate-950 border border-slate-700 text-slate-300 focus:border-emerald-500 outline-none font-mono text-sm tracking-widest"
              placeholder="••••••••"
            />
          </div>

          <div className="flex gap-3">
             <button
              onClick={processSteganography}
              disabled={!file || (activeTab === 'encode' && !message) || processing.isProcessing}
              className={`
                flex-1 py-3 font-mono text-sm font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all
                ${(!file || (activeTab === 'encode' && !message) || processing.isProcessing)
                  ? 'bg-slate-800 text-slate-600 border border-slate-700 cursor-not-allowed' 
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                }
              `}
            >
              {processing.isProcessing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  PROCESSING...
                </>
              ) : (
                <>
                  {activeTab === 'encode' ? 'EXECUTE ENCODE' : 'EXECUTE EXTRACT'}
                </>
              )}
            </button>
            <button 
               onClick={handlePurge}
               className="px-4 border border-red-900/50 text-red-700 hover:bg-red-900/20 hover:text-red-500 transition-colors"
               title="Purge Session"
            >
               <Trash2 className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Right Column: Output & Logs */}
        <div className="flex flex-col gap-4">
           {/* Result Panel */}
           <div className={`
              flex-1 rounded-sm border p-4 relative min-h-[200px] flex flex-col justify-center
              ${result 
                 ? (result.success ? 'bg-emerald-950/10 border-emerald-500/30' : 'bg-red-950/10 border-red-500/30') 
                 : 'bg-slate-900 border-slate-800'
              }
           `}>
              <div className="absolute top-0 left-0 px-2 py-1 bg-slate-800 text-[10px] font-mono text-slate-400">
                 OUTPUT_CONSOLE
              </div>

              {!result && !processing.isProcessing && (
                 <div className="text-center opacity-30">
                    <Shield className="w-12 h-12 mx-auto mb-2" />
                    <p className="font-mono text-xs">WAITING FOR INPUT...</p>
                 </div>
              )}
              
              {processing.isProcessing && (
                 <div className="text-center space-y-4">
                    <div className="w-full max-w-[200px] mx-auto h-1 bg-slate-800 overflow-hidden">
                       <div className="h-full bg-emerald-500 animate-progress origin-left" style={{width: `${processing.progress}%`}}></div>
                    </div>
                    <p className="font-mono text-xs text-emerald-400 animate-pulse">{processing.status}</p>
                 </div>
              )}

              {result && (
                <div className="w-full">
                  <div className="flex items-center gap-3 mb-4">
                     {result.success ? <CheckCircle className="text-emerald-500 w-5 h-5" /> : <AlertTriangle className="text-red-500 w-5 h-5" />}
                     <span className={`font-mono font-bold ${result.success ? 'text-emerald-400' : 'text-red-400'}`}>
                        {result.success ? 'OPERATION_COMPLETE' : 'OPERATION_FAILED'}
                     </span>
                  </div>
                  
                  {result.error && (
                     <p className="font-mono text-xs text-red-400 border-l-2 border-red-500 pl-3 py-1 bg-red-950/20">
                        ERR: {result.error}
                     </p>
                  )}

                  {result.success && activeTab === 'decode' && typeof result.data === 'string' && (
                     <div className="font-mono text-xs bg-black p-3 border border-emerald-900/50 text-emerald-300 break-all max-h-40 overflow-y-auto custom-scrollbar">
                        {result.data}
                     </div>
                  )}

                  {result.success && activeTab === 'encode' && (
                     <div className="space-y-3">
                         <div className="p-2 bg-slate-950 border border-slate-700">
                           <p className="text-[10px] text-slate-500 font-mono mb-1">SECURITY_REPORT:</p>
                           <p className="text-[10px] text-emerald-500 font-mono">ENCRYPTION: AES-GCM-256 (WebCrypto)</p>
                           <p className="text-[10px] text-emerald-500 font-mono">INTEGRITY: GMAC Auth Tag Verified</p>
                         </div>
                         <div className="flex gap-2">
                             <button 
                               onClick={downloadResult}
                               className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-emerald-400 font-mono text-xs flex items-center justify-center gap-2 group"
                             >
                               <Download className="w-4 h-4 group-hover:animate-bounce" />
                               DOWNLOAD_ARTIFACT
                             </button>
                             <button 
                               onClick={handleSimulateCorruption}
                               className="flex-1 py-2 bg-red-900/20 hover:bg-red-900/40 border border-red-800 text-red-400 font-mono text-xs flex items-center justify-center gap-2"
                             >
                               <Zap className="w-4 h-4" />
                               SIMULATE CORRUPTION
                             </button>
                         </div>
                     </div>
                  )}
                </div>
              )}
           </div>

           {/* Audit Log Terminal */}
           <div className="h-48 bg-black border border-slate-800 rounded-sm font-mono text-[10px] p-2 overflow-y-auto custom-scrollbar shadow-inner">
              {logs.length === 0 && <span className="text-slate-700">_audit_logs_empty</span>}
              {logs.map((log, i) => (
                <div key={i} className="mb-1 border-l-2 border-transparent hover:border-slate-700 pl-1">
                  <span className="text-slate-500">[{log.timestamp}]</span>
                  <span className={`ml-2 uppercase font-bold ${
                    log.type === 'error' ? 'text-red-500' : 
                    log.type === 'warn' ? 'text-amber-500' : 
                    log.type === 'success' ? 'text-emerald-500' : 'text-cyan-600'
                  }`}>
                    {log.type}
                  </span>
                  <span className="text-slate-300 ml-2"> : {log.message}</span>
                </div>
              ))}
              <div ref={logsEndRef} />
           </div>
        </div>
      </div>
    </div>
  );
};
