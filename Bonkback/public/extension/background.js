/**
 * BonkBack Browser Extension - Background Service Worker
 * Handles session management, partner site detection, and data sync
 */

// Configuration - dynamically determined from environment
const getApiConfig = () => {
  // In production, use the actual domain
  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getManifest) {
    const manifest = chrome.runtime.getManifest();
    const isDev = manifest.version.includes('dev') || manifest.name.includes('Dev');
    
    return {
      API_BASE: isDev 
        ? 'https://lnachtwjumapjmabrrrp.supabase.co' 
        : 'https://lnachtwjumapjmabrrrp.supabase.co',
      APP_BASE: isDev 
        ? 'https://app.bonkback.com' 
        : 'https://app.bonkback.com'
    };
  }
  
  // Fallback
  return {
    API_BASE: 'https://lnachtwjumapjmabrrrp.supabase.co',
    APP_BASE: 'https://app.bonkback.com'
  };
};

const { API_BASE: BONKBACK_API_BASE, APP_BASE: BONKBACK_APP_BASE } = getApiConfig();

// Partner merchant configuration
const PARTNER_MERCHANTS = {
  'amazon.com': { 
    name: 'Amazon', 
    rate: 2.5, 
    affiliate: 'bonkback-20',
    selectors: {
      orderTotal: ['#grand-total-price', '.grand-total-price', '[data-testid="order-total"]'],
      orderId: ['[data-testid="order-id"]', '.order-id', '#order-id']
    }
  },
  'ebay.com': { 
    name: 'eBay', 
    rate: 1.5, 
    affiliate: 'bonkback',
    selectors: {
      orderTotal: ['.total-price', '#total-amount', '.order-total'],
      orderId: ['.order-number', '#order-id', '.confirmation-number']
    }
  },
  'walmart.com': { 
    name: 'Walmart', 
    rate: 2.0, 
    affiliate: 'bonkback',
    selectors: {
      orderTotal: ['.order-total', '#total-price', '.grand-total'],
      orderId: ['.order-id', '#confirmation-number', '.tracking-number']
    }
  }
};

// Extension installation and setup
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('BonkBack extension installed/updated');
  
  // Initialize storage
  await chrome.storage.local.set({
    version: '2.0.0',
    installDate: Date.now(),
    isEnabled: true
  });

  // Sync user session from main app
  await syncUserSession();
});

// Tab navigation listener for partner site detection (removed webNavigation permission)
// Now uses activeTab only when extension is actively used
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status !== 'complete' || !tab.url) return;
  
  try {
    const url = new URL(tab.url);
    const domain = url.hostname.replace('www.', '');
    const merchant = findPartnerMerchant(domain);
    
    if (merchant) {
      // Only set badge, don't auto-inject
      await chrome.action.setBadgeText({ text: '🎯', tabId: tabId });
      await chrome.action.setBadgeBackgroundColor({ color: '#FACC15', tabId: tabId });
    } else {
      await chrome.action.setBadgeText({ text: '', tabId: tabId });
    }
  } catch (error) {
    console.error('Error handling tab update:', error);
  }
});

// Message handling from content scripts and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessage(message, sender, sendResponse);
  return true; // Keep message channel open for async responses
});

// Alarm for periodic sync
chrome.alarms.create('syncUserData', { periodInMinutes: 5 });
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'syncUserData') {
    await syncUserSession();
  }
});

// Core Functions

/**
 * Find matching partner merchant for domain
 */
function findPartnerMerchant(domain) {
  return Object.keys(PARTNER_MERCHANTS).find(merchantDomain => 
    domain.includes(merchantDomain)
  );
}

/**
 * Handle partner site visit
 */
async function handlePartnerSiteVisit(tabId, merchantKey, url) {
  const merchant = PARTNER_MERCHANTS[merchantKey];
  
  // Set tracking badge
  await chrome.action.setBadgeText({
    text: '🎯',
    tabId: tabId
  });
  
  await chrome.action.setBadgeBackgroundColor({
    color: '#FACC15', // Primary color from design system
    tabId: tabId
  });

  // Inject tracking script
  await chrome.scripting.executeScript({
    target: { tabId: tabId },
    func: initializeTracking,
    args: [merchant, url.href]
  });

  // Store visit data
  await chrome.storage.local.set({
    [`visit_${tabId}`]: {
      merchant: merchantKey,
      url: url.href,
      timestamp: Date.now(),
      affiliate: merchant.affiliate
    }
  });
}

/**
 * Sync user session with main app (using secure method)
 */
async function syncUserSession() {
  try {
    // Check if we have stored authentication
    const stored = await chrome.storage.local.get(['userSession']);
    if (stored.userSession && stored.userSession.token) {
      // Validate existing session
      const userData = await fetchUserData(stored.userSession.token);
      if (userData) {
        console.log('User session validated successfully');
        return;
      }
    }

    // No valid session found - user needs to login through main app
    console.log('No valid session found - user should login through main app');
  } catch (error) {
    console.error('Failed to sync user session:', error);
  }
}

/**
 * Fetch user data from BonkBack API
 */
async function fetchUserData(token) {
  try {
    const response = await fetch(`${BONKBACK_API_BASE}/functions/v1/get-user-stats`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      return await response.json();
    }
  } catch (error) {
    console.error('Failed to fetch user data:', error);
  }
  return null;
}

/**
 * Handle messages from content scripts and popup
 */
