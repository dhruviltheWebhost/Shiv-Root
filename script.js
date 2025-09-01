/*******************************
 * Shiv Infocom — script.js
 * FINAL CORRECTED VERSION V5
 *******************************/

/* ================== Global ================== */
let allProducts = [];
let amazonProducts = [];
let facebookAdsProducts = [];
let currentFilter = 'all';
let searchQuery = '';
let isSearching = false;
let itemsToShow = 6;
let originalStatsParent = null;
const productIdToProduct = new Map();
let amazonRendered = false;

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

/* ================== Helpers ================== */
function debounce(func, delay = 300) {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(this, args), delay);
  };
}

function formatPrice(price) {
  const n = Number(price);
  if (price === "N/A" || price === undefined || price === null || price === "" || isNaN(n)) {
      return "Contact for Price";
  }
  return `₹${n.toLocaleString('en-IN')}`;
}

/* ================== Boot ================== */
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    if (loadingScreen) {
      loadingScreen.style.opacity = '0';
      setTimeout(() => (loadingScreen.style.display = 'none'), 500);
    }
  }, 1200);

  initEventListeners();
  initTheme();
  initAnalytics();
  initOneSignal();
  initServiceWorker();
  initMobileStatsPlacement();

  fetchAllProducts();

  setTimeout(showNotificationPopup, 8000);
});

function initEventListeners() {
    initMobileMenu();
    initScrollEffects();
    initFilterTabs();
    initSearchFunctionality();
    initRouter();
    initNotificationPopup();
    initAnimations();
    initLazyLoading();
}

/* ================== Data Fetching ================== */

async function fetchAllProducts() {
    showProductsLoading(true);
    try {
        await Promise.all([
            fetchProducts(),
            fetchAmazonProducts(),
            fetchFacebookAdsProducts()
        ]);
        filterAndDisplayProducts();
        displayAmazonProducts();
        updateSearchResultsCount();
        handleRouteChange();
    } catch (error) {
        console.error("A critical error occurred while fetching products:", error);
        if (productGrid) {
            productGrid.innerHTML = `
              <div class="no-products">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Unable to load products</h3>
                <p>Please check your internet connection and try refreshing the page.</p>
              </div>`;
        }
    } finally {
        showProductsLoading(false);
    }
}

async function fetchSheetData(sheetURL) {
    const response = await fetch(sheetURL);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const data = await response.text();
    const startIndex = data.indexOf('{');
    const endIndex = data.lastIndexOf('}');
    if (startIndex === -1 || endIndex === -1) throw new Error('Invalid JSONP response from Google Sheet.');
    const jsonText = data.substring(startIndex, endIndex + 1);
    return JSON.parse(jsonText);
}

function parseImagesFromRow(row) {
    const images = new Set();
    if (row.c[5]?.v) images.add(row.c[5].v); // Column F: Image URL
    for (let i = 7; i <= 10; i++) { // Columns H-K: Image 2-5
        if (row.c[i]?.v) images.add(row.c[i].v);
    }
    return Array.from(images);
}


