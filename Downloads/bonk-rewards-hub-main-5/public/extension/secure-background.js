/**
 * Enhanced background script with secure token storage
 */

// Import the original background script functionality
// We'll enhance it with secure storage capabilities

// Secure storage wrapper using Web Crypto API
class ExtensionSecureStorage {
  static key = 'bonkback-ext-secure-v1';

  static async getKey() {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(this.key);
    const hashBuffer = await crypto.subtle.digest('SHA-256', keyData);
    
    return crypto.subtle.importKey(
      'raw',
      hashBuffer.slice(0, 32),
      { name: 'AES-GCM' },
      false,
      ['encrypt', 'decrypt']
    );
  }

  static async encrypt(plaintext) {
    try {
      const key = await this.getKey();
      const encoder = new TextEncoder();
      const data = encoder.encode(plaintext);
      
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        data
      );

      const combined = new Uint8Array(iv.length + encrypted.byteLength);
      combined.set(iv);
      combined.set(new Uint8Array(encrypted), iv.length);
      
      return btoa(String.fromCharCode(...combined));
    } catch (error) {
      console.error('Extension encryption failed:', error);
      throw error;
    }
  }

  static async decrypt(ciphertext) {
    try {
      const key = await this.getKey();
      const combined = new Uint8Array(
        atob(ciphertext).split('').map(char => char.charCodeAt(0))
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
      console.error('Extension decryption failed:', error);
      throw error;
    }
  }

  static async storeSecure(key, value) {
    const encrypted = await this.encrypt(JSON.stringify(value));
    await chrome.storage.local.set({ [`secure_${key}`]: encrypted });
  }

  static async getSecure(key) {
    try {
      const result = await chrome.storage.local.get([`secure_${key}`]);
      const encrypted = result[`secure_${key}`];
      
      if (!encrypted) return null;
      
      const decrypted = await this.decrypt(encrypted);
      return JSON.parse(decrypted);
    } catch (error) {
      console.error('Failed to retrieve secure data:', error);
      return null;
    }
  }

  static async removeSecure(key) {
    await chrome.storage.local.remove([`secure_${key}`]);
  }

  static async clearAllSecure() {
    const items = await chrome.storage.local.get();
    const secureKeys = Object.keys(items).filter(key => key.startsWith('secure_'));
    if (secureKeys.length > 0) {
      await chrome.storage.local.remove(secureKeys);
    }
  }
}

// Enhanced session management for extension
class ExtensionSessionManager {
  static SESSION_TIMEOUT = 120 * 60 * 1000; // 2 hours
  static CHECK_INTERVAL = 5 * 60 * 1000; // Check every 5 minutes
  
  static async storeSession(sessionData) {
    const sessionWithTimestamp = {
      ...sessionData,
      storedAt: Date.now(),
      expiresAt: Date.now() + this.SESSION_TIMEOUT
    };
    
    await ExtensionSecureStorage.storeSecure('user_session', sessionWithTimestamp);
  }

  static async getValidSession() {
    const session = await ExtensionSecureStorage.getSecure('user_session');
    
    if (!session) return null;
    
    // Check if session is expired
    if (Date.now() > session.expiresAt) {
      await this.clearSession();
      return null;
    }
    
    return session;
  }

  static async clearSession() {
    await ExtensionSecureStorage.removeSecure('user_session');
    await ExtensionSecureStorage.removeSecure('user_stats');
    await ExtensionSecureStorage.removeSecure('auth_token');
  }

  static async refreshSession() {
    const session = await this.getValidSession();
    if (!session) return false;

    // Extend session expiry
    const extendedSession = {
      ...session,
      expiresAt: Date.now() + this.SESSION_TIMEOUT
    };
    
    await ExtensionSecureStorage.storeSecure('user_session', extendedSession);
    return true;
  }
}

// Enhanced sync function with secure storage
async function syncUserSessionSecure() {
  try {
    // Get session from main app domain with security checks
    const cookies = await chrome.cookies.getAll({
      domain: new URL(BONKBACK_APP_BASE).hostname
    });

    const authCookie = cookies.find(cookie => 
      cookie.name.includes('supabase') && cookie.name.includes('auth')
    );

    if (authCookie && authCookie.value) {
      // Parse and validate the session
      const sessionData = JSON.parse(decodeURIComponent(authCookie.value));
      
      // Validate session structure and expiry
      if (sessionData.access_token && sessionData.expires_at) {
        const expiresAt = new Date(sessionData.expires_at * 1000);
        const now = new Date();
        
        if (expiresAt > now) {
          // Store session securely
          await ExtensionSessionManager.storeSession(sessionData);
          
          // Fetch user stats with the token
          await fetchUserDataSecure(sessionData.access_token);
          
          console.log('Secure session sync completed');
        } else {
          console.warn('Session expired, clearing stored data');
          await ExtensionSessionManager.clearSession();
        }
      }
    } else {
      // No valid auth cookie found
      await ExtensionSessionManager.clearSession();
    }
  } catch (error) {
    console.error('Secure session sync failed:', error);
    await ExtensionSessionManager.clearSession();
  }
}

// Enhanced user data fetch with secure storage
async function fetchUserDataSecure(token) {
  try {
    const response = await fetch(`${BONKBACK_APP_BASE}/functions/v1/get-user-stats`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({})
    });

    if (response.ok) {
      const userData = await response.json();
      
      // Store user stats securely
      await ExtensionSecureStorage.storeSecure('user_stats', userData);
      
      console.log('User stats updated securely');
    } else {
      console.error('Failed to fetch user stats:', response.status);
    }
  } catch (error) {
    console.error('Error fetching user data:', error);
  }
}

// Enhanced message handler with security validation
async function handleMessageSecure(message, sender, sendResponse) {
  try {
    // Validate message source
    if (!sender.tab && message.type !== 'GET_USER_SESSION' && message.type !== 'SYNC_SESSION') {
      console.warn('Unauthorized message source');
      sendResponse({ error: 'Unauthorized' });
      return;
    }

    switch (message.type) {
      case 'GET_USER_SESSION':
        const session = await ExtensionSessionManager.getValidSession();
        sendResponse({ session });
        break;

      case 'SYNC_SESSION':
        await syncUserSessionSecure();
        await ExtensionSessionManager.refreshSession();
        sendResponse({ success: true });
        break;

      case 'LOGOUT':
        await ExtensionSessionManager.clearSession();
        sendResponse({ success: true });
        break;

      default:
        // Handle other message types from original background script
        console.log('Unhandled message type:', message.type);
        sendResponse({ error: 'Unknown message type' });
    }
  } catch (error) {
    console.error('Message handling error:', error);
    sendResponse({ error: error.message });
  }
}

// Set up periodic session validation
chrome.alarms.create('validateSession', { periodInMinutes: 5 });
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'validateSession') {
    const session = await ExtensionSessionManager.getValidSession();
    if (!session) {
      console.log('Session validation failed, clearing data');
      await ExtensionSessionManager.clearSession();
    }
  }
});

// Replace original message listener with secure version
chrome.runtime.onMessage.removeListener(handleMessage);
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessageSecure(message, sender, sendResponse);
  return true; // Indicate async response
});

// Initialize secure storage on extension startup
chrome.runtime.onStartup.addListener(async () => {
  console.log('Extension started, validating stored sessions');
  const session = await ExtensionSessionManager.getValidSession();
  if (!session) {
    await ExtensionSessionManager.clearSession();
  }
});

console.log('Secure background script loaded');