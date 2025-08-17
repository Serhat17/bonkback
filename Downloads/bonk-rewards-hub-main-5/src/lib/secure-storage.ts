/**
 * Secure storage utilities for sensitive data encryption
 */

interface EncryptedData {
  data: string;
  salt: string;
  version: number;
}

class SecureStorage {
  private static readonly CURRENT_VERSION = 2;
  private static readonly PBKDF2_ITERATIONS = 100000;

  private static async deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const passwordData = encoder.encode(password);
    
    // Import password as key material
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      passwordData,
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );
    
    // Derive AES-GCM key using PBKDF2
    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: this.PBKDF2_ITERATIONS,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  private static async getDeviceFingerprint(): Promise<string> {
    // Create a device-specific identifier from available entropy
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillText('Device fingerprint', 2, 2);
    }
    
    const fingerprint = [
      navigator.userAgent,
      navigator.language,
      screen.width + 'x' + screen.height,
      new Date().getTimezoneOffset().toString(),
      canvas.toDataURL(),
      navigator.hardwareConcurrency?.toString() || '4'
    ].join('|');
    
    const encoder = new TextEncoder();
    const data = encoder.encode(fingerprint);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    
    return Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  static async encrypt(plaintext: string): Promise<string> {
    try {
      const deviceId = await this.getDeviceFingerprint();
      const salt = crypto.getRandomValues(new Uint8Array(32));
      const key = await this.deriveKey(deviceId, salt);
      
      const encoder = new TextEncoder();
      const data = encoder.encode(plaintext);
      
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        data
      );

      // Combine iv and encrypted data
      const combined = new Uint8Array(iv.length + encrypted.byteLength);
      combined.set(iv);
      combined.set(new Uint8Array(encrypted), iv.length);
      
      const encryptedData: EncryptedData = {
        data: btoa(String.fromCharCode(...combined)),
        salt: btoa(String.fromCharCode(...salt)),
        version: this.CURRENT_VERSION
      };
      
      return JSON.stringify(encryptedData);
    } catch (error) {
      console.error('Encryption failed:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  static async decrypt(ciphertext: string): Promise<string> {
    try {
      // Try parsing as new format first
      let encryptedData: EncryptedData;
      try {
        encryptedData = JSON.parse(ciphertext);
      } catch {
        // Legacy format - migrate to new format
        return await this.decryptLegacy(ciphertext);
      }

      // Handle version compatibility
      if (encryptedData.version !== this.CURRENT_VERSION) {
        throw new Error('Unsupported encryption version');
      }

      const deviceId = await this.getDeviceFingerprint();
      const salt = new Uint8Array(
        atob(encryptedData.salt).split('').map(char => char.charCodeAt(0))
      );
      const key = await this.deriveKey(deviceId, salt);
      
      const combined = new Uint8Array(
        atob(encryptedData.data).split('').map(char => char.charCodeAt(0))
      );
      
      const iv = combined.slice(0, 12);
      const encrypted = combined.slice(12);
      
      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        key,
        encrypted
      );
      
      const decoder = new TextDecoder();
      return decoder.decode(decrypted);
    } catch (error) {
      console.error('Decryption failed:', error);
      throw new Error('Failed to decrypt data');
    }
  }

  private static async decryptLegacy(ciphertext: string): Promise<string> {
    try {
      // Legacy decryption for migration
      const encoder = new TextEncoder();
      const keyData = encoder.encode('bonkback-secure-key-v1');
      const hashBuffer = await crypto.subtle.digest('SHA-256', keyData);
      
      const legacyKey = await crypto.subtle.importKey(
        'raw',
        hashBuffer.slice(0, 32),
        { name: 'AES-GCM' },
        false,
        ['decrypt']
      );

      const combined = new Uint8Array(
        atob(ciphertext).split('').map(char => char.charCodeAt(0))
      );
      
      const iv = combined.slice(0, 12);
      const encrypted = combined.slice(12);
      
      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        legacyKey,
        encrypted
      );
      
      const decoder = new TextDecoder();
      const plaintext = decoder.decode(decrypted);
      
      // Immediately re-encrypt with new format
      console.warn('Migrating legacy encrypted data to new format');
      return plaintext;
    } catch (error) {
      console.error('Legacy decryption failed:', error);
      throw new Error('Failed to decrypt legacy data - re-authentication required');
    }
  }

  // Browser extension specific secure storage
  static async storeSecureToken(key: string, token: string): Promise<void> {
    if (typeof window !== 'undefined' && (window as any).chrome?.storage) {
      const encrypted = await this.encrypt(token);
      await (window as any).chrome.storage.local.set({ [`secure_${key}`]: encrypted });
    } else {
      // Fallback for web app
      const encrypted = await this.encrypt(token);
      localStorage.setItem(`secure_${key}`, encrypted);
    }
  }

  static async getSecureToken(key: string): Promise<string | null> {
    try {
      let encrypted: string | null = null;
      
      if (typeof window !== 'undefined' && (window as any).chrome?.storage) {
        const result = await (window as any).chrome.storage.local.get([`secure_${key}`]);
        encrypted = result[`secure_${key}`] || null;
      } else {
        // Fallback for web app
        encrypted = localStorage.getItem(`secure_${key}`);
      }
      
      if (!encrypted) return null;
      
      try {
        const decrypted = await this.decrypt(encrypted);
        
        // Check if this was legacy data and re-encrypt it
        try {
          JSON.parse(encrypted);
        } catch {
          // Was legacy format, re-store with new encryption
          console.log('Migrating token to new encryption format:', key);
          await this.storeSecureToken(key, decrypted);
        }
        
        return decrypted;
      } catch (error) {
        console.error('Failed to decrypt token, clearing:', key);
        await this.removeSecureToken(key);
        return null;
      }
    } catch (error) {
      console.error('Failed to retrieve secure token:', error);
      return null;
    }
  }

  static async removeSecureToken(key: string): Promise<void> {
    if (typeof window !== 'undefined' && (window as any).chrome?.storage) {
      await (window as any).chrome.storage.local.remove([`secure_${key}`]);
    } else {
      localStorage.removeItem(`secure_${key}`);
    }
  }

  static async clearAllSecureTokens(): Promise<void> {
    if (typeof window !== 'undefined' && (window as any).chrome?.storage) {
      const items = await (window as any).chrome.storage.local.get();
      const secureKeys = Object.keys(items).filter(key => key.startsWith('secure_'));
      if (secureKeys.length > 0) {
        await (window as any).chrome.storage.local.remove(secureKeys);
      }
    } else {
      // Clear from localStorage
      const keys = Object.keys(localStorage).filter(key => key.startsWith('secure_'));
      keys.forEach(key => localStorage.removeItem(key));
    }
  }
}

export { SecureStorage };