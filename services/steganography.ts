
import { encryptMessage, decryptMessage } from './encryption';

// Utilities for LSB Steganography

const stringToBinary = (str: string): string => {
  return str.split('').map(char => {
    const binary = char.charCodeAt(0).toString(2);
    return '0'.repeat(16 - binary.length) + binary; // 16-bit encoding for wider character support
  }).join('');
};

const binaryToString = (binary: string): string => {
  const chars = [];
  for (let i = 0; i < binary.length; i += 16) {
    const byte = binary.substr(i, 16);
    chars.push(String.fromCharCode(parseInt(byte, 2)));
  }
  return chars.join('');
};

// --- IMAGE STEGANOGRAPHY (LSB) ---

export const encodeImage = async (
  imageFile: File, 
  message: string, 
  password?: string
): Promise<Blob> => {
  // Wait for image load
  const loadImg = (file: File): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  const img = await loadImg(imageFile);
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context not available');

  ctx.drawImage(img, 0, 0);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  // Prepare message: Length (32 chars of 0/1) + Message Binary
  
  // High Security Encryption (AES-GCM)
  let finalMessage = message;
  if (password) {
     finalMessage = await encryptMessage(message, password);
  } else {
     // If no password, we wrap it in a marker or just send plain text. 
     // For this app, strict mode suggests we might want to warn, but we'll allow plaintext.
  }

  const binaryMessage = stringToBinary(finalMessage);
  const lengthBin = binaryMessage.length.toString(2).padStart(32, '0');
  const fullBinary = lengthBin + binaryMessage;

  if (fullBinary.length > data.length * 3 / 4) { 
    throw new Error(`Capacity exceeded. Payload needs ${fullBinary.length} bits, image allows approx ${Math.floor(data.length * 0.75)} bits.`);
  }

  let dataIndex = 0;
  let binIndex = 0;

  while (binIndex < fullBinary.length && dataIndex < data.length) {
    // Skip Alpha channel (every 4th byte)
    if ((dataIndex + 1) % 4 === 0) {
      dataIndex++;
      continue;
    }

    const bit = parseInt(fullBinary[binIndex], 10);
    // Clear LSB and set new bit
    data[dataIndex] = (data[dataIndex] & ~1) | bit;
    
    dataIndex++;
    binIndex++;
  }

  ctx.putImageData(imageData, 0, 0);
  
  return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Encoding failed'));
      }, 'image/png');
  });
};

export const decodeImage = async (imageFile: File, password?: string): Promise<string> => {
   const loadImg = (file: File): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  const img = await loadImg(imageFile);
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context not available');

  ctx.drawImage(img, 0, 0);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  let binary = '';
  let dataIndex = 0;
  
  // Read Length (32 bits)
  let lengthBin = '';
  while (lengthBin.length < 32 && dataIndex < data.length) {
    if ((dataIndex + 1) % 4 === 0) {
      dataIndex++;
      continue;
    }
    lengthBin += (data[dataIndex] & 1).toString();
    dataIndex++;
  }

  const msgLength = parseInt(lengthBin, 2);
  if (msgLength <= 0 || msgLength > data.length * 8) {
     throw new Error('No valid header found. File may be empty or not processed by this tool.');
  }

  // Read Message
  while (binary.length < msgLength && dataIndex < data.length) {
    if ((dataIndex + 1) % 4 === 0) {
      dataIndex++;
      continue;
    }
    binary += (data[dataIndex] & 1).toString();
    dataIndex++;
  }

  let decoded = binaryToString(binary);

  // Decrypt if needed
  if (password) {
     decoded = await decryptMessage(decoded, password);
  }

  return decoded;
};

// --- SIMULATION TOOLS ---
export const corruptImage = async (imageBlob: Blob): Promise<Blob> => {
  const loadImg = (url: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = url;
    });
  };

  const url = URL.createObjectURL(imageBlob);
  const img = await loadImg(url);
  URL.revokeObjectURL(url);

  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context not available');

  ctx.drawImage(img, 0, 0);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  // We want to skip the 32-bit header to avoid breaking the LSB length check
  // and only corrupt the encrypted payload.
  // 32 bits = 32 modified RGB bytes.
  
  let validBytesFound = 0;
  let i = 0;
  let corrupted = false;

  while(i < data.length && !corrupted) {
     if ((i + 1) % 4 === 0) {
        i++;
        continue;
     }
     
     // Skip header (32 bits) + 10 bits cushion
     if (validBytesFound > 42) {
        // FLIP A SINGLE BIT (XOR 1)
        data[i] = data[i] ^ 1; 
        corrupted = true;
     }
     validBytesFound++;
     i++;
  }

  ctx.putImageData(imageData, 0, 0);
  
  return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Corruption failed'));
      }, 'image/png');
  });
};