async function fetchProducts() {
  const sheetURL = "https://docs.google.com/spreadsheets/d/1Ba_YRVZAxBPh76j6-UdAx0Qi_UfU1d6wKau2av9VhFs/gviz/tq?tqx=out:json&sheet=Products";
  try {
    const json = await fetchSheetData(sheetURL);
    if (!json.table || !json.table.rows) return;

    const rawProducts = json.table.rows.map((row, idx) => {
        const statusValue = row.c[11]?.v?.trim().toLowerCase();
        const status = statusValue && (statusValue.includes('ready') || statusValue.includes('dispetch')) ? 'Ready to Dispatch' : 'On Order';

        return {
            model:       row.c[0]?.v ?? "N/A",
            processor:   row.c[1]?.v ?? "N/A",
            ram:         row.c[2]?.v ?? "N/A",
            storage:     row.c[3]?.v ?? "N/A",
            price:       row.c[4]?.v ?? "N/A",
            imageUrl:    row.c[5]?.v ?? "",
            productLink: row.c[6]?.v ?? "",
            status:      status,
            images:      parseImagesFromRow(row),
            id:          generateStableId(row.c[0]?.v, row.c[1]?.v, 'local', idx),
            category:    row.c[12]?.v ?? 'Other' // Assuming Category is in Column M (index 12)
        };
    }).filter(p => p.model !== "N/A");

    const seen = new Set();
    allProducts = rawProducts.filter(p => {
        const key = `${p.model.trim().toLowerCase()}|${(p.processor || '').trim().toLowerCase()}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });

    productIdToProduct.clear();
    allProducts.forEach(p => productIdToProduct.set(p.id, p));
  } catch (error) {
      console.error("Failed to fetch 'Products' sheet. Please ensure it exists and is public.", error);
  }
}

async function fetchAmazonProducts() {
    // FINAL FIX: Using the correct API URL for your Amazon sheet
    const sheetURL = "https://docs.google.com/spreadsheets/d/1Ba_YRVZAxBPh76j6-UdAx0Qi_UfU1d6wKau2av9VhFs/gviz/tq?tqx=out:json&sheet=Amazon";
    try {
        const json = await fetchSheetData(sheetURL);
        if (!json.table || !json.table.rows) return;

        const raw = json.table.rows.map((row, idx) => ({
            model: row.c[0]?.v ?? "N/A",
            category: row.c[1]?.v ?? "Other",
            price: row.c[5]?.v ?? "N/A",
            imageUrl: row.c[6]?.v ?? "",
            link: row.c[7]?.v ?? "#",
            id: generateStableId(row.c[0]?.v, null, 'amazon', idx)
        })).filter(p => p.model !== "N/A");

        const seen = new Set();
        amazonProducts = raw.filter(p => {
            const key = `${p.model.trim().toLowerCase()}|${p.link.trim().toLowerCase()}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    } catch (error) {
        console.error("Failed to fetch 'Amazon' sheet. Please ensure it exists and is public.", error);
    }
}

async function fetchFacebookAdsProducts() {
    // FINAL FIX: Using the correct spreadsheet ID and API URL for your Facebook Ads sheet
    const sheetURL = "https://docs.google.com/spreadsheets/d/11DuYsqp24FEs-7Jo17-mI4aft-v6B1hpTZQIE8edUls/gviz/tq?tqx=out:json&sheet=Sheet1";
    try {
        const json = await fetchSheetData(sheetURL);
        if (!json.table || !json.table.rows) return;
        facebookAdsProducts = json.table.rows.map(row => ({
            model: row.c[0]?.v ?? "N/A",
            category: row.c[1]?.v ?? "Other",
        })).filter(p => p.model !== "N/A");
    } catch (error) {
        console.warn("Could not fetch Facebook Ads products.", error);
    }
}

/* ================== Product Display & Filtering ================== */

function filterAndDisplayProducts() {
    const filteredProducts = getFilteredProducts();
    displayProducts(filteredProducts.slice(0, itemsToShow));
    renderViewMoreButton(filteredProducts.length);
}

function getFilteredProducts() {
    let filtered = [...allProducts];
    if (currentFilter !== 'all') {
        filtered = filtered.filter(p => p.category.toLowerCase() === currentFilter.toLowerCase());
    }
    if (isSearching && searchQuery) {
        const q = searchQuery.toLowerCase();
        filtered = filtered.filter(p =>
            `${p.model} ${p.processor} ${p.ram} ${p.storage}`.toLowerCase().includes(q)
        );
    }
    
    filtered.sort((a, b) => {
        if (a.status === 'Ready to Dispatch' && b.status !== 'Ready to Dispatch') return -1;
        if (a.status !== 'Ready to Dispatch' && b.status === 'Ready to Dispatch') return 1;
        return 0;
    });

    return filtered;
}

function displayProducts(products) {
    if (!productGrid) return;
    if (products.length === 0) {
        productGrid.innerHTML = `<div class="no-products"><h3>No products found.</h3></div>`;
        return;
    }

    let separatorRendered = false;
    const productsHTML = products.map((product, index) => {
        let separatorHTML = '';
        if (product.status === 'On Order' && !separatorRendered && products.some(p => p.status === 'Ready to Dispatch')) {
            separatorHTML = `<div class="product-grid-separator"><span>-- On Order Products --</span></div>`;
            separatorRendered = true;
        }
        return separatorHTML + createProductCardHTML(product, index);
    }).join('');

    productGrid.innerHTML = productsHTML;
    initLazyLoading();
}


function createProductCardHTML(product, index) {
    const statusClass = product.status.toLowerCase().replace(/ /g, '-');
    const thumbnailUrl = product.imageUrl || 'logo.png'; 
    return `
    <div class="product-card lazy-load clickable"
         style="animation-delay: ${index * 0.05}s"
         onclick="window.location.hash='#/product/${product.id}'"
         title="View details for ${product.model}">
      <img data-src="${thumbnailUrl}" src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" alt="${product.model}" loading="lazy" class="lazy-load"
           onerror="this.onerror=null;this.src='logo.png';" referrerpolicy="no-referrer">
      <div class="product-card-content">
        <span class="status-badge ${statusClass}">${product.status}</span>
        <h3>${product.model}</h3>
        ${product.processor !== "N/A" ? `<p><strong>Processor:</strong> ${product.processor}</p>` : ""}
        <div class="price">${formatPrice(product.price)}</div>
        <div class="product-actions">
          <button class="btn btn-primary">View Details</button>
        </div>
      </div>
    </div>`;
}

function renderViewMoreButton(totalCount) {
    const container = document.getElementById('view-all-container');
    if (!container) return;
    if (itemsToShow >= totalCount) {
        container.innerHTML = '';
        return;
    }
    container.innerHTML = `<button id="view-more-btn" class="btn btn-secondary">View More (${totalCount - itemsToShow} remaining)</button>`;
    document.getElementById('view-more-btn').addEventListener('click', () => {
        itemsToShow += 6;
        filterAndDisplayProducts();
        trackEvent('view_more_products');
    });
}

function showProductsLoading(isLoading) {
    if (productsLoading) productsLoading.style.display = isLoading ? 'flex' : 'none';
    if (productGrid) productGrid.style.display = isLoading ? 'none' : 'grid';
}


/* ================== Amazon Display ================== */
function displayAmazonProducts() {
    if (amazonRendered || amazonProducts.length === 0) return;
    const laptopGrid = document.getElementById('amazon-laptop-grid');
    const accessoryGrid = document.getElementById('amazon-accessory-grid');
    if (!laptopGrid || !accessoryGrid) return;

    const laptops = amazonProducts.filter(p => p.category.toLowerCase() === 'laptop');
    const accessories = amazonProducts.filter(p => p.category.toLowerCase() !== 'laptop');

    laptopGrid.innerHTML = laptops.length > 0
        ? laptops.slice(0, 4).map(createAmazonProductCard).join('')
        : '<p class="info-text">No featured laptops from Amazon right now.</p>';

    accessoryGrid.innerHTML = accessories.length > 0
        ? accessories.slice(0, 4).map(createAmazonProductCard).join('')
        : '<p class="info-text">No featured accessories from Amazon right now.</p>';

    initLazyLoading();
    amazonRendered = true;
}

function createAmazonProductCard(product) {
    return `
    <div class="product-card lazy-load">
      <img data-src="${product.imageUrl}" src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" alt="${product.model}" class="lazy-load" onerror="this.onerror=null;this.src='logo.png';" referrerpolicy="no-referrer">
      <div class="product-card-content">
        <h3>${product.model}</h3>
        <div class="price">${formatPrice(product.price)}</div>
        <a href="${product.link}" target="_blank" rel="noopener" class="btn btn-amazon">
          <i class="fab fa-amazon"></i> Buy on Amazon
        </a>
      </div>
    </div>`;
}

/* ================== Router & Detail View ================== */
function initRouter() {
    window.addEventListener('hashchange', handleRouteChange);
    handleRouteChange();
}

function handleRouteChange() {
    const hash = window.location.hash;
    const detailSection = document.getElementById('product-detail-view');
    const mainSections = document.querySelectorAll('main > section:not(#product-detail-view)');

    if (hash.startsWith('#/product/')) {
        const id = hash.split('/')[2];
        const product = productIdToProduct.get(id);
        const renderView = (p) => {
            renderProductDetail(p);
            mainSections.forEach(sec => sec.style.display = 'none');
            detailSection.style.display = 'block';
            window.scrollTo({ top: 0, behavior: 'smooth' });
        };
        if (product) {
            renderView(product);
        } else {
            setTimeout(() => {
                const p = productIdToProduct.get(id);
                if (p) renderView(p);
                else window.location.hash = '#products';
            }, 500);
        }
    } else {
        mainSections.forEach(sec => sec.style.display = 'block');
        detailSection.style.display = 'none';
    }
}

function renderProductDetail(product) {
    const container = document.getElementById('product-detail-card-container');
    if (!container) return;
    const statusClass = product.status.toLowerCase().replace(/ /g, '-');
    const images = Array.isArray(product.images) && product.images.length > 0 ? product.images : [product.imageUrl].filter(Boolean);
    const slides = images.map(src => `<img src="${src}" alt="${product.model}" onerror="this.onerror=null;this.src='logo.png';" referrerpolicy="no-referrer">`).join('');
    const thumbs = images.map((src, i) => `<img src="${src}" data-index="${i}" alt="Thumbnail ${i + 1}" class="${i === 0 ? 'active' : ''}" referrerpolicy="no-referrer">`).join('');
    container.innerHTML = `
    <div class="product-detail-card">
        <div class="detail-gallery">
            <div class="slider"><div class="slides">${slides}</div></div>
            <div class="thumbs">${thumbs}</div>
        </div>
        <div class="detail-info">
            <h1>${product.model}</h1>
            <div class="detail-meta">Category: ${product.category}</div>
            <div class="detail-status ${statusClass}">${product.status}</div>
            <div class="price">${formatPrice(product.price)}</div>
            <div class="specs-list">
                ${product.processor !== "N/A" ? `<div><strong>Processor:</strong> ${product.processor}</div>` : ''}
                ${product.ram !== "N/A" ? `<div><strong>RAM:</strong> ${product.ram}</div>` : ''}
                ${product.storage !== "N/A" ? `<div><strong>Storage:</strong> ${product.storage}</div>` : ''}
            </div>
            <div class="detail-actions">
                <button id="whatsapp-cta" class="btn btn-primary"><i class="fab fa-whatsapp"></i> Contact on WhatsApp</button>
                <a class="btn btn-secondary" href="#products">Back to Products</a>
            </div>
        </div>
    </div>`;
    initSlider();
    document.getElementById('whatsapp-cta').addEventListener('click', () => buyOnWhatsApp(product.model));
}


function initSlider() {
    const slides = document.querySelector('.detail-gallery .slides');
    const thumbs = document.querySelectorAll('.detail-gallery .thumbs img');
    if (!slides || thumbs.length === 0) return;
    let index = 0;
    const totalSlides = slides.children.length;
    const updateSlider = () => {
        slides.style.transform = `translateX(-${index * 100}%)`;
        thumbs.forEach((t, i) => t.classList.toggle('active', i === index));
    };
    thumbs.forEach(thumb => {
        thumb.addEventListener('click', () => { index = parseInt(thumb.dataset.index, 10); updateSlider(); });
    });
}

function generateStableId(model, processor, source, idx) {
    const clean = (text) => (text || '').toString().trim().toLowerCase().replace(/[^a-z0-9]+/g, '-');
    return `${source}-${clean(model)}-${clean(processor)}-${idx}`;
}

/* ================== UI & Interactions ================== */

function initMobileMenu() {
    if (!mobileMenuToggle || !navMenu) return;
    mobileMenuToggle.addEventListener('click', () => {
        const isActive = navMenu.classList.toggle('active');
        mobileMenuToggle.classList.toggle('active');
        mobileMenuToggle.setAttribute('aria-expanded', isActive);
    });
}

function initTheme() {
    const themeToggle = document.getElementById('theme-toggle');
    if (!themeToggle) return;
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');
    const currentTheme = localStorage.getItem('theme') ?? (prefersDark.matches ? 'dark' : 'light');
    const applyTheme = (theme) => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
        themeToggle.querySelector('i').className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    };
    applyTheme(currentTheme);
    themeToggle.addEventListener('click', () => applyTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark'));
}

function initScrollEffects() {
    if (!backToTopBtn) return;
    window.addEventListener('scroll', () => {
        backToTopBtn.style.display = window.pageYOffset > 300 ? 'flex' : 'none';
    });
    backToTopBtn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
}

function initFilterTabs() {
    filterTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            filterTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentFilter = tab.dataset.filter;
            itemsToShow = 6;
            filterAndDisplayProducts();
            updateSearchResultsCount();
        });
    });
}

