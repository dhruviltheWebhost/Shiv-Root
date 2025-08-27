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
const notificationPopup = document.getElementById('notification-popup');
const closePopupBtn = document.getElementById('close-popup-btn');
const subscribeBtn = document.getElementById('subscribe-btn');
const notNowBtn = document.getElementById('not-now-btn');

// --- HELPER FUNCTIONS ---

/**
 * Debounce function to limit the rate at which a function gets called.
 * @param {Function} func The function to debounce.
 * @param {number} delay The delay in milliseconds.
 * @returns {Function} The debounced function.
 */
function debounce(func, delay = 300) {
  let timeoutId;
  return function(...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      func.apply(this, args);
    }, delay);
  };
}

/**
 * Formats a number as a price string (e.g., 10000 -> "10,000").
 * @param {string|number} price The price to format.
 * @returns {string} The formatted price string.
 */
function formatPrice(price) {
  if (price === "N/A" || !price) return "N/A";
  return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// --- INITIALIZATION ---

document.addEventListener('DOMContentLoaded', function() {
  // Hide loading screen gracefully
  setTimeout(() => {
    if (loadingScreen) {
      loadingScreen.style.opacity = '0';
      setTimeout(() => {
        loadingScreen.style.display = 'none';
      }, 500);
    }
  }, 1500);

  // Initialize all functionalities
  initMobileMenu();
  initScrollEffects();
  initFilterTabs();
  initAnimations();
  initSearchFunctionality(); // This now handles search and suggestions
  initNotificationPopup();
  initAnalytics();
  initOneSignal();
  initServiceWorker();
  initLazyLoading();

  // Fetch product data from Google Sheets
  fetchProducts();
  fetchAmazonProducts();
  fetchFacebookAdsProducts();

  // Show notification popup after a delay
  setTimeout(showNotificationPopup, 5000);
});


// --- SEARCH FUNCTIONALITY ---

/**
 * Initializes the main search input and suggestion dropdown.
 */
function initSearchFunctionality() {
    const mainSearchInput = document.getElementById('product-search');
    const mainSuggestions = document.getElementById('search-suggestions');
    const mainClearBtn = document.getElementById('clear-search');

    if (!mainSearchInput) return;

    const handleSuggestions = (query, suggestionsContainer) => {
        if (query.length < 2) {
            suggestionsContainer.style.display = 'none';
            return;
        }

        const allAvailableProducts = [...allProducts, ...amazonProducts, ...facebookAdsProducts];
        const filtered = allAvailableProducts.filter(product =>
            product.model.toLowerCase().includes(query) ||
            (product.category && product.category.toLowerCase().includes(query)) ||
            (product.processor && product.processor.toLowerCase().includes(query))
        ).slice(0, 10); // Limit to 10 results

        if (filtered.length > 0) {
            suggestionsContainer.innerHTML = filtered.map(product => `
                <a href="${product.link || 'javascript:void(0)'}" class="suggestion-item" onclick="buyOnWhatsApp('${product.model.replace(/'/g, "\\'")}', '${product.price}')">
                    <img src="${product.imageUrl}" alt="${product.model}" onerror="this.src='root_tech_back_remove-removebg-preview.png'">
                    <div class="suggestion-details">
                        <div class="suggestion-name">${product.model}</div>
                        <div class="suggestion-price">₹${formatPrice(product.price)}</div>
                    </div>
                </a>
            `).join('');
        } else {
            suggestionsContainer.innerHTML = '<div class="no-results">No results found</div>';
        }
        suggestionsContainer.style.display = 'block';
    };

    const debouncedMainSearch = debounce(query => handleSuggestions(query, mainSuggestions));

    // Setup main search input
    mainSearchInput.addEventListener('input', () => {
        const query = mainSearchInput.value.toLowerCase().trim();
        searchQuery = query; // Update global search query
        isSearching = query.length > 0;
        mainClearBtn.style.display = isSearching ? 'block' : 'none';
        debouncedMainSearch(query);
        filterAndDisplayProducts(); // Also update main grid
        
        // Update search results count
        updateSearchResultsCount();
    });

    mainClearBtn.addEventListener('click', () => {
        mainSearchInput.value = '';
        searchQuery = '';
        isSearching = false;
        mainClearBtn.style.display = 'none';
        mainSuggestions.style.display = 'none';
        filterAndDisplayProducts();
        updateSearchResultsCount();
    });

    // Hide suggestions when clicking outside
    document.addEventListener('click', (e) => {
        if (!mainSearchInput.parentElement.contains(e.target)) {
            mainSuggestions.style.display = 'none';
        }
    });
}

/**
 * Updates the search results count display.
 */
function updateSearchResultsCount() {
    const resultsCountElement = document.getElementById('search-results-count');
    if (!resultsCountElement) return;
    
    if (isSearching || currentFilter !== 'all') {
        const filteredProducts = getFilteredProducts();
        const count = filteredProducts.length;
        const filterText = currentFilter !== 'all' ? ` in ${currentFilter}s` : '';
        const searchText = isSearching ? ` for "${searchQuery}"` : '';
        resultsCountElement.textContent = `${count} product${count !== 1 ? 's' : ''} found${searchText}${filterText}`;
        resultsCountElement.style.display = 'block';
    } else {
        resultsCountElement.style.display = 'none';
    }
}


// --- PRODUCT FETCHING AND DISPLAY ---

/**
 * Fetches products from the "Products" sheet.
 */
async function fetchProducts() {
  const sheetURL = "https://docs.google.com/spreadsheets/d/1Ba_YRVZAxBPh76j6-UdAx0Qi_UfU1d6wKau2av9VhFs/gviz/tq?tqx=out:json&sheet=Products";
  showProductsLoading(true);

  try {
    const response = await fetch(sheetURL);
    let data = await response.text();
    data = data.substring(47, data.length - 2);
    const json = JSON.parse(data);

    allProducts = json.table.rows.map(row => ({
      model: row.c[0]?.v || "N/A",
      category: row.c[1]?.v || "Other",
      processor: row.c[2]?.v || "N/A",
      ram: row.c[3]?.v || "N/A",
      storage: row.c[4]?.v || "N/A",
      price: row.c[5]?.v || "N/A",
      imageUrl: row.c[6]?.v || "",
      description: row.c[7]?.v || ""
    })).filter(p => p.model !== "N/A");

    // Initial load - show only first 6 products
    filterAndDisplayProducts();
    updateSearchResultsCount();
  } catch (error) {
    console.error("Error fetching products:", error);
    // Show error message to user
    if (productGrid) {
      productGrid.innerHTML = `
        <div class="no-products">
          <i class="fas fa-exclamation-triangle"></i>
          <h3>Unable to load products</h3>
          <p>Please check your internet connection and try refreshing the page.</p>
          <button onclick="fetchProducts()" class="btn btn-primary" style="margin-top: 1rem;">
            <i class="fas fa-refresh"></i> Try Again
          </button>
        </div>`;
    }
  } finally {
    showProductsLoading(false);
  }
}

/**
 * Fetches products from the "Amazon" sheet.
 */
async function fetchAmazonProducts() {
    const sheetURL = "https://docs.google.com/spreadsheets/d/1Ba_YRVZAxBPh76j6-UdAx0Qi_UfU1d6wKau2av9VhFs/gviz/tq?tqx=out:json&sheet=Amazon";
    try {
        const response = await fetch(sheetURL);
        let data = await response.text();
        data = data.substring(47, data.length - 2);
        const json = JSON.parse(data);

        amazonProducts = json.table.rows.map(row => ({
            model: row.c[0]?.v || "N/A",
            category: row.c[1]?.v || "Other",
            processor: row.c[2]?.v || "N/A",
            ram: row.c[3]?.v || "N/A",
            storage: row.c[4]?.v || "N/A",
            price: row.c[5]?.v || "N/A",
            imageUrl: row.c[6]?.v || "",
            link: row.c[7]?.v || "#"
        })).filter(p => p.model !== "N/A");

        displayAmazonProducts();
    } catch (error) {
        console.error("Error fetching Amazon products:", error);
    }
}

/**
 * Fetches products from the "FacebookAds" sheet.
 */
async function fetchFacebookAdsProducts() {
    const sheetURL = "https://docs.google.com/spreadsheets/d/1Ba_YRVZAxBPh76j6-UdAx0Qi_UfU1d6wKau2av9VhFs/gviz/tq?tqx=out:json&sheet=FacebookAds";
    try {
        const response = await fetch(sheetURL);
        let data = await response.text();
        data = data.substring(47, data.length - 2);
        const json = JSON.parse(data);

        facebookAdsProducts = json.table.rows.map(row => ({
            model: row.c[0]?.v || "N/A",
            category: row.c[1]?.v || "Other",
            processor: row.c[2]?.v || "N/A",
            ram: row.c[3]?.v || "N/A",
            storage: row.c[4]?.v || "N/A",
            price: row.c[5]?.v || "N/A",
            imageUrl: row.c[6]?.v || "",
            description: row.c[7]?.v || "",
            source: "Facebook Ads"
        })).filter(p => p.model !== "N/A");
    } catch (error) {
        console.error("Error fetching Facebook Ads products:", error);
    }
}

/**
 * Gets filtered products based on current filter and search criteria.
 * @returns {Array} The filtered products array.
 */
function getFilteredProducts() {
  let filteredProducts = [...allProducts];

  // Apply category filter
  if (currentFilter !== 'all') {
    filteredProducts = filteredProducts.filter(product => 
      product.category.toLowerCase() === currentFilter.toLowerCase()
    );
  }

  // Apply search filter
  if (isSearching && searchQuery) {
    filteredProducts = filteredProducts.filter(product => {
      const searchableText = `${product.model} ${product.processor} ${product.ram} ${product.storage} ${product.category}`.toLowerCase();
      return searchableText.includes(searchQuery.toLowerCase());
    });
  }

  return filteredProducts;
}

/**
 * Filters and displays products on the main grid based on current filters and search query.
 */
function filterAndDisplayProducts() {
    const viewAllContainer = document.getElementById('view-all-container');
    let filteredProducts = getFilteredProducts();

    // Check if we should apply the 6-item limit (only on initial load)
    const shouldLimit = !isSearching && currentFilter === 'all';

    if (shouldLimit) {
        displayProducts(filteredProducts.slice(0, 6)); // Show only the first 6
        
        // If there are more than 6 products, show the "View All" button
        if (filteredProducts.length > 6) {
            renderViewAllButton(filteredProducts.length);
        } else {
            viewAllContainer.innerHTML = ''; // No need for a button if less than 6
        }
    } else {
        displayProducts(filteredProducts); // Show all results when searching or filtering
        viewAllContainer.innerHTML = ''; // Hide the button
    }
}

/**
 * Creates and manages the "View All" button.
 * @param {number} totalCount - The total number of products available.
 */
function renderViewAllButton(totalCount) {
    const viewAllContainer = document.getElementById('view-all-container');
    if (viewAllContainer) {
        viewAllContainer.innerHTML = `
            <button id="view-all-btn" class="btn btn-secondary">View All ${totalCount} Products</button>
        `;
        
        // Add a click listener to the new button
        document.getElementById('view-all-btn').addEventListener('click', () => {
            const allProducts = getFilteredProducts();
            displayProducts(allProducts); // Display all products
            viewAllContainer.innerHTML = ''; // Remove the button after click
            trackEvent('view_all_products_click');
        });
    }
}

/**
 * Renders a list of products to the main product grid.
 * @param {Array} products The array of products to display.
 */
function displayProducts(products) {
  if (!productGrid) return;

  if (products.length === 0) {
    productGrid.innerHTML = `
            <div class="no-products">
                <i class="fas fa-search"></i>
                <h3>No products found</h3>
                <p>Try adjusting your search or filter criteria.</p>
            </div>`;
    return;
  }

  const productsHTML = products.map((product, index) => `
        <div class="product-card lazy-load clickable" 
             data-category="${product.category}" 
             style="animation-delay: ${index * 0.1}s"
             onclick="buyOnWhatsApp('${product.model.replace(/'/g, "\\'")}', '${product.price}')"
             title="Click to enquire about ${product.model}">
            <img src="${product.imageUrl}" alt="${product.model}" loading="lazy" class="lazy-load" onerror="this.src='root_tech_back_remove-removebg-preview.png'">
            <div class="product-card-content">
                <h3>${product.model}</h3>
                ${product.processor !== "N/A" ? `<p><strong>Processor:</strong> ${product.processor}</p>` : ""}
                ${product.ram !== "N/A" ? `<p><strong>RAM:</strong> ${product.ram}</p>` : ""}
                ${product.storage !== "N/A" ? `<p><strong>Storage:</strong> ${product.storage}</p>` : ""}
                <div class="price">₹${formatPrice(product.price)}</div>
                <div class="product-actions">
                    <button class="btn btn-primary whatsapp-btn">
                        <i class="fab fa-whatsapp"></i> Enquire Now
                    </button>
                </div>
            </div>
        </div>
    `).join('');

  productGrid.innerHTML = productsHTML;
  initLazyLoading(); // Re-initialize for new images
}

/**
 * Displays featured Amazon products in their respective grids.
 */
function displayAmazonProducts() {
  const laptopGrid = document.getElementById('amazon-laptop-grid');
  const accessoryGrid = document.getElementById('amazon-accessory-grid');
  if (!laptopGrid || !accessoryGrid) return;

  const laptops = amazonProducts.filter(p => p.category.toLowerCase() === 'laptop');
  const accessories = amazonProducts.filter(p => p.category.toLowerCase() !== 'laptop');

  laptopGrid.innerHTML = laptops.length > 0 ?
    laptops.slice(0, 4).map(createAmazonProductCard).join('') :
    '<p>No laptops available on Amazon at the moment.</p>';

  accessoryGrid.innerHTML = accessories.length > 0 ?
    accessories.slice(0, 4).map(createAmazonProductCard).join('') :
    '<p>No accessories available on Amazon at the moment.</p>';
}

/**
 * Creates the HTML for a single Amazon product card.
 * @param {object} product The Amazon product object.
 * @returns {string} The HTML string for the product card.
 */
function createAmazonProductCard(product) {
  return `
        <div class="product-card">
            <img src="${product.imageUrl}" alt="${product.model}" loading="lazy" class="lazy-load">
            <div class="product-card-content">
                <h3>${product.model}</h3>
                <div class="price">₹${formatPrice(product.price)}</div>
                <a href="${product.link}" target="_blank" class="btn btn-amazon">
                    <i class="fab fa-amazon"></i> Buy on Amazon
                </a>
            </div>
        </div>`;
}

/**
 * Shows or hides the loading spinner for the product grid.
 * @param {boolean} show True to show, false to hide.
 */
function showProductsLoading(show) {
  if (productsLoading) {
    productsLoading.style.display = show ? 'block' : 'none';
  }
}

// --- UI AND INTERACTIONS ---

/**
 * Initializes mobile menu toggle and close functionality.
 */
function initMobileMenu() {
  if (mobileMenuToggle && navMenu) {
    mobileMenuToggle.addEventListener('click', () => {
      navMenu.classList.toggle('active');
      mobileMenuToggle.classList.toggle('active');
    });

    document.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', () => {
        navMenu.classList.remove('active');
        mobileMenuToggle.classList.remove('active');
      });
    });
  }
}

