/*******************************
 * Shiv Infocom — script.js
 * (Sheets-driven, no duplication, 6-cards paging, suggestions for Local+Amazon)
 *******************************/

/* ================== Global ================== */
let allProducts = [];           // LOCAL products (from "Products" sheet)
let amazonProducts = [];        // AMAZON products (from "Amazon" sheet)
let facebookAdsProducts = [];   // Not rendered on the main grid (kept as in your code)
let currentFilter = 'all';
let searchQuery = '';
let isSearching = false;
let itemsToShow = 6;            // Show 6 cards at once
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
const closePopupBtn = document.getElementById('close-popup-btn');
const subscribeBtn = document.getElementById('subscribe-btn');
const notNowBtn = document.getElementById('not-now-btn');

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
  initSearchFunctionality(); // suggestions + search grid update
  initRouter();
  initNotificationPopup();
  initAnalytics();
  initOneSignal();
  initServiceWorker();
  initLazyLoading();
  initMobileStatsPlacement();

  // Fetch sheets
  fetchProducts();          // LOCAL (Products sheet)
  fetchAmazonProducts();    // AMAZON (Amazon sheet)
  fetchFacebookAdsProducts();

  // Prompt popup later
  setTimeout(() => showNotificationPopup(), 5000);
});

/* ================== Search + Suggestions ================== */
function initSearchFunctionality() {
  const mainSearchInput = document.getElementById('product-search');
  const mainSuggestions = document.getElementById('search-suggestions');
  const mainClearBtn = document.getElementById('clear-search');

  if (!mainSearchInput) return;

  // Build suggestions from both Local + Amazon
  const handleSuggestions = (query, suggestionsContainer) => {
    if (query.length < 2) {
      suggestionsContainer.style.display = 'none';
      return;
    }

    const q = query.toLowerCase();

    // LOCAL matches
    const localMatches = allProducts.filter(p =>
      (p.model && p.model.toLowerCase().includes(q)) ||
      (p.category && p.category.toLowerCase().includes(q)) ||
      (p.processor && p.processor.toLowerCase().includes(q))
    ).slice(0, 8);

    // AMAZON matches
    const amazonMatches = amazonProducts.filter(p =>
      (p.model && p.model.toLowerCase().includes(q)) ||
      (p.category && p.category.toLowerCase().includes(q)) ||
      (p.processor && p.processor.toLowerCase().includes(q))
    ).slice(0, 8);

    // Merge results (show Local first, then Amazon)
    const merged = [...localMatches.map(p => ({ ...p, _src: 'local' })), ...amazonMatches.map(p => ({ ...p, _src: 'amazon' }))].slice(0, 10);

    if (merged.length > 0) {
      suggestionsContainer.innerHTML = merged.map(product => {
        const isAmazon = product._src === 'amazon';
        const href = isAmazon
          ? (product.link || '#')
          : `#/product/${product.id}`;
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
    itemsToShow = 6;                 // reset paging on new search
    filterAndDisplayProducts();      // update LOCAL grid only
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

    // De-duplicate LOCAL by normalized model+processor
    const seen = new Set();
    allProducts = rawProducts.filter(p => {
      const key = `${(p.model || '').trim().toLowerCase()}|${(p.processor || '').trim().toLowerCase()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Build id->product map for LOCAL routing
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

    // De-duplicate AMAZON by model+link (link ensures uniqueness)
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

// Keep for completeness (not shown on main grid)
async function fetchFacebookAdsProducts() {
  const sheetURL = "https://docs.google.com/spreadsheets/d/11DuYsqp24FEs-7Jo17-mI4aft-v6B1hpTZQIE8edUls/edit?usp=sharing";
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

  const btn = document.getElementById('view-more-btn');
  if (btn) {
    btn.onclick = () => {
      itemsToShow += 6;
      const filtered = getFilteredProducts();
      displayProducts(filtered.slice(0, itemsToShow));
      renderViewMoreButton(filtered.length);
      trackEvent('view_more_products_click');
    };
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

  // Important: replace content to avoid repetition
  productGrid.innerHTML = productsHTML;
  initLazyLoading();
}

/* ================== Amazon Display (separate section) ================== */
function displayAmazonProducts() {
  if (amazonRendered) return; // guard duplicate rendering
  const laptopGrid = document.getElementById('amazon-laptop-grid');
  const accessoryGrid = document.getElementById('amazon-accessory-grid');
  if (!laptopGrid || !accessoryGrid) return;

  // Clear before render (avoid duplicates)
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
      return;
    }
    // try again briefly if products not loaded yet
    setTimeout(() => {
      const p = getProductById(id);
      if (p) {
        renderProductDetail(p);
        if (productsSection) productsSection.style.display = 'none';
        if (detailSection) detailSection.style.display = 'block';
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }, 400);
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
  const thumbs = images.map((src, i) => `<img src="${src}" data-index="${i}" alt="${product.model} image ${i + 1}">`).join('');

  container.innerHTML = `
    <div class="detail-gallery">
      <div class="slider" data-index="0">
        <div class="slides">${slides}</div>
      </div>
      <div class="slider-nav">
        <button class="slider-btn" id="slide-prev">Prev</button>
        <button class="slider-btn" id="slide-next">Next</button>
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

  const waBtn = document.getElementById('whatsapp-cta');
  if (waBtn) {
    waBtn.onclick = () => {
      const details = `${product.model}${product.processor ? ` | ${product.processor}` : ''}${product.ram ? ` | ${product.ram}` : ''}${product.storage ? ` | ${product.storage}` : ''}`;
      buyOnWhatsApp(details, product.price);
    };
  }

  const shareBtn = document.getElementById('share-link');
  if (shareBtn) {
    shareBtn.onclick = async () => {
      const shareData = {
        title: product.model,
        text: product.description || product.model,
        url: window.location.href
      };
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
}

function initSlider() {
  const slider = document.querySelector('.detail-gallery .slider');
  const slides = document.querySelector('.detail-gallery .slides');
  const thumbs = document.querySelectorAll('.detail-gallery .thumbs img');
  if (!slider || !slides) return;

  let index = 0;
  const update = () => {
    slides.style.transform = `translateX(-${index * 100}%)`;
    thumbs.forEach((t, i) => t.classList.toggle('active', i === index));
  };
  const next = () => { index = (index + 1) % slides.children.length; update(); };
  const prev = () => { index = (index - 1 + slides.children.length) % slides.children.length; update(); };

  const nextBtn = document.getElementById('slide-next');
  const prevBtn = document.getElementById('slide-prev');
  if (nextBtn) nextBtn.onclick = next;
  if (prevBtn) prevBtn.onclick = prev;
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

  // Get saved theme or default to system preference
  const currentTheme = localStorage.getItem('theme') ||
    (prefersDarkScheme.matches ? 'dark' : 'light');

  // Apply initial theme
  document.documentElement.setAttribute('data-theme', currentTheme);
  updateThemeIcon(currentTheme);

  // Theme toggle click handler
  themeToggle.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeIcon(newTheme);

    // Add rotation animation
    themeToggle.style.transform = 'rotate(360deg)';
    setTimeout(() => {
      themeToggle.style.transform = '';
    }, 300);
  });

  // Listen for system theme changes
  prefersDarkScheme.addEventListener('change', (e) => {
    if (!localStorage.getItem('theme')) {
      const newTheme = e.matches ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', newTheme);
      updateThemeIcon(newTheme);
    }
  });
}

function updateThemeIcon(theme) {
  const themeToggle = document.getElementById('theme-toggle');
  if (!themeToggle) return;
  
  const icon = themeToggle.querySelector('i');
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
  const whatsappURL = `https://wa.me/${phoneNumber}?text=${message}`;
  window.open(whatsappURL, '_blank');
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

  const closeBtn = document.getElementById('close-popup-btn');
  const notNowButton = document.getElementById('not-now-btn');
  const subscribeButton = document.getElementById('subscribe-btn');

  if (closeBtn) closeBtn.onclick = () => hideAndSetCookie();
  if (notNowButton) {
    notNowButton.onclick = () => {
      hideAndSetCookie("notification_dismissed", 7);
      trackEvent("notification_popup_dismissed");
    };
  }

  if (subscribeButton) {
    subscribeButton.onclick = async (e) => {
      e.preventDefault();
      if (subscribeButton.disabled) return;
      await subscribeToNotifications();
    };
  }

  notificationPopup.addEventListener("click", (e) => {
    if (e.target === notificationPopup) hideAndSetCookie();
  });
}

function showNotificationPopup() {
  const dismissed = getCookie("notification_dismissed");
  const subscribed = getCookie("notification_subscribed");
  
  // Check if browser supports notifications
  if (!('Notification' in window)) {
    return; // Don't show popup if browser doesn't support notifications
  }
  
  // Check if user has already granted or denied permission
  if (Notification.permission === 'granted' || Notification.permission === 'denied') {
    return; // Don't show popup if user has already made a decision
  }
  
  // Check if user is already subscribed (OneSignal check)
  if (window.OneSignal && OneSignal.User && OneSignal.User.PushSubscription) {
    OneSignal.User.PushSubscription.optedIn.then((optedIn) => {
      if (optedIn) {
        return; // Don't show popup if already subscribed
      }
    }).catch(() => {
      // If OneSignal check fails, continue with popup
    });
  }
  
  if (dismissed || subscribed) return;
  if (notificationPopup) notificationPopup.classList.add("show");
}

async function subscribeToNotifications() {
  const btn = document.getElementById('subscribe-btn');
  const originalText = btn ? btn.innerHTML : '';

  try {
    // Check browser support first
    if (!('Notification' in window)) {
      showNotificationError("Your browser doesn't support notifications.");
      return;
    }

    if (btn) {
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Subscribing...';
      btn.disabled = true;
    }

    // OneSignal path (v16)
    if (window.OneSignal && OneSignal.Notifications && OneSignal.User) {
      let permissionGranted = Notification.permission === 'granted';
      
      // Only request permission if not already granted or denied
      if (Notification.permission === 'default') {
        try {
          const result = await OneSignal.Notifications.requestPermission();
          permissionGranted = result === true;
        } catch (error) {
          console.warn('OneSignal permission request failed:', error);
          // Fall back to native notification API
          const perm = await Notification.requestPermission();
          permissionGranted = perm === 'granted';
        }
      }
      
      if (Notification.permission === 'denied' || !permissionGranted) {
        throw new Error('Notifications are blocked. Please enable them in your browser settings.');
      }

      await OneSignal.User.PushSubscription.optIn();
      setCookie("notification_subscribed", "true", 365);
      notificationPopup.classList.remove("show");
      trackEvent("notification_subscribed");
      showNotificationSuccess("🎉 You're now subscribed to notifications!");
      return;
    }

    // Fallback (no OneSignal available)
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') {
      throw new Error("Notification permission denied. You can enable it later in your browser settings.");
    }

    setCookie("notification_subscribed", "true", 365);
    notificationPopup.classList.remove("show");
    trackEvent("notification_subscribed_fallback");
    new Notification("Shiv Infocom", {
      body: "You're now subscribed to notifications! We'll keep you updated on new products and deals.",
      icon: "root_tech_back_remove-removebg-preview.png",
      badge: "root_tech_back_remove-removebg-preview.png"
    });
    showNotificationSuccess("🎉 You're now subscribed to basic notifications!");
  } catch (err) {
    showNotificationError(err.message || "Failed to subscribe to notifications. Please try again.");
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
  const existing = document.querySelector('.notification-toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = `notification-toast ${type}`;
  toast.innerHTML = `
    <div class="toast-content">
      <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
      <span>${message}</span>
    </div>
    <button class="toast-close" onclick="this.parentElement.remove()">
      <i class="fas fa-times"></i>
    </button>
  `;
  document.body.appendChild(toast);
  setTimeout(() => toast.classList.add('show'), 50);
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 200);
  }, 4500);
}

/* ================== Third-Party & System ================== */
function initAnalytics() {
  if (typeof gtag === 'function') {
    gtag('event', 'page_view', {
      page_title: document.title,
      page_location: window.location.href
    });
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

    // Set cookie if already subscribed
    try {
      const isSubscribed = await OneSignal.User.PushSubscription.optedIn;
      if (isSubscribed) setCookie("notification_subscribed", "true", 365);
    } catch (e) {
      console.log('Subscription status check failed:', e);
    }
  } catch (e) {
    console.error('OneSignal initialization failed:', e);
  }
}

function waitForOneSignal(timeout = 10000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    (function check() {
      if (typeof OneSignal !== 'undefined' && OneSignal.init) return resolve();
      if (Date.now() - start >= timeout) return reject(new Error('OneSignal SDK failed to load within timeout'));
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
  const lazyImages = document.querySelectorAll('img.lazy-load');
  const imageObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target;
        img.src = img.dataset.src || img.src;
        img.classList.remove('lazy-load');
        observer.unobserve(img);
      }
    });
  });
  lazyImages.forEach(img => imageObserver.observe(img));
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




// function initSearchFunctionality() {
//     const mainSearchInput = document.getElementById('product-search');
//     const mainSuggestions = document.getElementById('search-suggestions');
//     const mainClearBtn = document.getElementById('clear-search');

//     if (!mainSearchInput) return;

//     const handleSuggestions = (query, suggestionsContainer) => {
//         if (query.length < 2) {
//             suggestionsContainer.style.display = 'none';
//             return;
//         }

//         const allAvailableProducts = [...allProducts];
//         const filtered = allAvailableProducts.filter(product =>
//             product.model.toLowerCase().includes(query) ||
//             (product.category && product.category.toLowerCase().includes(query)) ||
//             (product.processor && product.processor.toLowerCase().includes(query))
//         ).slice(0, 10); // Limit to 10 results

//         if (filtered.length > 0) {
//             suggestionsContainer.innerHTML = filtered.map(product => `
//                 <a href="#/product/${product.id}" class="suggestion-item">
//                     <img src="${product.imageUrl}" alt="${product.model}" onerror="this.src='root_tech_back_remove-removebg-preview.png'">
//                     <div class="suggestion-details">
//                         <div class="suggestion-name">${product.model}</div>
//                         <div class="suggestion-price">₹${formatPrice(product.price)}</div>
//                     </div>
//                 </a>
//             `).join('');
//         } else {
//             suggestionsContainer.innerHTML = '<div class="no-results">No results found</div>';
//         }
//         suggestionsContainer.style.display = 'block';
//     };

//     const debouncedMainSearch = debounce(query => handleSuggestions(query, mainSuggestions));

//     // Setup main search input
//     mainSearchInput.addEventListener('input', () => {
//         const query = mainSearchInput.value.toLowerCase().trim();
//         searchQuery = query; // Update global search query
//         isSearching = query.length > 0;
//         mainClearBtn.style.display = isSearching ? 'block' : 'none';
//         debouncedMainSearch(query);
//         filterAndDisplayProducts(); // Also update main grid
        
//         // Update search results count
//         updateSearchResultsCount();
//     });

//     mainClearBtn.addEventListener('click', () => {
//         mainSearchInput.value = '';
//         searchQuery = '';
//         isSearching = false;
//         mainClearBtn.style.display = 'none';
//         mainSuggestions.style.display = 'none';
//         itemsToShow = 6;
//         filterAndDisplayProducts();
//         updateSearchResultsCount();
//     });

//     // Hide suggestions when clicking outside
//     document.addEventListener('click', (e) => {
//         if (!mainSearchInput.parentElement.contains(e.target)) {
//             mainSuggestions.style.display = 'none';
//         }
//     });
// }

// /**
//  * Updates the search results count display.
//  */
// function updateSearchResultsCount() {
//     const resultsCountElement = document.getElementById('search-results-count');
//     if (!resultsCountElement) return;
    
//     if (isSearching || currentFilter !== 'all') {
//         const filteredProducts = getFilteredProducts();
//         const count = filteredProducts.length;
//         const filterText = currentFilter !== 'all' ? ` in ${currentFilter}s` : '';
//         const searchText = isSearching ? ` for "${searchQuery}"` : '';
//         resultsCountElement.textContent = `${count} product${count !== 1 ? 's' : ''} found${searchText}${filterText}`;
//         resultsCountElement.style.display = 'block';
//     } else {
//         resultsCountElement.style.display = 'none';
//     }
// }


// // --- PRODUCT FETCHING AND DISPLAY ---

// /**
//  * Fetches products from the "Products" sheet.
//  */
// async function fetchProducts() {
//   const sheetURL = "https://docs.google.com/spreadsheets/d/1Ba_YRVZAxBPh76j6-UdAx0Qi_UfU1d6wKau2av9VhFs/gviz/tq?tqx=out:json&sheet=Products";
//   showProductsLoading(true);

//   try {
//     const response = await fetch(sheetURL);
//     let data = await response.text();
//     data = data.substring(47, data.length - 2);
//     const json = JSON.parse(data);

//     const rawProducts = json.table.rows.map((row, idx) => ({
//       model: row.c[0]?.v || "N/A",
//       category: row.c[1]?.v || "Other",
//       processor: row.c[2]?.v || "N/A",
//       ram: row.c[3]?.v || "N/A",
//       storage: row.c[4]?.v || "N/A",
//       price: row.c[5]?.v || "N/A",
//       imageUrl: row.c[6]?.v || "",
//       description: row.c[7]?.v || "",
//       images: parseImages(row.c[6]?.v, row.c[7]?.v),
//       id: generateProductId(row.c[0]?.v, idx)
//     })).filter(p => p.model !== "N/A");

//     // Deduplicate by normalized model name
//     const seen = new Set();
//     allProducts = rawProducts.filter(p => {
//       const key = p.model.trim().toLowerCase().replace(/\s+/g, ' ');
//       if (seen.has(key)) return false;
//       seen.add(key);
//       return true;
//     });

//     // Build id -> product map
//     productIdToProduct.clear();
//     allProducts.forEach(p => productIdToProduct.set(p.id, p));

//     // Initial load - show only first 6 products
//     itemsToShow = 6;
//     filterAndDisplayProducts();
//     updateSearchResultsCount();
//     // Handle deep-link route if present
//     handleRouteChange();
//   } catch (error) {
//     console.error("Error fetching products:", error);
//     // Show error message to user
//     if (productGrid) {
//       productGrid.innerHTML = `
//         <div class="no-products">
//           <i class="fas fa-exclamation-triangle"></i>
//           <h3>Unable to load products</h3>
//           <p>Please check your internet connection and try refreshing the page.</p>
//           <button onclick="fetchProducts()" class="btn btn-primary" style="margin-top: 1rem;">
//             <i class="fas fa-refresh"></i> Try Again
//           </button>
//         </div>`;
//     }
//   } finally {
//     showProductsLoading(false);
//   }
// }

// /**
//  * Fetches products from the "Amazon" sheet.
//  */
// async function fetchAmazonProducts() {
//     const sheetURL = "https://docs.google.com/spreadsheets/d/1Ba_YRVZAxBPh76j6-UdAx0Qi_UfU1d6wKau2av9VhFs/gviz/tq?tqx=out:json&sheet=Amazon";
//     try {
//         const response = await fetch(sheetURL);
//         let data = await response.text();
//         data = data.substring(47, data.length - 2);
//         const json = JSON.parse(data);

//         amazonProducts = json.table.rows.map(row => ({
//             model: row.c[0]?.v || "N/A",
//             category: row.c[1]?.v || "Other",
//             processor: row.c[2]?.v || "N/A",
//             ram: row.c[3]?.v || "N/A",
//             storage: row.c[4]?.v || "N/A",
//             price: row.c[5]?.v || "N/A",
//             imageUrl: row.c[6]?.v || "",
//             link: row.c[7]?.v || "#"
//         })).filter(p => p.model !== "N/A");

//         displayAmazonProducts();
//     } catch (error) {
//         console.error("Error fetching Amazon products:", error);
//     }
// }

// /**
//  * Fetches products from the "FacebookAds" sheet.
//  */
// async function fetchFacebookAdsProducts() {
//     const sheetURL = "https://docs.google.com/spreadsheets/d/1Ba_YRVZAxBPh76j6-UdAx0Qi_UfU1d6wKau2av9VhFs/gviz/tq?tqx=out:json&sheet=FacebookAds";
//     try {
//         const response = await fetch(sheetURL);
//         let data = await response.text();
//         data = data.substring(47, data.length - 2);
//         const json = JSON.parse(data);

//         facebookAdsProducts = json.table.rows.map(row => ({
//             model: row.c[0]?.v || "N/A",
//             category: row.c[1]?.v || "Other",
//             processor: row.c[2]?.v || "N/A",
//             ram: row.c[3]?.v || "N/A",
//             storage: row.c[4]?.v || "N/A",
//             price: row.c[5]?.v || "N/A",
//             imageUrl: row.c[6]?.v || "",
//             description: row.c[7]?.v || "",
//             source: "Facebook Ads"
//         })).filter(p => p.model !== "N/A");
//     } catch (error) {
//         console.error("Error fetching Facebook Ads products:", error);
//     }
// }

// /**
//  * Gets filtered products based on current filter and search criteria.
//  * @returns {Array} The filtered products array.
//  */
// function getFilteredProducts() {
//   let filteredProducts = [...allProducts];

//   // Apply category filter
//   if (currentFilter !== 'all') {
//     filteredProducts = filteredProducts.filter(product => 
//       product.category.toLowerCase() === currentFilter.toLowerCase()
//     );
//   }

//   // Apply search filter
//   if (isSearching && searchQuery) {
//     filteredProducts = filteredProducts.filter(product => {
//       const searchableText = `${product.model} ${product.processor} ${product.ram} ${product.storage} ${product.category}`.toLowerCase();
//       return searchableText.includes(searchQuery.toLowerCase());
//     });
//   }

//   return filteredProducts;
// }

// /**
//  * Filters and displays products on the main grid based on current filters and search query.
//  */
// function filterAndDisplayProducts() {
//     const viewAllContainer = document.getElementById('view-all-container');
//     let filteredProducts = getFilteredProducts();

//     // Reset pagination when filters/search change
//     const shouldPaginate = true;
//     const total = filteredProducts.length;
//     const slice = filteredProducts.slice(0, itemsToShow);
//     displayProducts(slice);
//     renderViewMoreButton(total);
// }

// /**
//  * Creates and manages the "View All" button.
//  * @param {number} totalCount - The total number of products available.
//  */
// function renderViewMoreButton(totalCount) {
//     const viewAllContainer = document.getElementById('view-all-container');
//     if (viewAllContainer) {
//         if (itemsToShow >= totalCount) {
//             viewAllContainer.innerHTML = '';
//         } else {
//             viewAllContainer.innerHTML = `
//                 <button id="view-more-btn" class="btn btn-secondary">View More (${itemsToShow}/${totalCount})</button>
//             `;
//             document.getElementById('view-more-btn').addEventListener('click', () => {
//                 itemsToShow += 6;
//                 const filtered = getFilteredProducts();
//                 displayProducts(filtered.slice(0, itemsToShow));
//                 renderViewMoreButton(filtered.length);
//                 trackEvent('view_more_products_click');
//             });
//         }
//     }
// }

// /**
//  * Renders a list of products to the main product grid.
//  * @param {Array} products The array of products to display.
//  */
// function displayProducts(products) {
//   if (!productGrid) return;

//   if (products.length === 0) {
//     productGrid.innerHTML = `
//             <div class="no-products">
//                 <i class="fas fa-search"></i>
//                 <h3>No products found</h3>
//                 <p>Try adjusting your search or filter criteria.</p>
//             </div>`;
//     return;
//   }

//   const productsHTML = products.map((product, index) => `
//         <div class="product-card lazy-load clickable" 
//              data-category="${product.category}" 
//              style="animation-delay: ${index * 0.1}s"
//              onclick="window.location.hash='${`#/product/${product.id}`}'"
//              title="View details for ${product.model}">
//             <img src="${product.imageUrl}" alt="${product.model}" loading="lazy" class="lazy-load" onerror="this.src='root_tech_back_remove-removebg-preview.png'">
//             <div class="product-card-content">
//                 <h3>${product.model}</h3>
//                 ${product.processor !== "N/A" ? `<p><strong>Processor:</strong> ${product.processor}</p>` : ""}
//                 ${product.ram !== "N/A" ? `<p><strong>RAM:</strong> ${product.ram}</p>` : ""}
//                 ${product.storage !== "N/A" ? `<p><strong>Storage:</strong> ${product.storage}</p>` : ""}
//                 <div class="price">₹${formatPrice(product.price)}</div>
//                 <div class="product-actions">
//                     <button class="btn btn-primary">View Details</button>
//                 </div>
//             </div>
//         </div>
//     `).join('');

//   productGrid.innerHTML = productsHTML;
//   initLazyLoading(); // Re-initialize for new images
// }

// /**
//  * Displays featured Amazon products in their respective grids.
//  */
// function displayAmazonProducts() {
//   const laptopGrid = document.getElementById('amazon-laptop-grid');
//   const accessoryGrid = document.getElementById('amazon-accessory-grid');
//   if (!laptopGrid || !accessoryGrid) return;

//   const laptops = amazonProducts.filter(p => p.category.toLowerCase() === 'laptop');
//   const accessories = amazonProducts.filter(p => p.category.toLowerCase() !== 'laptop');

//   laptopGrid.innerHTML = laptops.length > 0 ?
//     laptops.slice(0, 4).map(createAmazonProductCard).join('') :
//     '<p>No laptops available on Amazon at the moment.</p>';

//   accessoryGrid.innerHTML = accessories.length > 0 ?
//     accessories.slice(0, 4).map(createAmazonProductCard).join('') :
//     '<p>No accessories available on Amazon at the moment.</p>';
// }

// /**
//  * Creates the HTML for a single Amazon product card.
//  * @param {object} product The Amazon product object.
//  * @returns {string} The HTML string for the product card.
//  */
// function createAmazonProductCard(product) {
//   return `
//         <div class="product-card">
//             <img src="${product.imageUrl}" alt="${product.model}" loading="lazy" class="lazy-load">
//             <div class="product-card-content">
//                 <h3>${product.model}</h3>
//                 <div class="price">₹${formatPrice(product.price)}</div>
//                 <a href="${product.link}" target="_blank" class="btn btn-amazon">
//                     <i class="fab fa-amazon"></i> Buy on Amazon
//                 </a>
//             </div>
//         </div>`;
// }

// /**
//  * Shows or hides the loading spinner for the product grid.
//  * @param {boolean} show True to show, false to hide.
//  */
// function showProductsLoading(show) {
//   if (productsLoading) {
//     productsLoading.style.display = show ? 'block' : 'none';
//   }
// }

// // --- UI AND INTERACTIONS ---

// /**
//  * Initializes mobile menu toggle and close functionality.
//  */
// function initMobileMenu() {
//   if (mobileMenuToggle && navMenu) {
//     mobileMenuToggle.addEventListener('click', () => {
//       navMenu.classList.toggle('active');
//       mobileMenuToggle.classList.toggle('active');
//     });

//     document.querySelectorAll('.nav-link').forEach(link => {
//       link.addEventListener('click', () => {
//         navMenu.classList.remove('active');
//         mobileMenuToggle.classList.remove('active');
//       });
//     });
//   }
// }

// /**
//  * Initializes scroll-related effects like the "back to top" button.
//  */
// function initScrollEffects() {
//   window.addEventListener('scroll', () => {
//     if (backToTopBtn) {
//       backToTopBtn.style.display = window.pageYOffset > 300 ? 'flex' : 'none';
//     }
//   });

//   if (backToTopBtn) {
//     backToTopBtn.addEventListener('click', () => {
//       window.scrollTo({ top: 0, behavior: 'smooth' });
//     });
//   }
// }

// /**
//  * Initializes the product category filter tabs.
//  */
// function initFilterTabs() {
//   filterTabs.forEach(tab => {
//     tab.addEventListener('click', () => {
//       filterTabs.forEach(t => t.classList.remove('active'));
//       tab.classList.add('active');
//       currentFilter = tab.dataset.filter;
//       itemsToShow = 6;
//       filterAndDisplayProducts();
//       updateSearchResultsCount();
//     });
//   });
// }

// /**
//  * Initializes animations, like the statistics counters.
//  */
// function initAnimations() {
//   const statsObserver = new IntersectionObserver((entries) => {
//     entries.forEach(entry => {
//       if (entry.isIntersecting) {
//         animateCounter(entry.target);
//         statsObserver.unobserve(entry.target);
//       }
//     });
//   }, { threshold: 0.5 });

//   statNumbers.forEach(stat => statsObserver.observe(stat));
// }

// /**
//  * Animates a number from 0 to a target value.
//  * @param {HTMLElement} element The element containing the number.
//  */
// function animateCounter(element) {
//   const target = parseInt(element.dataset.target);
//   let current = 0;
//   const increment = target / 100;

//   const updateCounter = () => {
//     current += increment;
//     if (current < target) {
//       element.textContent = Math.ceil(current);
//       requestAnimationFrame(updateCounter);
//     } else {
//       element.textContent = target;
//     }
//   };
//   updateCounter();
// }

// /**
//  * Opens a WhatsApp chat with a pre-filled message for a product.
//  * @param {string} productName The name of the product.
//  * @param {string|number} price The price of the product.
//  */
// function buyOnWhatsApp(productName, price) {
//   const phoneNumber = "916351541231";
//   const message = encodeURIComponent(`Hello, I am interested in "${productName}". Please share more details.`);
//   const whatsappURL = `https://wa.me/${phoneNumber}?text=${message}`;
//   window.open(whatsappURL, '_blank');
//   trackEvent('whatsapp_inquiry', { product_name: productName });
// }

// // --- ROUTING AND DETAIL VIEW ---

// function initRouter() {
//   window.addEventListener('hashchange', handleRouteChange);
// }

// function handleRouteChange() {
//   const hash = window.location.hash || '';
//   const detailSection = document.getElementById('product-detail-view');
//   const productsSection = document.getElementById('products');
//   if (hash.startsWith('#/product/')) {
//     const id = hash.split('/')[2];
//     const product = getProductById(id);
//     if (product) {
//       renderProductDetail(product);
//       if (productsSection) productsSection.style.display = 'none';
//       if (detailSection) detailSection.style.display = 'block';
//       window.scrollTo({ top: 0, behavior: 'smooth' });
//     } else {
//       // If not loaded yet, wait for products
//       // Fallback: try after a short delay
//       setTimeout(() => {
//         const p = getProductById(id);
//         if (p) {
//           renderProductDetail(p);
//           if (productsSection) productsSection.style.display = 'none';
//           if (detailSection) detailSection.style.display = 'block';
//           window.scrollTo({ top: 0, behavior: 'smooth' });
//         }
//       }, 500);
//     }
//   } else {
//     if (detailSection) detailSection.style.display = 'none';
//     if (productsSection) productsSection.style.display = 'block';
//   }
// }

// function getProductById(id) {
//   if (productIdToProduct.has(id)) return productIdToProduct.get(id);
//   return null;
// }

// function renderProductDetail(product) {
//   const container = document.getElementById('product-detail-card');
//   if (!container) return;
//   const priceText = product.price && product.price !== 'N/A' ? `₹${formatPrice(product.price)}` : 'Contact for price';
//   const images = Array.isArray(product.images) && product.images.length > 0 ? product.images : [product.imageUrl].filter(Boolean);
//   const slides = images.map(src => `<img src="${src}" alt="${product.model}" onerror="this.src='root_tech_back_remove-removebg-preview.png'">`).join('');
//   const thumbs = images.map((src, i) => `<img src="${src}" data-index="${i}" alt="${product.model} image ${i+1}">`).join('');
//   container.innerHTML = `
//     <div class="detail-gallery">
//       <div class="slider" data-index="0">
//         <div class="slides">${slides}</div>
//       </div>
//       <div class="slider-nav">
//         <button class="slider-btn" id="slide-prev">Prev</button>
//         <button class="slider-btn" id="slide-next">Next</button>
//       </div>
//       <div class="thumbs">${thumbs}</div>
//     </div>
//     <div class="detail-info">
//       <h1>${product.model}</h1>
//       <div class="detail-meta">Category: ${product.category}</div>
//       <div class="price" style="font-size:1.25rem;margin:0.5rem 0;">${priceText}</div>
//       <div class="specs-list">
//         ${product.processor && product.processor !== 'N/A' ? `<div><strong>Processor:</strong> ${product.processor}</div>` : ''}
//         ${product.ram && product.ram !== 'N/A' ? `<div><strong>RAM:</strong> ${product.ram}</div>` : ''}
//         ${product.storage && product.storage !== 'N/A' ? `<div><strong>Storage:</strong> ${product.storage}</div>` : ''}
//         ${product.condition ? `<div><strong>Condition:</strong> ${product.condition}</div>` : ''}
//         ${product.warranty ? `<div><strong>Warranty:</strong> ${product.warranty}</div>` : ''}
//       </div>
//       ${product.description ? `<p style="margin-bottom:1rem;">${product.description}</p>` : ''}
//       <div class="detail-actions">
//         <button class="btn btn-primary" id="whatsapp-cta"><i class="fab fa-whatsapp"></i> Contact on WhatsApp</button>
//         <button class="btn btn-share" id="share-link">Share Link</button>
//         <a class="btn btn-secondary" href="#products">Back to Products</a>
//       </div>
//     </div>
//   `;
//   initSlider();
//   const waBtn = document.getElementById('whatsapp-cta');
//   if (waBtn) {
//     waBtn.addEventListener('click', () => {
//       const details = `${product.model}${product.processor?` | ${product.processor}`:''}${product.ram?` | ${product.ram}`:''}${product.storage?` | ${product.storage}`:''}`;
//       buyOnWhatsApp(details, product.price);
//     });
//   }
//   const shareBtn = document.getElementById('share-link');
//   if (shareBtn) {
//     shareBtn.addEventListener('click', async () => {
//       const shareData = {
//         title: product.model,
//         text: product.description || product.model,
//         url: window.location.href
//       };
//       try {
//         if (navigator.share) {
//           await navigator.share(shareData);
//         } else {
//           await navigator.clipboard.writeText(window.location.href);
//           showNotificationSuccess('Link copied to clipboard');
//         }
//       } catch (e) {
//         await navigator.clipboard.writeText(window.location.href);
//         showNotificationSuccess('Link copied to clipboard');
//       }
//     });
//   }
// }

// function initSlider() {
//   const slider = document.querySelector('.detail-gallery .slider');
//   const slides = document.querySelector('.detail-gallery .slides');
//   const thumbs = document.querySelectorAll('.detail-gallery .thumbs img');
//   if (!slider || !slides) return;
//   let index = 0;
//   const update = () => {
//     slides.style.transform = `translateX(-${index * 100}%)`;
//     thumbs.forEach((t, i) => t.classList.toggle('active', i === index));
//   };
//   const next = () => { index = (index + 1) % slides.children.length; update(); };
//   const prev = () => { index = (index - 1 + slides.children.length) % slides.children.length; update(); };
//   const nextBtn = document.getElementById('slide-next');
//   const prevBtn = document.getElementById('slide-prev');
//   if (nextBtn) nextBtn.addEventListener('click', next);
//   if (prevBtn) prevBtn.addEventListener('click', prev);
//   thumbs.forEach(t => t.addEventListener('click', () => { index = parseInt(t.dataset.index, 10) || 0; update(); }));
//   update();
// }

// function parseImages(imageUrl, description) {
//   const images = [];
//   if (imageUrl) images.push(imageUrl);
//   if (description && /https?:\/\//i.test(description)) {
//     const urls = description.match(/https?:[^\s,]+/g);
//     if (urls) urls.forEach(u => { if (!images.includes(u)) images.push(u); });
//   }
//   return images;
// }

// function generateProductId(model, idx) {
//   const base = (model || 'product').toString().trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
//   return `${base}-${idx}`;
// }

// // --- MOBILE STATS PLACEMENT ---
// function initMobileStatsPlacement() {
//   const stats = document.getElementById('stats-section');
//   const products = document.getElementById('products');
//   if (!stats || !products) return;
//   originalStatsParent = stats.parentElement;
//   const reposition = () => {
//     const isMobile = window.innerWidth <= 768;
//     if (isMobile) {
//       // Move stats after products section
//       products.parentElement.insertBefore(stats, products.nextSibling);
//     } else if (originalStatsParent && stats.parentElement !== originalStatsParent) {
//       originalStatsParent.appendChild(stats);
//     }
//   };
//   reposition();
//   window.addEventListener('resize', debounce(reposition, 200));
// }

// // --- NOTIFICATION POPUP ---

// /**
//  * Initializes the notification subscription popup.
//  */
// function initNotificationPopup() {
//     if (!notificationPopup) {
//         console.warn('Notification popup element not found');
//         return;
//     }

//     const hideAndSetCookie = (cookieName, days) => {
//         notificationPopup.classList.remove("show");
//         if (cookieName) setCookie(cookieName, "true", days);
//     };

//     // Ensure all elements exist before adding listeners
//     const closeBtn = document.getElementById('close-popup-btn');
//     const notNowButton = document.getElementById('not-now-btn');
//     const subscribeButton = document.getElementById('subscribe-btn');

//     if (closeBtn) {
//         closeBtn.addEventListener("click", () => hideAndSetCookie());
//     }

//     if (notNowButton) {
//         notNowButton.addEventListener("click", () => {
//             hideAndSetCookie("notification_dismissed", 7);
//             trackEvent("notification_popup_dismissed");
//         });
//     }

//     if (subscribeButton) {
//         // Remove any existing listeners to prevent duplicates
//         subscribeButton.removeEventListener("click", subscribeToNotifications);
        
//         // Add the event listener with additional debugging
//         subscribeButton.addEventListener("click", async (e) => {
//             e.preventDefault();
//             e.stopPropagation();
            
//             console.log('Subscribe button clicked');
            
//             // Prevent multiple rapid clicks
//             if (subscribeButton.disabled) {
//                 console.log('Subscribe button already processing');
//                 return;
//             }
            
//             await subscribeToNotifications();
//         });
        
//         console.log('Subscribe button event listener attached');
//     } else {
//         console.error('Subscribe button not found');
//     }

//     // Add popup backdrop click handler
//     notificationPopup.addEventListener("click", (e) => {
//         if (e.target === notificationPopup) hideAndSetCookie();
//     });
// }

// /**
//  * Shows the notification popup if it hasn't been dismissed or subscribed to.
//  */
// function showNotificationPopup() {
//   const dismissed = getCookie("notification_dismissed");
//   const subscribed = getCookie("notification_subscribed");
  
//   console.log('Notification status - dismissed:', dismissed, 'subscribed:', subscribed);
  
//   if (dismissed || subscribed) {
//     console.log('Notification popup skipped due to previous interaction');
//     return;
//   }
  
//   if (notificationPopup) {
//     console.log('Showing notification popup');
//     notificationPopup.classList.add("show");
    
//     // Re-ensure event listeners are attached (in case of dynamic content)
//     const subscribeButton = document.getElementById('subscribe-btn');
//     if (subscribeButton && !subscribeButton.hasAttribute('data-listener-attached')) {
//       console.log('Re-attaching subscribe button listener');
//       subscribeButton.addEventListener("click", async (e) => {
//         e.preventDefault();
//         e.stopPropagation();
        
//         if (subscribeButton.disabled) return;
        
//         await subscribeToNotifications();
//       });
//       subscribeButton.setAttribute('data-listener-attached', 'true');
//     }
//   } else {
//     console.error('Notification popup element not found');
//   }
// }

// /**
//  * Handles the subscription process via OneSignal v16 API.
//  */
// async function subscribeToNotifications() {
//     const subscribeBtn = document.getElementById('subscribe-btn');
//     let originalText = '<i class="fas fa-bell"></i> Subscribe';
    
//     try {
//         console.log('Starting subscription process...');
        
//         if (!subscribeBtn) {
//             console.error('Subscribe button not found');
//             return;
//         }

//         // Store original button text
//         originalText = subscribeBtn.innerHTML;

//         // Check if OneSignal is available
//         if (!window.OneSignal) {
//             console.warn("OneSignal SDK not available, using fallback method.");
//             await handleFallbackNotificationSubscription();
//             return;
//         }

//         // Check if browser supports notifications
//         if (!('Notification' in window)) {
//             console.warn("Browser doesn't support notifications");
//             showNotificationError("Your browser doesn't support notifications.");
//             return;
//         }

//         // Show loading state
//         subscribeBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Subscribing...';
//         subscribeBtn.disabled = true;
        
//         console.log('Requesting notification permission...');

//         // For OneSignal v16, we need to handle this differently
//         let permissionGranted = false;
        
//         try {
//             // Check current permission status
//             const currentPermission = Notification.permission;
//             console.log('Current notification permission:', currentPermission);
            
//             if (currentPermission === 'granted') {
//                 permissionGranted = true;
//             } else if (currentPermission === 'denied') {
//                 throw new Error('Notifications are blocked. Please enable them in your browser settings.');
//             } else {
//                 // Request permission through OneSignal
//                 const result = await OneSignal.Notifications.requestPermission();
//                 permissionGranted = result === true;
//                 console.log('OneSignal permission result:', result);
//             }
//         } catch (permissionError) {
//             console.error('Permission request failed:', permissionError);
//             throw permissionError;
//         }
        
//         if (permissionGranted) {
//             console.log('Permission granted, subscribing...');
            
//             try {
//                 // Subscribe to push notifications
//                 await OneSignal.User.PushSubscription.optIn();
//                 console.log('Successfully subscribed to notifications');
                
//                 setCookie("notification_subscribed", "true", 365);
//                 notificationPopup.classList.remove("show");
//                 trackEvent("notification_subscribed");
                
//                 // Show success message
//                 showNotificationSuccess("🎉 You're now subscribed to notifications!");
//             } catch (subscribeError) {
//                 console.error('Subscription failed:', subscribeError);
//                 throw new Error('Failed to complete subscription. Please try again.');
//             }
//         } else {
//             throw new Error("Notification permission denied. You can enable it later in your browser settings.");
//         }
//     } catch (error) {
//         console.error('Subscription process failed:', error);
//         let errorMessage = error.message || "Failed to subscribe to notifications. Please try again.";
//         showNotificationError(errorMessage);
//     } finally {
//         // Reset button state
//         if (subscribeBtn) {
//             subscribeBtn.innerHTML = originalText;
//             subscribeBtn.disabled = false;
//         }
//         console.log('Subscription process completed');
//     }
// }

// /**
//  * Handles fallback notification subscription when OneSignal is not available.
//  */
// async function handleFallbackNotificationSubscription() {
//     try {
//         if (!('Notification' in window)) {
//             throw new Error("Your browser doesn't support notifications.");
//         }

//         const permission = await Notification.requestPermission();
        
//         if (permission === 'granted') {
//             setCookie("notification_subscribed", "true", 365);
//             notificationPopup.classList.remove("show");
//             trackEvent("notification_subscribed_fallback");
            
//             // Show a test notification
//             new Notification("Shiv Infocom", {
//                 body: "You're now subscribed to notifications! We'll keep you updated on new products and deals.",
//                 icon: "root_tech_back_remove-removebg-preview.png",
//                 badge: "root_tech_back_remove-removebg-preview.png"
//             });
            
//             showNotificationSuccess("🎉 You're now subscribed to basic notifications!");
//         } else {
//             throw new Error("Notification permission denied. You can enable it later in your browser settings.");
//         }
//     } catch (error) {
//         console.error('Fallback subscription failed:', error);
//         showNotificationError(error.message || "Failed to subscribe to notifications. Please try again.");
//     }
// }

// /**
//  * Shows a success notification message.
//  */
// function showNotificationSuccess(message) {
//     showNotificationToast(message, 'success');
// }

// /**
//  * Shows an error notification message.
//  */
// function showNotificationError(message) {
//     showNotificationToast(message, 'error');
// }

// /**
//  * Shows a toast notification.
//  */
// function showNotificationToast(message, type = 'info') {
//     // Remove any existing toasts
//     const existingToast = document.querySelector('.notification-toast');
//     if (existingToast) {
//         existingToast.remove();
//     }

//     const toast = document.createElement('div');
//     toast.className = `notification-toast ${type}`;
//     toast.innerHTML = `
//         <div class="toast-content">
//             <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
//             <span>${message}</span>
//         </div>
//         <button class="toast-close" onclick="this.parentElement.remove()">
//             <i class="fas fa-times"></i>
//         </button>
//     `;

//     document.body.appendChild(toast);

//     // Show toast
//     setTimeout(() => toast.classList.add('show'), 100);

//     // Auto remove after 5 seconds
//     setTimeout(() => {
//         if (toast.parentElement) {
//             toast.classList.remove('show');
//             setTimeout(() => toast.remove(), 300);
//         }
//     }, 5000);
// }


// // --- THIRD-PARTY INTEGRATIONS & ADVANCED ---

// /**
//  * Initializes Google Analytics tracking.
//  */
// function initAnalytics() {
//   // This function assumes gtag is loaded from the HTML script tag.
//   if (typeof gtag === 'function') {
//     gtag('event', 'page_view', {
//       page_title: document.title,
//       page_location: window.location.href
//     });
//   }
// }

// /**
//  * Tracks an event with Google Analytics.
//  * @param {string} eventName The name of the event.
//  * @param {object} parameters Additional parameters for the event.
//  */
// function trackEvent(eventName, parameters = {}) {
//   if (typeof gtag === 'function') {
//     gtag('event', eventName, parameters);
//   }
// }

// /**
//  * Initializes the OneSignal SDK using v16 API with proper waiting.
//  */
// async function initOneSignal() {
//     try {
//         // Wait for OneSignal to be available with timeout
//         await waitForOneSignal();

//         // Initialize OneSignal with v16 API
//         await OneSignal.init({
//             appId: "ee523d8b-51c0-43d7-ad51-f0cf380f0487",
//             serviceWorkerParam: { scope: "/" },
//             serviceWorkerPath: "OneSignalSDKWorker.js"
//         });

//         console.log('OneSignal initialized successfully');
        
//         // Check if user is already subscribed
//         try {
//             const isSubscribed = await OneSignal.User.PushSubscription.optedIn;
//             if (isSubscribed) {
//                 setCookie("notification_subscribed", "true", 365);
//             }
//         } catch (subscriptionError) {
//             console.log('Could not check subscription status:', subscriptionError);
//         }
//     } catch (error) {
//         console.error('OneSignal initialization failed:', error);
//     }
// }

// /**
//  * Waits for OneSignal SDK to be available.
//  */
// function waitForOneSignal(timeout = 10000) {
//     return new Promise((resolve, reject) => {
//         let attempts = 0;
//         const maxAttempts = timeout / 100;
        
//         const checkOneSignal = () => {
//             attempts++;
            
//             if (typeof OneSignal !== 'undefined' && OneSignal.init) {
//                 console.log('OneSignal SDK is ready');
//                 resolve();
//             } else if (attempts >= maxAttempts) {
//                 reject(new Error('OneSignal SDK failed to load within timeout'));
//             } else {
//                 setTimeout(checkOneSignal, 100);
//             }
//         };
        
//         checkOneSignal();
//     });
// }

// /**
//  * Registers the service worker for caching and offline capabilities.
//  */
// function initServiceWorker() {
//   if ('serviceWorker' in navigator) {
//     window.addEventListener('load', () => {
//       navigator.serviceWorker.register('/sw.js')
//         .then(reg => console.log('Service Worker registered.', reg))
//         .catch(err => console.error('Service Worker registration failed:', err));
//     });
//   }
// }

// /**
//  * Initializes lazy loading for images.
//  */
// function initLazyLoading() {
//   const lazyImages = document.querySelectorAll('img.lazy-load');
//   const imageObserver = new IntersectionObserver((entries, observer) => {
//     entries.forEach(entry => {
//       if (entry.isIntersecting) {
//         const img = entry.target;
//         img.src = img.dataset.src || img.src; // Handle cases where src is already there
//         img.classList.remove('lazy-load');
//         observer.unobserve(img);
//       }
//     });
//   });
//   lazyImages.forEach(img => imageObserver.observe(img));
// }

// /**
//  * Sets a cookie.
//  * @param {string} name The name of the cookie.
//  * @param {string} value The value of the cookie.
//  * @param {number} days The number of days until the cookie expires.
//  */
// function setCookie(name, value, days) {
//     const d = new Date();
//     d.setTime(d.getTime() + (days * 24 * 60 * 60 * 1000));
//     const expires = "expires=" + d.toUTCString();
//     document.cookie = name + "=" + value + ";" + expires + ";path=/";
// }

// /**
//  * Gets the value of a cookie.
//  * @param {string} name The name of the cookie.
//  * @returns {string|null} The cookie value or null if not found.
//  */
// function getCookie(name) {
//     const cname = name + "=";
//     const decodedCookie = decodeURIComponent(document.cookie);
//     const ca = decodedCookie.split(';');
//     for (let i = 0; i < ca.length; i++) {
//         let c = ca[i];
//         while (c.charAt(0) === ' ') {
//             c = c.substring(1);
//         }
//         if (c.indexOf(cname) === 0) {
//             return c.substring(cname.length, c.length);
//         }
//     }
//     return null;
// }
