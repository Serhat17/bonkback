/**
 * BonkBack Browser Extension - Content Script
 * Runs on all pages to detect partner sites and track user activity
 */

(function() {
  'use strict';

  // Prevent multiple initializations
  if (window.bonkbackContentScript) return;
  window.bonkbackContentScript = true;

  const PARTNER_DOMAINS = [
    'amazon.com', 'amazon.co.uk', 'amazon.de', 'amazon.fr', 'amazon.it', 'amazon.es',
    'ebay.com', 'ebay.co.uk', 'ebay.de', 'ebay.fr', 'ebay.it', 'ebay.es',
    'walmart.com'
  ];

  // Check if current site is a partner
  const currentDomain = window.location.hostname.replace('www.', '');
  const isPartnerSite = PARTNER_DOMAINS.some(domain => currentDomain.includes(domain));

  if (isPartnerSite) {
    initializePartnerTracking();
  }

  /**
   * Initialize tracking on partner sites
   */
  function initializePartnerTracking() {
    console.log('BonkBack: Partner site detected -', currentDomain);

    // Inject notification styles
    injectNotificationStyles();

    // Track referral parameters
    trackReferralParameters();

    // Monitor for purchase completion
    monitorPurchaseCompletion();

    // Show tracking notification
    showTrackingNotification();
  }

  /**
   * Track referral parameters in URL
   */
  function trackReferralParameters() {
    const urlParams = new URLSearchParams(window.location.search);
    const affiliateParam = getAffiliateParam();
    
    if (urlParams.has(affiliateParam) && urlParams.get(affiliateParam).includes('bonkback')) {
      // Store referral tracking data
      chrome.runtime.sendMessage({
        type: 'REFERRAL_TRACKED',
        data: {
          merchant: currentDomain,
          affiliateId: urlParams.get(affiliateParam),
          url: window.location.href,
          timestamp: Date.now()
        }
      });
    }
  }

  /**
   * Get affiliate parameter name for current merchant
   */
  function getAffiliateParam() {
    if (currentDomain.includes('amazon')) return 'tag';
    if (currentDomain.includes('ebay')) return 'campid';
    if (currentDomain.includes('walmart')) return 'sourceid';
    return 'ref';
  }

  /**
   * Monitor for purchase completion
   */
  function monitorPurchaseCompletion() {
    // Check immediately
    checkForPurchase();

    // Set up mutation observer for dynamic content
    const observer = new MutationObserver(debounce(checkForPurchase, 2000));
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true
    });

    // Also check on navigation events
    window.addEventListener('popstate', () => {
      setTimeout(checkForPurchase, 1000);
    });
  }

  /**
   * Check if current page indicates a completed purchase
   */
  function checkForPurchase() {
    try {
      const purchaseData = detectPurchaseCompletion();
      if (purchaseData) {
        chrome.runtime.sendMessage({
          type: 'PURCHASE_DETECTED',
          data: purchaseData
        });
      }
    } catch (error) {
      console.error('BonkBack: Error checking for purchase:', error);
    }
  }

  /**
   * Detect purchase completion and extract order details
   */
  function detectPurchaseCompletion() {
    const bodyText = document.body.textContent.toLowerCase();
    
    // Purchase confirmation keywords
    const purchaseKeywords = [
      'order confirmation', 'order placed', 'purchase complete',
      'thank you for your order', 'order received', 'payment successful',
      'your order has been placed', 'order summary', 'receipt'
    ];

    const isPurchasePage = purchaseKeywords.some(keyword => 
      bodyText.includes(keyword)
    );

    if (!isPurchasePage) return null;

    // Extract order amount
    const orderAmount = extractOrderAmount();
    if (!orderAmount) return null;

    // Extract order ID
    const orderId = extractOrderId();

    return {
      amount: orderAmount,
      orderId: orderId || generateFallbackOrderId(),
      url: window.location.href,
      timestamp: Date.now(),
      merchant: getMerchantName()
    };
  }

  /**
   * Extract order amount from page
   */
  function extractOrderAmount() {
    const selectors = getOrderAmountSelectors();
    
    for (const selector of selectors) {
      const elements = document.querySelectorAll(selector);
      for (const element of elements) {
        const text = element.textContent || element.value || '';
        const amount = parseAmountFromText(text);
        if (amount && amount > 0) {
          return amount;
        }
      }
    }

    // Fallback: search for price patterns in page text
    const priceRegex = /(?:total|subtotal|amount|price)[:\s]*\$?([0-9,]+\.?[0-9]*)/gi;
    const matches = document.body.textContent.match(priceRegex);
    if (matches) {
      for (const match of matches) {
        const amount = parseAmountFromText(match);
        if (amount && amount > 5) { // Minimum threshold
          return amount;
        }
      }
    }

    return null;
  }

  /**
   * Get order amount selectors for current merchant
   */
  function getOrderAmountSelectors() {
    const baseSelectors = [
      '[data-testid*="total"]', '[data-testid*="amount"]', '[data-testid*="price"]',
      '.total', '.grand-total', '.order-total', '.final-price',
      '#total', '#grand-total', '#order-total', '#final-price',
      '.price-total', '.checkout-total', '.payment-total'
    ];

    if (currentDomain.includes('amazon')) {
      return [
        '#grand-total-price', '.grand-total-price', '[data-testid="order-total"]',
        '.a-price-whole', '.a-price-decimal', ...baseSelectors
      ];
    }

    if (currentDomain.includes('ebay')) {
      return [
        '.total-price', '#total-amount', '.order-total', '.summary-total',
        ...baseSelectors
      ];
    }

    if (currentDomain.includes('walmart')) {
      return [
        '.order-total', '#total-price', '.grand-total', '.checkout-total',
        ...baseSelectors
      ];
    }

    return baseSelectors;
  }

  /**
   * Extract order ID from page
   */
  function extractOrderId() {
    const selectors = [
      '[data-testid*="order"], [data-testid*="confirmation"]',
      '.order-id', '.order-number', '.confirmation-number', '.tracking-number',
      '#order-id', '#order-number', '#confirmation-number', '#tracking-number'
    ];

    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element) {
        const text = element.textContent.trim();
        if (text && text.length > 3) {
          return text;
        }
      }
    }

    // Search for order ID patterns in text
    const orderIdRegex = /(?:order|confirmation|tracking)[:\s#]*([A-Z0-9\-]{6,})/gi;
    const match = document.body.textContent.match(orderIdRegex);
    if (match && match[1]) {
      return match[1];
    }

    return null;
  }

  /**
   * Parse amount from text string
   */
  function parseAmountFromText(text) {
    if (!text) return null;
    
    // Remove currency symbols and extract numbers
    const cleanText = text.replace(/[^\d.,]/g, '');
    const amount = parseFloat(cleanText.replace(/,/g, ''));
    
    return isNaN(amount) ? null : amount;
  }

  /**
   * Generate fallback order ID
   */
  function generateFallbackOrderId() {
    return `BONK_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get merchant name from domain
   */
  function getMerchantName() {
    if (currentDomain.includes('amazon')) return 'Amazon';
    if (currentDomain.includes('ebay')) return 'eBay';
    if (currentDomain.includes('walmart')) return 'Walmart';
    return currentDomain;
  }

  /**
   * Show tracking notification
   */
  function showTrackingNotification() {
    const notification = createNotificationElement(
      '🎯 BonkBack tracking active',
      `Earn cashback on your ${getMerchantName()} purchases!`,
      'tracking'
    );
    
    showNotification(notification, 4000);
  }

  /**
   * Inject notification styles
   */
  function injectNotificationStyles() {
    if (document.getElementById('bonkback-styles')) return;

    const styles = document.createElement('style');
    styles.id = 'bonkback-styles';
    styles.textContent = `
      .bonkback-notification {
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, hsl(215 28% 8%), hsl(215 25% 10%));
        color: hsl(210 20% 98%);
        border: 1px solid hsl(215 20% 20%);
        border-radius: 16px;
        padding: 16px 20px;
        box-shadow: 0 25px 50px -12px hsl(0 0% 0% / 0.4);
        z-index: 2147483647;
        font-family: 'Inter', system-ui, sans-serif;
        font-size: 14px;
        max-width: 320px;
        backdrop-filter: blur(12px);
        transform: translateX(100%);
        transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      }
      
      .bonkback-notification.show {
        transform: translateX(0);
      }
      
      .bonkback-notification-title {
        font-weight: 600;
        margin-bottom: 4px;
        color: hsl(45 96% 53%);
      }
      
      .bonkback-notification-message {
        color: hsl(215 16% 65%);
        font-size: 13px;
        line-height: 1.4;
      }
      
      .bonkback-notification-close {
        position: absolute;
        top: 8px;
        right: 8px;
        background: none;
        border: none;
        color: hsl(215 16% 65%);
        cursor: pointer;
        font-size: 18px;
        padding: 4px;
        border-radius: 4px;
        transition: color 0.2s ease;
      }
      
      .bonkback-notification-close:hover {
        color: hsl(210 20% 98%);
      }
    `;
    
    document.head.appendChild(styles);
  }

  /**
   * Create notification element
   */
  function createNotificationElement(title, message, type) {
    const notification = document.createElement('div');
    notification.className = 'bonkback-notification';
    
    // Sanitize inputs to prevent XSS
    const sanitizedTitle = title.replace(/[<>&"']/g, (match) => {
      const escapeMap = { '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#x27;' };
      return escapeMap[match];
    });
    
    const sanitizedMessage = message.replace(/[<>&"']/g, (match) => {
      const escapeMap = { '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#x27;' };
      return escapeMap[match];
    });
    
    notification.innerHTML = `
      <button class="bonkback-notification-close" aria-label="Close notification">&times;</button>
      <div class="bonkback-notification-title">${sanitizedTitle}</div>
      <div class="bonkback-notification-message">${sanitizedMessage}</div>
    `;
    
    notification.querySelector('.bonkback-notification-close').addEventListener('click', () => {
      hideNotification(notification);
    });
    
    return notification;
  }

  /**
   * Show notification
   */
  function showNotification(notification, duration = 5000) {
    document.body.appendChild(notification);
    
    // Trigger animation
    setTimeout(() => notification.classList.add('show'), 100);
    
    // Auto-hide
    setTimeout(() => hideNotification(notification), duration);
  }

  /**
   * Hide notification
   */
  function hideNotification(notification) {
    notification.classList.remove('show');
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  }

  /**
   * Debounce function
   */
  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  console.log('BonkBack content script initialized');
})();