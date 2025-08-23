// Global variables
let allProducts = [];
let amazonProducts = [];
let facebookAdsProducts = [];
let combinedSearchResults = [];
let currentFilter = 'all';
let searchQuery = '';
let isSearching = false;

// DOM Elements
const loadingScreen = document.getElementById('loading-screen');
const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
const navMenu = document.getElementById('nav-menu');
const backToTopBtn = document.getElementById('back-to-top');
const productGrid = document.getElementById('product-grid');
const productsLoading = document.getElementById('products-loading');
const filterTabs = document.querySelectorAll('.filter-tab');
const statNumbers = document.querySelectorAll('.stat-number');

// New DOM Elements
const searchInput = document.getElementById('product-search');
const clearSearchBtn = document.getElementById('clear-search');
const searchResultsCount = document.getElementById('search-results-count');
const notificationPopup = document.getElementById('notification-popup');
const closePopupBtn = document.getElementById('close-popup');
const subscribeBtn = document.getElementById('subscribe-notifications');
const notNowBtn = document.getElementById('not-now');

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    // Hide loading screen after content loads
    setTimeout(() => {
        if (loadingScreen) {
            loadingScreen.style.opacity = '0';
            setTimeout(() => {
                loadingScreen.style.display = 'none';
            }, 500);
        }
    }, 1500);

    // Initialize all functionality
    initMobileMenu();
    initScrollEffects();
    initFilterTabs();
    initAnimations();
    initSearchFunctionality();
    initNotificationPopup();
    initAnalytics();
    fetchProducts();
    fetchAmazonProducts();
    initTawkTo();
    initLazyLoading();
    registerEnhancedServiceWorker();
    
    // Prefetch Facebook Ads data for faster search (delayed to not impact initial load)
    setTimeout(() => {
        prefetchFacebookAdsData();
    }, 3000);
    
    // Show notification popup after 5 seconds (or 3 seconds on mobile)
    const deviceInfo = getDeviceInfo();
    const popupDelay = deviceInfo.isMobile ? 3000 : 5000;
    setTimeout(showNotificationPopup, popupDelay);
});

// Search Functionality
function initSearchFunctionality() {
    if (!searchInput) return;
    
    searchInput.addEventListener('input', handleSearch);
    
    if (clearSearchBtn) {
        clearSearchBtn.addEventListener('click', clearSearch);
    }
}

function handleSearch(e) {
    searchQuery = e.target.value.toLowerCase().trim();
    isSearching = searchQuery.length > 0;
    
    // Show/hide clear button
    if (clearSearchBtn) {
        clearSearchBtn.style.display = isSearching ? 'block' : 'none';
    }
    
    // If searching, perform multi-source search
    if (isSearching) {
        performMultiSourceSearch(searchQuery);
    } else {
        combinedSearchResults = [];
        filterAndDisplayProducts();
    }
    
    // Track search analytics
    trackEvent('search', {
        search_term: searchQuery,
        search_results_count: getFilteredProducts().length
    });
}

function clearSearch() {
    if (searchInput) {
        searchInput.value = '';
        searchQuery = '';
        isSearching = false;
    }
    
    if (clearSearchBtn) {
        clearSearchBtn.style.display = 'none';
    }
    
    combinedSearchResults = [];
    filterAndDisplayProducts();
}

// Multi-source search function
async function performMultiSourceSearch(query) {
    try {
        // Show loading state
        showProductsLoading(true);
        
        // Search in existing products (Amazon tab)
        const amazonResults = searchInProducts(allProducts, query, 'Amazon');
        
        // Fetch and search Facebook Ads products
        let facebookResults = [];
        if (facebookAdsProducts.length === 0) {
            // Fetch Facebook Ads data if not already loaded
            await fetchFacebookAdsProducts();
        }
        facebookResults = searchInProducts(facebookAdsProducts, query, 'Facebook Ads');
        
        // Combine results with Facebook Ads prioritized first
        combinedSearchResults = [...facebookResults, ...amazonResults];
        
        // Remove duplicates based on model name
        combinedSearchResults = removeDuplicateProducts(combinedSearchResults);
        
        // Display combined results
        filterAndDisplayProducts();
        showProductsLoading(false);
        
        // Track multi-source search
        trackEvent('multi_source_search', {
            search_term: query,
            facebook_results: facebookResults.length,
            amazon_results: amazonResults.length,
            total_results: combinedSearchResults.length
        });
        
    } catch (error) {
        console.error('Multi-source search error:', error);
        showProductsLoading(false);
        
        // Fallback to regular search in existing products
        const fallbackResults = searchInProducts(allProducts, query, 'Amazon');
        combinedSearchResults = fallbackResults;
        filterAndDisplayProducts();
        
        trackEvent('search_error', {
            error_message: error.message,
            search_term: query
        });
    }
}

// Search within a specific product array
function searchInProducts(products, query, source = 'Unknown') {
    return products.filter(product => {
        const searchableText = `${product.model} ${product.processor} ${product.ram} ${product.storage} ${product.category} ${product.description || ''}`.toLowerCase();
        const matches = searchableText.includes(query);
        
        if (matches) {
            // Add source identifier for tracking
            product.source = source;
        }
        
        return matches;
    });
}

// Remove duplicate products based on model name (prioritize Facebook Ads)
function removeDuplicateProducts(products) {
    const seen = new Set();
    return products.filter(product => {
        const key = product.model.toLowerCase().trim();
        if (seen.has(key)) {
            return false;
        }
        seen.add(key);
        return true;
    });
}