function initAnimations() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                animateCounter(entry.target);
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.5 });
    statNumbers.forEach(stat => observer.observe(stat));
}

function animateCounter(element) {
    const target = parseInt(element.dataset.target, 10);
    let current = 0;
    const step = () => {
        const increment = Math.ceil((target - current) / 10);
        current += increment;
        element.textContent = current;
        if (current < target) requestAnimationFrame(step);
        else element.textContent = target;
    };
    step();
}

function buyOnWhatsApp(productName) {
    const phone = "916351541231";
    const message = encodeURIComponent(`Hello, I am interested in "${productName}".`);
    window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
    trackEvent('whatsapp_inquiry', { product_name: productName });
}

function initMobileStatsPlacement() {
    const stats = document.getElementById('stats-section');
    const products = document.getElementById('products');
    if (!stats || !products) return;
    originalStatsParent = stats.parentElement;
    const reposition = () => {
        if (window.innerWidth <= 768) products.after(stats);
        else if (originalStatsParent && stats.parentElement !== originalStatsParent) originalStatsParent.appendChild(stats);
    };
    reposition();
    window.addEventListener('resize', debounce(reposition, 200));
}

/* ================== Notifications ================== */

function initNotificationPopup() {
    if (!notificationPopup) return;
    const hide = (cookieName, days) => {
        notificationPopup.classList.remove("show");
        if (cookieName) setCookie(cookieName, "true", days);
    };
    document.getElementById('close-popup-btn')?.addEventListener('click', () => hide());
    document.getElementById('not-now-btn')?.addEventListener('click', () => hide("notification_dismissed", 7));
    document.getElementById('subscribe-btn')?.addEventListener('click', subscribeToNotifications);
}

