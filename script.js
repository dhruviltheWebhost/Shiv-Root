// Global variables
let allProducts = [];
let amazonProducts = [];
let currentFilter = 'all';

// DOM Elements
const loadingScreen = document.getElementById('loading-screen');
const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
const navMenu = document.getElementById('nav-menu');
const backToTopBtn = document.getElementById('back-to-top');
const productGrid = document.getElementById('product-grid');
const productsLoading = document.getElementById('products-loading');
const filterTabs = document.querySelectorAll('.filter-tab');
const statNumbers = document.querySelectorAll('.stat-number');

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
    fetchProducts();
    fetchAmazonProducts();
    initTawkTo();
});

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
            
            // Get filter value and apply filter
            currentFilter = tab.dataset.filter;
            filterProducts();
        });
    });
}

// Animations
function initAnimations() {
    // Animate stat numbers
    const animateStats = () => {
        statNumbers.forEach(stat => {
            const target = parseInt(stat.dataset.target);
            const increment = target / 100;
            let current = 0;
            
            const updateStat = () => {
                if (current < target) {
                    current += increment;
                    stat.textContent = Math.floor(current);
                    requestAnimationFrame(updateStat);
                } else {
                    stat.textContent = target + (stat.dataset.target === '99' ? '%' : '+');
                }
            };
            
            updateStat();
        });
    };

    // Intersection Observer for animations
    const observerOptions = {
        threshold: 0.5,
        rootMargin: '0px 0px -100px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                if (entry.target.classList.contains('stats')) {
                    animateStats();
                    observer.unobserve(entry.target);
                }
            }
        });
    }, observerOptions);

    // Observe stats section
    const statsSection = document.querySelector('.stats');
    if (statsSection) {
        observer.observe(statsSection);
    }
}

// Product Fetching and Display
async function fetchProducts() {
    const sheetURL = "https://docs.google.com/spreadsheets/d/11DuYsqp24FEs-7Jo17-mI4aft-v6B1hpTZQIE8edUls/gviz/tq?tqx=out:json";
    
    try {
        showProductsLoading(true);
        
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
                processor: row.c[1]?.v || "N/A",
                ram: row.c[2]?.v || "N/A",
                storage: row.c[3]?.v || "N/A",
                price: row.c[4]?.v || "N/A",
                imageUrl: row.c[5]?.v || "",
                link: row.c[6]?.v || "#",
                category: 'laptop' // Assuming these are laptops from this sheet
            };
            allProducts.push(product);
        });
        
        displayProducts(allProducts);
        showProductsLoading(false);
        
    } catch (error) {
        console.error("Error fetching products:", error);
        showProductsLoading(false);
        showError("Failed to load products. Please try again later.");
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
    }
}

function displayProducts(products) {
    if (!productGrid) return;
    
    if (products.length === 0) {
        productGrid.innerHTML = `
            <div class="no-products">
                <i class="fas fa-search"></i>
                <h3>No products found</h3>
                <p>Try adjusting your filter or check back later for new products.</p>
            </div>
        `;
        return;
    }
    
    const productsHTML = products.map(product => `
        <div class="product-card" data-category="${product.category}">
            <img src="${product.imageUrl}" alt="${product.model}" loading="lazy" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDMwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0xMjUgNzVIMTc1VjEyNUgxMjVWNzVaIiBmaWxsPSIjRTVFN0VCIi8+CjxwYXRoIGQ9Ik0xMzEuMjUgOTMuNzVIMTY4Ljc1VjEwNi4yNUgxMzEuMjVWOTMuNzVaIiBmaWxsPSIjRDFENURCIi8+CjwvZz4KPC9zdmc+'">
            <div class="product-card-content">
                <h3>${product.model}</h3>
                ${product.processor !== "N/A" ? `<p><strong>Processor:</strong> ${product.processor}</p>` : ""}
                ${product.ram !== "N/A" ? `<p><strong>RAM:</strong> ${product.ram}</p>` : ""}
                ${product.storage !== "N/A" ? `<p><strong>Storage:</strong> ${product.storage}</p>` : ""}
                <div class="price">₹${formatPrice(product.price)}</div>
                <button onclick="buyOnWhatsApp('${product.model.replace(/'/g, "\\'")}', '${product.price}')" class="btn btn-primary">
                    <i class="fab fa-whatsapp"></i> Buy Now
                </button>
            </div>
        </div>
    `).join('');
    
    productGrid.innerHTML = productsHTML;
    
    // Add animation to product cards
    animateProductCards();
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
            <img src="${product.imageUrl}" alt="${product.model}" loading="lazy" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDMwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0xMjUgNzVIMTc1VjEyNUgxMjVWNzVaIiBmaWxsPSIjRTVFN0VCIi8+CjxwYXRoIGQ9Ik0xMzEuMjUgOTMuNzVIMTY4Ljc1VjEwNi4yNUgxMzEuMjVWOTMuNzVaIiBmaWxsPSIjRDFENURCIi8+CjwvZz4KPC9zdmc+'">
            <div class="product-card-content">
                <h3>${product.model}</h3>
                ${product.processor !== "N/A" ? `<p><strong>Processor:</strong> ${product.processor}</p>` : ""}
                ${product.ram !== "N/A" ? `<p><strong>RAM:</strong> ${product.ram}</p>` : ""}
                ${product.storage !== "N/A" ? `<p><strong>Storage:</strong> ${product.storage}</p>` : ""}
                <div class="price">₹${formatPrice(product.price)}</div>
                <a href="${product.link}" target="_blank" class="btn btn-amazon">
                    <i class="fab fa-amazon"></i> Buy on Amazon
                </a>
            </div>
        </div>
    `;
}

function filterProducts() {
    let filteredProducts;
    
    if (currentFilter === 'all') {
        filteredProducts = allProducts;
    } else {
        filteredProducts = allProducts.filter(product => 
            product.category.toLowerCase() === currentFilter.toLowerCase()
        );
    }
    
    displayProducts(filteredProducts);
}

function animateProductCards() {
    const cards = document.querySelectorAll('.product-card');
    cards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        
        setTimeout(() => {
            card.style.transition = 'all 0.5s ease-out';
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        }, index * 100);
    });
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

function buyOnWhatsApp(productName, price) {
    const phoneNumber = "916351541231";
    const message = encodeURIComponent(
        `Hello! I'm interested in buying the ${productName} for ₹${formatPrice(price)}. Can you provide more details?`
    );
    const whatsappURL = `https://wa.me/${phoneNumber}?text=${message}`;
    window.open(whatsappURL, '_blank');
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

// Performance Optimization
function lazyLoadImages() {
    const images = document.querySelectorAll('img[data-src]');
    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src;
                img.classList.remove('lazy');
                imageObserver.unobserve(img);
            }
        });
    });

    images.forEach(img => imageObserver.observe(img));
}

// Error Handling
window.addEventListener('error', function(e) {
    console.error('JavaScript Error:', e.error);
});

window.addEventListener('unhandledrejection', function(e) {
    console.error('Unhandled Promise Rejection:', e.reason);
});

// Additional CSS for error states and loading
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
    
    .lazy {
        opacity: 0;
        transition: opacity 0.3s;
    }
    
    .lazy.loaded {
        opacity: 1;
    }
`;

// Inject additional styles
const styleSheet = document.createElement('style');
styleSheet.textContent = additionalStyles;
document.head.appendChild(styleSheet);