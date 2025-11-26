
export type StegoMode = 'image' | 'audio' | 'pdf';
export type ProcessType = 'encode' | 'decode';

export interface StegoResult {
  success: boolean;
  data?: Blob | string; // Blob for encoded file, string for decoded message
  error?: string;
  downloadName?: string;
}

export interface ProcessingState {
  isProcessing: boolean;
  progress: number; // 0-100
  status: string;
}

export interface ImageDimensions {
  width: number;
  height: number;
}