async function handleMessage(message, sender, sendResponse) {
  console.log('Background received message:', message.type);
  
  try {
    switch (message.type) {
      case 'PURCHASE_DETECTED':
        await handlePurchaseDetected(message.data, sender.tab?.id);
        sendResponse({ success: true });
        break;

      case 'GET_USER_SESSION':
        try {
          const session = await chrome.storage.local.get(['userSession']);
          sendResponse({ session: session.userSession || null });
        } catch (error) {
          console.warn('Failed to get user session:', error);
          sendResponse({ session: null });
        }
        break;

      case 'GET_TRACKING_STATUS':
        try {
          const status = await getTrackingStatus(sender.tab?.id);
          sendResponse({ status: status || { isTracking: false } });
        } catch (error) {
          console.warn('Failed to get tracking status:', error);
          sendResponse({ status: { isTracking: false } });
        }
        break;

      case 'SYNC_SESSION':
        try {
          await syncUserSession();
          sendResponse({ success: true });
        } catch (error) {
          console.warn('Failed to sync session:', error);
          sendResponse({ success: false, error: error.message });
        }
        break;

      default:
        console.warn('Unknown message type:', message.type);
        sendResponse({ error: 'Unknown message type' });
    }
  } catch (error) {
    console.error('Error handling message:', error);
    sendResponse({ error: error.message });
  }
}

/**
 * Handle purchase detection from content script
 */
async function handlePurchaseDetected(purchaseData, tabId) {
  try {
    const visitData = await chrome.storage.local.get([`visit_${tabId}`]);
    const userSession = await chrome.storage.local.get(['userSession']);

    if (!visitData[`visit_${tabId}`] || !userSession.userSession) {
      throw new Error('Missing visit or session data');
    }

    const visit = visitData[`visit_${tabId}`];
    const merchant = PARTNER_MERCHANTS[visit.merchant];

    // Calculate cashback
    const cashbackAmount = (parseFloat(purchaseData.amount) * merchant.rate / 100).toFixed(2);
    const bonkAmount = Math.floor(parseFloat(cashbackAmount) / 0.000015); // Using BONK price

    // Send purchase data to API
    const response = await fetch(`${BONKBACK_API_BASE}/functions/v1/track-purchase`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${userSession.userSession.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        merchant: merchant.name,
        amount: purchaseData.amount,
        orderId: purchaseData.orderId,
        cashbackAmount: cashbackAmount,
        bonkAmount: bonkAmount,
        url: visit.url,
        affiliateId: visit.affiliate
      })
    });

    if (response.ok) {
      // Show success notification
      await chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon48.png',
        title: 'BonkBack Cashback Tracked!',
        message: `🎉 ${cashbackAmount} USD (${bonkAmount.toLocaleString()} BONK) cashback tracked for your ${merchant.name} purchase!`
      });

      // Clean up visit data
      await chrome.storage.local.remove([`visit_${tabId}`]);
    } else {
      throw new Error('Failed to track purchase');
    }
  } catch (error) {
    console.error('Error processing purchase:', error);
    
    // Show error notification
    await chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon48.png',
      title: 'BonkBack Tracking Error',
      message: 'Failed to track your purchase. Please try again or contact support.'
    });
  }
}

/**
 * Get tracking status for current tab
 */
async function getTrackingStatus(tabId) {
  if (!tabId) return { isTracking: false };

  const visitData = await chrome.storage.local.get([`visit_${tabId}`]);
  const visit = visitData[`visit_${tabId}`];

  if (visit) {
    const merchant = PARTNER_MERCHANTS[visit.merchant];
    return {
      isTracking: true,
      merchant: merchant.name,
      rate: merchant.rate,
      url: visit.url
    };
  }

  return { isTracking: false };
}

/**
 * Function injected into partner sites for tracking
 */
function initializeTracking(merchant, currentUrl) {
  // This function runs in the page context
  if (window.bonkbackTracker) return; // Already initialized

  window.bonkbackTracker = {
    merchant,
    initialized: true,
    
    // Detect purchase completion
    detectPurchase() {
      const orderSelectors = merchant.selectors.orderTotal;
      const idSelectors = merchant.selectors.orderId;
      
      let orderAmount = null;
      let orderId = null;

      // Try to find order total
      for (const selector of orderSelectors) {
        const element = document.querySelector(selector);
        if (element) {
          const text = element.textContent;
          const match = text.match(/[\d,]+\.?\d*/);
          if (match) {
            orderAmount = parseFloat(match[0].replace(/,/g, ''));
            break;
          }
        }
      }

      // Try to find order ID
      for (const selector of idSelectors) {
        const element = document.querySelector(selector);
        if (element) {
          orderId = element.textContent.trim();
          break;
        }
      }

      // Check for purchase confirmation keywords
      const bodyText = document.body.textContent.toLowerCase();
      const purchaseKeywords = [
        'order confirmation', 'purchase complete', 'order placed',
        'thank you for your order', 'order received', 'payment successful'
      ];

      const isPurchasePage = purchaseKeywords.some(keyword => 
        bodyText.includes(keyword)
      );

      if (isPurchasePage && orderAmount) {
        chrome.runtime.sendMessage({
          type: 'PURCHASE_DETECTED',
          data: {
            amount: orderAmount,
            orderId: orderId || 'unknown',
            merchant: merchant.name,
            url: currentUrl,
            timestamp: Date.now()
          }
        });
      }
    }
  };

  // Start monitoring
  window.bonkbackTracker.detectPurchase();
  
  // Monitor for dynamic content changes
  const observer = new MutationObserver(() => {
    setTimeout(() => window.bonkbackTracker.detectPurchase(), 1000);
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  console.log('BonkBack tracker initialized for', merchant.name);
}