// Fetch Facebook Ads products
async function fetchFacebookAdsProducts() {
    const sheetURL = "https://docs.google.com/spreadsheets/d/1Ba_YRVZAxBPh76j6-UdAx0Qi_UfU1d6wKau2av9VhFs/gviz/tq?tqx=out:json&sheet=Facebook%20Ads";
    
    try {
        const response = await fetch(sheetURL);
        let data = await response.text();
        
        // Remove extra characters added by Google Sheets API
        data = data.substring(47, data.length - 2);
        const json = JSON.parse(data);
        
        facebookAdsProducts = [];
        const rows = json.table.rows;
        
        rows.forEach(row => {
            const product = {
                model: row.c[0]?.v || "N/A",
                category: row.c[1]?.v || "Other",
                processor: row.c[2]?.v || "N/A",
                ram: row.c[3]?.v || "N/A",
                storage: row.c[4]?.v || "N/A",
                price: row.c[5]?.v || "N/A",
                imageUrl: row.c[6]?.v || "",
                description: row.c[7]?.v || "",
                source: 'Facebook Ads'
            };
            facebookAdsProducts.push(product);
        });
        
        trackEvent('facebook_ads_products_loaded', {
            total_products: facebookAdsProducts.length
        });
        
    } catch (error) {
        console.error("Error fetching Facebook Ads products:", error);
        trackEvent('facebook_ads_products_load_error', {
            error_message: error.message
        });
        throw error;
    }
}

// Prefetch Facebook Ads data for faster search
async function prefetchFacebookAdsData() {
    if (facebookAdsProducts.length === 0) {
        try {
            await fetchFacebookAdsProducts();
            console.log(`Prefetched ${facebookAdsProducts.length} Facebook Ads products for faster search`);
        } catch (error) {
            console.log('Facebook Ads prefetch failed, will fetch on demand:', error.message);
        }
    }
}

function getFilteredProducts() {
    let filteredProducts;
    
    // If searching, use combined results from multiple sources
    if (isSearching && combinedSearchResults.length > 0) {
        filteredProducts = combinedSearchResults;
    } else {
        filteredProducts = allProducts;
    }
    
    // Apply category filter
    if (currentFilter !== 'all') {
        filteredProducts = filteredProducts.filter(product => 
            product.category.toLowerCase() === currentFilter.toLowerCase()
        );
    }
    
    return filteredProducts;
}

function filterAndDisplayProducts() {
    const filteredProducts = getFilteredProducts();
    displayProducts(filteredProducts);
    updateSearchResultsCount(filteredProducts.length);
}

function updateSearchResultsCount(count) {
    if (!searchResultsCount) return;
    
    if (isSearching || currentFilter !== 'all') {
        const filterText = currentFilter !== 'all' ? ` in ${currentFilter}s` : '';
        const searchText = isSearching ? ` matching "${searchQuery}"` : '';
        
        // Show source breakdown for search results
        let sourceBreakdown = '';
        if (isSearching && combinedSearchResults.length > 0) {
            const facebookCount = combinedSearchResults.filter(p => p.source === 'Facebook Ads').length;
            const amazonCount = combinedSearchResults.filter(p => p.source === 'Amazon').length;
            
            if (facebookCount > 0 && amazonCount > 0) {
                sourceBreakdown = ` (${facebookCount} featured, ${amazonCount} from catalog)`;
            } else if (facebookCount > 0) {
                sourceBreakdown = ` (${facebookCount} featured)`;
            } else if (amazonCount > 0) {
                sourceBreakdown = ` (from catalog)`;
            }
        }
        
        searchResultsCount.textContent = `Found ${count} product${count !== 1 ? 's' : ''}${searchText}${filterText}${sourceBreakdown}`;
        searchResultsCount.style.display = 'block';
    } else {
        searchResultsCount.style.display = 'none';
    }
}

// Enhanced WhatsApp Integration
function buyOnWhatsApp(productName, price, source = 'Website') {
    const phoneNumber = "916351541231";
    const message = encodeURIComponent(
        `Hello, I am interested in ${productName}. Please share details.`
    );
    const whatsappURL = `https://wa.me/${phoneNumber}?text=${message}`;
    
    // Track WhatsApp click with source information
    trackEvent('whatsapp_inquiry', {
        product_name: productName,
        product_price: price,
        product_source: source,
        inquiry_type: 'product_specific'
    });
    
    window.open(whatsappURL, '_blank');
}

// Notification Popup Functionality
function initNotificationPopup() {
    if (!notificationPopup) return;
    
    if (closePopupBtn) {
        closePopupBtn.addEventListener('click', hideNotificationPopup);
    }
    
    if (notNowBtn) {
        notNowBtn.addEventListener('click', () => {
            hideNotificationPopup();
            // Set cookie to not show again for 7 days
            setCookie('notification_dismissed', 'true', 7);
            trackEvent('notification_popup', { action: 'dismissed' });
        });
    }
    
    if (subscribeBtn) {
        subscribeBtn.addEventListener('click', function() {
            const deviceInfo = getDeviceInfo();
            
            // Handle different subscription methods based on device capabilities
            if (!deviceInfo.pushSupported) {
                // Direct to email subscription
                hideNotificationPopup();
                showEmailSubscriptionForm();
            } else {
                // Try push notifications first
                subscribeToNotifications();
            }
        });
    }
    
    // Close popup when clicking outside
    notificationPopup.addEventListener('click', (e) => {
        if (e.target === notificationPopup) {
            hideNotificationPopup();
        }
    });
}

function showNotificationPopup() {
    // Don't show if user already dismissed it or subscribed via email
    if (getCookie('notification_dismissed') === 'true' || 
        getCookie('notification_subscribed') === 'true' || 
        getCookie('email_subscribed') === 'true') {
        return;
    }
    
    // Check device capabilities before showing
    const deviceInfo = getDeviceInfo();
    
    if (notificationPopup) {
        // Update popup content based on device capabilities
        updatePopupForDevice(deviceInfo);
        notificationPopup.classList.add('show');
        trackEvent('notification_popup', { 
            action: 'shown',
            device_type: deviceInfo.type,
            push_supported: deviceInfo.pushSupported,
            browser: deviceInfo.browser
        });
    }
}