function showNotificationPopup() {
    if (getCookie("notification_dismissed") || getCookie("notification_subscribed") || !('Notification' in window) || Notification.permission !== 'default') return;
    notificationPopup?.classList.add("show");
}

async function subscribeToNotifications() {
    const btn = document.getElementById('subscribe-btn');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Subscribing...';
    btn.disabled = true;

    try {
        if (!window.OneSignal) throw new Error("OneSignal has not loaded yet.");
        
        const permission = await OneSignal.Notifications.requestPermission();
        if (permission !== true) { 
             throw new Error("Notification permission was not granted.");
        }
        
        await OneSignal.User.PushSubscription.optIn();
        
        setCookie("notification_subscribed", "true", 365);
        notificationPopup.classList.remove("show");
        showNotificationToast("You're subscribed to notifications!", "success");
        trackEvent("notification_subscribed");

    } catch (e) {
        console.error("OneSignal Subscription Error:", e);
        showNotificationToast("Subscription failed. Please enable notifications in your browser settings.", "error");
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}


function showNotificationToast(message, type = 'info') {
    document.querySelector('.notification-toast')?.remove();
    const toast = document.createElement('div');
    toast.className = `notification-toast ${type}`;
    toast.innerHTML = `<div class="toast-content"><i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i><span>${message}</span></div>`;
    document.body.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 50);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 4500);
}

