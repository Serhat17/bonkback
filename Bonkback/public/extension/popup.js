/**
 * BonkBack Browser Extension - Popup Script
 * Handles the extension popup interface and user interactions
 */

const BONKBACK_APP_BASE = 'https://app.bonkback.com';

class BonkBackPopup {
  constructor() {
    this.isLoading = false;
    this.userSession = null;
    this.trackingStatus = null;
    this.initializePromise = null;
    
    this.init();
  }

  async init() {
    // Prevent multiple initializations
    if (this.initializePromise) {
      return this.initializePromise;
    }

    this.initializePromise = this._performInit();
    return this.initializePromise;
  }

  async _performInit() {
    console.log('BonkBack extension popup initializing...');
    
    try {
      this.showLoading(true);
      
      // Set up event listeners first (non-async)
      this.setupEventListeners();
      
      // Load data in parallel with timeouts
      const loadPromises = [
        this.loadTrackingStatusWithTimeout(),
        this.loadUserSessionWithTimeout()
      ];
      
      await Promise.allSettled(loadPromises);
      
      // Load user stats if logged in
      if (this.userSession) {
        await this.loadUserStatsWithTimeout();
      }
      
      // Update UI
      this.updateUI();
      
      console.log('BonkBack extension popup initialized successfully');
      
    } catch (error) {
      console.error('Failed to initialize popup:', error);
      this.showError('Failed to load extension data');
      
      // Still show UI with fallback data
      this.updateUI();
    } finally {
      this.showLoading(false);
    }
  }

  async loadTrackingStatusWithTimeout() {
    return Promise.race([
      this.loadTrackingStatus(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Tracking status timeout')), 3000)
      )
    ]).catch(error => {
      console.warn('Failed to load tracking status:', error);
      this.trackingStatus = { isTracking: false };
    });
  }

