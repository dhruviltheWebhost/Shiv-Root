// Global variables
let allProducts = [];
let amazonProducts = [];
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
    fetchProducts();
    fetchAmazonProducts();
    initTawkTo();
    initLazyLoading();
    
    // Show notification popup after 5 seconds
    setTimeout(showNotificationPopup, 5000);
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
    let filteredProducts = [...allProducts, ...amazonProducts];
    
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
    if (getCookie("notification_dismissed") === "true") return;
    if (getCookie("notification_subscribed") === "true") return;

    if (notificationPopup) {
        notificationPopup.classList.add("show");
        trackEvent("notification_popup", { action: "shown" });
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
    if (!window.OneSignal) {
        showToast("Push notifications are not supported in your browser", "info");
        hideNotificationPopup();
        return;
    }

    OneSignal.Notifications.requestPermission().then((permission) => {
        if (permission === "granted") {
            setCookie("notification_subscribed", "true", 365);
            hideNotificationPopup();
            showToast("✅ Successfully subscribed to notifications!", "success");
            trackEvent("notification_subscription", { status: "subscribed" });
        } else {
            showToast("⚠️ You denied notifications. Enable them in browser settings.", "error");
            trackEvent("notification_subscription", { status: "denied" });
        }
    });
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
                    description: row.c[7]?.v || ""
                };
                
                // Only add products with valid data
                if (product.model !== "N/A" && product.model.trim() !== "") {
                    allProducts.push(product);
                }
            }
        }
        
        console.log(`Loaded ${allProducts.length} products from Google Sheets`);
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
    
    const productsHTML = products.map((product, index) => `
        <div class="product-card lazy-load" data-category="${product.category}" style="animation-delay: ${index * 0.1}s">
            <img src="${product.imageUrl}" alt="${product.model}" loading="lazy" class="lazy-load" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDMwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0xMjUgNzVIMTc1VjEyNUgxMjVWNzVaIiBmaWxsPSIjRTVFN0VCIi8+CjxwYXRoIGQ9Ik0xMzEuMjUgOTMuNzVIMTY4Ljc1VjEwNi4yNUgxMzEuMjVWOTMuNzVaIiBmaWxsPSIjRDFENURCIi8+CjwvZz4KPC9zdmc+'">
            <div class="product-card-content">
                <h3>${product.model}</h3>
                ${product.processor !== "N/A" ? `<p><strong>Processor:</strong> ${product.processor}</p>` : ""}
                ${product.ram !== "N/A" ? `<p><strong>RAM:</strong> ${product.ram}</p>` : ""}
                ${product.storage !== "N/A" ? `<p><strong>Storage:</strong> ${product.storage}</p>` : ""}
                ${product.description ? `<p class="product-description">${product.description}</p>` : ""}
                <div class="price">₹${formatPrice(product.price)}</div>
                <button onclick="buyOnWhatsApp('${product.model.replace(/'/g, "\\'")}', '${product.price}')" class="btn btn-primary">
                    <i class="fab fa-whatsapp"></i> Enquire Now
                </button>
            </div>
        </div>
    `).join('');
    
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