function getDeviceInfo() {
    const userAgent = navigator.userAgent.toLowerCase();
    const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
    const isIOS = /iphone|ipad|ipod/i.test(userAgent);
    const isAndroid = /android/i.test(userAgent);
    const isSafari = /safari/i.test(userAgent) && !/chrome/i.test(userAgent);
    const isChrome = /chrome/i.test(userAgent);
    const isFirefox = /firefox/i.test(userAgent);
    
    // Check push notification support
    const pushSupported = 'Notification' in window && 'serviceWorker' in navigator;
    
    let browser = 'unknown';
    if (isChrome) browser = 'chrome';
    else if (isSafari) browser = 'safari';
    else if (isFirefox) browser = 'firefox';
    
    return {
        type: isMobile ? 'mobile' : 'desktop',
        isMobile,
        isIOS,
        isAndroid,
        browser,
        pushSupported,
        oneSignalSupported: window.OneSignal !== undefined
    };
}

function updatePopupForDevice(deviceInfo) {
    const popupBody = notificationPopup.querySelector('.popup-body p');
    const subscribeBtn = notificationPopup.querySelector('#subscribe-notifications');
    
    if (!popupBody || !subscribeBtn) return;
    
    if (!deviceInfo.pushSupported) {
        // Device doesn't support push notifications
        popupBody.innerHTML = `
            <p>Stay updated with our latest products and exclusive deals! 
            Since push notifications aren't supported on your device, 
            we'll set up email notifications for you.</p>
        `;
        subscribeBtn.innerHTML = '<i class="fas fa-envelope"></i> Subscribe via Email';
    } else if (deviceInfo.isIOS && deviceInfo.browser === 'safari') {
        // iOS Safari specific instructions
        popupBody.innerHTML = `
            <p>Get notified about new arrivals, special offers, and exclusive deals on refurbished laptops and accessories.</p>
            <div class="ios-instructions" style="font-size: 0.9rem; color: var(--text-light); margin-top: 1rem; padding: 1rem; background: var(--gray-50); border-radius: var(--border-radius);">
                <strong>For iOS Safari:</strong> After clicking Subscribe, you may need to add our site to your Home Screen for notifications to work properly.
            </div>
        `;
    } else if (deviceInfo.isAndroid) {
        // Android specific
        popupBody.innerHTML = `
            <p>Get notified about new arrivals, special offers, and exclusive deals on refurbished laptops and accessories.</p>
            <div class="android-instructions" style="font-size: 0.9rem; color: var(--text-light); margin-top: 1rem;">
                <i class="fas fa-info-circle"></i> Notifications will appear in your notification panel and can be customized in your browser settings.
            </div>
        `;
    }
}

function hideNotificationPopup() {
    if (notificationPopup) {
        notificationPopup.classList.remove('show');
    }
}

function showNotificationStatus(message, type = 'info') {
    const statusDiv = document.getElementById('notification-status');
    const statusMessage = document.getElementById('status-message');
    
    if (statusDiv && statusMessage) {
        statusMessage.textContent = message;
        statusDiv.className = `notification-status ${type}`;
        statusDiv.style.display = 'flex';
        
        // Auto-hide success messages after 3 seconds
        if (type === 'success') {
            setTimeout(() => {
                if (statusDiv) {
                    statusDiv.style.display = 'none';
                }
            }, 3000);
        }
    }
}

function hideNotificationStatus() {
    const statusDiv = document.getElementById('notification-status');
    if (statusDiv) {
        statusDiv.style.display = 'none';
    }
}

function subscribeToNotifications() {
    // Check for OneSignal first
    if (window.OneSignal) {
        OneSignal.push(function() {
            // Check if notifications are supported
            if (!OneSignal.isPushNotificationsSupported()) {
                handleNotificationFallback();
                return;
            }
            
            // Check current permission status
            OneSignal.getNotificationPermission().then(function(permission) {
                if (permission === 'granted') {
                    showNotificationStatus('You are already subscribed to notifications!', 'success');
                    setCookie('notification_subscribed', 'true', 365);
                    setTimeout(hideNotificationPopup, 2000);
                    return;
                }
                
                if (permission === 'denied') {
                    handleNotificationFallback();
                    return;
                }
                
                // Show OneSignal prompt
                OneSignal.showNativePrompt().then(function() {
                    // Check subscription status after prompt
                    OneSignal.isPushNotificationsEnabled().then(function(isEnabled) {
                        if (isEnabled) {
                            setCookie('notification_subscribed', 'true', 365);
                            showNotificationStatus('Successfully subscribed to notifications!', 'success');
                            setTimeout(hideNotificationPopup, 2000);
                            trackEvent('notification_subscription', { 
                                status: 'subscribed',
                                method: 'onesignal'
                            });
                        } else {
                            showNotificationStatus('Subscription was declined. Trying alternative method...', 'warning');
                            setTimeout(handleNotificationFallback, 1500);
                        }
                    });
                }).catch(function(error) {
                    console.error('OneSignal prompt error:', error);
                    handleNotificationFallback();
                });
            });
        });
    } else {
        // Try native Web Push API as fallback
        tryNativeNotifications();
    }
}

function handleNotificationFallback() {
    hideNotificationPopup();
    
    // Show email subscription option
    const emailSubscription = confirm(
        'Push notifications are not available on your device. ' +
        'Would you like to subscribe to our email newsletter instead for updates on new products and deals?'
    );
    
    if (emailSubscription) {
        // Create email subscription form
        showEmailSubscriptionForm();
    } else {
        showToast('You can always enable notifications later from your browser settings', 'info');
    }
    
    trackEvent('notification_subscription', { 
        status: 'fallback_offered',
        email_opted: emailSubscription
    });
}

