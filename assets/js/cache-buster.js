/**
 * Cache Busting Utility for Questa
 * Provides consistent cache busting across the application
 */

// Cache busting version - increment this when deploying updates
const CACHE_VERSION = '9';

/**
 * Add cache busting parameter to a URL
 * @param {string} url - The URL to add cache busting to
 * @param {string} version - Optional version override (defaults to CACHE_VERSION)
 * @returns {string} URL with cache busting parameter
 */
function addCacheBuster(url, version = CACHE_VERSION) {
    if (!url) return url;
    
    // Skip external URLs (CDNs, etc.)
    if (url.startsWith('http://') || url.startsWith('https://')) {
        return url;
    }
    
    // Skip URLs that already have cache busting
    if (url.includes('?v=') || url.includes('&v=')) {
        return url;
    }
    
    // Add cache busting parameter
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}v=${version}`;
}

/**
 * Cache bust all script and link elements in the document
 * This should be called early in the page load process
 */
function cacheBustResources() {
    // Cache bust CSS files
    const linkElements = document.querySelectorAll('link[rel="stylesheet"]');
    linkElements.forEach(link => {
        if (link.href && !link.href.includes('fonts.googleapis.com')) {
            link.href = addCacheBuster(link.href);
        }
    });
    
    // Cache bust script files
    const scriptElements = document.querySelectorAll('script[src]');
    scriptElements.forEach(script => {
        if (script.src && !script.src.includes('cdn.jsdelivr.net')) {
            script.src = addCacheBuster(script.src);
        }
    });
    
    // Cache bust image elements
    const imgElements = document.querySelectorAll('img[src]');
    imgElements.forEach(img => {
        if (img.src && !img.src.startsWith('data:')) {
            img.src = addCacheBuster(img.src);
        }
    });
}

/**
 * Dynamically load a script with cache busting
 * @param {string} src - Script source URL
 * @param {Function} callback - Optional callback function
 * @param {string} type - Script type (default: 'text/javascript')
 */
function loadScript(src, callback = null, type = 'text/javascript') {
    const script = document.createElement('script');
    script.type = type;
    script.src = addCacheBuster(src);
    
    if (callback) {
        script.onload = callback;
        script.onerror = () => console.error(`Failed to load script: ${src}`);
    }
    
    document.head.appendChild(script);
}

/**
 * Dynamically load a CSS file with cache busting
 * @param {string} href - CSS file URL
 * @param {Function} callback - Optional callback function
 */
function loadCSS(href, callback = null) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = addCacheBuster(href);
    
    if (callback) {
        link.onload = callback;
        link.onerror = () => console.error(`Failed to load CSS: ${href}`);
    }
    
    document.head.appendChild(link);
}

/**
 * Get the current cache version
 * @returns {string} Current cache version
 */
function getCacheVersion() {
    return CACHE_VERSION;
}

/**
 * Update cache version and reload the page
 * This can be used for manual cache clearing
 */
function clearCache() {
    // Store new version in localStorage
    localStorage.setItem('questa_cache_version', (parseInt(CACHE_VERSION) + 1).toString());
    
    // Reload the page
    window.location.reload();
}

// Auto-cache bust resources when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', cacheBustResources);
} else {
    cacheBustResources();
}

// Export functions for use in other modules
window.CacheBuster = {
    addCacheBuster,
    cacheBustResources,
    loadScript,
    loadCSS,
    getCacheVersion,
    clearCache
};
