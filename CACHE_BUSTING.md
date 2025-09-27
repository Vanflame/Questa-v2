# Cache Busting System for Questa

This document explains the cache busting implementation in the Questa static website.

## Overview

Static websites often suffer from aggressive browser caching, which can prevent users from seeing updates immediately. This cache busting system ensures that users always get the latest version of your files.

## Implementation

### 1. Cache Buster Utility (`assets/js/cache-buster.js`)

The main cache busting utility provides:
- Automatic cache busting for all resources on page load
- Helper functions for dynamic resource loading
- Centralized version management

**Key Functions:**
- `addCacheBuster(url, version)` - Adds cache busting parameter to URLs
- `loadScript(src, callback)` - Dynamically load scripts with cache busting
- `loadCSS(href, callback)` - Dynamically load CSS with cache busting
- `clearCache()` - Force cache clear and page reload

### 2. HTML Files

All HTML files include cache busting parameters:
```html
<link rel="stylesheet" href="/assets/css/styles.css?v=2">
<script src="/assets/js/cache-buster.js?v=2"></script>
```

### 3. Dynamic Resource Loading

JavaScript files that dynamically load resources use the cache buster utility:
```javascript
// Before
img.src = imageUrl;

// After
img.src = window.CacheBuster ? window.CacheBuster.addCacheBuster(imageUrl) : imageUrl;
```

## Usage

### Updating Cache Version

When you need to force cache invalidation:

1. **Manual Update:**
   - Edit `assets/js/cache-buster.js`
   - Change `CACHE_VERSION = '2'` to `CACHE_VERSION = '3'`
   - Update all HTML files to use `?v=3`

2. **Using the Update Script:**
   ```bash
   node update-cache-version.js 3
   ```

### Adding New Resources

When adding new CSS or JS files:

1. **In HTML files:**
   ```html
   <link rel="stylesheet" href="/assets/css/new-file.css?v=2">
   <script src="/assets/js/new-file.js?v=2"></script>
   ```

2. **In JavaScript (dynamic loading):**
   ```javascript
   // Use the utility functions
   window.CacheBuster.loadCSS('/assets/css/new-file.css');
   window.CacheBuster.loadScript('/assets/js/new-file.js');
   ```

## Best Practices

1. **Version Management:**
   - Increment version number when deploying updates
   - Use consistent version numbers across all files
   - Document version changes in deployment notes

2. **External Resources:**
   - Don't add cache busting to CDN URLs (Google Fonts, Supabase, etc.)
   - Only apply to local assets

3. **Testing:**
   - Test with hard refresh (Ctrl+F5) after updates
   - Check browser developer tools for correct cache headers
   - Verify all resources load with new version numbers

## Troubleshooting

### Resources Not Updating

1. Check if cache busting parameters are present in URLs
2. Verify version numbers are consistent across files
3. Clear browser cache manually if needed
4. Check if CDN caching is interfering

### Performance Impact

- Cache busting adds minimal overhead
- Only affects initial page load
- Subsequent loads use cached resources normally

## Files Modified

- `assets/js/cache-buster.js` - Main utility
- `index.html` - Landing page
- `login/index.html` - Login page
- `register/index.html` - Registration page
- `dashboard/index.html` - User dashboard
- `admin/index.html` - Admin panel
- `assets/js/wallet.js` - Dynamic receipt downloads
- `assets/js/admin-tasks.js` - Dynamic image previews
- `update-cache-version.js` - Version update script

## Version History

- v2 - Initial implementation with comprehensive cache busting
