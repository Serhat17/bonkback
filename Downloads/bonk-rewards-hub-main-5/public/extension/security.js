/* BonkBack Extension Content Security Policy */
/* This file defines security policies for the extension popup */

/* Restrict all inline scripts - use external files only */
/* Allow only self-hosted resources and approved external domains */
/* Prevent execution of eval() and similar dynamic code execution */

window.addEventListener('DOMContentLoaded', function() {
  'use strict';
  
  // Security: Disable eval and Function constructor
  window.eval = function() {
    throw new Error('eval() is disabled for security');
  };
  
  window.Function = function() {
    throw new Error('Function constructor is disabled for security');
  };
  
  // Security: CSP violation reporting
  document.addEventListener('securitypolicyviolation', function(e) {
    console.error('CSP Violation:', {
      violatedDirective: e.violatedDirective,
      blockedURI: e.blockedURI,
      lineNumber: e.lineNumber,
      sourceFile: e.sourceFile
    });
    
    // Report to background script for logging
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.sendMessage({
        type: 'CSP_VIOLATION',
        data: {
          directive: e.violatedDirective,
          uri: e.blockedURI,
          timestamp: Date.now()
        }
      });
    }
  });
  
  // Security: Sanitize any dynamic content
  function sanitizeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
  
  // Make sanitizer available globally for popup scripts
  window.BonkBackSecurity = {
    sanitizeHTML: sanitizeHTML,
    
    // Validate URLs to ensure they're from allowed domains
    validateURL: function(url) {
      try {
        const urlObj = new URL(url);
        const allowedDomains = [
          'lnachtwjumapjmabrrrp.supabase.co',
          'app.bonkback.com',
          'amazon.com', 'amazon.co.uk', 'amazon.de', 'amazon.fr', 'amazon.it', 'amazon.es',
          'ebay.com', 'ebay.co.uk', 'ebay.de', 'ebay.fr', 'ebay.it', 'ebay.es',
          'walmart.com'
        ];
        
        return allowedDomains.some(domain => 
          urlObj.hostname === domain || urlObj.hostname.endsWith('.' + domain)
        );
      } catch (e) {
        return false;
      }
    }
  };
});