function tryNativeNotifications() {
    if (!('Notification' in window)) {
        handleNotificationFallback();
        return;
    }
    
    if (Notification.permission === 'granted') {
        showToast('You are already subscribed to notifications!', 'info');
        setCookie('notification_subscribed', 'true', 365);
        hideNotificationPopup();
        return;
    }
    
    if (Notification.permission === 'denied') {
        handleNotificationFallback();
        return;
    }
    
    // Request permission using native API
    Notification.requestPermission().then(function(permission) {
        if (permission === 'granted') {
            // Create a test notification
            new Notification('RootTech Shop', {
                body: 'Thanks for subscribing! We\'ll notify you about new products and deals.',
                icon: '/root_tech_back_remove-removebg-preview.png',
                badge: '/root_tech_back_remove-removebg-preview.png'
            });
            
            setCookie('notification_subscribed', 'true', 365);
            hideNotificationPopup();
            showToast('Successfully subscribed to notifications!', 'success');
            trackEvent('notification_subscription', { 
                status: 'subscribed',
                method: 'native'
            });
        } else {
            handleNotificationFallback();
        }
    }).catch(function(error) {
        console.error('Native notification error:', error);
        handleNotificationFallback();
    });
}

function showEmailSubscriptionForm() {
    // Create email subscription modal
    const emailModal = document.createElement('div');
    emailModal.className = 'email-subscription-modal';
    emailModal.innerHTML = `
        <div class="email-modal-content">
            <div class="email-modal-header">
                <h3><i class="fas fa-envelope"></i> Stay Updated via Email</h3>
                <button class="close-email-modal" onclick="closeEmailModal()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="email-modal-body">
                <p>Get notified about new products, exclusive deals, and special offers directly in your inbox!</p>
                <form class="email-subscription-form" onsubmit="submitEmailSubscription(event)">
                    <div class="email-input-group">
                        <i class="fas fa-envelope"></i>
                        <input type="email" id="subscriber-email" placeholder="Enter your email address" required>
                    </div>
                    <button type="submit" class="btn btn-primary">
                        <i class="fas fa-paper-plane"></i> Subscribe
                    </button>
                </form>
                <p class="email-disclaimer">We respect your privacy and won't spam you. Unsubscribe anytime.</p>
            </div>
        </div>
    `;
    
    document.body.appendChild(emailModal);
    
    // Add styles
    const emailModalStyles = `
        .email-subscription-modal {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10001;
            animation: fadeIn 0.3s ease;
        }
        
        .email-modal-content {
            background: var(--white);
            border-radius: var(--border-radius-lg);
            max-width: 500px;
            width: 90%;
            max-height: 90vh;
            overflow-y: auto;
            box-shadow: var(--shadow-xl);
            animation: slideUp 0.3s ease;
        }
        
        .email-modal-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 1.5rem;
            border-bottom: 1px solid var(--gray-200);
        }
        
        .email-modal-header h3 {
            margin: 0;
            color: var(--text-dark);
        }
        
        .email-modal-header i {
            color: var(--primary-color);
            margin-right: 0.5rem;
        }
        
        .close-email-modal {
            background: none;
            border: none;
            font-size: 1.2rem;
            color: var(--text-light);
            cursor: pointer;
            padding: 0.5rem;
            border-radius: 50%;
            transition: var(--transition);
        }
        
        .close-email-modal:hover {
            background: var(--gray-100);
            color: var(--text-dark);
        }
        
        .email-modal-body {
            padding: 1.5rem;
        }
        
        .email-modal-body p {
            margin-bottom: 1.5rem;
            color: var(--text-light);
            line-height: 1.6;
        }
        
        .email-input-group {
            position: relative;
            margin-bottom: 1rem;
        }
        
        .email-input-group i {
            position: absolute;
            left: 1rem;
            top: 50%;
            transform: translateY(-50%);
            color: var(--text-light);
        }
        
        .email-input-group input {
            width: 100%;
            padding: 1rem 1rem 1rem 3rem;
            border: 2px solid var(--gray-200);
            border-radius: var(--border-radius);
            font-size: 1rem;
            transition: var(--transition);
        }
        
        .email-input-group input:focus {
            outline: none;
            border-color: var(--primary-color);
        }
        
        .email-disclaimer {
            font-size: 0.85rem;
            color: var(--text-light);
            margin-top: 1rem;
            margin-bottom: 0;
        }
        
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        
        @keyframes slideUp {
            from { transform: translateY(30px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
        }
    `;
    
    const emailStyleSheet = document.createElement('style');
    emailStyleSheet.textContent = emailModalStyles;
    document.head.appendChild(emailStyleSheet);
    
    // Focus on email input
    setTimeout(() => {
        const emailInput = document.getElementById('subscriber-email');
        if (emailInput) emailInput.focus();
    }, 300);
}

function closeEmailModal() {
    const modal = document.querySelector('.email-subscription-modal');
    if (modal) {
        modal.style.animation = 'fadeOut 0.3s ease';
        setTimeout(() => {
            document.body.removeChild(modal);
        }, 300);
    }
}

function submitEmailSubscription(event) {
    event.preventDefault();
    const email = document.getElementById('subscriber-email').value;
    
    if (!email || !isValidEmail(email)) {
        showToast('Please enter a valid email address', 'error');
        return;
    }
    
    // Store email subscription (you can integrate with your email service here)
    setCookie('email_subscribed', 'true', 365);
    setCookie('subscriber_email', email, 365);
    
    // Track email subscription
    trackEvent('email_subscription', { 
        email: email,
        source: 'notification_fallback'
    });
    
    closeEmailModal();
    showToast('Successfully subscribed to email updates!', 'success');
}

function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Manual notification test function (for debugging)
function testNotification() {
    const deviceInfo = getDeviceInfo();
    console.log('Device Info:', deviceInfo);
    
    if (window.OneSignal) {
        OneSignal.push(function() {
            console.log('OneSignal Status:');
            console.log('- Push Supported:', OneSignal.isPushNotificationsSupported());
            
            OneSignal.getNotificationPermission().then(function(permission) {
                console.log('- Permission Status:', permission);
            });
            
            OneSignal.isPushNotificationsEnabled().then(function(isEnabled) {
                console.log('- Currently Enabled:', isEnabled);
            });
        });
    }
    
    if ('Notification' in window) {
        console.log('Native Notification Permission:', Notification.permission);
    }
    
    return deviceInfo;
}

