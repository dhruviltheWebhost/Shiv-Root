// Global variables
let allProducts = [];
let amazonProducts = [];
let facebookAdsProducts = [];
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

// Fixed DOM Elements - matching HTML IDs
const searchInput = document.getElementById('product-search');
const clearSearchBtn = document.getElementById('clear-search');
const searchResultsCount = document.getElementById('search-results-count');
const headerSearchInput = document.getElementById('header-search');
const headerClearSearchBtn = document.getElementById('header-clear-search');
const notificationPopup = document.getElementById('notification-popup');
const closePopupBtn = document.getElementById('close-popup-btn');
const subscribeBtn = document.getElementById('subscribe-btn');
const notNowBtn = document.getElementById('not-now-btn');

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
    initOneSignal();
    initServiceWorker();
    fetchProducts();
    fetchAmazonProducts();
    fetchFacebookAdsProducts();
    initTawkTo();
    initLazyLoading();
    
    // Show notification popup after 5 seconds
    setTimeout(showNotificationPopup, 5000);
    
    // Initialize OneSignal with proper retry logic
    initOneSignalWithRetry();
});

// Search Functionality
function initSearchFunctionality() {
    // Main search section
    if (searchInput) {
        searchInput.addEventListener('input', handleSearch);
    }
    
    if (clearSearchBtn) {
        clearSearchBtn.addEventListener('click', clearSearch);
    }
    
    // Header search
    if (headerSearchInput) {
        headerSearchInput.addEventListener('input', handleHeaderSearch);
    }
    
    if (headerClearSearchBtn) {
        headerClearSearchBtn.addEventListener('click', clearHeaderSearch);
    }
}

function handleSearch(e) {
    searchQuery = e.target.value.toLowerCase().trim();
    isSearching = searchQuery.length > 0;
    
    // Show/hide clear button
    if (clearSearchBtn) {
        clearSearchBtn.style.display = isSearching ? 'block' : 'none';
    }
    
    // Filter and display products
    filterAndDisplayProducts();
    
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
    
    filterAndDisplayProducts();
}

function handleHeaderSearch(e) {
    searchQuery = e.target.value.toLowerCase().trim();
    isSearching = searchQuery.length > 0;
    
    // Show/hide clear button
    if (headerClearSearchBtn) {
        headerClearSearchBtn.style.display = isSearching ? 'block' : 'none';
    }
    
    // Sync with main search input
    if (searchInput) {
        searchInput.value = e.target.value;
    }
    
    // Filter and display products
    filterAndDisplayProducts();
    
    // Track search analytics
    trackEvent('header_search', {
        search_term: searchQuery,
        search_results_count: getFilteredProducts().length
    });
}

function clearHeaderSearch() {
    if (headerSearchInput) {
        headerSearchInput.value = '';
        searchQuery = '';
        isSearching = false;
    }
    
    if (headerClearSearchBtn) {
        headerClearSearchBtn.style.display = 'none';
    }
    
    // Sync with main search input
    if (searchInput) {
        searchInput.value = '';
    }
    
    filterAndDisplayProducts();
}

function getFilteredProducts() {
    let filteredProducts = [...allProducts, ...amazonProducts, ...facebookAdsProducts];
    
    // Apply category filter
    if (currentFilter !== 'all') {
        filteredProducts = filteredProducts.filter(product => 
            product.category.toLowerCase() === currentFilter.toLowerCase()
        );
    }
    
    // Apply search filter
    if (isSearching) {
        filteredProducts = filteredProducts.filter(product => {
            const searchableText = `${product.model} ${product.processor} ${product.ram} ${product.storage} ${product.category}`.toLowerCase();
            return searchableText.includes(searchQuery);
        });
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
        searchResultsCount.textContent = `Found ${count} product${count !== 1 ? 's' : ''}${searchText}${filterText}`;
        searchResultsCount.style.display = 'block';
    } else {
        searchResultsCount.style.display = 'none';
    }
}

// Enhanced WhatsApp Integration
function buyOnWhatsApp(productName, price) {
    const phoneNumber = "916351541231";
    const message = encodeURIComponent(
        `Hello, I am interested in ${productName}. Please share details.`
    );
    const whatsappURL = `https://wa.me/${phoneNumber}?text=${message}`;
    
    // Track WhatsApp click
    trackEvent('whatsapp_inquiry', {
        product_name: productName,
        product_price: price,
        inquiry_type: 'product_specific'
    });
    
    window.open(whatsappURL, '_blank');
}

// Notification Popup Functionality
// function initNotificationPopup() {
//     if (!notificationPopup) return;
    
//     if (closePopupBtn) {
//         closePopupBtn.addEventListener('click', hideNotificationPopup);
//     }
    
