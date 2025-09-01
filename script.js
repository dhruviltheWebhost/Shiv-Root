/*******************************
 * Shiv Infocom — script.js
 * (Sheets-driven, no duplication, 6-cards paging, suggestions for Local+Amazon)
 *******************************/

/* ================== Global ================== */
let allProducts = [];         // LOCAL products (from "Products" sheet)
let amazonProducts = [];      // AMAZON products (from "Amazon" sheet)
let facebookAdsProducts = []; // FACEBOOK products (from "FacebookAds" sheet)
let currentFilter = 'all';
let searchQuery = '';
let isSearching = false;
let itemsToShow = 6;          // Show 6 cards at once
let originalStatsParent = null;
let productIdToProduct = new Map(); // LOCAL detail routing map
let amazonRendered = false;     // prevent duplicate Amazon rendering

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
  return function (...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(this, args), delay);
  };
}

function formatPrice(price) {
  if (price === "N/A" || price === undefined || price === null || price === "") return "N/A";
  const n = Number(price);
  if (Number.isNaN(n)) return price.toString();
  return n.toLocaleString('en-IN');
}

/* ================== Boot ================== */
document.addEventListener('DOMContentLoaded', function () {
  // Loading screen fade
  setTimeout(() => {
    if (loadingScreen) {
      loadingScreen.style.opacity = '0';
      setTimeout(() => (loadingScreen.style.display = 'none'), 500);
    }
  }, 1200);

  initMobileMenu();
  initThemeToggle();
  initScrollEffects();
  initFilterTabs();
  initAnimations();
  initSearchFunctionality();
  initRouter();
  initNotificationPopup();
  initAnalytics();
  initOneSignal();
  initServiceWorker();
  initLazyLoading();
  initMobileStatsPlacement();

  // Fetch all data from Google Sheets
  fetchProducts();
  fetchAmazonProducts();
  fetchFacebookAdsProducts();

  // Prompt popup after a delay
  setTimeout(() => showNotificationPopup(), 5000);
});

/* ================== Search + Suggestions ================== */
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

    const q = query.toLowerCase();

    const localMatches = allProducts.filter(p =>
      (p.model && p.model.toLowerCase().includes(q)) ||
      (p.category && p.category.toLowerCase().includes(q)) ||
      (p.processor && p.processor.toLowerCase().includes(q))
    ).slice(0, 8);

    const amazonMatches = amazonProducts.filter(p =>
      (p.model && p.model.toLowerCase().includes(q)) ||
      (p.category && p.category.toLowerCase().includes(q)) ||
      (p.processor && p.processor.toLowerCase().includes(q))
    ).slice(0, 8);

    const merged = [...localMatches.map(p => ({ ...p, _src: 'local' })), ...amazonMatches.map(p => ({ ...p, _src: 'amazon' }))].slice(0, 10);

    if (merged.length > 0) {
      suggestionsContainer.innerHTML = merged.map(product => {
        const isAmazon = product._src === 'amazon';
        const href = isAmazon ? (product.link || '#') : `#/product/${product.id}`;
        const target = isAmazon ? `target="_blank" rel="noopener"` : '';
        const badge = isAmazon ? '<span class="badge amazon">Amazon</span>' : '<span class="badge local">Local</span>';
        return `
          <a href="${href}" class="suggestion-item" ${target}>
            <img src="${product.imageUrl || ''}" alt="${product.model}" onerror="this.src='root_tech_back_remove-removebg-preview.png'">
            <div class="suggestion-details">
              <div class="suggestion-name">${product.model}</div>
              <div class="suggestion-price">₹${formatPrice(product.price)}</div>
            </div>
            ${badge}
          </a>
        `;
      }).join('');
    } else {
      suggestionsContainer.innerHTML = '<div class="no-results">No results found</div>';
    }
    suggestionsContainer.style.display = 'block';
  };

  const debouncedMainSearch = debounce(query => handleSuggestions(query, mainSuggestions));

  mainSearchInput.addEventListener('input', () => {
    const query = mainSearchInput.value.toLowerCase().trim();
    searchQuery = query;
    isSearching = query.length > 0;
    mainClearBtn.style.display = isSearching ? 'block' : 'none';
    debouncedMainSearch(query);
    itemsToShow = 6;
    filterAndDisplayProducts();
    updateSearchResultsCount();
  });

  mainClearBtn.addEventListener('click', () => {
    mainSearchInput.value = '';
    searchQuery = '';
    isSearching = false;
    mainClearBtn.style.display = 'none';
    mainSuggestions.style.display = 'none';
    itemsToShow = 6;
    filterAndDisplayProducts();
    updateSearchResultsCount();
  });

  document.addEventListener('click', (e) => {
    if (!mainSearchInput.parentElement.contains(e.target)) {
      mainSuggestions.style.display = 'none';
    }
  });
}