// Add to window for manual testing
window.testNotification = testNotification;
window.showNotificationPopup = showNotificationPopup;
window.subscribeToNotifications = subscribeToNotifications;

// Enhanced service worker for better notification handling
function registerEnhancedServiceWorker() {
    if ('serviceWorker' in navigator) {
        const swCode = `
            const CACHE_NAME = 'roottech-notifications-v1';
            
            // Handle push notifications
            self.addEventListener('push', function(event) {
                console.log('Push received:', event);
                
                const options = {
                    body: event.data ? event.data.text() : 'New products and deals available!',
                    icon: '/root_tech_back_remove-removebg-preview.png',
                    badge: '/root_tech_back_remove-removebg-preview.png',
                    vibrate: [200, 100, 200],
                    data: {
                        dateOfArrival: Date.now(),
                        primaryKey: 1,
                        url: '/'
                    },
                    actions: [
                        {
                            action: 'explore',
                            title: 'View Products',
                            icon: '/root_tech_back_remove-removebg-preview.png'
                        },
                        {
                            action: 'close',
                            title: 'Close',
                            icon: '/root_tech_back_remove-removebg-preview.png'
                        }
                    ]
                };
                
                event.waitUntil(
                    self.registration.showNotification('RootTech Shop', options)
                );
            });
            
            // Handle notification clicks
            self.addEventListener('notificationclick', function(event) {
                console.log('Notification clicked:', event);
                event.notification.close();
                
                if (event.action === 'explore') {
                    event.waitUntil(
                        clients.openWindow('/#products')
                    );
                } else if (event.action !== 'close') {
                    event.waitUntil(
                        clients.openWindow('/')
                    );
                }
            });
            
            // Basic caching
            self.addEventListener('fetch', function(event) {
                if (event.request.destination === 'image') {
                    event.respondWith(
                        caches.open(CACHE_NAME).then(function(cache) {
                            return cache.match(event.request).then(function(response) {
                                return response || fetch(event.request).then(function(response) {
                                    cache.put(event.request, response.clone());
                                    return response;
                                });
                            });
                        })
                    );
                }
            });
        `;
        
        const blob = new Blob([swCode], { type: 'application/javascript' });
        const swUrl = URL.createObjectURL(blob);
        
        navigator.serviceWorker.register(swUrl)
            .then(function(registration) {
                console.log('Enhanced ServiceWorker registered successfully');
                
                // Subscribe to push notifications if supported
                if ('PushManager' in window) {
                    registration.pushManager.getSubscription().then(function(subscription) {
                        if (subscription) {
                            console.log('Push subscription active');
                        }
                    });
                }
            })
            .catch(function(err) {
                console.log('Enhanced ServiceWorker registration failed: ', err);
            });
    }
}

// Analytics Integration
function initAnalytics() {
    // Track page view
    trackEvent('page_view', {
        page_title: document.title,
        page_location: window.location.href
    });
    
    // Track user engagement
    let engagementTimer = 0;
    setInterval(() => {
        engagementTimer += 10;
        if (engagementTimer % 30 === 0) { // Every 30 seconds
            trackEvent('user_engagement', {
                time_on_page: engagementTimer,
                scroll_depth: Math.round((window.pageYOffset / (document.body.scrollHeight - window.innerHeight)) * 100)
            });
        }
    }, 10000);
}

function trackEvent(eventName, parameters = {}) {
    // Google Analytics 4
    if (typeof gtag !== 'undefined') {
        gtag('event', eventName, parameters);
    }
    
    // Console log for debugging
    console.log('Analytics Event:', eventName, parameters);
}

// Enhanced Lazy Loading
function initLazyLoading() {
    // Intersection Observer for lazy loading
    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                if (img.dataset.src) {
                    img.src = img.dataset.src;
                    img.removeAttribute('data-src');
                }
                img.classList.remove('lazy-load');
                img.classList.add('loaded');
                observer.unobserve(img);
            }
        });
    }, {
        rootMargin: '50px 0px',
        threshold: 0.1
    });

    // Observe all images with lazy loading
    document.querySelectorAll('img[loading="lazy"], .lazy-load').forEach(img => {
        imageObserver.observe(img);
    });
}

// Mobile Menu Functionality
function initMobileMenu() {
    if (mobileMenuToggle && navMenu) {
        mobileMenuToggle.addEventListener('click', toggleMobileMenu);
        
        // Close menu when clicking on nav links
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', closeMobileMenu);
        });

        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!mobileMenuToggle.contains(e.target) && !navMenu.contains(e.target)) {
                closeMobileMenu();
            }
        });
    }
}

function toggleMobileMenu() {
    navMenu.classList.toggle('active');
    mobileMenuToggle.classList.toggle('active');
    trackEvent('mobile_menu', { action: navMenu.classList.contains('active') ? 'opened' : 'closed' });
}

function closeMobileMenu() {
    navMenu.classList.remove('active');
    mobileMenuToggle.classList.remove('active');
}

// Scroll Effects
function initScrollEffects() {
    // Back to top button
    window.addEventListener('scroll', () => {
        if (window.pageYOffset > 300) {
            backToTopBtn.style.display = 'flex';
        } else {
            backToTopBtn.style.display = 'none';
        }
    });

    if (backToTopBtn) {
        backToTopBtn.addEventListener('click', () => {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
            trackEvent('back_to_top_click');
        });
    }

    // Smooth scrolling for nav links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                const headerHeight = document.querySelector('.header').offsetHeight;
                const quickContactHeight = document.querySelector('.quick-contact').offsetHeight;
                const targetPosition = target.offsetTop - headerHeight - quickContactHeight;
                
                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
                
                trackEvent('internal_link_click', {
                    link_target: this.getAttribute('href')
                });
            }
        });
    });
}