//     if (notNowBtn) {
//         notNowBtn.addEventListener('click', () => {
//             hideNotificationPopup();
//             // Set cookie to not show again for 7 days
//             setCookie('notification_dismissed', 'true', 7);
//             trackEvent('notification_popup', { action: 'dismissed' });
//         });
//     }
    
//     if (subscribeBtn) {
//         subscribeBtn.addEventListener('click', subscribeToNotifications);
//     }
    
//     // Close popup when clicking outside
//     notificationPopup.addEventListener('click', (e) => {
//         if (e.target === notificationPopup) {
//             hideNotificationPopup();
//         }
//     });
// }

// function showNotificationPopup() {
//     // Don't show if user already dismissed it
//     if (getCookie('notification_dismissed') === 'true' || getCookie('notification_subscribed') === 'true') {
//         return;
//     }
    
//     if (notificationPopup) {
//         notificationPopup.classList.add('show');
//         trackEvent('notification_popup', { action: 'shown' });
//     }
// }

// function hideNotificationPopup() {
//     if (notificationPopup) {
//         notificationPopup.classList.remove('show');
//     }
// }

// function subscribeToNotifications() {
//     if (window.OneSignal) {
//         OneSignal.push(function() {
//             OneSignal.showNativePrompt();
            
//             OneSignal.on('subscriptionChange', function(isSubscribed) {
//                 if (isSubscribed) {
//                     setCookie('notification_subscribed', 'true', 365);
//                     hideNotificationPopup();
//                     showToast('Successfully subscribed to notifications!', 'success');
//                     trackEvent('notification_subscription', { status: 'subscribed' });
//                 } else {
//                     trackEvent('notification_subscription', { status: 'declined' });
//                 }
//             });
//         });
//     } else {
//         // Fallback for browsers that don't support push notifications
//         showToast('Push notifications are not supported in your browser', 'info');
//         hideNotificationPopup();
//     }
// }
// Notification Popup Functionality
function initNotificationPopup() {
    if (!notificationPopup) return;

    // Close (X) button
    if (closePopupBtn) {
        closePopupBtn.addEventListener("click", hideNotificationPopup);
    }

    // "Not Now" button → hide for 7 days
    if (notNowBtn) {
        notNowBtn.addEventListener("click", () => {
            hideNotificationPopup();
            setCookie("notification_dismissed", "true", 7);
            trackEvent("notification_popup", { action: "dismissed" });
        });
    }

    // "Subscribe" button → request OneSignal permission
    if (subscribeBtn) {
        subscribeBtn.addEventListener("click", () => {
            subscribeToNotifications();
        });
    }

    // Click outside popup closes it
    notificationPopup.addEventListener("click", (e) => {
        if (e.target === notificationPopup) {
            hideNotificationPopup();
        }
    });
}

// Show popup (only if not dismissed/subscribed before)
function showNotificationPopup() {
    try {
        // Check if popup element exists
        if (!notificationPopup) {
            console.warn('Notification popup element not found');
            return;
        }
        
        // Check if already dismissed or subscribed
        if (getCookie("notification_dismissed") === "true") {
            console.log('Notification popup dismissed previously');
            return;
        }
        
        if (getCookie("notification_subscribed") === "true") {
            console.log('User already subscribed to notifications');
            return;
        }
        
        // Check browser support for notifications
        const browserSupport = checkBrowserNotificationSupport();
        if (!browserSupport.notifications) {
            if (browserSupport.iosSafari) {
                console.log('Notifications not supported in iOS Safari');
            } else {
                console.log('Notifications not supported in this browser');
            }
            return;
        }
        
        // Show the popup
        notificationPopup.classList.add("show");
        trackEvent("notification_popup", { action: "shown" });
        
        console.log('Notification popup shown successfully');
        
    } catch (error) {
        console.error('Error showing notification popup:', error);
        trackEvent('notification_popup_error', {
            error: error.message
        });
    }
}

// Hide popup
function hideNotificationPopup() {
    if (notificationPopup) {
        notificationPopup.classList.remove("show");
    }
}