function updateSearchResultsCount() {
  const el = document.getElementById('search-results-count');
  if (!el) return;

  if (isSearching || currentFilter !== 'all') {
    const filteredProducts = getFilteredProducts();
    const count = filteredProducts.length;
    const filterText = currentFilter !== 'all' ? ` in ${currentFilter}s` : '';
    const searchText = isSearching ? ` for "${searchQuery}"` : '';
    el.textContent = `${count} product${count !== 1 ? 's' : ''} found${searchText}${filterText}`;
    el.style.display = 'block';
  } else {
    el.style.display = 'none';
  }
}

/* ================== Fetch: Sheets ================== */
// LOCAL products — "Products" sheet
async function fetchProducts() {
  const sheetURL = "https://docs.google.com/spreadsheets/d/1Ba_YRVZAxBPh76j6-UdAx0Qi_UfU1d6wKau2av9VhFs/gviz/tq?tqx=out:json&sheet=Products";
  showProductsLoading(true);
  try {
    const response = await fetch(sheetURL);
    let data = await response.text();
    data = data.substring(47, data.length - 2);
    const json = JSON.parse(data);

    const rawProducts = json.table.rows.map((row, idx) => ({
      model: row.c[0]?.v || "N/A",
      category: row.c[1]?.v || "Other",
      processor: row.c[2]?.v || "N/A",
      ram: row.c[3]?.v || "N/A",
      storage: row.c[4]?.v || "N/A",
      price: row.c[5]?.v || "N/A",
      imageUrl: row.c[6]?.v || "",
      description: row.c[7]?.v || "",
      images: parseImages(row.c[6]?.v, row.c[7]?.v),
      id: generateStableId(row.c[0]?.v || 'product', row.c[2]?.v || '', 'local', idx)
    })).filter(p => p.model !== "N/A");

    const seen = new Set();
    allProducts = rawProducts.filter(p => {
      const key = `${(p.model || '').trim().toLowerCase()}|${(p.processor || '').trim().toLowerCase()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    productIdToProduct.clear();
    allProducts.forEach(p => productIdToProduct.set(p.id, p));

    itemsToShow = 6;
    filterAndDisplayProducts();
    updateSearchResultsCount();
    handleRouteChange();
  } catch (error) {
    console.error("Error fetching products:", error);
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

// AMAZON products — "Amazon" sheet
async function fetchAmazonProducts() {
  const sheetURL = "https://docs.google.com/spreadsheets/d/1Ba_YRVZAxBPh76j6-UdAx0Qi_UfU1d6wKau2av9VhFs/gviz/tq?tqx=out:json&sheet=Amazon";
  try {
    const response = await fetch(sheetURL);
    let data = await response.text();
    data = data.substring(47, data.length - 2);
    const json = JSON.parse(data);

    const raw = json.table.rows.map((row, idx) => ({
      model: row.c[0]?.v || row.c[0]?.f || "N/A",
      category: row.c[1]?.v || "Other",
      processor: row.c[2]?.v || "N/A",
      ram: row.c[3]?.v || "N/A",
      storage: row.c[4]?.v || "N/A",
      price: row.c[5]?.v || "N/A",
      imageUrl: row.c[6]?.v || "",
      link: row.c[7]?.v || "#",
      id: generateStableId(row.c[0]?.v || 'product', row.c[2]?.v || '', 'amazon', idx)
    })).filter(p => p.model !== "N/A");

    const seen = new Set();
    amazonProducts = raw.filter(p => {
      const key = `${(p.model || '').trim().toLowerCase()}|${(p.link || '').trim().toLowerCase()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    displayAmazonProducts();
  } catch (error) {
    console.error("Error fetching Amazon products:", error);
  }
}

// FACEBOOK products — "FacebookAds" sheet
async function fetchFacebookAdsProducts() {
  // CORRECTED URL: Using the correct spreadsheet ID and API format.
  // Make sure your sheet is actually named "FacebookAds".
  const sheetURL = "https://docs.google.com/spreadsheets/d/1Ba_YRVZAxBPh76j6-UdAx0Qi_UfU1d6wKau2av9VhFs/gviz/tq?tqx=out:json&sheet=FacebookAds";
  try {
    const response = await fetch(sheetURL);
    let data = await response.text();
    // Check if the response is valid JSONP before parsing
    if (!data.startsWith('google.visualization.Query.setResponse')) {
        console.error("Invalid response from Facebook Ads sheet:", data);
        return;
    }
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


/* ================== Filtering & Display (LOCAL grid) ================== */
function getFilteredProducts() {
  let filteredProducts = [...allProducts];

  if (currentFilter !== 'all') {
    filteredProducts = filteredProducts.filter(product =>
      (product.category || '').toLowerCase() === currentFilter.toLowerCase()
    );
  }

  if (isSearching && searchQuery) {
    const q = searchQuery.toLowerCase();
    filteredProducts = filteredProducts.filter(product => {
      const searchableText = `${product.model} ${product.processor} ${product.ram} ${product.storage} ${product.category}`.toLowerCase();
      return searchableText.includes(q);
    });
  }

  return filteredProducts;
}

function filterAndDisplayProducts() {
  const filteredProducts = getFilteredProducts();
  displayProducts(filteredProducts.slice(0, itemsToShow));
  renderViewMoreButton(filteredProducts.length);
}

function renderViewMoreButton(totalCount) {
  const viewAllContainer = document.getElementById('view-all-container');
  if (!viewAllContainer) return;

  if (itemsToShow >= totalCount) {
    viewAllContainer.innerHTML = '';
    return;
  }

  viewAllContainer.innerHTML = `
    <button id="view-more-btn" class="btn btn-secondary">View More (${itemsToShow}/${totalCount})</button>
  `;

  document.getElementById('view-more-btn').onclick = () => {
      itemsToShow += 6;
      const filtered = getFilteredProducts();
      displayProducts(filtered.slice(0, itemsToShow));
      renderViewMoreButton(filtered.length);
      trackEvent('view_more_products_click');
    };
}

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
         style="animation-delay: ${index * 0.06}s"
         onclick="window.location.hash='${`#/product/${product.id}`}'"
         title="View details for ${product.model}">
      <img src="${product.imageUrl}" alt="${product.model}" loading="lazy" class="lazy-load"
           onerror="this.src='root_tech_back_remove-removebg-preview.png'">
      <div class="product-card-content">
        <div class="badge local">Local</div>
        <h3>${product.model}</h3>
        ${product.processor !== "N/A" ? `<p><strong>Processor:</strong> ${product.processor}</p>` : ""}
        ${product.ram !== "N/A" ? `<p><strong>RAM:</strong> ${product.ram}</p>` : ""}
        ${product.storage !== "N/A" ? `<p><strong>Storage:</strong> ${product.storage}</p>` : ""}
        <div class="price">₹${formatPrice(product.price)}</div>
        <div class="product-actions">
          <button class="btn btn-primary">View Details</button>
        </div>
      </div>
    </div>
  `).join('');

  productGrid.innerHTML = productsHTML;
  initLazyLoading();
}

/* ================== Amazon Display (separate section) ================== */
function displayAmazonProducts() {
  if (amazonRendered) return;
  const laptopGrid = document.getElementById('amazon-laptop-grid');
  const accessoryGrid = document.getElementById('amazon-accessory-grid');
  if (!laptopGrid || !accessoryGrid) return;

  laptopGrid.innerHTML = '';
  accessoryGrid.innerHTML = '';

  const laptops = amazonProducts.filter(p => (p.category || '').toLowerCase() === 'laptop');
  const accessories = amazonProducts.filter(p => (p.category || '').toLowerCase() !== 'laptop');

  laptopGrid.innerHTML = laptops.length > 0
    ? laptops.slice(0, 4).map(createAmazonProductCard).join('')
    : '<p>No laptops available on Amazon at the moment.</p>';

  accessoryGrid.innerHTML = accessories.length > 0
    ? accessories.slice(0, 4).map(createAmazonProductCard).join('')
    : '<p>No accessories available on Amazon at the moment.</p>';

  amazonRendered = true;
}

function createAmazonProductCard(product) {
  return `
    <div class="product-card">
      <img src="${product.imageUrl}" alt="${product.model}" loading="lazy" class="lazy-load"
           onerror="this.src='root_tech_back_remove-removebg-preview.png'">
      <div class="product-card-content">
        <div class="badge amazon">Amazon</div>
        <h3>${product.model}</h3>
        <div class="price">₹${formatPrice(product.price)}</div>
        <a href="${product.link}" target="_blank" rel="noopener" class="btn btn-amazon">
          <i class="fab fa-amazon"></i> Buy on Amazon
        </a>
      </div>
    </div>
  `;
}

/* ================== Router & Detail View (LOCAL only) ================== */
function initRouter() {
  window.addEventListener('hashchange', handleRouteChange);
}

function handleRouteChange() {
  const hash = window.location.hash || '';
  const detailSection = document.getElementById('product-detail-view');
  const productsSection = document.getElementById('products');

  if (hash.startsWith('#/product/')) {
    const id = hash.split('/')[2];
    const product = getProductById(id);
    if (product) {
      renderProductDetail(product);
      if (productsSection) productsSection.style.display = 'none';
      if (detailSection) detailSection.style.display = 'block';
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      setTimeout(() => {
        const p = getProductById(id);
        if (p) {
          renderProductDetail(p);
          if (productsSection) productsSection.style.display = 'none';
          if (detailSection) detailSection.style.display = 'block';
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }, 400);
    }
  } else {
    if (detailSection) detailSection.style.display = 'none';
    if (productsSection) productsSection.style.display = 'block';
  }
}

function getProductById(id) {
  return productIdToProduct.get(id) || null;
}

function renderProductDetail(product) {
  const container = document.getElementById('product-detail-card');
  if (!container) return;

  const priceText = product.price && product.price !== 'N/A'
    ? `₹${formatPrice(product.price)}`
    : 'Contact for price';

  const images = Array.isArray(product.images) && product.images.length > 0
    ? product.images
    : [product.imageUrl].filter(Boolean);

  const slides = images.map(src => `<img src="${src}" alt="${product.model}" onerror="this.src='root_tech_back_remove-removebg-preview.png'">`).join('');
  const thumbs = images.map((src, i) => `<img src="${src}" data-index="${i}" alt="${product.model} thumbnail ${i + 1}">`).join('');

  container.innerHTML = `
    <div class="detail-gallery">
      <div class="slider" data-index="0"><div class="slides">${slides}</div></div>
      <div class="slider-nav">
        <button class="slider-btn" id="slide-prev" aria-label="Previous image">Prev</button>
        <button class="slider-btn" id="slide-next" aria-label="Next image">Next</button>
      </div>
      <div class="thumbs">${thumbs}</div>
    </div>
    <div class="detail-info">
      <h1>${product.model}</h1>
      <div class="detail-meta">Category: ${product.category}</div>
      <div class="price" style="font-size:1.25rem;margin:0.5rem 0;">${priceText}</div>
      <div class="specs-list">
        ${product.processor && product.processor !== 'N/A' ? `<div><strong>Processor:</strong> ${product.processor}</div>` : ''}
        ${product.ram && product.ram !== 'N/A' ? `<div><strong>RAM:</strong> ${product.ram}</div>` : ''}
        ${product.storage && product.storage !== 'N/A' ? `<div><strong>Storage:</strong> ${product.storage}</div>` : ''}
        ${product.condition ? `<div><strong>Condition:</strong> ${product.condition}</div>` : ''}
        ${product.warranty ? `<div><strong>Warranty:</strong> ${product.warranty}</div>` : ''}
      </div>
      ${product.description ? `<p style="margin-bottom:1rem;">${product.description}</p>` : ''}
      <div class="detail-actions">
        <button class="btn btn-primary" id="whatsapp-cta"><i class="fab fa-whatsapp"></i> Contact on WhatsApp</button>
        <button class="btn btn-share" id="share-link">Share Link</button>
        <a class="btn btn-secondary" href="#products">Back to Products</a>
      </div>
    </div>
  `;

  initSlider();

  document.getElementById('whatsapp-cta').onclick = () => {
      const details = `${product.model}${product.processor ? ` | ${product.processor}` : ''}${product.ram ? ` | ${product.ram}` : ''}${product.storage ? ` | ${product.storage}` : ''}`;
      buyOnWhatsApp(details, product.price);
    };

  document.getElementById('share-link').onclick = async () => {
      const shareData = { title: product.model, text: product.description || product.model, url: window.location.href };
      try {
        if (navigator.share) {
          await navigator.share(shareData);
        } else {
          await navigator.clipboard.writeText(window.location.href);
          showNotificationSuccess('Link copied to clipboard');
        }
      } catch {
        await navigator.clipboard.writeText(window.location.href);
        showNotificationSuccess('Link copied to clipboard');
      }
    };
}

function initSlider() {
  const slides = document.querySelector('.detail-gallery .slides');
  const thumbs = document.querySelectorAll('.detail-gallery .thumbs img');
  if (!slides) return;

  let index = 0;
  const update = () => {
    slides.style.transform = `translateX(-${index * 100}%)`;
    thumbs.forEach((t, i) => t.classList.toggle('active', i === index));
  };
  const next = () => { index = (index + 1) % slides.children.length; update(); };
  const prev = () => { index = (index - 1 + slides.children.length) % slides.children.length; update(); };

  document.getElementById('slide-next').onclick = next;
  document.getElementById('slide-prev').onclick = prev;
  thumbs.forEach(t => t.addEventListener('click', () => { index = parseInt(t.dataset.index, 10) || 0; update(); }));
  update();
}

function parseImages(imageUrl, description) {
  const images = [];
  if (imageUrl) images.push(imageUrl);
  if (description && /https?:\/\//i.test(description)) {
    const urls = description.match(/https?:[^\s,]+/g);
    if (urls) urls.forEach(u => { if (!images.includes(u)) images.push(u); });
  }
  return images;
}

/**
 * NOTE: This ID generation is NOT stable. If you reorder rows in your Google Sheet,
 * the IDs will change and saved links will break.
 * RECOMMENDATION: Add a unique 'SKU' or 'ID' column to your sheet and use that
 * value instead of the index 'idx' for truly stable IDs.
 */
function generateStableId(model, processor, source, idx) {
  const base = (model || 'product').toString().trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  const cpu = (processor || '').toString().trim().toLowerCase().replace(/[^a-z0-9]+/g, '-');
  return `${source}-${base}${cpu ? '-' + cpu : ''}-${idx}`;
}

/* ================== UI & Interactions ================== */
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

function initThemeToggle() {
  const themeToggle = document.getElementById('theme-toggle');
  const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)');
  if (!themeToggle) return;

  const currentTheme = localStorage.getItem('theme') || (prefersDarkScheme.matches ? 'dark' : 'light');
  document.documentElement.setAttribute('data-theme', currentTheme);
  updateThemeIcon(currentTheme);

  themeToggle.addEventListener('click', () => {
    const newTheme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeIcon(newTheme);
    themeToggle.style.transform = 'rotate(360deg)';
    setTimeout(() => { themeToggle.style.transform = ''; }, 300);
  });

  prefersDarkScheme.addEventListener('change', (e) => {
    if (!localStorage.getItem('theme')) {
      const newTheme = e.matches ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', newTheme);
      updateThemeIcon(newTheme);
    }
  });
}

function updateThemeIcon(theme) {
  const icon = document.querySelector('#theme-toggle i');
  if (!icon) return;
  if (theme === 'dark') {
    icon.className = 'fas fa-sun';
    icon.setAttribute('aria-label', 'Switch to light mode');
  } else {
    icon.className = 'fas fa-moon';
    icon.setAttribute('aria-label', 'Switch to dark mode');
  }
}

function initScrollEffects() {
  window.addEventListener('scroll', () => {
    if (backToTopBtn) {
      backToTopBtn.style.display = window.pageYOffset > 300 ? 'flex' : 'none';
    }
  });
  if (backToTopBtn) {
    backToTopBtn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  }
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

function animateCounter(element) {
  const target = parseInt(element.dataset.target);
  let current = 0;
  const increment = Math.max(1, target / 80);
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

function buyOnWhatsApp(productName, price) {
  const phoneNumber = "916351541231";
  const message = encodeURIComponent(`Hello, I am interested in "${productName}". Please share more details.`);
  window.open(`https://wa.me/${phoneNumber}?text=${message}`, '_blank');
  trackEvent('whatsapp_inquiry', { product_name: productName });
}

/* ================== Mobile: move Stats after Products ================== */
function initMobileStatsPlacement() {
  const stats = document.getElementById('stats-section');
  const products = document.getElementById('products');
  if (!stats || !products) return;

  originalStatsParent = stats.parentElement;
  const reposition = () => {
    const isMobile = window.innerWidth <= 768;
    if (isMobile) {
      products.parentElement.insertBefore(stats, products.nextSibling);
    } else if (originalStatsParent && stats.parentElement !== originalStatsParent) {
      originalStatsParent.appendChild(stats);
    }
  };
  reposition();
  window.addEventListener('resize', debounce(reposition, 200));
}

/* ================== Notifications (Popup + OneSignal v16) ================== */
function initNotificationPopup() {
  if (!notificationPopup) return;

  const hideAndSetCookie = (cookieName, days) => {
    notificationPopup.classList.remove("show");
    if (cookieName) setCookie(cookieName, "true", days);
  };

  document.getElementById('close-popup-btn')?.addEventListener('click', () => hideAndSetCookie());
  document.getElementById('not-now-btn')?.addEventListener('click', () => {
    hideAndSetCookie("notification_dismissed", 7);
    trackEvent("notification_popup_dismissed");
  });
  document.getElementById('subscribe-btn')?.addEventListener('click', (e) => {
    e.preventDefault();
    if (e.currentTarget.disabled) return;
    subscribeToNotifications();
  });

  notificationPopup.addEventListener("click", (e) => {
    if (e.target === notificationPopup) hideAndSetCookie();
  });
}

function showNotificationPopup() {
  if (getCookie("notification_dismissed") || getCookie("notification_subscribed")) return;
  if (!('Notification' in window) || Notification.permission === 'denied' || Notification.permission === 'granted') return;
  
  if (window.OneSignal && OneSignal.User && OneSignal.User.PushSubscription) {
    OneSignal.User.PushSubscription.optedIn.then(optedIn => {
      if (!optedIn && notificationPopup) notificationPopup.classList.add("show");
    });
  } else if (notificationPopup) {
    notificationPopup.classList.add("show");
  }
}

async function subscribeToNotifications() {
  const btn = document.getElementById('subscribe-btn');
  const originalText = btn ? btn.innerHTML : '';

  try {
    if (!('Notification' in window)) {
      showNotificationError("Your browser doesn't support notifications.");
      return;
    }
    if (btn) {
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Subscribing...';
      btn.disabled = true;
    }

    if (window.OneSignal && OneSignal.Notifications && OneSignal.User) {
      const permission = await OneSignal.Notifications.requestPermission();
      if (permission !== true) {
        throw new Error('Notifications are blocked. Please enable them in your browser settings.');
      }
      await OneSignal.User.PushSubscription.optIn();
      setCookie("notification_subscribed", "true", 365);
      notificationPopup.classList.remove("show");
      trackEvent("notification_subscribed");
      showNotificationSuccess("🎉 You're now subscribed to notifications!");
    } else {
      // Fallback for when OneSignal isn't available
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') throw new Error("Notification permission denied.");
      setCookie("notification_subscribed", "true", 365);
      notificationPopup.classList.remove("show");
      trackEvent("notification_subscribed_fallback");
      new Notification("Shiv Infocom", {
        body: "You're now subscribed to notifications!",
        icon: "root_tech_back_remove-removebg-preview.png"
      });
      showNotificationSuccess("🎉 You're now subscribed to basic notifications!");
    }
  } catch (err) {
    showNotificationError(err.message || "Failed to subscribe to notifications.");
  } finally {
    if (btn) {
      btn.innerHTML = originalText;
      btn.disabled = false;
    }
  }
}

function showNotificationSuccess(message) { showNotificationToast(message, 'success'); }
function showNotificationError(message) { showNotificationToast(message, 'error'); }

function showNotificationToast(message, type = 'info') {
  document.querySelector('.notification-toast')?.remove();
  const toast = document.createElement('div');
  toast.className = `notification-toast ${type}`;
  toast.innerHTML = `
    <div class="toast-content">
      <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
      <span>${message}</span>
    </div>
    <button class="toast-close" onclick="this.parentElement.remove()" aria-label="Close notification"><i class="fas fa-times"></i></button>`;
  document.body.appendChild(toast);
  setTimeout(() => toast.classList.add('show'), 50);
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 4500);
}

/* ================== Third-Party & System ================== */
function initAnalytics() {
  if (typeof gtag === 'function') {
    gtag('event', 'page_view', { page_title: document.title, page_location: window.location.href });
  }
}

function trackEvent(eventName, parameters = {}) {
  if (typeof gtag === 'function') gtag('event', eventName, parameters);
}

async function initOneSignal() {
  try {
    await waitForOneSignal();
    await OneSignal.init({
      appId: "ee523d8b-51c0-43d7-ad51-f0cf380f0487",
      serviceWorkerParam: { scope: "/" },
      serviceWorkerPath: "OneSignalSDKWorker.js"
    });
    const isSubscribed = await OneSignal.User.PushSubscription.optedIn;
    if (isSubscribed) setCookie("notification_subscribed", "true", 365);
  } catch (e) {
    console.error('OneSignal initialization failed:', e);
  }
}

function waitForOneSignal(timeout = 10000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    (function check() {
      if (typeof OneSignal !== 'undefined' && OneSignal.init) return resolve();
      if (Date.now() - start >= timeout) return reject(new Error('OneSignal SDK failed to load'));
      setTimeout(check, 100);
    })();
  });
}

function initServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then(reg => console.log('Service Worker registered.', reg))
        .catch(err => console.error('Service Worker registration failed:', err));
    });
  }
}

function initLazyLoading() {
  const lazyElements = document.querySelectorAll('.lazy-load');
  const elementObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const el = entry.target;
        if (el.tagName === 'IMG') {
          el.src = el.dataset.src || el.src;
        }
        el.classList.add('loaded');
        observer.unobserve(el);
      }
    });
  });
  lazyElements.forEach(el => elementObserver.observe(el));
}

/* ================== Cookies ================== */
function setCookie(name, value, days) {
  const d = new Date();
  d.setTime(d.getTime() + (days * 24 * 60 * 60 * 1000));
  document.cookie = `${name}=${value};expires=${d.toUTCString()};path=/`;
}

function getCookie(name) {
  const cname = `${name}=`;
  return document.cookie.split(';').map(c => c.trim()).find(c => c.indexOf(cname) === 0)?.substring(cname.length) || null;
}