/* ================== Third-Party & System ================== */
function initAnalytics() {
    if (typeof gtag === 'function') gtag('event', 'page_view', { page_title: document.title });
}

function trackEvent(eventName, params = {}) {
    if (typeof gtag === 'function') gtag('event', eventName, params);
}

async function initOneSignal() {
    window.OneSignal = window.OneSignal || [];
    OneSignal.push(() => {
        OneSignal.init({ appId: "ee523d8b-51c0-43d7-ad51-f0cf380f0487" });
    });
}

function initServiceWorker() {
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/sw.js').catch(err => console.error('Service Worker registration failed:', err));
        });
    }
}

function initLazyLoading() {
    const lazyImages = document.querySelectorAll('img.lazy-load');
    const observer = new IntersectionObserver((entries, obs) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src;
                img.classList.remove('lazy-load');
                img.classList.add('loaded');
                obs.unobserve(img);
            }
        });
    }, { rootMargin: "0px 0px 200px 0px" });
    lazyImages.forEach(img => observer.observe(img));
}

/* ================== Cookies ================== */
function setCookie(name, value, days) {
  const d = new Date();
  d.setTime(d.getTime() + (days * 24 * 60 * 60 * 1000));
  document.cookie = `${name}=${value};expires=${d.toUTCString()};path=/;SameSite=Lax`;
}