// Subscribe with OneSignal v16
function subscribeToNotifications() {
    try {
        // Check browser compatibility
        const browserSupport = checkBrowserNotificationSupport();
        if (!browserSupport.notifications) {
            if (browserSupport.iosSafari) {
                showToast("Push notifications are not supported in iOS Safari. Please use Chrome or Firefox.", "info");
            } else {
                showToast("Push notifications are not supported in your browser", "info");
            }
            hideNotificationPopup();
            return;
        }
        
        // Check if OneSignal is available
        if (!window.OneSignal) {
            console.warn('OneSignal not available, using native notifications');
            // Fallback to native notifications
            requestNativeNotificationPermission();
            return;
        }
        
        // Use OneSignal if available
        if (OneSignal.Notifications && OneSignal.Notifications.requestPermission) {
            OneSignal.Notifications.requestPermission().then((permission) => {
                if (permission === "granted") {
                    setCookie("notification_subscribed", "true", 365);
                    hideNotificationPopup();
                    showToast("✅ Successfully subscribed to notifications!", "success");
                    trackEvent("notification_subscription", { status: "subscribed", method: "onesignal" });
                    
                    // Subscribe to OneSignal
                    try {
                        if (OneSignal.User && OneSignal.User.PushSubscription) {
                            OneSignal.User.PushSubscription.optIn();
                        }
                    } catch (error) {
                        console.warn('Error opting into OneSignal:', error);
                    }
                    
                    // Track successful subscription
                    trackEvent('onesignal_subscription_success', {
                        app_id: "ee523d8b-51c0-43d7-ad51-f0cf380f0487"
                    });
                } else {
                    showToast("⚠️ You denied notifications. Enable them in browser settings.", "error");
                    trackEvent("notification_subscription", { status: "denied", method: "onesignal" });
                }
            }).catch((error) => {
                console.error('Error requesting OneSignal permission:', error);
                trackEvent('notification_subscription', { status: 'error', method: 'onesignal', error: error.message });
                // Fallback to native notifications
                requestNativeNotificationPermission();
            });
        } else {
            console.warn('OneSignal.Notifications not available, using native notifications');
            requestNativeNotificationPermission();
        }
        
    } catch (error) {
        console.error('Error in subscribeToNotifications:', error);
        trackEvent('notification_subscription', { status: 'error', method: 'unknown', error: error.message });
        // Fallback to native notifications
        requestNativeNotificationPermission();
    }
}

// Check browser compatibility for notifications
function checkBrowserNotificationSupport() {
    const support = {
        notifications: 'Notification' in window,
        serviceWorker: 'serviceWorker' in navigator,
        pushManager: 'PushManager' in window,
        userAgent: navigator.userAgent,
        browser: 'unknown'
    };
    
    // Detect browser
    if (navigator.userAgent.includes('Chrome')) {
        support.browser = 'Chrome';
    } else if (navigator.userAgent.includes('Firefox')) {
        support.browser = 'Firefox';
    } else if (navigator.userAgent.includes('Safari')) {
        support.browser = 'Safari';
    } else if (navigator.userAgent.includes('Edge')) {
        support.browser = 'Edge';
    }
    
    // Check iOS Safari limitations
    if (support.browser === 'Safari' && /iPad|iPhone|iPod/.test(navigator.userAgent)) {
        support.iosSafari = true;
        support.notifications = false; // iOS Safari doesn't support notifications
    }
    
    console.log('Browser notification support:', support);
    return support;
}

// Fallback to native notifications
function requestNativeNotificationPermission() {
    if ('Notification' in window) {
        Notification.requestPermission().then((permission) => {
            if (permission === "granted") {
                setCookie("notification_subscribed", "true", 365);
                hideNotificationPopup();
                showToast("✅ Successfully subscribed to notifications!", "success");
                trackEvent("notification_subscription", { status: "subscribed", method: "native" });
                
                // Show a test notification
                new Notification("RootTech Shop", {
                    body: "Welcome! You'll now receive updates about our latest products.",
                    icon: "/root_tech_back_remove-removebg-preview.png"
                });
            } else {
                showToast("⚠️ You denied notifications. Enable them in browser settings.", "error");
                trackEvent("notification_subscription", { status: "denied", method: "native" });
            }
        }).catch((error) => {
            console.error('Error requesting native notification permission:', error);
            trackEvent('notification_subscription', { status: 'error', method: 'native', error: error.message });
            showToast('Failed to subscribe to notifications', 'error');
        });
    } else {
        showToast("Push notifications are not supported in your browser", "info");
        hideNotificationPopup();
    }
}