// Filter Tabs Functionality
function initFilterTabs() {
    filterTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Remove active class from all tabs
            filterTabs.forEach(t => t.classList.remove('active'));
            
            // Add active class to clicked tab
            tab.classList.add('active');
            
            // Update current filter
            currentFilter = tab.dataset.filter;
            
            // Filter and display products
            filterAndDisplayProducts();
            
            // Track filter usage
            trackEvent('product_filter', {
                filter_category: currentFilter
            });
        });
    });
}

// Animations
function initAnimations() {
    // Counter animation for stats
    const observerOptions = {
        threshold: 0.5
    };

    const statsObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                animateCounter(entry.target);
            }
        });
    }, observerOptions);

    statNumbers.forEach(stat => {
        statsObserver.observe(stat);
    });
}

function animateCounter(element) {
    const target = parseInt(element.dataset.target);
    const increment = target / 50;
    let current = 0;

    const updateCounter = () => {
        current += increment;
        if (current < target) {
            element.textContent = Math.ceil(current);
            requestAnimationFrame(updateCounter);
        } else {
            element.textContent = target;
        }
    };

    updateCounter();
}

// Product Data Fetching
async function fetchProducts() {
    const sheetURL = "https://docs.google.com/spreadsheets/d/1Ba_YRVZAxBPh76j6-UdAx0Qi_UfU1d6wKau2av9VhFs/gviz/tq?tqx=out:json&sheet=Products";
    
    showProductsLoading(true);
    
    try {
        const response = await fetch(sheetURL);
        let data = await response.text();
        
        // Remove extra characters added by Google Sheets API
        data = data.substring(47, data.length - 2);
        const json = JSON.parse(data);
        
        allProducts = [];
        const rows = json.table.rows;
        
        rows.forEach(row => {
            const product = {
                model: row.c[0]?.v || "N/A",
                category: row.c[1]?.v || "Other",
                processor: row.c[2]?.v || "N/A",
                ram: row.c[3]?.v || "N/A",
                storage: row.c[4]?.v || "N/A",
                price: row.c[5]?.v || "N/A",
                imageUrl: row.c[6]?.v || "",
                description: row.c[7]?.v || ""
            };
            allProducts.push(product);
        });
        
        filterAndDisplayProducts();
        showProductsLoading(false);
        
        trackEvent('products_loaded', {
            total_products: allProducts.length
        });
        
    } catch (error) {
        console.error("Error fetching products:", error);
        showProductsLoading(false);
        showError("Failed to load products. Please try again later.");
        trackEvent('products_load_error', {
            error_message: error.message
        });
    }
}

async function fetchAmazonProducts() {
    const sheetURL = "https://docs.google.com/spreadsheets/d/1Ba_YRVZAxBPh76j6-UdAx0Qi_UfU1d6wKau2av9VhFs/gviz/tq?tqx=out:json";
    
    try {
        const response = await fetch(sheetURL);
        let data = await response.text();
        
        // Remove extra characters added by Google Sheets API
        data = data.substring(47, data.length - 2);
        const json = JSON.parse(data);
        
        amazonProducts = [];
        const rows = json.table.rows;
        
        rows.forEach(row => {
            const product = {
                model: row.c[0]?.v || "N/A",
                category: row.c[1]?.v || "Other",
                processor: row.c[2]?.v || "N/A",
                ram: row.c[3]?.v || "N/A",
                storage: row.c[4]?.v || "N/A",
                price: row.c[5]?.v || "N/A",
                imageUrl: row.c[6]?.v || "",
                link: row.c[7]?.v || "#"
            };
            amazonProducts.push(product);
        });
        
        displayAmazonProducts();
        
    } catch (error) {
        console.error("Error fetching Amazon products:", error);
        trackEvent('amazon_products_load_error', {
            error_message: error.message
        });
    }
}

function displayProducts(products) {
    if (!productGrid) return;
    
    if (products.length === 0) {
        productGrid.innerHTML = `
            <div class="no-products">
                <i class="fas fa-search"></i>
                <h3>No products found</h3>
                <p>Try adjusting your search or filter criteria.</p>
            </div>
        `;
        return;
    }
    
    const productsHTML = products.map((product, index) => {
        const isFacebookAds = product.source === 'Facebook Ads';
        const sourceIndicator = isFacebookAds ? 
            `<div class="product-source facebook-ads" title="Featured Product"><i class="fas fa-star"></i> Featured</div>` : 
            (product.source ? `<div class="product-source ${product.source.toLowerCase().replace(' ', '-')}">${product.source}</div>` : '');
        
        return `
            <div class="product-card lazy-load ${isFacebookAds ? 'featured-product' : ''}" data-category="${product.category}" style="animation-delay: ${index * 0.1}s">
                ${sourceIndicator}
                <img src="${product.imageUrl}" alt="${product.model}" loading="lazy" class="lazy-load" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDMwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0xMjUgNzVIMTc1VjEyNUgxMjVWNzVaIiBmaWxsPSIjRTVFN0VCIi8+CjxwYXRoIGQ9Ik0xMzEuMjUgOTMuNzVIMTY4Ljc1VjEwNi4yNUgxMzEuMjVWOTMuNzVaIiBmaWxsPSIjRDFENURCIi8+CjwvZz4KPC9zdmc+'">
                <div class="product-card-content">
                    <h3>${product.model}</h3>
                    ${product.processor !== "N/A" ? `<p><strong>Processor:</strong> ${product.processor}</p>` : ""}
                    ${product.ram !== "N/A" ? `<p><strong>RAM:</strong> ${product.ram}</p>` : ""}
                    ${product.storage !== "N/A" ? `<p><strong>Storage:</strong> ${product.storage}</p>` : ""}
                    ${product.description ? `<p class="product-description">${product.description}</p>` : ""}
                    <div class="price">₹${formatPrice(product.price)}</div>
                    <button onclick="buyOnWhatsApp('${product.model.replace(/'/g, "\\'")}', '${product.price}', '${product.source || 'Website'}')" class="btn btn-primary">
                        <i class="fab fa-whatsapp"></i> Enquire Now
                    </button>
                </div>
            </div>
        `;
    }).join('');
    
    productGrid.innerHTML = productsHTML;
    
    // Initialize lazy loading for new images
    initLazyLoading();
    
    // Add animation to product cards
    setTimeout(() => {
        document.querySelectorAll('.product-card.lazy-load').forEach(card => {
            card.classList.add('loaded');
        });
    }, 100);
}