// --- AUDIO STEGANOGRAPHY (WAV LSB) ---

export const encodeAudio = async (
    audioFile: File, 
    message: string,
    password?: string
): Promise<Blob> => {
    const arrayBuffer = await audioFile.arrayBuffer();
    const dataView = new DataView(arrayBuffer);
    
    // Basic WAV parsing
    let offset = 12; // Skip RIFF header
    while (offset < dataView.byteLength) {
        const chunkId = String.fromCharCode(
            dataView.getUint8(offset),
            dataView.getUint8(offset + 1),
            dataView.getUint8(offset + 2),
            dataView.getUint8(offset + 3)
        );
        offset += 4;
        const chunkSize = dataView.getUint32(offset, true); // Little endian
        offset += 4;
        
        if (chunkId === 'data') {
            const samples = new Uint8Array(arrayBuffer, offset, chunkSize);
            
            let finalMessage = message;
            if (password) {
               finalMessage = await encryptMessage(message, password);
            }

            const binaryMessage = stringToBinary(finalMessage);
            const lengthBin = binaryMessage.length.toString(2).padStart(32, '0');
            const fullBinary = lengthBin + binaryMessage;

            if (fullBinary.length > samples.length) {
                throw new Error('Capacity Exceeded for Audio LSB');
            }

            // Encode LSB
            for (let i = 0; i < fullBinary.length; i++) {
                const bit = parseInt(fullBinary[i], 10);
                samples[i] = (samples[i] & ~1) | bit;
            }
            
            return new Blob([arrayBuffer], { type: 'audio/wav' });
        }
        
        offset += chunkSize;
    }
    throw new Error('Invalid WAV structure');
};

export const decodeAudio = async (audioFile: File, password?: string): Promise<string> => {
    const arrayBuffer = await audioFile.arrayBuffer();
    const dataView = new DataView(arrayBuffer);
    
    let offset = 12;
    while (offset < dataView.byteLength) {
        const chunkId = String.fromCharCode(
            dataView.getUint8(offset),
            dataView.getUint8(offset + 1),
            dataView.getUint8(offset + 2),
            dataView.getUint8(offset + 3)
        );
        offset += 4;
        const chunkSize = dataView.getUint32(offset, true);
        offset += 4;
        
        if (chunkId === 'data') {
            const samples = new Uint8Array(arrayBuffer, offset, chunkSize);
            
            // Read Length
            let lengthBin = '';
            for (let i = 0; i < 32; i++) {
                lengthBin += (samples[i] & 1).toString();
            }
            
            const msgLength = parseInt(lengthBin, 2);
            if (msgLength <= 0 || msgLength > samples.length) {
                throw new Error('No hidden data detected');
            }
            
            let binary = '';
            for (let i = 32; i < 32 + msgLength; i++) {
                binary += (samples[i] & 1).toString();
            }
            
            let decoded = binaryToString(binary);
            
            if (password) {
               decoded = await decryptMessage(decoded, password);
            }
            return decoded;
        }
        offset += chunkSize;
    }
    throw new Error('Invalid WAV file');
};

export const corruptAudio = async (audioBlob: Blob): Promise<Blob> => {
    const arrayBuffer = await audioBlob.arrayBuffer();
    const bufferCopy = arrayBuffer.slice(0); // Clone buffer
    const dataView = new DataView(bufferCopy);
    
    let offset = 12;
    while (offset < dataView.byteLength) {
        const chunkId = String.fromCharCode(
            dataView.getUint8(offset),
            dataView.getUint8(offset + 1),
            dataView.getUint8(offset + 2),
            dataView.getUint8(offset + 3)
        );
        offset += 4;
        const chunkSize = dataView.getUint32(offset, true);
        offset += 4;
        
        if (chunkId === 'data') {
            const samples = new Uint8Array(bufferCopy, offset, chunkSize);
            // Skip 32 bits (header) + cushion, flip one bit in payload
            if (samples.length > 50) {
               samples[40] = samples[40] ^ 1; 
            }
            return new Blob([bufferCopy], { type: 'audio/wav' });
        }
        offset += chunkSize;
    }
    throw new Error('Invalid WAV structure');
};