/**
 * Initializes scroll-related effects like the "back to top" button.
 */
function initScrollEffects() {
  window.addEventListener('scroll', () => {
    if (backToTopBtn) {
      backToTopBtn.style.display = window.pageYOffset > 300 ? 'flex' : 'none';
    }
  });

  if (backToTopBtn) {
    backToTopBtn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }
}

/**
 * Initializes the product category filter tabs.
 */
function initFilterTabs() {
  filterTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      filterTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentFilter = tab.dataset.filter;
      filterAndDisplayProducts();
      updateSearchResultsCount();
    });
  });
}

/**
 * Initializes animations, like the statistics counters.
 */
function initAnimations() {
  const statsObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        animateCounter(entry.target);
        statsObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.5 });

  statNumbers.forEach(stat => statsObserver.observe(stat));
}

/**
 * Animates a number from 0 to a target value.
 * @param {HTMLElement} element The element containing the number.
 */
function animateCounter(element) {
  const target = parseInt(element.dataset.target);
  let current = 0;
  const increment = target / 100;

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

/**
 * Opens a WhatsApp chat with a pre-filled message for a product.
 * @param {string} productName The name of the product.
 * @param {string|number} price The price of the product.
 */
function buyOnWhatsApp(productName, price) {
  const phoneNumber = "916351541231";
  const message = encodeURIComponent(`Hello, I am interested in "${productName}". Please share more details.`);
  const whatsappURL = `https://wa.me/${phoneNumber}?text=${message}`;
  window.open(whatsappURL, '_blank');
  trackEvent('whatsapp_inquiry', { product_name: productName });
}

// --- NOTIFICATION POPUP ---

/**
 * Initializes the notification subscription popup.
 */
function initNotificationPopup() {
    if (!notificationPopup) return;

    const hideAndSetCookie = (cookieName, days) => {
        notificationPopup.classList.remove("show");
        if (cookieName) setCookie(cookieName, "true", days);
    };

    closePopupBtn.addEventListener("click", () => hideAndSetCookie());
    notNowBtn.addEventListener("click", () => {
        hideAndSetCookie("notification_dismissed", 7);
        trackEvent("notification_popup_dismissed");
    });
    subscribeBtn.addEventListener("click", subscribeToNotifications);
    notificationPopup.addEventListener("click", (e) => {
        if (e.target === notificationPopup) hideAndSetCookie();
    });
}

/**
 * Shows the notification popup if it hasn't been dismissed or subscribed to.
 */
function showNotificationPopup() {
  if (getCookie("notification_dismissed") || getCookie("notification_subscribed")) return;
  if (notificationPopup) notificationPopup.classList.add("show");
}

/**
 * Handles the subscription process via OneSignal.
 */
function subscribeToNotifications() {
  if (!window.OneSignal) {
    console.warn("OneSignal SDK not available.");
    return;
  }
  OneSignal.Notifications.requestPermission().then((permission) => {
    if (permission === "granted") {
      setCookie("notification_subscribed", "true", 365);
      notificationPopup.classList.remove("show");
      trackEvent("notification_subscribed");
    }
  });
}


// --- THIRD-PARTY INTEGRATIONS & ADVANCED ---

/**
 * Initializes Google Analytics tracking.
 */
function initAnalytics() {
  // This function assumes gtag is loaded from the HTML script tag.
  if (typeof gtag === 'function') {
    gtag('event', 'page_view', {
      page_title: document.title,
      page_location: window.location.href
    });
  }
}

/**
 * Tracks an event with Google Analytics.
 * @param {string} eventName The name of the event.
 * @param {object} parameters Additional parameters for the event.
 */
function trackEvent(eventName, parameters = {}) {
  if (typeof gtag === 'function') {
    gtag('event', eventName, parameters);
  }
}

/**
 * Initializes the OneSignal SDK.
 */
function initOneSignal() {
    window.OneSignal = window.OneSignal || [];
    OneSignal.push(function() {
        OneSignal.init({
            appId: "ee523d8b-51c0-43d7-ad51-f0cf380f0487",
        });
    });
}

/**
 * Registers the service worker for caching and offline capabilities.
 */
function initServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then(reg => console.log('Service Worker registered.', reg))
        .catch(err => console.error('Service Worker registration failed:', err));
    });
  }
}