function displayAmazonProducts() {
    const laptopGrid = document.getElementById('amazon-laptop-grid');
    const accessoryGrid = document.getElementById('amazon-accessory-grid');
    
    if (!laptopGrid || !accessoryGrid) return;
    
    const laptops = amazonProducts.filter(product => 
        product.category.toLowerCase() === 'laptop'
    );
    
    const accessories = amazonProducts.filter(product => 
        product.category.toLowerCase() !== 'laptop'
    );
    
    // Display laptops
    if (laptops.length > 0) {
        laptopGrid.innerHTML = laptops.slice(0, 4).map(product => createAmazonProductCard(product)).join('');
    } else {
        laptopGrid.innerHTML = '<p>No laptops available at the moment.</p>';
    }
    
    // Display accessories
    if (accessories.length > 0) {
        accessoryGrid.innerHTML = accessories.slice(0, 4).map(product => createAmazonProductCard(product)).join('');
    } else {
        accessoryGrid.innerHTML = '<p>No accessories available at the moment.</p>';
    }
}

function createAmazonProductCard(product) {
    return `
        <div class="product-card">
            <img src="${product.imageUrl}" alt="${product.model}" loading="lazy" class="lazy-load" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDMwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0xMjUgNzVIMTc1VjEyNUgxMjVWNzVaIiBmaWxsPSIjRTVFN0VCIi8+CjxwYXRoIGQ9Ik0xMzEuMjUgOTMuNzVIMTY4Ljc1VjEwNi4yNUgxMzEuMjVWOTMuNzVaIiBmaWxsPSIjRDFENURCIi8+CjwvZz4KPC9zdmc+'">
            <div class="product-card-content">
                <h3>${product.model}</h3>
                ${product.processor !== "N/A" ? `<p><strong>Processor:</strong> ${product.processor}</p>` : ""}
                ${product.ram !== "N/A" ? `<p><strong>RAM:</strong> ${product.ram}</p>` : ""}
                ${product.storage !== "N/A" ? `<p><strong>Storage:</strong> ${product.storage}</p>` : ""}
                <div class="price">₹${formatPrice(product.price)}</div>
                <a href="${product.link}" target="_blank" class="btn btn-amazon" onclick="trackEvent('amazon_product_click', {product_name: '${product.model}', product_price: '${product.price}'})">
                    <i class="fab fa-amazon"></i> Buy on Amazon
                </a>
            </div>
        </div>
    `;
}

function showProductsLoading(show) {
    if (productsLoading) {
        productsLoading.style.display = show ? 'block' : 'none';
    }
}