// Send push notification (for testing/admin use)
function sendTestNotification(title, message) {
    if (!window.OneSignal) {
        console.warn('OneSignal not available');
        return;
    }
    
    try {
        OneSignal.User.PushSubscription.optIn();
        OneSignal.Notifications.add({
            title: title || 'RootTech Shop Update',
            message: message || 'New products available!',
            url: window.location.href + '#products',
            icon: '/root_tech_back_remove-removebg-preview.png'
        });
        
        trackEvent('test_notification_sent', {
            title: title,
            message: message
        });
        
        showToast('Test notification sent!', 'success');
    } catch (error) {
        console.error('Error sending test notification:', error);
        showToast('Failed to send notification', 'error');
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
            const headerHeight = document.querySelector('.header')?.offsetHeight || 0;
            const quickContactElement = document.querySelector('.quick-contact');
            const quickContactHeight = quickContactElement ? quickContactElement.offsetHeight : 0;
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
        // Add timeout to fetch request
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
        
        const response = await fetch(sheetURL, {
            signal: controller.signal,
            headers: {
                'Accept': 'application/json',
                'Cache-Control': 'no-cache'
            }
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}`);
        }
        
        let data = await response.text();
        
        // Validate response format
        if (!data || data.length < 50) {
            throw new Error('Invalid response from Google Sheets - response too short');
        }
        
        // Remove extra characters added by Google Sheets API
        data = data.substring(47, data.length - 2);
        
        let json;
        try {
            json = JSON.parse(data);
        } catch (parseError) {
            throw new Error(`Failed to parse JSON response: ${parseError.message}`);
        }
        
        // Validate JSON structure
        if (!json.table || !json.table.rows || !Array.isArray(json.table.rows)) {
            throw new Error('Invalid JSON structure - missing table.rows array');
        }
        
        allProducts = [];
        const rows = json.table.rows;
        
        // Skip header row if it exists
        const startIndex = rows[0]?.c[0]?.v === 'Model' ? 1 : 0;
        
        let validProducts = 0;
        let invalidProducts = 0;
        
        for (let i = startIndex; i < rows.length; i++) {
            const row = rows[i];
            if (row.c && row.c.length > 0) {
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
                
                // Only add products with valid data
                if (product.model !== "N/A" && product.model.trim() !== "") {
                    allProducts.push(product);
                    validProducts++;
                } else {
                    invalidProducts++;
                }
            }
        }
        
        console.log(`Loaded ${allProducts.length} products from Google Sheets (${validProducts} valid, ${invalidProducts} invalid)`);
        
        if (allProducts.length === 0) {
            console.warn('No valid products found in Google Sheets');
            showError("No products found. Please check the Google Sheets configuration.");
        } else {
            filterAndDisplayProducts();
            // Save to cache for offline use
            await saveProductsToCache(allProducts, 'products_cache');
        }
        
        showProductsLoading(false);
        
        trackEvent('products_loaded', {
            total_products: allProducts.length,
            valid_products: validProducts,
            invalid_products: invalidProducts
        });
        
    } catch (error) {
        console.error("Error fetching products:", error);
        showProductsLoading(false);
        
        let errorMessage = "Failed to load products. ";
        if (error.name === 'AbortError') {
            errorMessage += "Request timed out. Please check your internet connection.";
        } else if (error.message.includes('HTTP error')) {
            errorMessage += "Server error. Please try again later.";
        } else if (error.message.includes('JSON')) {
            errorMessage += "Data format error. Please contact support.";
        } else {
            errorMessage += "Please try again later.";
        }
        
        showError(errorMessage);
        
        trackEvent('products_load_error', {
            error_message: error.message,
            error_type: error.name,
            error_stack: error.stack
        });
        
        // Try to load from cache if available
        try {
            const cachedProducts = await loadProductsFromCache();
            if (cachedProducts && cachedProducts.length > 0) {
                console.log('Loading products from cache...');
                allProducts = cachedProducts;
                filterAndDisplayProducts();
                showToast('Loaded products from cache', 'info');
            }
        } catch (cacheError) {
            console.log('No cached products available');
        }
    }
}

// Cache management functions
async function saveProductsToCache(products, cacheKey = 'products_cache') {
    try {
        const cacheData = {
            products: products,
            timestamp: Date.now(),
            version: '1.0'
        };
        localStorage.setItem(cacheKey, JSON.stringify(cacheData));
        console.log(`Products saved to cache: ${products.length} items`);
    } catch (error) {
        console.error('Error saving to cache:', error);
    }
}

async function loadProductsFromCache(cacheKey = 'products_cache') {
    try {
        const cached = localStorage.getItem(cacheKey);
        if (!cached) return null;
        
        const cacheData = JSON.parse(cached);
        const cacheAge = Date.now() - cacheData.timestamp;
        const maxAge = 24 * 60 * 60 * 1000; // 24 hours
        
        if (cacheAge > maxAge) {
            console.log('Cache expired, removing old data');
            localStorage.removeItem(cacheKey);
            return null;
        }
        
        console.log(`Products loaded from cache: ${cacheData.products.length} items (age: ${Math.round(cacheAge / 1000 / 60)} minutes)`);
        return cacheData.products;
    } catch (error) {
        console.error('Error loading from cache:', error);
        return null;
    }
}

async function fetchAmazonProducts() {
    const sheetURL = "https://docs.google.com/spreadsheets/d/1Ba_YRVZAxBPh76j6-UdAx0Qi_UfU1d6wKau2av9VhFs/gviz/tq?tqx=out:json&sheet=Amazon";
    
    try {
        const response = await fetch(sheetURL);
        let data = await response.text();
        
        // Remove extra characters added by Google Sheets API
        data = data.substring(47, data.length - 2);
        const json = JSON.parse(data);
        
        amazonProducts = [];
        const rows = json.table.rows;
        
        // Skip header row if it exists
        const startIndex = rows[0]?.c[0]?.v === 'Model' ? 1 : 0;
        
        for (let i = startIndex; i < rows.length; i++) {
            const row = rows[i];
            if (row.c && row.c.length > 0) {
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
                
                // Only add products with valid data
                if (product.model !== "N/A" && product.model.trim() !== "") {
                    amazonProducts.push(product);
                }
            }
        }
        
        console.log(`Loaded ${amazonProducts.length} Amazon products from Google Sheets`);
        displayAmazonProducts();
        
    } catch (error) {
        console.error("Error fetching Amazon products:", error);
        trackEvent('amazon_products_load_error', {
            error_message: error.message
        });
    }
}

async function fetchFacebookAdsProducts() {
    const sheetURL = "https://docs.google.com/spreadsheets/d/1Ba_YRVZAxBPh76j6-UdAx0Qi_UfU1d6wKau2av9VhFs/gviz/tq?tqx=out:json&sheet=FacebookAds";
    
    try {
        const response = await fetch(sheetURL);
        let data = await response.text();
        
        // Remove extra characters added by Google Sheets API
        data = data.substring(47, data.length - 2);
        const json = JSON.parse(data);
        
        facebookAdsProducts = [];
        const rows = json.table.rows;
        
        // Skip header row if it exists
        const startIndex = rows[0]?.c[0]?.v === 'Model' ? 1 : 0;
        
        for (let i = startIndex; i < rows.length; i++) {
            const row = rows[i];
            if (row.c && row.c.length > 0) {
                const product = {
                    model: row.c[0]?.v || "N/A",
                    category: row.c[1]?.v || "Other",
                    processor: row.c[2]?.v || "N/A",
                    ram: row.c[3]?.v || "N/A",
                    storage: row.c[4]?.v || "N/A",
                    price: row.c[5]?.v || "N/A",
                    imageUrl: row.c[6]?.v || "",
                    description: row.c[7]?.v || "",
                    source: "Facebook Ads"
                };
                
                // Only add products with valid data
                if (product.model !== "N/A" && product.model.trim() !== "") {
                    facebookAdsProducts.push(product);
                }
            }
        }
        
        console.log(`Loaded ${facebookAdsProducts.length} Facebook Ads products from Google Sheets`);
        filterAndDisplayProducts(); // Refresh display to include new products
        
        trackEvent('facebook_ads_products_loaded', {
            total_products: facebookAdsProducts.length
        });
        
    } catch (error) {
        console.error("Error fetching Facebook Ads products:", error);
        trackEvent('facebook_ads_products_load_error', {
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
        // Validate and sanitize image URL
        const imageUrl = validateImageUrl(product.imageUrl);
        const safeModel = (product.model || '').replace(/'/g, "\\'").replace(/"/g, '\\"');
        const safePrice = (product.price || '').toString();
        
        return `
        <div class="product-card lazy-load clickable" 
             data-category="${product.category || 'Other'}" 
             style="animation-delay: ${index * 0.1}s"
             onclick="buyOnWhatsApp('${safeModel}', '${safePrice}')"
             title="Click to enquire about ${product.model}">
            <img src="${imageUrl}" 
                 alt="${product.model || 'Product'}" 
                 loading="lazy" 
                 class="lazy-load" 
                 onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDMwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0xMjUgNzVIMTc1VjEyNUgxMjVWNzVaIiBmaWxsPSIjRTVFN0VCIi8+CjxwYXRoIGQ9Ik0xMzEuMjUgOTMuNzVIMTY4Ljc1VjEwNi4yNUgxMzEuMjVWOTMuNzVaIiBmaWxsPSIjRDFENURCIi8+CjwvZz4KPC9zdmc+'">
            <div class="product-card-content">
                <h3>${product.model || 'Product'}</h3>
                ${product.processor && product.processor !== "N/A" ? `<p><strong>Processor:</strong> ${product.processor}</p>` : ""}
                ${product.ram && product.ram !== "N/A" ? `<p><strong>RAM:</strong> ${product.ram}</p>` : ""}
                ${product.storage && product.storage !== "N/A" ? `<p><strong>Storage:</strong> ${product.storage}</p>` : ""}
                ${product.description ? `<p class="product-description">${product.description}</p>` : ""}
                <div class="price">₹${formatPrice(product.price)}</div>
                <div class="product-actions">
                    <button class="btn btn-primary whatsapp-btn">
                        <i class="fab fa-whatsapp"></i> Enquire Now
                    </button>
                    <div class="click-hint">
                        <i class="fas fa-mouse-pointer"></i> Click anywhere on card to enquire
                    </div>
                </div>
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
    
    // Update dynamic structured data for products
    updateProductStructuredData(products);
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
    // Validate and sanitize image URL
    const imageUrl = validateImageUrl(product.imageUrl);
    const safeModel = (product.model || '').replace(/'/g, "\\'").replace(/"/g, '\\"');
    const safePrice = (product.price || '').toString();
    
    return `
        <div class="product-card">
            <img src="${imageUrl}" alt="${product.model || 'Product'}" loading="lazy" class="lazy-load" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDMwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0xMjUgNzVIMTc1VjEyNUgxMjVWNzVaIiBmaWxsPSIjRTVFN0VCIi8+CjxwYXRoIGQ9Ik0xMzEuMjUgOTMuNzVIMTY4Ljc1VjEwNi4yNUgxMzEuMjVWOTMuNzVaIiBmaWxsPSIjRDFENURCIi8+CjwvZz4KPC9zdmc+'">
            <div class="product-card-content">
                <h3>${product.model || 'Product'}</h3>
                ${product.processor && product.processor !== "N/A" ? `<p><strong>Processor:</strong> ${product.processor}</p>` : ""}
                ${product.ram && product.ram !== "N/A" ? `<p><strong>RAM:</strong> ${product.ram}</p>` : ""}
                ${product.storage && product.storage !== "N/A" ? `<p><strong>Storage:</strong> ${product.storage}</p>` : ""}
                <div class="price">₹${formatPrice(product.price)}</div>
                <a href="${product.link || '#'}" target="_blank" class="btn btn-amazon" onclick="trackEvent('amazon_product_click', {product_name: '${safeModel}', product_price: '${safePrice}'})">
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
    try {
        if (price === "N/A" || price === null || price === undefined) return "N/A";
        
        // Convert to string and clean up
        const priceStr = price.toString().trim();
        if (!priceStr || priceStr === "") return "N/A";
        
        // Remove any non-numeric characters except dots and commas
        const cleanPrice = priceStr.replace(/[^\d.,]/g, '');
        if (!cleanPrice) return "N/A";
        
        // Convert to number and format
        const numPrice = parseFloat(cleanPrice.replace(',', ''));
        if (isNaN(numPrice)) return "N/A";
        
        // Format with commas
        return numPrice.toLocaleString('en-IN');
        
    } catch (error) {
        console.warn('Error formatting price:', price, error);
        return "N/A";
    }
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

// OneSignal initialization with retry logic
function initOneSignalWithRetry() {
    let retryCount = 0;
    const maxRetries = 8; // Increased retries
    const retryDelay = 1500; // 1.5 seconds between retries
    
    function attemptInit() {
        if (window.OneSignal) {
            console.log('OneSignal SDK detected, initializing...');
            const success = initOneSignal();
            if (success) {
                console.log('OneSignal initialized successfully');
                return;
            }
        }
        
        retryCount++;
        if (retryCount < maxRetries) {
            console.log(`OneSignal SDK not ready, retrying in ${retryDelay}ms... (${retryCount}/${maxRetries})`);
            setTimeout(attemptInit, retryDelay);
        } else {
            console.warn('OneSignal SDK failed to load after all retries');
            trackEvent('onesignal_final_failure', {
                retry_count: retryCount,
                max_retries: maxRetries
            });
        }
    }
    
    // Start the retry process
    attemptInit();
}

// OneSignal Push Notifications Initialization
function initOneSignal() {
    try {
        if (window.OneSignal) {
            console.log('OneSignal SDK found, initializing...');
            
            OneSignal.push(function() {
                OneSignal.init({
                    appId: "ee523d8b-51c0-43d7-ad51-f0cf380f0487",
                    safari_web_id: "web.onesignal.auto.YOUR_SAFARI_WEB_ID",
                    notifyButton: {
                        enable: false,
                    },
                    autoResubscribe: true,
                    persistNotification: false,
                    allowLocalhostAsSecureOrigin: true,
                    welcomeNotification: {
                        title: "Welcome to RootTech Shop!",
                        message: "Stay updated with our latest products and offers."
                    }
                });
                
                console.log('OneSignal initialized successfully');
                
                // Track OneSignal initialization
                trackEvent('onesignal_initialized', {
                    app_id: "ee523d8b-51c0-43d7-ad51-f0cf380f0487"
                });
                
                // Set up OneSignal event listeners with error handling
                try {
                    if (OneSignal.User && OneSignal.User.PushSubscription) {
                        OneSignal.User.PushSubscription.addEventListener('change', (event) => {
                            console.log('Push subscription changed:', event);
                            trackEvent('push_subscription_changed', {
                                is_subscribed: event.currentTarget.optedIn
                            });
                        });
                    }
                    
                    if (OneSignal.Notifications) {
                        OneSignal.Notifications.addEventListener('click', (event) => {
                            console.log('Notification clicked:', event);
                            trackEvent('notification_clicked', {
                                notification_id: event.notification.id,
                                notification_title: event.notification.title
                            });
                        });
                        
                        OneSignal.Notifications.addEventListener('dismiss', (event) => {
                            console.log('Notification dismissed:', event);
                            trackEvent('notification_dismissed', {
                                notification_id: event.notification.id
                            });
                        });
                    }
                    
                    // Check current subscription status
                    if (OneSignal.User && OneSignal.User.PushSubscription) {
                        OneSignal.User.PushSubscription.optedIn.then((optedIn) => {
                            console.log('User opted in to push notifications:', optedIn);
                            if (optedIn) {
                                setCookie('notification_subscribed', 'true', 365);
                            }
                        }).catch((error) => {
                            console.warn('Error checking subscription status:', error);
                        });
                    }
                    
                } catch (error) {
                    console.warn('Error setting up OneSignal event listeners:', error);
                }
                
            });
            
            return true;
        } else {
            console.warn('OneSignal SDK not loaded');
            trackEvent('onesignal_load_error', {
                error: 'SDK not loaded'
            });
            return false;
        }
    } catch (error) {
        console.error('Error initializing OneSignal:', error);
        trackEvent('onesignal_init_error', {
            error: error.message
        });
        return false;
    }
}

// Service Worker Registration
function initServiceWorker() {
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/sw.js')
                .then((registration) => {
                    console.log('Service Worker registered successfully:', registration);
                    
                    // Track successful registration
                    trackEvent('service_worker_registered', {
                        scope: registration.scope,
                        version: registration.active?.scriptURL
                    });
                    
                    // Handle updates
                    registration.addEventListener('updatefound', () => {
                        const newWorker = registration.installing;
                        newWorker.addEventListener('statechange', () => {
                            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                // New version available
                                console.log('New Service Worker version available');
                                trackEvent('service_worker_update_available');
                                
                                // You can show a notification to the user here
                                showToast('New version available! Refresh to update.', 'info');
                            }
                        });
                    });
                })
                .catch((error) => {
                    console.error('Service Worker registration failed:', error);
                    trackEvent('service_worker_registration_failed', {
                        error: error.message
                    });
                });
        });
    } else {
        console.warn('Service Worker not supported');
        trackEvent('service_worker_not_supported');
    }
}

// Image URL validation and fallback
function validateImageUrl(imageUrl) {
    if (!imageUrl || typeof imageUrl !== 'string') {
        return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDMwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0xMjUgNzVIMTc1VjEyNUgxMjVWNzVaIiBmaWxsPSIjRTVFN0VCIi8+CjxwYXRoIGQ9Ik0xMzEuMjUgOTMuNzVIMTY4Ljc1VjEwNi4yNUgxMzEuMjVWOTMuNzVaIiBmaWxsPSIjRDFENURCIi8+CjwvZz4KPC9zdmc+';
    }
    
    // Check if URL is valid
    try {
        const url = new URL(imageUrl);
        // Only allow HTTP/HTTPS protocols
        if (url.protocol !== 'http:' && url.protocol !== 'https:') {
            return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDMwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0xMjUgNzVIMTc1VjEyNUgxMjVWNzVaIiBmaWxsPSIjRTVFN0VCIi8+CjxwYXRoIGQ9Ik0xMzEuMjUgOTMuNzVIMTY4Ljc1VjEwNi4yNUgxMzEuMjVWOTMuNzVaIiBmaWxsPSIjRDFENURCIi8+CjwvZz4KPC9zdmc+';
        }
        
        // Check for common invalid domains
        const invalidDomains = ['suncomputersystem.com', 'localhost', '127.0.0.1'];
        if (invalidDomains.some(domain => url.hostname.includes(domain))) {
            return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDMwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0xMjUgNzVIMTc1VjEyNUgxMjVWNzVaIiBmaWxsPSIjRTVFN0VCIi8+CjxwYXRoIGQ9Ik0xMzEuMjUgOTMuNzVIMTY4Ljc1VjEwNi4yNUgxMzEuMjVWOTMuNzVaIiBmaWxsPSIjRDFENURCIi8+CjwvZz4KPC9zdmc+';
        }
        
        return imageUrl;
    } catch (error) {
        console.warn('Invalid image URL:', imageUrl, error);
        return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDMwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0xMjUgNzVIMTc1VjEyNUgxMjVWNzVaIiBmaWxsPSIjRTVFN0VCIi8+CjxwYXRoIGQ9Ik0xMzEuMjUgOTMuNzVIMTY4Ljc1VjEwNi4yNUgxMzEuMjVWOTMuNzVaIiBmaWxsPSIjRDFENURCIi8+CjwvZz4KPC9zdmc+';
    }
}

// Preload and validate images
function preloadImage(imageUrl) {
    return new Promise((resolve) => {
        if (!imageUrl || imageUrl.startsWith('data:')) {
            resolve(imageUrl); // Return as-is for data URLs
            return;
        }
        
        const img = new Image();
        img.onload = () => {
            resolve(imageUrl); // Image loaded successfully
        };
        img.onerror = () => {
            console.warn('Failed to load image:', imageUrl);
            resolve('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDMwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRTVFN0VCIi8+CjxwYXRoIGQ9Ik0xMjUgNzVIMTc1VjEyNUgxMjVWNzVaIiBmaWxsPSIjRTVFN0VCIi8+CjxwYXRoIGQ9Ik0xMzEuMjUgOTMuNzVIMTY4Ljc1VjEwNi4yNUgxMzEuMjVWOTMuNzVaIiBmaWxsPSIjRDFENURCIi8+CjwvZz4KPC9zdmc+');
        };
        
        // Set timeout to prevent hanging
        setTimeout(() => {
            img.onload = null;
            img.onerror = null;
            resolve('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDMwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0xMjUgNzVIMTc1VjEyNUgxMjVWNzVaIiBmaWxsPSIjRTVFN0VCIi8+CjxwYXRoIGQ9Ik0xMzEuMjUgOTMuNzVIMTY4Ljc1VjEwNi4yNUgxMzEuMjVWOTMuNzVaIiBmaWxsPSIjRDFENURCIi8+CjwvZz4KPC9zdmc+');
        }, 5000); // 5 second timeout
        
        img.src = imageUrl;
    });
}
        // Create new structured data with safe data handling
        const structuredData = {
            "@context": "https://schema.org",
            "@type": "ItemList",
            "name": "Available Products",
            "description": `Current inventory of ${products.length} refurbished IT products`,
            "url": window.location.href + "#products",
            "numberOfItems": products.length,
            "itemListElement": products.map((product, index) => {
                // Safely handle all product properties
                const safeModel = (product.model || 'Product').toString();
                const safeCategory = (product.category || 'Other').toString();
                const safeProcessor = (product.processor || 'N/A').toString();
                const safeRam = (product.ram || 'N/A').toString();
                const safeStorage = (product.storage || 'N/A').toString();
                const safeDescription = (product.description || `${safeCategory} - ${safeProcessor} ${safeRam} ${safeStorage}`).toString();
                const safeSource = (product.source || 'RootTech Shop').toString();
                
                // Safely handle price
                let safePrice = '0';
                try {
                    if (product.price !== null && product.price !== undefined) {
                        safePrice = product.price.toString().replace(/[^\d.]/g, '');
                        if (!safePrice || safePrice === '') safePrice = '0';
                    }
                } catch (error) {
                    console.warn('Error processing price for product:', product.model, error);
                    safePrice = '0';
                }
                
                return {
                    "@type": "ListItem",
                    "position": index + 1,
                    "item": {
                        "@type": "Product",
                        "name": safeModel,
                        "description": safeDescription,
                        "category": safeCategory,
                        "brand": {
                            "@type": "Brand",
                            "name": safeSource
                        },
                        "offers": {
                            "@type": "Offer",
                            "price": safePrice,
                            "priceCurrency": "INR",
                            "availability": "https://schema.org/InStock",
                            "seller": {
                                "@type": "Organization",
                                "name": "Shiv Infocom - RootTech Shop",
                                "url": "https://dhruvilthewebhost.github.io/Shiv-Root/"
                            }
                        },
                        "additionalProperty": [
                            {
                                "@type": "PropertyValue",
                                "name": "Processor",
                                "value": safeProcessor
                            },
                            {
                                "@type": "PropertyValue",
                                "name": "RAM",
                                "value": safeRam
                            },
                            {
                                "@type": "PropertyValue",
                                "name": "Storage",
                                "value": safeStorage
                            }
                        ].filter(prop => prop.value && prop.value !== "N/A" && prop.value !== "undefined")
                    }
                };
            })
        };
        
        // Create and inject the script tag
        const script = document.createElement('script');
        script.type = 'application/ld+json';
        script.setAttribute('data-dynamic-products', 'true');
        script.textContent = JSON.stringify(structuredData, null, 2);
        
        // Insert after the existing structured data
        const existingStructuredData = document.querySelector('script[type="application/ld+json"]');
        if (existingStructuredData) {
            existingStructuredData.parentNode.insertBefore(script, existingStructuredData.nextSibling);
        } else {
            document.head.appendChild(script);
        }
        
        console.log('Product structured data updated with', products.length, 'products');
        
        // Track structured data update
        trackEvent('structured_data_updated', {
            product_count: products.length,
            data_type: 'products'
        });
        
    } catch (error) {
        console.error('Error updating product structured data:', error);
        trackEvent('structured_data_error', {
            error: error.message,
            data_type: 'products'
        });
    }
}

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