/**
 * Initializes lazy loading for images.
 */
function initLazyLoading() {
  const lazyImages = document.querySelectorAll('img.lazy-load');
  const imageObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target;
        img.src = img.dataset.src || img.src; // Handle cases where src is already there
        img.classList.remove('lazy-load');
        observer.unobserve(img);
      }
    });
  });
  lazyImages.forEach(img => imageObserver.observe(img));
}

/**
 * Sets a cookie.
 * @param {string} name The name of the cookie.
 * @param {string} value The value of the cookie.
 * @param {number} days The number of days until the cookie expires.
 */
function setCookie(name, value, days) {
    const d = new Date();
    d.setTime(d.getTime() + (days * 24 * 60 * 60 * 1000));
    const expires = "expires=" + d.toUTCString();
    document.cookie = name + "=" + value + ";" + expires + ";path=/";
}

/**
 * Gets the value of a cookie.
 * @param {string} name The name of the cookie.
 * @returns {string|null} The cookie value or null if not found.
 */
function getCookie(name) {
    const cname = name + "=";
    const decodedCookie = decodeURIComponent(document.cookie);
    const ca = decodedCookie.split(';');
    for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) === ' ') {
            c = c.substring(1);
        }
        if (c.indexOf(cname) === 0) {
            return c.substring(cname.length, c.length);
        }
    }
    return null;
}