function showError(message) {
    if (productGrid) {
        productGrid.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Oops! Something went wrong</h3>
                <p>${message}</p>
                <button onclick="location.reload()" class="btn btn-primary">
                    <i class="fas fa-refresh"></i> Try Again
                </button>
            </div>
        `;
    }
}

// Utility Functions
function formatPrice(price) {
    if (price === "N/A" || !price) return "N/A";
    return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function setCookie(name, value, days) {
    const expires = new Date();
    expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000));
    document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/`;
}

function getCookie(name) {
    const nameEQ = name + "=";
    const ca = document.cookie.split(';');
    for(let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) === ' ') c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
}

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
        <span>${message}</span>
    `;
    
    document.body.appendChild(toast);
    
    // Add styles
    Object.assign(toast.style, {
        position: 'fixed',
        top: '20px',
        right: '20px',
        background: type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6',
        color: 'white',
        padding: '12px 20px',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        zIndex: '10001',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        maxWidth: '300px',
        transform: 'translateX(100%)',
        transition: 'transform 0.3s ease'
    });
    
    // Animate in
    setTimeout(() => {
        toast.style.transform = 'translateX(0)';
    }, 100);
    
    // Remove after 4 seconds
    setTimeout(() => {
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => {
            document.body.removeChild(toast);
        }, 300);
    }, 4000);
}

// Tawk.to Chat Integration
function initTawkTo() {
    var Tawk_API = Tawk_API || {}, Tawk_LoadStart = new Date();
    (function () {
        var s1 = document.createElement("script"), s0 = document.getElementsByTagName("script")[0];
        s1.async = true;
        s1.src = 'https://embed.tawk.to/67d7be9df538fb190aa3ee3e/1imhc1667';
        s1.charset = 'UTF-8';
        s1.setAttribute('crossorigin', '*');
        s0.parentNode.insertBefore(s1, s0);
    })();
}

// Error Handling
window.addEventListener('error', function(e) {
    console.error('JavaScript Error:', e.error);
    trackEvent('javascript_error', {
        error_message: e.message,
        error_filename: e.filename,
        error_lineno: e.lineno
    });
});

window.addEventListener('unhandledrejection', function(e) {
    console.error('Unhandled Promise Rejection:', e.reason);
    trackEvent('promise_rejection', {
        error_reason: e.reason
    });
});

// Performance monitoring
window.addEventListener('load', function() {
    // Track page load time
    const loadTime = window.performance.timing.loadEventEnd - window.performance.timing.navigationStart;
    trackEvent('page_load_time', {
        load_time_ms: loadTime
    });
});

// Additional CSS for new features
const additionalStyles = `
    .no-products, .error-message {
        text-align: center;
        padding: 3rem;
        color: var(--text-light);
        grid-column: 1 / -1;
    }
    
    .no-products i, .error-message i {
        font-size: 3rem;
        color: var(--text-light);
        margin-bottom: 1rem;
    }
    
    .error-message i {
        color: #ef4444;
    }
    
    .no-products h3, .error-message h3 {
        margin-bottom: 1rem;
        color: var(--text-dark);
    }
    
    .mobile-menu-toggle.active span:nth-child(1) {
        transform: rotate(45deg) translate(5px, 5px);
    }
    
    .mobile-menu-toggle.active span:nth-child(2) {
        opacity: 0;
    }
    
    .mobile-menu-toggle.active span:nth-child(3) {
        transform: rotate(-45deg) translate(7px, -6px);
    }
    
    .product-description {
        font-style: italic;
        color: var(--text-light);
        font-size: 0.85rem;
        margin: 0.5rem 0;
    }
    
    .toast {
        font-family: 'Inter', sans-serif;
        font-weight: 500;
    }
    
    /* Product source indicators */
    .product-source {
        position: absolute;
        top: 0.75rem;
        right: 0.75rem;
        padding: 0.25rem 0.75rem;
        border-radius: 12px;
        font-size: 0.75rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.025em;
        z-index: 2;
        backdrop-filter: blur(4px);
    }
    
    .product-source.facebook-ads {
        background: linear-gradient(135deg, #f59e0b, #d97706);
        color: white;
        box-shadow: 0 2px 4px rgba(245, 158, 11, 0.3);
    }
    
    .product-source.amazon {
        background: rgba(255, 255, 255, 0.95);
        color: var(--text-dark);
        border: 1px solid var(--gray-200);
    }
    
    .featured-product {
        border: 2px solid var(--accent-color);
        box-shadow: 0 4px 20px rgba(245, 158, 11, 0.15);
    }
    
    .featured-product:hover {
        border-color: #d97706;
        box-shadow: 0 8px 30px rgba(245, 158, 11, 0.25);
    }
`;

// Service Worker Registration for Performance
if ('serviceWorker' in navigator) {
    window.addEventListener('load', function() {
        // Register service worker for caching
        const swCode = `
            const CACHE_NAME = 'roottech-v1';
            const urlsToCache = [
                '/',
                '/styles.css',
                '/script.js',
                '/root_tech_back_remove-removebg-preview.png',
                'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap',
                'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
            ];

            self.addEventListener('install', function(event) {
                event.waitUntil(
                    caches.open(CACHE_NAME)
                        .then(function(cache) {
                            return cache.addAll(urlsToCache);
                        })
                );
            });

            self.addEventListener('fetch', function(event) {
                event.respondWith(
                    caches.match(event.request)
                        .then(function(response) {
                            if (response) {
                                return response;
                            }
                            return fetch(event.request);
                        }
                    )
                );
            });
        `;
        
        const blob = new Blob([swCode], { type: 'application/javascript' });
        const swUrl = URL.createObjectURL(blob);
        
        navigator.serviceWorker.register(swUrl)
            .then(function(registration) {
                console.log('ServiceWorker registration successful');
                trackEvent('service_worker_registered');
            })
            .catch(function(err) {
                console.log('ServiceWorker registration failed: ', err);
            });
    });
}

// Critical Resource Hints
function addResourceHints() {
    const hints = [
        { rel: 'prefetch', href: 'https://docs.google.com/spreadsheets/d/1Ba_YRVZAxBPh76j6-UdAx0Qi_UfU1d6wKau2av9VhFs/gviz/tq?tqx=out:json&sheet=Products' },
        { rel: 'prefetch', href: 'https://docs.google.com/spreadsheets/d/1Ba_YRVZAxBPh76j6-UdAx0Qi_UfU1d6wKau2av9VhFs/gviz/tq?tqx=out:json' }
    ];
    
    hints.forEach(hint => {
        const link = document.createElement('link');
        link.rel = hint.rel;
        link.href = hint.href;
        document.head.appendChild(link);
    });
}

// Initialize resource hints after page load
window.addEventListener('load', addResourceHints);

// Image optimization
function optimizeImages() {
    // Convert images to WebP if supported
    function supportsWebP() {
        return new Promise((resolve) => {
            const webP = new Image();
            webP.onload = webP.onerror = () => resolve(webP.height === 2);
            webP.src = 'data:image/webp;base64,UklGRjoAAABXRUJQVlA4IC4AAACyAgCdASoCAAIALmk0mk0iIiIiIgBoSygABc6WWgAA/veff/0PP8bA//LwYAAA';
        });
    }
    
    supportsWebP().then(supported => {
        if (supported) {
            document.documentElement.classList.add('webp');
        }
    });
}

// Initialize image optimization
optimizeImages();

// Memory management
function cleanupMemory() {
    // Clean up event listeners and objects that might cause memory leaks
    if (window.performance && window.performance.memory) {
        const memoryInfo = window.performance.memory;
        if (memoryInfo.usedJSHeapSize > memoryInfo.totalJSHeapSize * 0.8) {
            console.warn('High memory usage detected');
            trackEvent('high_memory_usage', {
                used: memoryInfo.usedJSHeapSize,
                total: memoryInfo.totalJSHeapSize
            });
        }
    }
}

// Run memory cleanup periodically
setInterval(cleanupMemory, 60000); // Every minute

// Connection speed optimization
function adaptToConnectionSpeed() {
    if ('connection' in navigator) {
        const connection = navigator.connection;
        const effectiveType = connection.effectiveType;
        
        // Adjust behavior based on connection speed
        if (effectiveType === 'slow-2g' || effectiveType === '2g') {
            // Disable animations for slow connections
            document.documentElement.style.setProperty('--transition', 'none');
            document.documentElement.classList.add('slow-connection');
        }
        
        trackEvent('connection_speed', {
            effective_type: effectiveType,
            downlink: connection.downlink,
            rtt: connection.rtt
        });
    }
}

// Initialize connection speed adaptation
adaptToConnectionSpeed();

// Final performance optimization
document.addEventListener('DOMContentLoaded', function() {
    // Remove loading screen more efficiently
    requestAnimationFrame(() => {
        if (loadingScreen) {
            loadingScreen.style.display = 'none';
        }
    });
});

// Inject additional styles
const styleSheet = document.createElement('style');
styleSheet.textContent = additionalStyles;
document.head.appendChild(styleSheet);