
// Professional Grade AES-GCM Encryption using Web Crypto API
// Standards: AES-GCM-256, PBKDF2-SHA256 Key Derivation

const ITERATIONS = 100000; // NIST recommended minimum
const SALT_LENGTH = 16;
const IV_LENGTH = 12; // Standard for GCM

const getPasswordKey = (password: string) => 
  window.crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveKey"]
  );

const deriveKey = (passwordKey: CryptoKey, salt: Uint8Array, keyUsage: ["encrypt"] | ["decrypt"]) => 
  window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: ITERATIONS,
      hash: "SHA-256",
    },
    passwordKey,
    { name: "AES-GCM", length: 256 },
    false,
    keyUsage
  );

export const encryptMessage = async (message: string, password: string): Promise<string> => {
  try {
    const salt = window.crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
    const iv = window.crypto.getRandomValues(new Uint8Array(IV_LENGTH));
    
    const passwordKey = await getPasswordKey(password);
    const aesKey = await deriveKey(passwordKey, salt, ["encrypt"]);
    
    const encodedMessage = new TextEncoder().encode(message);
    
    const encryptedContent = await window.crypto.subtle.encrypt(
      {
        name: "AES-GCM",
        iv: iv,
      },
      aesKey,
      encodedMessage
    );

    // Combine Salt + IV + Ciphertext for storage
    // Format: JSON string to keep it structured within the stego payload
    const bundle = {
      s: Array.from(salt),
      iv: Array.from(iv),
      d: Array.from(new Uint8Array(encryptedContent))
    };

    return JSON.stringify(bundle);
  } catch (error) {
    console.error("Encryption Failed:", error);
    throw new Error("AES-GCM Encryption failed. Check environment security context.");
  }
};

export const decryptMessage = async (encryptedJson: string, password: string): Promise<string> => {
  try {
    let bundle;
    try {
      bundle = JSON.parse(encryptedJson);
    } catch {
      throw new Error("Invalid payload format. Not an encrypted container.");
    }

    if (!bundle.s || !bundle.iv || !bundle.d) {
       throw new Error("Corrupted encryption header.");
    }

    const salt = new Uint8Array(bundle.s);
    const iv = new Uint8Array(bundle.iv);
    const data = new Uint8Array(bundle.d);

    const passwordKey = await getPasswordKey(password);
    const aesKey = await deriveKey(passwordKey, salt, ["decrypt"]);

    const decryptedContent = await window.crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: iv,
      },
      aesKey,
      data
    );

    return new TextDecoder().decode(decryptedContent);
  } catch (error: any) {
    // Specifically catch GCM integrity errors
    if (error.name === 'OperationError') {
       throw new Error("INTEGRITY CHECK FAILED: Data has been tampered with (GCM Auth Tag Mismatch).");
    }
    throw new Error("Decryption failed. Invalid password or corrupted data.");
  }
};
