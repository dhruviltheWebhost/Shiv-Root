# Website Debugging Guide

## How to Open Developer Console

### Chrome/Edge:
1. Press `F12` or `Ctrl+Shift+I` (Windows/Linux) or `Cmd+Option+I` (Mac)
2. Or right-click anywhere on the page → "Inspect" → "Console" tab
3. Or press `Ctrl+Shift+J` (Windows/Linux) or `Cmd+Option+J` (Mac) to go directly to Console

### Firefox:
1. Press `F12` or `Ctrl+Shift+I` (Windows/Linux) or `Cmd+Option+I` (Mac)
2. Or right-click → "Inspect Element" → "Console" tab

### Safari:
1. Enable Developer menu: Safari → Preferences → Advanced → "Show Develop menu in menu bar"
2. Press `Cmd+Option+C` or Develop → Show JavaScript Console

## Common Issues & Fixes

### 1. Product Cards Not Rendering
**Symptoms:** Empty product container, no products displayed
**Check Console For:** 
- Network errors (failed fetch requests)
- JavaScript errors in product fetching
- CORS issues with Google Sheets

**Debug Steps:**
1. Open Console → Network tab
2. Refresh page
3. Look for failed requests to Google Sheets
4. Check if `fetchProducts()` and `fetchAmazonProducts()` are called
5. Verify Google Sheets URLs are accessible

**Common Fixes:**
- Ensure Google Sheets are published to web
- Check sheet names match exactly ("Products" and "Amazon")
- Verify sharing permissions

### 2. Search Not Working
**Symptoms:** Search input doesn't filter products, no results
**Check Console For:**
- JavaScript errors in search functions
- Products array is empty
- Event listeners not attached

**Debug Steps:**
1. Console: `console.log(allProducts)` - should show array of products
2. Console: `console.log(amazonProducts)` - should show Amazon products
3. Check if search input has event listener: `getEventListeners(document.getElementById('product-search'))`

### 3. Navigation Links Not Scrolling
**Symptoms:** Clicking nav links doesn't scroll to sections
**Check Console For:**
- JavaScript errors in scroll functions
- Missing section IDs
- CSS conflicts

**Debug Steps:**
1. Verify section IDs exist: `#home`, `#products`, `#contact`
2. Check if smooth scrolling is enabled in CSS
3. Test scroll function: `window.scrollTo({top: 0, behavior: 'smooth'})`

### 4. Mobile Menu Not Working
**Symptoms:** Mobile menu toggle doesn't open/close
**Check Console For:**
- JavaScript errors in mobile menu functions
- CSS conflicts with `.active` class
- Missing event listeners

**Debug Steps:**
1. Check if mobile menu toggle element exists
2. Verify CSS for `.nav-menu.active` exists
3. Test toggle function manually

### 5. Notification Popup Not Working
**Symptoms:** Subscribe popup doesn't show or buttons don't work
**Check Console For:**
- JavaScript errors in popup functions
- Missing DOM elements
- Event listener errors

**Debug Steps:**
1. Check if popup elements exist: `document.getElementById('notification-popup')`
2. Verify button IDs match: `subscribe-btn`, `not-now-btn`, `close-popup-btn`
3. Check if popup is hidden by CSS

## Performance Issues

### 1. Slow Page Load
**Check:**
- Network tab for large files
- Console for JavaScript errors blocking execution
- Images not optimized
- External resources blocking

### 2. Poor Lighthouse Scores
**Performance:**
- Optimize images (WebP format)
- Minify CSS/JS
- Enable compression
- Use CDN for external resources

**Accessibility:**
- Add alt text to images
- Ensure proper heading hierarchy
- Check color contrast
- Add ARIA labels

**SEO:**
- Validate structured data
- Check meta tags
- Ensure proper heading structure
- Verify canonical URLs

## Testing Checklist

### Functionality Tests:
- [ ] Products load from Google Sheets
- [ ] Search filters products in real-time
- [ ] Navigation links scroll correctly
- [ ] Mobile menu opens/closes
- [ ] Notification popup works
- [ ] All buttons respond to clicks

### Performance Tests:
- [ ] Page loads under 3 seconds
- [ ] Images lazy load properly
- [ ] Smooth scrolling works
- [ ] No JavaScript errors in console
- [ ] Mobile responsive design works

### Browser Compatibility:
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile browsers

## Quick Debug Commands

```javascript
// Check if products loaded
console.log('All Products:', allProducts.length);
console.log('Amazon Products:', amazonProducts.length);

// Test search functionality
console.log('Search Query:', searchQuery);
console.log('Filtered Products:', getFilteredProducts().length);

// Check DOM elements
console.log('Search Input:', document.getElementById('product-search'));
console.log('Header Search:', document.getElementById('header-search'));
console.log('Popup:', document.getElementById('notification-popup'));

// Test Google Sheets URLs
fetch('https://docs.google.com/spreadsheets/d/1Ba_YRVZAxBPh76j6-UdAx0Qi_UfU1d6wKau2av9VhFs/gviz/tq?tqx=out:json&sheet=Products')
  .then(response => response.text())
  .then(data => console.log('Sheets Response:', data.substring(47).slice(0, -2)))
  .catch(error => console.error('Sheets Error:', error));
```

## Common Mistakes & Fixes

### 1. Google Sheets API Issues
**Problem:** CORS errors or failed requests
**Fix:** Ensure sheets are published to web with correct permissions

### 2. JavaScript Loading Order
**Problem:** Script runs before DOM is ready
**Fix:** Use `DOMContentLoaded` event or place script at end of body

### 3. CSS Conflicts
**Problem:** Styles not applying correctly
**Fix:** Check CSS specificity, use `!important` sparingly

### 4. Event Listener Issues
**Problem:** Buttons not responding
**Fix:** Verify element IDs match between HTML and JavaScript

### 5. Mobile Responsiveness
**Problem:** Layout breaks on mobile
**Fix:** Test on actual devices, use proper media queries

## Getting Help

If you're still experiencing issues:
1. Check the browser console for specific error messages
2. Test in different browsers to isolate the problem
3. Verify all external resources are accessible
4. Check network connectivity and firewall settings
5. Review recent changes that might have caused the issue