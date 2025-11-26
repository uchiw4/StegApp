
import { PDFDocument } from 'pdf-lib';
import { encryptMessage, decryptMessage } from './encryption';

export const encodePdf = async (
  pdfFile: File,
  message: string,
  password?: string
): Promise<Blob> => {
  const arrayBuffer = await pdfFile.arrayBuffer();
  const pdfDoc = await PDFDocument.load(arrayBuffer);
  
  let finalMessage = message;
  
  if (password) {
      // AES-GCM Encryption
      // The result of encryptMessage is already a JSON string, safe for insertion
      finalMessage = await encryptMessage(message, password);
      // We Base64 encode the JSON to make it perfectly safe for Metadata text fields
      finalMessage = btoa(finalMessage);
  } else {
      finalMessage = btoa(message);
  }

  // Prefix to identify our hidden data
  const flag = "STEGAPP_HIDDEN:";
  pdfDoc.setSubject(flag + finalMessage);
  
  const modifiedPdfBytes = await pdfDoc.save();
  return new Blob([modifiedPdfBytes], { type: 'application/pdf' });
};

export const decodePdf = async (
  pdfFile: File,
  password?: string
): Promise<string> => {
  const arrayBuffer = await pdfFile.arrayBuffer();
  const pdfDoc = await PDFDocument.load(arrayBuffer);
  
  const subject = pdfDoc.getSubject();
  
  if (!subject || !subject.startsWith("STEGAPP_HIDDEN:")) {
    throw new Error("No hidden message found in PDF Subject metadata.");
  }
  
  const rawData = subject.replace("STEGAPP_HIDDEN:", "");
  let decoded = "";
  
  try {
      decoded = atob(rawData);
  } catch (e) {
      throw new Error("Corrupted hidden data encoding.");
  }

  if (password) {
      // If we used a password, 'decoded' is now the JSON string from AES-GCM
      decoded = await decryptMessage(decoded, password);
  }
  
  return decoded;
};

export const corruptPdf = async (pdfBlob: Blob): Promise<Blob> => {
  const arrayBuffer = await pdfBlob.arrayBuffer();
  const pdfDoc = await PDFDocument.load(arrayBuffer);
  
  const subject = pdfDoc.getSubject();
  if (subject && subject.startsWith("STEGAPP_HIDDEN:")) {
     const rawData = subject.replace("STEGAPP_HIDDEN:", "");
     if (rawData.length > 10) {
        // Flip a character in the middle of the base64 string
        // Changing a base64 char changes the underlying bits of the encrypted JSON
        const idx = Math.floor(rawData.length / 2);
        const char = rawData[idx];
        const newChar = char === 'A' ? 'B' : 'A';
        const corrupted = rawData.substring(0, idx) + newChar + rawData.substring(idx + 1);
        
        pdfDoc.setSubject("STEGAPP_HIDDEN:" + corrupted);
     }
  }
  
  const modifiedPdfBytes = await pdfDoc.save();
  return new Blob([modifiedPdfBytes], { type: 'application/pdf' });
};