  async loadUserSessionWithTimeout() {
    return Promise.race([
      this.loadUserSession(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('User session timeout')), 3000)
      )
    ]).catch(error => {
      console.warn('Failed to load user session:', error);
      this.userSession = null;
    });
  }

  async loadUserStatsWithTimeout() {
    return Promise.race([
      this.loadUserStats(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('User stats timeout')), 3000)
      )
    ]).catch(error => {
      console.warn('Failed to load user stats:', error);
      this.userStats = null;
    });
  }

  async loadTrackingStatus() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab) {
        this.trackingStatus = { isTracking: false };
        return;
      }

      const response = await chrome.runtime.sendMessage({
        type: 'GET_TRACKING_STATUS'
      });

      this.trackingStatus = response?.status || { isTracking: false };
      this.currentTab = tab;
    } catch (error) {
      console.error('Failed to load tracking status:', error);
      this.trackingStatus = { isTracking: false };
    }
  }

  async loadUserSession() {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'GET_USER_SESSION'
      });

      this.userSession = response?.session || null;
    } catch (error) {
      console.error('Failed to load user session:', error);
      this.userSession = null;
    }
  }

  async loadUserStats() {
    if (!this.userSession) return;

    try {
      // Mock stats for now - would integrate with actual API
      const stats = {
        pendingCashback: '12.45',
        totalEarned: '156.78',
        bonkBalance: '10456789',
        activeOffers: '8'
      };

      this.userStats = stats;
    } catch (error) {
      console.error('Failed to load user stats:', error);
      this.userStats = null;
    }
  }

  setupEventListeners() {
    // Dashboard button
    document.getElementById('open-dashboard').addEventListener('click', () => {
      this.openURL(`${BONKBACK_APP_BASE}/dashboard`);
    });

    // Offers button
    document.getElementById('view-offers').addEventListener('click', () => {
      this.openURL(`${BONKBACK_APP_BASE}/offers`);
    });

    // Sync session button
    document.getElementById('sync-session').addEventListener('click', async () => {
      await this.syncSession();
    });

    // Auth button
    document.getElementById('auth-button').addEventListener('click', () => {
      if (this.userSession) {
        this.logout();
      } else {
        this.openURL(`${BONKBACK_APP_BASE}/auth`);
      }
    });
  }

  updateUI() {
    this.updateTrackingStatus();
    this.updateUserStats();
    this.updateAuthButton();
  }

  updateTrackingStatus() {
    const statusCard = document.getElementById('status-card');
    const statusIcon = document.getElementById('status-icon');
    const statusMessage = document.getElementById('status-message');
    const statusDetails = document.getElementById('status-details');

    if (!statusCard || !statusIcon || !statusMessage || !statusDetails) {
      console.warn('Status elements not found in DOM');
      return;
    }

    if (this.trackingStatus?.isTracking) {
      statusCard.className = 'status-card tracking';
      statusIcon.textContent = '✅';
      statusMessage.textContent = `Tracking active on ${this.trackingStatus.merchant}`;
      statusDetails.textContent = `Earn ${this.trackingStatus.rate}% cashback on purchases`;
    } else {
      statusCard.className = 'status-card inactive';
      statusIcon.textContent = '🔍';
      statusMessage.textContent = 'Not currently on a partner site';
      statusDetails.textContent = 'Visit Amazon, eBay, or Walmart to start earning';
    }
  }

  updateUserStats() {
    const elements = {
      pendingCashback: document.getElementById('pending-cashback'),
      totalEarned: document.getElementById('total-earned'),
      bonkBalance: document.getElementById('bonk-balance'),
      activeOffers: document.getElementById('active-offers')
    };

    // Check if all elements exist
    const missingElements = Object.entries(elements)
      .filter(([key, element]) => !element)
      .map(([key]) => key);

    if (missingElements.length > 0) {
      console.warn('Missing stat elements:', missingElements);
      return;
    }

    if (this.userStats) {
      elements.pendingCashback.textContent = `$${this.userStats.pendingCashback}`;
      elements.totalEarned.textContent = `$${this.userStats.totalEarned}`;
      elements.bonkBalance.textContent = parseInt(this.userStats.bonkBalance).toLocaleString();
      elements.activeOffers.textContent = this.userStats.activeOffers;
    } else {
      elements.pendingCashback.textContent = '$0.00';
      elements.totalEarned.textContent = '$0.00';
      elements.bonkBalance.textContent = '0';
      elements.activeOffers.textContent = '0';
    }
  }

  updateAuthButton() {
    const authButton = document.getElementById('auth-button');
    const authText = document.getElementById('auth-text');

    if (!authButton || !authText) {
      console.warn('Auth button elements not found in DOM');
      return;
    }

    if (this.userSession) {
      authText.textContent = 'Logout';
      authButton.className = 'btn btn-outline';
    } else {
      authText.textContent = 'Login to BonkBack';
      authButton.className = 'btn btn-primary';
    }
  }

  async syncSession() {
    try {
      this.showLoading(true, 'Syncing session...');

      await chrome.runtime.sendMessage({
        type: 'SYNC_SESSION'
      });

      // Reload data
      await this.loadUserSession();
      if (this.userSession) {
        await this.loadUserStats();
      }

      this.updateUI();
      this.showSuccess('Session synced successfully');

    } catch (error) {
      console.error('Failed to sync session:', error);
      this.showError('Failed to sync session');
    } finally {
      this.showLoading(false);
    }
  }

  async logout() {
    try {
      // Clear local session data
      await chrome.storage.local.remove(['userSession']);
      this.userSession = null;
      this.userStats = null;
      
      this.updateUI();
      this.showSuccess('Logged out successfully');
    } catch (error) {
      console.error('Failed to logout:', error);
      this.showError('Failed to logout');
    }
  }

  openURL(url) {
    chrome.tabs.create({ url });
    window.close();
  }

  showLoading(show, message = 'Loading...') {
    const overlay = document.getElementById('loading-overlay');
    const loadingText = document.querySelector('.loading-text');
    
    if (!overlay) {
      console.warn('Loading overlay not found in DOM');
      return;
    }
    
    if (show) {
      if (loadingText) {
        loadingText.textContent = message;
      }
      overlay.classList.add('show');
    } else {
      overlay.classList.remove('show');
    }
    
    this.isLoading = show;
  }

  showSuccess(message) {
    this.showNotification(message, 'success');
  }

  showError(message) {
    this.showNotification(message, 'error');
  }

  showNotification(message, type = 'info') {
    // Simple notification - could be enhanced with toast component
    console.log(`${type.toUpperCase()}: ${message}`);
    
    // Update status message temporarily
    const statusMessage = document.getElementById('status-message');
    const originalMessage = statusMessage.textContent;
    
    statusMessage.textContent = message;
    statusMessage.style.color = type === 'error' ? '#ef4444' : 
                               type === 'success' ? '#22c55e' : 
                               'var(--muted-foreground)';
    
    setTimeout(() => {
      statusMessage.textContent = originalMessage;
      statusMessage.style.color = 'var(--muted-foreground)';
    }, 3000);
  }
}

// Initialize popup when DOM is loaded
let popupInstance = null;

document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM loaded, initializing BonkBack popup...');
  
  if (popupInstance) {
    console.warn('Popup already initialized');
    return;
  }
  
  try {
    popupInstance = new BonkBackPopup();
    window.bonkbackPopup = popupInstance;
  } catch (error) {
    console.error('Failed to initialize popup:', error);
    
    // Show fallback UI
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
      overlay.classList.remove('show');
    }
    
    const statusMessage = document.getElementById('status-message');
    if (statusMessage) {
      statusMessage.textContent = 'Extension error - please refresh';
      statusMessage.style.color = '#ef4444';
    }
  }
});

// Handle tab updates (with debouncing)
let tabUpdateTimeout = null;
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.active && popupInstance) {
    // Clear previous timeout
    if (tabUpdateTimeout) {
      clearTimeout(tabUpdateTimeout);
    }
    
    // Debounce tab updates
    tabUpdateTimeout = setTimeout(async () => {
      try {
        await popupInstance.loadTrackingStatusWithTimeout();
        popupInstance.updateTrackingStatus();
      } catch (error) {
        console.error('Failed to update tracking status on tab change:', error);
      }
    }, 500);
  }
});