function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
}


/* ================== Search ================== */
function initSearchFunctionality() {
    const input = document.getElementById('product-search');
    const suggestions = document.getElementById('search-suggestions');
    const clearBtn = document.getElementById('clear-search');
    if (!input) return;

    const handleInput = debounce(() => {
        searchQuery = input.value.trim();
        isSearching = searchQuery.length > 0;
        clearBtn.style.display = isSearching ? 'block' : 'none';
        itemsToShow = 6;
        filterAndDisplayProducts();
        updateSearchResultsCount();
        handleSuggestions(searchQuery, suggestions);
    }, 300);

    input.addEventListener('input', handleInput);
    clearBtn.addEventListener('click', () => {
        input.value = '';
        handleInput();
    });
    document.addEventListener('click', (e) => {
        if (!input.parentElement.contains(e.target)) {
            suggestions.style.display = 'none';
        }
    });
}

function handleSuggestions(query, container) {
    if (query.length < 2) {
        container.style.display = 'none';
        return;
    }
    const q = query.toLowerCase();
    const localMatches = allProducts.filter(p => p.model.toLowerCase().includes(q)).slice(0, 4);
    const amazonMatches = amazonProducts.filter(p => p.model.toLowerCase().includes(q)).slice(0, 3);
    const merged = [
        ...localMatches.map(p => ({ ...p, _src: 'local' })),
        ...amazonProducts.map(p => ({ ...p, _src: 'amazon' }))
    ];

    if (merged.length > 0) {
        container.innerHTML = merged.map(p => `
            <a href="${p._src === 'local' ? `#/product/${p.id}` : p.link}" class="suggestion-item" ${p._src === 'amazon' ? 'target="_blank" rel="noopener"' : ''}>
                <img src="${p.imageUrl || 'logo.png'}" alt="${p.model}" class="suggestion-img">
                <div class="suggestion-details">
                    <div class="suggestion-name">${p.model}</div>
                    <div class="suggestion-price">${formatPrice(p.price)}</div>
                </div>
                <span class="suggestion-badge ${p._src}">${p._src}</span>
            </a>`).join('');
    } else {
        container.innerHTML = '<div class="no-results">No matches found</div>';
    }
    container.style.display = 'block';
}

function updateSearchResultsCount() {
    const el = document.getElementById('search-results-count');
    if (!el) return;
    if (isSearching || currentFilter !== 'all') {
        const count = getFilteredProducts().length;
        el.textContent = `Found ${count} product${count !== 1 ? 's' : ''}.`;
        el.style.display = 'block';
    } else {
        el.style.display = 'none';
    }
}

