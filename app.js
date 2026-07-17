// app.js
// Main Application Controller for Creative Industries B2B SPA

(function () {
  // Ensure data has loaded
  const db = window.CreativeData;
  if (!db) {
    console.error("Data script (data.js) not loaded!");
    return;
  }

  // --- STATE MANAGEMENT ---
  const state = {
    cart: JSON.parse(localStorage.getItem("ci_cart")) || [],
    wishlist: JSON.parse(localStorage.getItem("ci_wishlist")) || [],
    compare: JSON.parse(localStorage.getItem("ci_compare")) || [],
    recentlyViewed: JSON.parse(localStorage.getItem("ci_recently_viewed")) || [],
    orders: JSON.parse(localStorage.getItem("ci_orders")) || [
      {
        id: "ORD-92837",
        date: "2026-07-05",
        company: "Moglix Procurement",
        gst: "07AABC1234F1Z0",
        items: [
          { productId: "door-outer-panel", name: "Door Outer Panel", qty: 50, price: 1850 },
          { productId: "front-fender", name: "Front Fender", qty: 30, price: 1250 }
        ],
        subtotal: 130000,
        gstAmount: 23400,
        shipping: 4500,
        total: 157900,
        payment: "Net 30",
        status: "Dispatched",
        address: "Moglix Warehouse DC-4, Sector 63, Noida, UP, 201301"
      },
      {
        id: "ORD-87462",
        date: "2026-06-20",
        company: "Maruti Suzuki (Vendor Logistics)",
        gst: "06AAACM4839M1Z8",
        items: [
          { productId: "bonnet-hood-panel", name: "Bonnet Hood Panel", qty: 20, price: 4200 },
          { productId: "floor-panel", name: "Floor Panel", qty: 15, price: 8500 }
        ],
        subtotal: 211500,
        gstAmount: 38070,
        shipping: 8000,
        total: 257570,
        payment: "Bank Transfer",
        status: "Delivered",
        address: "Maruti Suzuki India Ltd., Faridabad Procurement Unit, Haryana"
      }
    ],
    user: JSON.parse(localStorage.getItem("ci_user")) || {
      companyName: "Automotive Solutions India",
      gstNumber: "07AAAAS9876M1ZX",
      contactPerson: "Rajesh Kumar",
      phone: "+91 98123 45678",
      email: "r.kumar@autosolutions.in",
      address: "Plot 120, Sector 5, Sanjay Colony, Sector-23, Faridabad, Haryana - 121005"
    },
    isLoggedIn: JSON.parse(localStorage.getItem("ci_logged_in")) !== null ? JSON.parse(localStorage.getItem("ci_logged_in")) : true,
    liveStockInterval: null
  };

  // Sync state to localStorage on modification
  const saveState = () => {
    localStorage.setItem("ci_cart", JSON.stringify(state.cart));
    localStorage.setItem("ci_wishlist", JSON.stringify(state.wishlist));
    localStorage.setItem("ci_compare", JSON.stringify(state.compare));
    localStorage.setItem("ci_recently_viewed", JSON.stringify(state.recentlyViewed));
    localStorage.setItem("ci_orders", JSON.stringify(state.orders));
    localStorage.setItem("ci_user", JSON.stringify(state.user));
    localStorage.setItem("ci_logged_in", JSON.stringify(state.isLoggedIn));
    updateBadges();
  };

  // --- NOTIFICATION ENGINE ---
  const showToast = (message, type = "success") => {
    const container = document.getElementById("toast-container");
    if (!container) return;

    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    
    let icon = "fa-check-circle";
    if (type === "error") icon = "fa-exclamation-circle";
    if (type === "info") icon = "fa-info-circle";

    toast.innerHTML = `
      <i class="fas ${icon}" style="color: ${type === 'success' ? '#2E7D32' : type === 'error' ? '#D62828' : '#0B3D91'}"></i>
      <span style="font-weight: 500; font-size: 0.85rem;">${message}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.animation = "slideIn 0.3s reverse forwards";
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  };

  // --- LIVE BADGES UPDATE ---
  const updateBadges = () => {
    const cartCount = state.cart.reduce((sum, item) => sum + item.qty, 0);
    const cartBadge = document.getElementById("cart-badge");
    if (cartBadge) {
      cartBadge.textContent = cartCount;
      cartBadge.style.display = cartCount > 0 ? "flex" : "none";
    }

    const wishlistCount = state.wishlist.length;
    const wishlistBadge = document.getElementById("wishlist-badge");
    if (wishlistBadge) {
      wishlistBadge.textContent = wishlistCount;
      wishlistBadge.style.display = wishlistCount > 0 ? "flex" : "none";
    }

    // Update floating compare count if drawer exists
    updateCompareDrawer();
  };

  // --- FLOATING QUOTE & COMPARE DRAWER MANAGEMENT ---
  const updateCompareDrawer = () => {
    const drawer = document.getElementById("comparison-drawer");
    if (!drawer) return;

    if (state.compare.length === 0) {
      drawer.classList.remove("active");
      return;
    }

    drawer.classList.add("active");
    const container = document.getElementById("compare-items-row");
    if (!container) return;

    let itemsHtml = "";
    state.compare.forEach(id => {
      const prod = db.products.find(p => p.id === id);
      if (!prod) return;
      itemsHtml += `
        <div class="compare-pill">
          <img src="${prod.image}" alt="${prod.name}">
          <span>${prod.name}</span>
          <i class="fas fa-times-circle compare-pill-remove" data-id="${prod.id}"></i>
        </div>
      `;
    });

    itemsHtml += `
      <button class="btn btn-primary btn-sm" id="btn-trigger-compare-modal" style="margin-left: auto;">
        <i class="fas fa-columns"></i> Compare Now (${state.compare.length}/3)
      </button>
      <button class="btn btn-secondary btn-sm" id="btn-clear-compare" style="color: var(--text-primary); border-color: var(--border-color);">
        Clear All
      </button>
    `;

    container.innerHTML = itemsHtml;

    // Attach listeners
    container.querySelectorAll(".compare-pill-remove").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const id = e.target.getAttribute("data-id");
        toggleCompare(id);
      });
    });

    document.getElementById("btn-trigger-compare-modal")?.addEventListener("click", openComparisonModal);
    document.getElementById("btn-clear-compare")?.addEventListener("click", () => {
      state.compare = [];
      saveState();
      showToast("Comparison cleared", "info");
      router();
    });
  };

  // --- TOGGLES ---
  const toggleWishlist = (productId) => {
    const idx = state.wishlist.indexOf(productId);
    if (idx > -1) {
      state.wishlist.splice(idx, 1);
      showToast("Removed from wishlist", "info");
    } else {
      state.wishlist.push(productId);
      showToast("Added to wishlist", "success");
    }
    saveState();
    // Re-render current page to show active states
    router();
  };

  const toggleCompare = (productId) => {
    const idx = state.compare.indexOf(productId);
    if (idx > -1) {
      state.compare.splice(idx, 1);
      showToast("Removed from comparison", "info");
    } else {
      if (state.compare.length >= 3) {
        showToast("You can compare a maximum of 3 products", "error");
        return;
      }
      state.compare.push(productId);
      showToast("Added to comparison", "success");
    }
    saveState();
    router();
  };

  // --- SIMULATED INVENTORY FLUCTUATION ---
  const startLiveStockSimulation = () => {
    if (state.liveStockInterval) clearInterval(state.liveStockInterval);
    state.liveStockInterval = setInterval(() => {
      db.products.forEach(p => {
        const warehouses = Object.keys(p.stockByWarehouse);
        const randomWh = warehouses[Math.floor(Math.random() * warehouses.length)];
        const change = Math.random() > 0.5 ? 1 : -1;
        
        // Ensure stock doesn't fall below 5 or go too high
        if (p.stockByWarehouse[randomWh] + change > 5) {
          p.stockByWarehouse[randomWh] += change;
        }
      });
      // Dynamically update inventory fields if the page is currently rendering them
      updateLiveStockUI();
    }, 15000);
  };

  const updateLiveStockUI = () => {
    // If we are on inventory table page
    const tableBody = document.querySelector(".inventory-table tbody");
    if (tableBody) {
      db.products.forEach(p => {
        const totalStock = Object.values(p.stockByWarehouse).reduce((a, b) => a + b, 0);
        const stockCell = document.querySelector(`.stock-cell[data-id="${p.id}"]`);
        const statusCell = document.querySelector(`.status-cell[data-id="${p.id}"]`);
        
        if (stockCell) {
          stockCell.innerHTML = `<strong>${totalStock} pcs</strong><br><span style="font-size:0.75rem;color:var(--text-secondary)">Faridabad Works</span>`;
        }
        if (statusCell) {
          statusCell.innerHTML = totalStock > 300 
            ? `<span class="status-badge status-instock"><i class="fas fa-check-circle"></i> In Stock</span>`
            : `<span class="status-badge status-lowstock"><i class="fas fa-exclamation-triangle"></i> Low Stock</span>`;
        }
      });
    }

    // If on product details page
    const detailStock = document.getElementById("detail-stock-total");
    if (detailStock) {
      const activeId = detailStock.getAttribute("data-id");
      const prod = db.products.find(p => p.id === activeId);
      if (prod) {
        const totalStock = Object.values(prod.stockByWarehouse).reduce((a, b) => a + b, 0);
        detailStock.textContent = `${totalStock} pcs`;
        
        // Update individual warehouse items
        Object.entries(prod.stockByWarehouse).forEach(([wh, stock]) => {
          const whEl = document.getElementById(`wh-stock-${wh.replace(/\s+/g, '')}`);
          if (whEl) whEl.textContent = `${stock} pcs`;
        });
      }
    }
  };

  // --- ROUTING SYSTEM ---
  const routes = {
    "/": renderHome,
    "/products": renderProducts,
    "/product/:id": renderProductDetail,
    "/inventory": renderInventory,
    "/industries": renderIndustries,
    "/clients": renderClients,
    "/cart": renderCart,
    "/checkout": renderCheckout,
    "/confirmation/:id": renderConfirmation,
    "/track": renderTrack,
    "/about": renderAbout,
    "/contact": renderContact,
    "/dashboard": renderDashboard,
    "/shipping-policy": renderShippingPolicy,
    "/privacy-policy": renderPrivacyPolicy,
    "/terms-conditions": renderTermsConditions,
    "/profile": renderProfile
  };

  const router = () => {
    const hash = window.location.hash || "#/";
    const container = document.getElementById("app-container");
    if (!container) return;

    // Remove active state from all header links
    document.querySelectorAll(".nav-link").forEach(link => link.classList.remove("active"));
    
    // Auto close mobile menu
    document.getElementById("nav-links")?.classList.remove("active");

    // Match route
    let matchedRenderer = null;
    let params = null;

    for (const route in routes) {
      const routeParts = route.split("/");
      const hashPath = hash.replace("#", "").split("?")[0];
      const hashParts = hashPath.split("/");

      if (routeParts.length === hashParts.length) {
        let isMatch = true;
        const tempParams = {};

        for (let i = 0; i < routeParts.length; i++) {
          if (routeParts[i].startsWith(":")) {
            tempParams[routeParts[i].substring(1)] = hashParts[i];
          } else if (routeParts[i] !== hashParts[i]) {
            isMatch = false;
            break;
          }
        }

        if (isMatch) {
          matchedRenderer = routes[route];
          params = tempParams;
          break;
        }
      }
    }

    if (matchedRenderer) {
      // Set active link in header based on hash
      const cleanPath = hash.split("?")[0];
      const matchingLink = document.querySelector(`.nav-link[href="${cleanPath}"]`);
      if (matchingLink) matchingLink.classList.add("active");

      matchedRenderer(params);
      window.scrollTo(0, 0);
    } else {
      container.innerHTML = `<div class="section" style="text-align:center;"><h2>Page Not Found</h2><a href="#/" class="btn btn-primary" style="margin-top:1.5rem;">Return Home</a></div>`;
    }
  };

  window.addEventListener("hashchange", router);

  // --- AUTO-COMPLETE SEARCH LOGIC ---
  const initSearchAutocomplete = () => {
    const searchInput = document.getElementById("header-search-input");
    const dropdown = document.getElementById("search-autocomplete-dropdown");
    if (!searchInput || !dropdown) return;

    // Global click listener to close search autocomplete
    document.addEventListener("click", (e) => {
      if (!searchInput.contains(e.target) && !dropdown.contains(e.target)) {
        dropdown.style.display = "none";
      }
    });

    searchInput.addEventListener("focus", () => {
      triggerSearch(searchInput.value);
    });

    searchInput.addEventListener("input", (e) => {
      triggerSearch(e.target.value);
    });

    const triggerSearch = (query) => {
      const trimmed = query.trim().toLowerCase();
      if (!trimmed) {
        dropdown.style.display = "none";
        return;
      }

      // Filter products
      const matches = db.products.filter(p => 
        p.name.toLowerCase().includes(trimmed) || 
        p.sku.toLowerCase().includes(trimmed) ||
        p.material.toLowerCase().includes(trimmed) ||
        p.compatibility.some(c => c.toLowerCase().includes(trimmed))
      );

      if (matches.length === 0) {
        dropdown.innerHTML = `<div style="padding: 1rem; text-align: center; color: var(--text-secondary); font-size: 0.85rem;">No products found.</div>`;
        dropdown.style.display = "block";
        return;
      }

      let dropdownHtml = "";
      matches.slice(0, 5).forEach(prod => {
        const totalStock = Object.values(prod.stockByWarehouse).reduce((a, b) => a + b, 0);
        dropdownHtml += `
          <div class="autocomplete-item" data-id="${prod.id}">
            <img class="autocomplete-img" src="${prod.image}" alt="${prod.name}">
            <div class="autocomplete-info">
              <span class="autocomplete-name">${prod.name}</span>
              <span class="autocomplete-meta">SKU: ${prod.sku} | Mat: ${prod.material}</span>
              <span class="autocomplete-meta" style="color: ${totalStock > 0 ? '#15803D' : '#D62828'}; font-weight:600;">Stock: ${totalStock} pcs</span>
            </div>
          </div>
        `;
      });

      dropdown.innerHTML = dropdownHtml;
      dropdown.style.display = "block";

      // Attach click listeners to autocomplete entries
      dropdown.querySelectorAll(".autocomplete-item").forEach(item => {
        item.addEventListener("click", () => {
          const id = item.getAttribute("data-id");
          dropdown.style.display = "none";
          searchInput.value = "";
          window.location.hash = `#/product/${id}`;
        });
      });
    };
  };

  // --- RENDERERS ---

  // 1. HOME VIEW
  function renderHome() {
    const container = document.getElementById("app-container");
    
    let clientsHtml = "";
    db.clients.forEach(c => {
      clientsHtml += `
        <div class="client-logo-wrapper" title="${c.name}">
          <img src="${c.logo}" class="client-logo" alt="${c.name}">
        </div>
      `;
    });

    container.innerHTML = `
      <section class="hero-banner" style="background-image: url('hero_banner.png');">
        <div class="hero-content">
          <h1 class="hero-headline">High-Quality Automotive<br>Sheet Metal Components</h1>
          <p class="hero-subheading">Supplying OEM-grade sheet metal spare parts across India with fast delivery, competitive pricing, and reliable inventory management.</p>
          <div class="hero-btns">
            <a href="#/products" class="btn btn-primary"><i class="fas fa-th"></i> Browse Products</a>
            <button class="btn btn-secondary" id="btn-hero-rfq"><i class="fas fa-file-invoice"></i> Request Quotation</button>
          </div>
        </div>
      </section>

      <!-- Why Choose Us -->
      <section class="section">
        <div class="section-title-wrapper">
          <h2 class="section-title">Why Choose Creative Industries</h2>
          <p class="section-subtitle">Pioneering precision standards, custom sizing, and industrial logistics to meet high volume fabrication demands.</p>
        </div>
        <div class="why-grid">
          <div class="why-card">
            <div class="why-icon"><i class="fas fa-shield-alt"></i></div>
            <div class="why-info">
              <h3>Premium Quality</h3>
              <p>All stampings and drawing sheets strictly conform to ISO 9001 and OEM load tolerances, offering perfect structural matches.</p>
            </div>
          </div>
          <div class="why-card">
            <div class="why-icon"><i class="fas fa-warehouse"></i></div>
            <div class="why-info">
              <h3>Large Inventory</h3>
              <p>Massive raw sheet rolls and pre-stamped components kept ready in our strategic logistics hubs across India for bulk demands.</p>
            </div>
          </div>
          <div class="why-card">
            <div class="why-icon"><i class="fas fa-car"></i></div>
            <div class="why-info">
              <h3>OEM Compatible</h3>
              <p>Engineered precisely to match standard vehicle assembly points and line margins for quick aftermarket replacements.</p>
            </div>
          </div>
          <div class="why-card">
            <div class="why-icon"><i class="fas fa-shipping-fast"></i></div>
            <div class="why-info">
              <h3>Fast Dispatch</h3>
              <p>Automated warehouse dispatch network guarantees freight loading and route optimization within 24 hours of receipt.</p>
            </div>
          </div>
          <div class="why-card">
            <div class="why-icon"><i class="fas fa-map-marked-alt"></i></div>
            <div class="why-info">
              <h3>Nationwide Delivery</h3>
              <p>Partnerships with major national cargo lines ensure delivery directly to plants, warehouses, or workshops in India.</p>
            </div>
          </div>
          <div class="why-card">
            <div class="why-icon"><i class="fas fa-handshake"></i></div>
            <div class="why-info">
              <h3>Trusted by Manufacturers</h3>
              <p>Preferred vendor to major distributors and Tier-1 automotive assemblies seeking zero-defect stamping panels.</p>
            </div>
          </div>
        </div>
      </section>

      <!-- Stats Counters Banner -->
      <section class="stats-banner">
        <div class="stats-container">
          <div class="stat-item">
            <span class="stat-number" data-target="6">0</span>
            <span class="stat-label">Years Experience</span>
          </div>
          <div class="stat-item">
            <span class="stat-number" data-target="10">0</span>
            <span class="stat-label">Products</span>
          </div>
          <div class="stat-item">
            <span class="stat-number" data-target="4">0</span>
            <span class="stat-label">Clients</span>
          </div>
          <div class="stat-item">
            <span class="stat-number" data-target="200">0</span>
            <span class="stat-label">Orders Delivered</span>
          </div>
          <div class="stat-item">
            <span class="stat-number" data-target="98">0</span>
            <span class="stat-label">On-Time Delivery %</span>
          </div>
          <div class="stat-item">
            <span class="stat-number" data-target="24">0</span>
            <span class="stat-label">RFQ Response (Hrs)</span>
          </div>
        </div>
      </section>

      <!-- Clients Section -->
      <section class="section">
        <div class="section-title-wrapper">
          <h2 class="section-title">Major B2B Clients</h2>
          <p class="section-subtitle">Trusted by leading automotive assemblers, procurement networks, and manufacturing operations across India.</p>
        </div>
        <div class="clients-grid">
          ${clientsHtml}
        </div>
      </section>
    `;

    // Initialize stats counter animations
    animateCounters();

    // Bind RFQ triggers
    document.getElementById("btn-hero-rfq")?.addEventListener("click", openRfqModal);
  }

  // Count up animation logic
  const animateCounters = () => {
    const counters = document.querySelectorAll(".stat-number");
    counters.forEach(counter => {
      const target = parseInt(counter.getAttribute("data-target"), 10);
      let count = 0;
      const speed = target / 50; // controls duration
      const updateCount = () => {
        count += speed;
        if (count < target) {
          counter.textContent = Math.ceil(count) + (target === 6 || target === 10 || target === 4 || target === 200 ? "+" : target === 98 ? "%" : " Hrs");
          setTimeout(updateCount, 25);
        } else {
          counter.textContent = target + (target === 6 || target === 10 || target === 4 || target === 200 ? "+" : target === 98 ? "%" : " Hrs");
        }
      };
      updateCount();
    });
  };

  // 2. PRODUCT CATALOG VIEW
  function renderProducts() {
    const container = document.getElementById("app-container");

    // Gather filter criteria options dynamically
    const compatibilitySet = new Set();
    const materialSet = new Set();
    db.products.forEach(p => {
      p.compatibility.forEach(c => compatibilitySet.add(c.split(" ")[0])); // Brand names only
      materialSet.add(p.material);
    });

    let compFilterHtml = "";
    compatibilitySet.forEach(brand => {
      compFilterHtml += `
        <label class="checkbox-label">
          <input type="checkbox" class="filter-compat" value="${brand}">
          <span>${brand}</span>
        </label>
      `;
    });

    let matFilterHtml = "";
    materialSet.forEach(mat => {
      matFilterHtml += `
        <label class="checkbox-label">
          <input type="checkbox" class="filter-material" value="${mat}">
          <span>${mat}</span>
        </label>
      `;
    });

    container.innerHTML = `
      <div class="section-title-wrapper" style="margin-top: 3rem; margin-bottom: 1rem;">
        <h2 class="section-title">Product Catalog</h2>
        <p class="section-subtitle">OEM-grade stamping components. Add to cart to place net term orders, or select items to compare.</p>
      </div>

      <div class="catalog-layout">
        <!-- Sidebar Filters -->
        <aside class="filters-sidebar">
          <div class="filter-group">
            <h3 class="filter-title">Vehicle Compatibility</h3>
            <div class="filter-options">
              ${compFilterHtml}
            </div>
          </div>

          <div class="filter-group">
            <h3 class="filter-title">Material Type</h3>
            <div class="filter-options">
              ${matFilterHtml}
            </div>
          </div>

          <div class="filter-group">
            <h3 class="filter-title">Thickness</h3>
            <div class="filter-options">
              <label class="checkbox-label"><input type="checkbox" class="filter-thick" value="0.8mm"><span>0.8 mm</span></label>
              <label class="checkbox-label"><input type="checkbox" class="filter-thick" value="1.0mm"><span>1.0 mm</span></label>
              <label class="checkbox-label"><input type="checkbox" class="filter-thick" value="1.2mm"><span>1.2 mm</span></label>
              <label class="checkbox-label"><input type="checkbox" class="filter-thick" value="1.5mm"><span>1.5 mm+</span></label>
            </div>
          </div>

          <div class="filter-group">
            <h3 class="filter-title">Availability</h3>
            <div class="filter-options">
              <label class="checkbox-label">
                <input type="checkbox" id="filter-instock">
                <span>In Stock Only</span>
              </label>
            </div>
          </div>

          <div class="filter-group">
            <button class="btn btn-outline btn-sm" id="btn-clear-filters" style="width:100%;">Clear All Filters</button>
          </div>
        </aside>

        <!-- Catalog List -->
        <div class="products-wrapper">
          <div class="catalog-header">
            <span id="catalog-count" style="font-weight:600; color:var(--text-secondary);">16 Products Available</span>
            <div style="display:flex; gap:0.5rem; align-items:center;">
              <span style="font-size:0.9rem; color:var(--text-secondary);">Sort By:</span>
              <select class="filter-select" id="catalog-sort" style="width:180px;">
                <option value="popular">Popularity</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
                <option value="name-asc">Alphabetical</option>
              </select>
            </div>
          </div>

          <div class="products-grid" id="catalog-products-grid">
            <!-- Dynamic Injection -->
          </div>
        </div>
      </div>
    `;

    // Initial draw
    filterCatalog();

    // Bind event listeners
    document.querySelectorAll(".filter-compat, .filter-material, .filter-thick, #filter-instock").forEach(input => {
      input.addEventListener("change", filterCatalog);
    });
    document.getElementById("catalog-sort")?.addEventListener("change", filterCatalog);
    document.getElementById("btn-clear-filters")?.addEventListener("click", () => {
      document.querySelectorAll(".filter-compat, .filter-material, .filter-thick").forEach(input => input.checked = false);
      const instock = document.getElementById("filter-instock");
      if (instock) instock.checked = false;
      filterCatalog();
    });
  }

  // Core filter calculation for catalog page
  const filterCatalog = () => {
    const grid = document.getElementById("catalog-products-grid");
    if (!grid) return;

    // Fetch filters state
    const selectedBrands = Array.from(document.querySelectorAll(".filter-compat:checked")).map(el => el.value.toLowerCase());
    const selectedMats = Array.from(document.querySelectorAll(".filter-material:checked")).map(el => el.value.toLowerCase());
    const selectedThicks = Array.from(document.querySelectorAll(".filter-thick:checked")).map(el => el.value);
    const inStockOnly = document.getElementById("filter-instock")?.checked || false;
    const sortVal = document.getElementById("catalog-sort")?.value || "popular";

    // Filtering logic
    let filtered = db.products.filter(p => {
      const matchBrand = selectedBrands.length === 0 || p.compatibility.some(c => selectedBrands.some(brand => c.toLowerCase().includes(brand)));
      const matchMat = selectedMats.length === 0 || selectedMats.includes(p.material.toLowerCase());
      
      let matchThick = true;
      if (selectedThicks.length > 0) {
        matchThick = selectedThicks.some(thickVal => {
          if (thickVal === "1.5mm") {
            const rawFloat = parseFloat(p.thickness);
            return rawFloat >= 1.5;
          }
          return p.thickness === thickVal;
        });
      }

      const totalStock = Object.values(p.stockByWarehouse).reduce((a, b) => a + b, 0);
      const matchStock = !inStockOnly || totalStock > 0;

      return matchBrand && matchMat && matchThick && matchStock;
    });

    // Sorting logic
    if (sortVal === "price-asc") {
      filtered.sort((a, b) => a.price - b.price);
    } else if (sortVal === "price-desc") {
      filtered.sort((a, b) => b.price - a.price);
    } else if (sortVal === "name-asc") {
      filtered.sort((a, b) => a.name.localeCompare(b.name));
    } // "popular" keeps default order

    // Render count
    const countEl = document.getElementById("catalog-count");
    if (countEl) countEl.textContent = `${filtered.length} Products Found`;

    if (filtered.length === 0) {
      grid.innerHTML = `<div style="grid-column: 1/-1; padding: 4rem; text-align: center; background-color: var(--white); border-radius: var(--border-radius-lg); border: 1px solid var(--border-color);"><h3 style="color:var(--text-secondary);">No matching products found.</h3><p style="color:var(--text-secondary); margin-top:0.5rem;">Adjust your filter options and try again.</p></div>`;
      return;
    }

    let cardsHtml = "";
    filtered.forEach(p => {
      const isWishlisted = state.wishlist.includes(p.id);
      const isCompared = state.compare.includes(p.id);
      const totalStock = Object.values(p.stockByWarehouse).reduce((a, b) => a + b, 0);

      cardsHtml += `
        <article class="product-card">
          <span class="card-badge">${p.sku}</span>
          <div class="product-card-img-wrapper">
            <img src="${p.image}" class="product-card-img" alt="${p.name}">
          </div>
          <div class="product-card-body">
            <h3 class="product-card-title"><a href="#/product/${p.id}">${p.name}</a></h3>
            <div class="product-card-specs">
              <span>Mat: <strong>${p.material.split(" ")[0]}</strong></span>
              <span>Grade: <strong>${p.grade}</strong></span>
              <span>Thick: <strong>${p.thickness}</strong></span>
              <span>MOQ: <strong>${p.minOrder} pcs</strong></span>
            </div>
            
            <div class="product-card-stock">
              <i class="fas fa-warehouse" style="color:var(--text-secondary)"></i>
              <span class="${totalStock > 300 ? 'stock-in' : 'stock-low'}">${totalStock} pcs available</span>
            </div>

            <div class="product-card-price-row">
              <div class="product-card-price">
                <span class="price-label">Price (Est.)</span>
                <span class="price-amount">₹${p.price.toLocaleString("en-IN")}</span>
              </div>
              <button class="btn btn-primary btn-sm btn-add-cart" data-id="${p.id}">
                <i class="fas fa-shopping-cart"></i> Add
              </button>
            </div>

            <div class="card-actions">
              <button class="wishlist-btn-toggle ${isWishlisted ? 'active' : ''}" data-id="${p.id}" title="Add to Wishlist">
                <i class="fas fa-heart"></i>
              </button>
              <button class="compare-btn-toggle ${isCompared ? 'active' : ''}" data-id="${p.id}" title="Compare Product">
                <i class="fas fa-columns"></i>
              </button>
            </div>
          </div>
        </article>
      `;
    });

    grid.innerHTML = cardsHtml;

    // Attach button actions
    grid.querySelectorAll(".btn-add-cart").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-id");
        addToCart(id);
      });
    });

    grid.querySelectorAll(".wishlist-btn-toggle").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-id");
        toggleWishlist(id);
      });
    });

    grid.querySelectorAll(".compare-btn-toggle").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-id");
        toggleCompare(id);
      });
    });
  };

  // 3. PRODUCT DETAILS VIEW
  function renderProductDetail(params) {
    const prodId = params.id;
    const prod = db.products.find(p => p.id === prodId);
    const container = document.getElementById("app-container");

    if (!prod) {
      container.innerHTML = `<div class="section" style="text-align:center;"><h2>Product Not Found</h2><a href="#/products" class="btn btn-primary" style="margin-top:1.5rem;">Catalog</a></div>`;
      return;
    }

    // Add to recently viewed list
    const rvIdx = state.recentlyViewed.indexOf(prod.id);
    if (rvIdx > -1) state.recentlyViewed.splice(rvIdx, 1);
    state.recentlyViewed.unshift(prod.id);
    if (state.recentlyViewed.length > 4) state.recentlyViewed.pop();
    saveState();

    const isWishlisted = state.wishlist.includes(prod.id);
    const isCompared = state.compare.includes(prod.id);
    const totalStock = Object.values(prod.stockByWarehouse).reduce((a, b) => a + b, 0);

    // Build compatibility badges
    let compBadges = "";
    prod.compatibility.forEach(v => {
      compBadges += `<span class="comp-badge">${v}</span>`;
    });

    // Build warehouse cards
    let whRows = "";
    Object.entries(prod.stockByWarehouse).forEach(([wh, stock]) => {
      whRows += `
        <div class="wh-row">
          <span>${wh}</span>
          <strong id="wh-stock-${wh.replace(/\s+/g, '')}">${stock} pcs</strong>
        </div>
      `;
    });

    // Recently Viewed HTML
    let recentlyViewedHtml = "";
    const validRv = state.recentlyViewed.filter(id => id !== prod.id);
    if (validRv.length > 0) {
      let rvCards = "";
      validRv.slice(0, 3).forEach(id => {
        const rvProd = db.products.find(p => p.id === id);
        if (!rvProd) return;
        rvCards += `
          <div style="background:var(--white); border:1px solid var(--border-color); border-radius:8px; padding:0.75rem; display:flex; gap:0.75rem; align-items:center; cursor:pointer;" onclick="window.location.hash='#/product/${rvProd.id}'">
            <img src="${rvProd.image}" style="width:50px; height:50px; object-fit:cover; border-radius:4px;">
            <div>
              <h4 style="font-size:0.85rem; margin-bottom:0.15rem;">${rvProd.name}</h4>
              <span style="font-size:0.75rem; color:var(--primary-blue); font-weight:700;">₹${rvProd.price.toLocaleString("en-IN")}</span>
            </div>
          </div>
        `;
      });

      recentlyViewedHtml = `
        <div style="margin-top:2.5rem; border-top: 1px solid var(--border-color); padding-top:1.5rem;">
          <h3 style="font-size:1.1rem; margin-bottom:1rem;">Recently Viewed</h3>
          <div style="display:flex; flex-direction:column; gap:0.75rem;">
            ${rvCards}
          </div>
        </div>
      `;
    }

    container.innerHTML = `
      <div class="product-details-layout">
        <!-- Gallery -->
        <div class="product-gallery">
          <div class="main-image-wrapper">
            <img src="${prod.image}" alt="${prod.name}">
          </div>
          <div style="display:flex; gap:1rem;">
            <button class="btn btn-outline btn-sm" id="btn-download-pdf" style="flex:1;"><i class="fas fa-file-pdf"></i> Download Spec Sheet PDF</button>
            <button class="btn btn-outline btn-sm compare-btn-toggle ${isCompared ? 'active' : ''}" id="btn-details-compare" data-id="${prod.id}" style="width:50px;"><i class="fas fa-columns"></i></button>
            <button class="wishlist-btn-toggle ${isWishlisted ? 'active' : ''}" id="btn-details-wishlist" data-id="${prod.id}" style="width:50px; height:38px;"><i class="fas fa-heart"></i></button>
          </div>
          ${recentlyViewedHtml}
        </div>

        <!-- Detail info -->
        <div class="details-content">
          <div class="details-meta-labels">
            <span class="meta-pill meta-pill-blue">${prod.sku}</span>
            <span class="meta-pill">${prod.material}</span>
          </div>

          <h1 class="details-title">${prod.name}</h1>
          <p style="color:var(--text-secondary); font-size:1.05rem;">${prod.description}</p>

          <div class="details-price-card">
            <div>
              <span class="price-label" style="color:var(--primary-blue);">Estimated Unit Price (B2B)</span>
              <div class="price-amount">₹${prod.price.toLocaleString("en-IN")}</div>
              <span style="font-size:0.75rem; color:var(--text-secondary);">*Prices exclude GST (18%) and bulk logistics freight.</span>
            </div>
          </div>

          <table class="spec-table">
            <tr>
              <td class="spec-label">Steel Grade</td>
              <td class="spec-val">${prod.grade}</td>
            </tr>
            <tr>
              <td class="spec-label">Thickness</td>
              <td class="spec-val">${prod.thickness}</td>
            </tr>
            <tr>
              <td class="spec-label">Dimensions</td>
              <td class="spec-val">${prod.dimensions}</td>
            </tr>
            <tr>
              <td class="spec-label">Unit Weight</td>
              <td class="spec-val">${prod.weight}</td>
            </tr>
            <tr>
              <td class="spec-label">Minimum Order Qty</td>
              <td class="spec-val" style="color:var(--primary-red); font-weight:700;">${prod.minOrder} pcs</td>
            </tr>
            <tr>
              <td class="spec-label">Dispatch SLA</td>
              <td class="spec-val">${prod.deliveryTime}</td>
            </tr>
          </table>

          <div>
            <h4 style="font-size:0.95rem; margin-bottom:0.5rem;">Compatible Vehicle Models</h4>
            <div class="compatibility-grid">
              ${compBadges}
            </div>
          </div>

          <!-- Warehouse Stocks Box -->
          <div class="warehouse-stock-box">
            <h4>Live Stock Status (Total: <span id="detail-stock-total" data-id="${prod.id}">${totalStock} pcs</span>)</h4>
            <div style="border-top:1px solid var(--border-color); padding-top:0.75rem;">
              ${whRows}
            </div>
          </div>

          <!-- Actions -->
          <div style="display:flex; flex-direction:column; gap:1rem; border-top:1px solid var(--border-color); padding-top:1.5rem;">
            <div style="display:flex; align-items:center; gap:1.5rem;">
              <span style="font-weight:600; font-size:0.95rem;">Order Qty:</span>
              <div class="qty-selector">
                <button class="qty-btn" id="qty-minus">-</button>
                <input type="number" class="qty-input" id="detail-qty" value="${prod.minOrder}" min="${prod.minOrder}">
                <button class="qty-btn" id="qty-plus">+</button>
              </div>
            </div>

            <div style="display:flex; gap:1rem; margin-top:0.5rem;">
              <button class="btn btn-primary" id="btn-add-cart-detail" style="flex:1;"><i class="fas fa-cart-plus"></i> Add to Cart</button>
              <button class="btn btn-dark" id="btn-quote-detail" style="flex:1.2;"><i class="fas fa-file-invoice-dollar"></i> Request Bulk Quote</button>
            </div>
          </div>
        </div>
      </div>
    `;

    // Qty Adjusters
    const qtyInput = document.getElementById("detail-qty");
    document.getElementById("qty-minus")?.addEventListener("click", () => {
      const currentVal = parseInt(qtyInput.value, 10);
      if (currentVal > prod.minOrder) {
        qtyInput.value = currentVal - 1;
      }
    });

    document.getElementById("qty-plus")?.addEventListener("click", () => {
      const currentVal = parseInt(qtyInput.value, 10);
      qtyInput.value = currentVal + 1;
    });

    qtyInput?.addEventListener("change", () => {
      const val = parseInt(qtyInput.value, 10);
      if (isNaN(val) || val < prod.minOrder) {
        qtyInput.value = prod.minOrder;
        showToast(`Minimum order quantity for this item is ${prod.minOrder} pcs.`, "error");
      }
    });

    // Add to Cart
    document.getElementById("btn-add-cart-detail")?.addEventListener("click", () => {
      const qty = parseInt(qtyInput.value, 10);
      addToCart(prod.id, qty);
    });

    // Quote trigger
    document.getElementById("btn-quote-detail")?.addEventListener("click", () => {
      openRfqModal(prod.id);
    });

    // Wishlist and Compare details trigger
    document.getElementById("btn-details-wishlist")?.addEventListener("click", () => {
      toggleWishlist(prod.id);
    });

    document.getElementById("btn-details-compare")?.addEventListener("click", () => {
      toggleCompare(prod.id);
    });

    // PDF Spec trigger
    document.getElementById("btn-download-pdf")?.addEventListener("click", () => {
      generateProductPDF(prod);
    });
  }

  // Add to cart state update
  const addToCart = (productId, qty = null) => {
    const prod = db.products.find(p => p.id === productId);
    if (!prod) return;

    const orderQty = qty === null ? prod.minOrder : qty;

    const existingIdx = state.cart.findIndex(item => item.productId === productId);
    if (existingIdx > -1) {
      state.cart[existingIdx].qty += orderQty;
    } else {
      state.cart.push({ productId: productId, qty: orderQty });
    }

    saveState();
    showToast(`Added ${orderQty} pcs of ${prod.name} to cart.`, "success");
  };

  // 4. INVENTORY TABLE VIEW
  function renderInventory() {
    const container = document.getElementById("app-container");

    container.innerHTML = `
      <div class="inventory-container">
        <div class="section-title-wrapper" style="margin-bottom: 2rem;">
          <h2 class="section-title">Live Warehouse Inventory</h2>
          <p class="section-subtitle">Real-time stock level monitoring at our Faridabad works.</p>
        </div>

        <div class="inventory-header">
          <div class="inventory-search-row">
            <input type="text" class="inv-search-input" id="inv-search" placeholder="Search by SKU, Product Name, Grade, or Vehicle Compatibility...">
            <div class="inv-select" style="display:flex; align-items:center; background:#F8FAFC; border:1px solid var(--border-color); font-weight:600; font-size:0.9rem; padding:0 1rem; border-radius:var(--border-radius);">
              🏢 Faridabad Works Only
            </div>
            <select class="inv-select" id="inv-filter-status" style="margin-left:auto;">
              <option value="all">All Stock Statuses</option>
              <option value="instock">In Stock (>300 pcs)</option>
              <option value="lowstock">Low Stock (≤300 pcs)</option>
            </select>
          </div>
        </div>

        <div class="table-responsive">
          <table class="inventory-table">
            <thead>
              <tr>
                <th>Product Details</th>
                <th>Steel Grade</th>
                <th>Material</th>
                <th>Warehouse Stock Allocation</th>
                <th>Total Stock</th>
                <th>MOQ</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody id="inventory-table-body">
              <!-- Dynamic Rows -->
            </tbody>
          </table>
        </div>
      </div>
    `;

    drawInventoryRows();

    // Bind filters
    document.getElementById("inv-search")?.addEventListener("input", drawInventoryRows);
    document.getElementById("inv-filter-warehouse")?.addEventListener("change", drawInventoryRows);
    document.getElementById("inv-filter-status")?.addEventListener("change", drawInventoryRows);
  }

  const drawInventoryRows = () => {
    const body = document.getElementById("inventory-table-body");
    if (!body) return;

    const query = document.getElementById("inv-search")?.value.trim().toLowerCase() || "";
    const whFilter = document.getElementById("inv-filter-warehouse")?.value || "all";
    const statusFilter = document.getElementById("inv-filter-status")?.value || "all";

    let rowsHtml = "";
    let matchesFound = 0;

    db.products.forEach(p => {
      // Search matches
      const matchSearch = !query || 
        p.name.toLowerCase().includes(query) || 
        p.sku.toLowerCase().includes(query) ||
        p.grade.toLowerCase().includes(query) ||
        p.compatibility.some(c => c.toLowerCase().includes(query));

      // Stock allocation
      let totalAllocatedStock = 0;
      if (whFilter === "all") {
        totalAllocatedStock = Object.values(p.stockByWarehouse).reduce((a, b) => a + b, 0);
      } else {
        totalAllocatedStock = p.stockByWarehouse[whFilter] || 0;
      }

      // Status match
      const isInStock = totalAllocatedStock > 300;
      const matchStatus = statusFilter === "all" || 
        (statusFilter === "instock" && isInStock) ||
        (statusFilter === "lowstock" && !isInStock);

      if (matchSearch && matchStatus) {
        matchesFound++;
        const totalOverallStock = Object.values(p.stockByWarehouse).reduce((a, b) => a + b, 0);

        rowsHtml += `
          <tr>
            <td>
              <div class="inv-prod-cell">
                <img class="inv-prod-img" src="${p.image}" alt="${p.name}">
                <div class="inv-prod-info">
                  <span class="inv-prod-name"><a href="#/product/${p.id}">${p.name}</a></span>
                  <span class="inv-prod-sku">${p.sku} | ${p.thickness}</span>
                </div>
              </div>
            </td>
            <td><strong>${p.grade}</strong></td>
            <td>${p.material}</td>
            <td>
              <div style="font-size:0.9rem; font-weight:600; color:var(--primary-blue);">
                🏢 Faridabad Works
              </div>
            </td>
            <td class="stock-cell" data-id="${p.id}">
              <strong>${totalOverallStock} pcs</strong>
              <br><span style="font-size:0.75rem;color:var(--text-secondary)">Faridabad Works</span>
            </td>
            <td><strong style="color:var(--primary-red);">${p.minOrder} pcs</strong></td>
            <td class="status-cell" data-id="${p.id}">
              ${totalOverallStock > 300 
                ? `<span class="status-badge status-instock"><i class="fas fa-check-circle"></i> In Stock</span>`
                : `<span class="status-badge status-lowstock"><i class="fas fa-exclamation-triangle"></i> Low Stock</span>`}
            </td>
            <td>
              <div style="display:flex; gap:0.25rem;">
                <button class="btn btn-primary btn-sm btn-inv-add" data-id="${p.id}" title="Quick Add to Cart">
                  <i class="fas fa-plus"></i> Add
                </button>
              </div>
            </td>
          </tr>
        `;
      }
    });

    if (matchesFound === 0) {
      body.innerHTML = `<tr><td colspan="8" style="padding: 3rem; text-align: center; color: var(--text-secondary);">No inventory matches found. Try modifying filters.</td></tr>`;
      return;
    }

    body.innerHTML = rowsHtml;

    // Add list trigger
    body.querySelectorAll(".btn-inv-add").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-id");
        addToCart(id);
      });
    });
  };

  // 5. INDUSTRIES SERVED VIEW
  function renderIndustries() {
    const container = document.getElementById("app-container");
    let cardsHtml = "";
    db.industries.forEach(ind => {
      cardsHtml += `
        <div class="industry-card">
          <span class="industry-emoji">${ind.icon}</span>
          <h3>${ind.name}</h3>
          <p>${ind.desc}</p>
        </div>
      `;
    });

    container.innerHTML = `
      <div class="section" style="max-width:1100px; margin:0 auto; padding-top:4rem;">
        <div class="section-title-wrapper">
          <h2 class="section-title">Industries We Serve</h2>
          <p class="section-subtitle">Manufacturing reliable sheet metal solutions custom tailored for complex assembly grids across India.</p>
        </div>
        <div class="industries-grid">
          ${cardsHtml}
        </div>
      </div>
    `;
  }

  // 6. CLIENTS VIEW
  function renderClients() {
    const container = document.getElementById("app-container");
    let logosHtml = "";
    db.clients.forEach(c => {
      logosHtml += `
        <div class="client-logo-wrapper" title="${c.name}">
          <img src="${c.logo}" class="client-logo" alt="${c.name}">
        </div>
      `;
    });

    container.innerHTML = `
      <div class="section" style="max-width:1100px; margin:0 auto; padding-top:4rem;">
        <div class="section-title-wrapper">
          <h2 class="section-title">Our Valued Clients</h2>
          <p class="section-subtitle">Trusted by tier-1 automotive firms, parts distributors, and machinery manufacturing networks.</p>
        </div>
        <div class="clients-grid" style="margin-top:4rem;">
          ${logosHtml}
        </div>

        <div style="margin-top:5rem; background-color:var(--white); padding:3rem; border-radius:var(--border-radius-lg); border:1px solid var(--border-color); box-shadow:var(--shadow-sm);">
          <h3 style="font-size:1.5rem; text-align:center; margin-bottom:2rem;">Client Testimonials</h3>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:2rem;">
            <div style="border-left:4px solid var(--primary-blue); padding-left:1.5rem;">
              <p style="font-style:italic; font-size:0.95rem; color:var(--text-primary);">"Creative Industries has been our primary stampings vendor for over 5 years. Their stock updates are dependable, and deliveries are consistently on time for our assembly lines."</p>
              <h4 style="font-size:0.9rem; margin-top:1rem; color:var(--primary-blue);">- Head of Procurement, Moglix Industrial</h4>
            </div>
            <div style="border-left:4px solid var(--primary-red); padding-left:1.5rem;">
              <p style="font-style:italic; font-size:0.95rem; color:var(--text-primary);">"Outstanding material grade verification. The 1.2mm roof panels and structural brackets meet our precise tensile and coating standards without fail."</p>
              <h4 style="font-size:0.9rem; margin-top:1rem; color:var(--primary-red);">- Operations Lead, Maruti Suzuki Faridabad Vendor Node</h4>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // 7. CART VIEW
  function renderCart() {
    const container = document.getElementById("app-container");

    if (state.cart.length === 0) {
      container.innerHTML = `
        <div class="section" style="text-align:center; padding: 6rem 2rem;">
          <i class="fas fa-shopping-cart" style="font-size:4rem; color:var(--text-secondary); margin-bottom:1.5rem;"></i>
          <h2>Your Cart is Empty</h2>
          <p style="color:var(--text-secondary); margin-bottom:2rem;">Browse our product catalog to add components for quote checkout.</p>
          <a href="#/products" class="btn btn-primary">Browse Catalog</a>
        </div>
      `;
      return;
    }

    let itemsHtml = "";
    let subtotal = 0;

    state.cart.forEach((item, idx) => {
      const prod = db.products.find(p => p.id === item.productId);
      if (!prod) return;

      const itemTotal = prod.price * item.qty;
      subtotal += itemTotal;

      itemsHtml += `
        <div class="cart-item-row">
          <div class="cart-prod-meta">
            <img class="cart-prod-img" src="${prod.image}" alt="${prod.name}">
            <div>
              <h3 style="font-size:1.05rem; margin-bottom:0.25rem;"><a href="#/product/${prod.id}">${prod.name}</a></h3>
              <span style="font-size:0.75rem; color:var(--text-secondary);">SKU: ${prod.sku} | Thick: ${prod.thickness}</span>
              <br><button class="cart-remove-btn btn-sm" data-idx="${idx}" style="padding:0; margin-top:0.5rem; font-size:0.8rem;"><i class="fas fa-trash-alt"></i> Remove</button>
            </div>
          </div>

          <div style="font-weight:600; width:15%; text-align:right;">₹${prod.price.toLocaleString("en-IN")}</div>

          <div style="width:20%; display:flex; justify-content:center;">
            <div class="qty-selector">
              <button class="qty-btn btn-cart-qty-minus" data-idx="${idx}">-</button>
              <input type="number" class="qty-input cart-qty-val" data-idx="${idx}" value="${item.qty}" min="${prod.minOrder}">
              <button class="qty-btn btn-cart-qty-plus" data-idx="${idx}">+</button>
            </div>
          </div>

          <div style="font-weight:700; color:var(--primary-blue); width:20%; text-align:right; font-size:1.1rem;">₹${itemTotal.toLocaleString("en-IN")}</div>
        </div>
      `;
    });

    const gst = Math.round(subtotal * 0.18);
    const shipping = subtotal > 100000 ? 0 : 3500; // Free shipping over 1 Lakh
    const total = subtotal + gst + shipping;

    container.innerHTML = `
      <div class="section-title-wrapper" style="margin-top:3rem; margin-bottom:0;">
        <h2 class="section-title">Your Purchase Order Cart</h2>
        <p class="section-subtitle">Manage draft purchase orders, adjust sizes, and proceed to checkout under Net 30 or credit structures.</p>
      </div>

      <div class="cart-layout">
        <!-- List -->
        <div class="cart-table-wrapper">
          <div style="display:flex; justify-content:space-between; border-bottom:2px solid var(--border-color); padding-bottom:0.75rem; font-weight:700; color:var(--text-secondary); font-size:0.85rem; text-transform:uppercase;">
            <span style="width:45%;">Item Details</span>
            <span style="width:15%; text-align:right;">Unit Price</span>
            <span style="width:20%; text-align:center;">Qty</span>
            <span style="width:20%; text-align:right;">Total</span>
          </div>

          <div id="cart-items-container">
            ${itemsHtml}
          </div>
        </div>

        <!-- Summary -->
        <div class="cart-summary-box">
          <h3 style="font-size:1.25rem; border-bottom:1px solid var(--border-color); padding-bottom:1rem; margin-bottom:1.5rem;"><i class="fas fa-file-invoice"></i> Order Summary</h3>
          <div class="summary-row">
            <span>Subtotal</span>
            <strong>₹${subtotal.toLocaleString("en-IN")}</strong>
          </div>
          <div class="summary-row">
            <span>GST (18%)</span>
            <strong>₹${gst.toLocaleString("en-IN")}</strong>
          </div>
          <div class="summary-row">
            <span>Est. Shipping & Freight</span>
            <strong>${shipping === 0 ? '<span style="color:#15803D">FREE</span>' : `₹${shipping.toLocaleString("en-IN")}`}</strong>
          </div>
          
          <div class="summary-row summary-total">
            <span>Grand Total</span>
            <span>₹${total.toLocaleString("en-IN")}</span>
          </div>

          <div style="margin-top:2rem; display:flex; flex-direction:column; gap:0.75rem;">
            <a href="#/checkout" class="btn btn-primary" style="width:100%;"><i class="fas fa-credit-card"></i> Proceed to Checkout</a>
            <a href="#/products" class="btn btn-outline" style="width:100%; border-color:var(--border-color); color:var(--text-primary);"><i class="fas fa-arrow-left"></i> Continue Shopping</a>
          </div>
        </div>
      </div>

      <!-- Placed Purchase Orders (Active Tracking) Section -->
      <div style="max-width:1400px; margin: 3rem auto 0; padding: 2rem; background-color: var(--white); border-radius: var(--border-radius-lg); border: 1px solid var(--border-color); box-shadow: var(--shadow-sm); grid-column: 1 / -1;">
        <h3 style="font-size:1.35rem; margin-bottom:1.5rem; border-bottom:1px solid var(--border-color); padding-bottom:0.75rem; color:var(--primary-blue)">
          <i class="fas fa-receipt"></i> Your Placed Purchase Orders (Live Tracking)
        </h3>
        ${state.orders.length === 0 ? `
          <p style="color:var(--text-secondary); text-align:center; padding:1.5rem;">No purchase orders placed yet.</p>
        ` : `
          <div class="table-responsive" style="box-shadow:none; border:none; border-radius:0;">
            <table style="width:100%; border-collapse:collapse; text-align:left; font-size:0.9rem;">
              <thead>
                <tr style="background-color:var(--light-gray); border-bottom:2px solid var(--border-color);">
                  <th style="padding:0.75rem 1rem;">Order ID</th>
                  <th style="padding:0.75rem 1rem;">Date</th>
                  <th style="padding:0.75rem 1rem;">Items Summary</th>
                  <th style="padding:0.75rem 1rem;">Total Value</th>
                  <th style="padding:0.75rem 1rem;">Shipment Status</th>
                  <th style="padding:0.75rem 1rem; text-align:center;">Action</th>
                </tr>
              </thead>
              <tbody>
                ${state.orders.map(o => `
                  <tr style="border-bottom:1px solid var(--border-color);">
                    <td style="padding:0.75rem 1rem; font-weight:700; color:var(--primary-blue);">${o.id}</td>
                    <td style="padding:0.75rem 1rem;">${o.date}</td>
                    <td style="padding:0.75rem 1rem; font-size:0.8rem; line-height:1.3;">
                      ${o.items.map(item => `${item.name} (x${item.qty})`).join(", ")}
                    </td>
                    <td style="padding:0.75rem 1rem; font-weight:600;">₹${o.total.toLocaleString("en-IN")}</td>
                    <td style="padding:0.75rem 1rem;">
                      <span style="font-size:0.75rem; font-weight:700; padding:0.15rem 0.5rem; border-radius:30px; 
                        background-color:${o.status === 'Delivered' ? '#DCFCE7' : o.status === 'Dispatched' ? '#E0F2FE' : '#FEF3C7'};
                        color:${o.status === 'Delivered' ? '#15803D' : o.status === 'Dispatched' ? '#0369A1' : '#B45309'};">
                        ${o.status}
                      </span>
                    </td>
                    <td style="padding:0.75rem 1rem; text-align:center;">
                      <a href="#/track?id=${o.id}" class="btn btn-primary btn-sm" style="padding:0.25rem 0.6rem; font-size:0.75rem;">
                        <i class="fas fa-map-marker-alt"></i> Track
                      </a>
                    </td>
                  </tr>
                `).join("")}
              </tbody>
            </table>
          </div>
        `}
      </div>
    `;

    // Bind cart element listeners
    document.querySelectorAll(".cart-remove-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const idx = parseInt(btn.getAttribute("data-idx"), 10);
        state.cart.splice(idx, 1);
        saveState();
        showToast("Item removed from cart.", "info");
        renderCart();
      });
    });

    document.querySelectorAll(".btn-cart-qty-minus").forEach(btn => {
      btn.addEventListener("click", () => {
        const idx = parseInt(btn.getAttribute("data-idx"), 10);
        const item = state.cart[idx];
        const prod = db.products.find(p => p.id === item.productId);
        if (item.qty > prod.minOrder) {
          item.qty--;
          saveState();
          renderCart();
        } else {
          showToast(`Cannot order less than MOQ (${prod.minOrder} pcs) for ${prod.name}`, "error");
        }
      });
    });

    document.querySelectorAll(".btn-cart-qty-plus").forEach(btn => {
      btn.addEventListener("click", () => {
        const idx = parseInt(btn.getAttribute("data-idx"), 10);
        state.cart[idx].qty++;
        saveState();
        renderCart();
      });
    });

    document.querySelectorAll(".cart-qty-val").forEach(input => {
      input.addEventListener("change", () => {
        const idx = parseInt(input.getAttribute("data-idx"), 10);
        const item = state.cart[idx];
        const prod = db.products.find(p => p.id === item.productId);
        const val = parseInt(input.value, 10);

        if (isNaN(val) || val < prod.minOrder) {
          item.qty = prod.minOrder;
          showToast(`Order quantity reset to MOQ (${prod.minOrder} pcs) for ${prod.name}`, "error");
        } else {
          item.qty = val;
        }
        saveState();
        renderCart();
      });
    });
  }

  // 8. CHECKOUT VIEW
  function renderCheckout() {
    const container = document.getElementById("app-container");

    if (state.cart.length === 0) {
      window.location.hash = "#/cart";
      return;
    }

    let subtotal = 0;
    let orderSummaryRows = "";
    state.cart.forEach(item => {
      const prod = db.products.find(p => p.id === item.productId);
      if (!prod) return;
      subtotal += prod.price * item.qty;
      orderSummaryRows += `
        <div style="display:flex; justify-content:space-between; margin-bottom:0.75rem; font-size:0.9rem;">
          <span style="color:var(--text-secondary); max-width:70%;">${prod.name} (x${item.qty})</span>
          <strong>₹${(prod.price * item.qty).toLocaleString("en-IN")}</strong>
        </div>
      `;
    });

    const gst = Math.round(subtotal * 0.18);
    const shipping = subtotal > 100000 ? 0 : 3500;
    const total = subtotal + gst + shipping;

    // Delivery calculation: max delivery time among products
    let deliveryDays = 3;
    state.cart.forEach(item => {
      const prod = db.products.find(p => p.id === item.productId);
      if (!prod) return;
      const days = parseInt(prod.deliveryTime, 10);
      if (days > deliveryDays) deliveryDays = days;
    });

    const expectedDate = new Date();
    expectedDate.setDate(expectedDate.getDate() + deliveryDays);
    const dateString = expectedDate.toLocaleDateString("en-IN", { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    container.innerHTML = `
      <div class="checkout-layout">
        <!-- Billing Details Form -->
        <div style="background-color:var(--white); padding:2.5rem; border-radius:var(--border-radius-lg); border:1px solid var(--border-color); box-shadow:var(--shadow-sm);">
          <h3 style="font-size:1.5rem; border-bottom:1px solid var(--border-color); padding-bottom:1rem; margin-bottom:1.5rem;"><i class="fas fa-building"></i> Commercial Billing & Shipping</h3>
          <form id="checkout-form">
            <div class="form-group">
              <label for="checkout-company">Company Name *</label>
              <input type="text" class="form-control" id="checkout-company" value="${state.user.companyName}" required>
            </div>

            <div class="form-group">
              <label for="checkout-gst">GSTIN Number (15-Digit) *</label>
              <input type="text" class="form-control" id="checkout-gst" value="${state.user.gstNumber}" pattern="^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$" placeholder="e.g., 07AAAAA1111A1Z1" required>
              <small style="color:var(--text-secondary);">Required for legal B2B tax invoice credit.</small>
            </div>

            <div class="form-group">
              <label for="checkout-person">Contact Person *</label>
              <input type="text" class="form-control" id="checkout-person" value="${state.user.contactPerson}" required>
            </div>

            <div style="display:grid; grid-template-columns:1fr 1fr; gap:1rem;">
              <div class="form-group">
                <label for="checkout-phone">Phone *</label>
                <input type="tel" class="form-control" id="checkout-phone" value="${state.user.phone}" required>
              </div>
              <div class="form-group">
                <label for="checkout-email">Email Address *</label>
                <input type="email" class="form-control" id="checkout-email" value="${state.user.email}" required>
              </div>
            </div>

            <div class="form-group">
              <label for="checkout-address">Delivery Address *</label>
              <textarea class="form-control" id="checkout-address" rows="3" required>${state.user.address}</textarea>
            </div>

            <div class="form-group">
              <label>Expected Dispatch Date</label>
              <div style="background-color:var(--accent-light); padding:0.75rem; border-radius:var(--border-radius); border:1px solid #BFDBFE; font-weight:600; color:var(--primary-blue); font-size:0.9rem;">
                <i class="fas fa-calendar-alt"></i> ${dateString} (${deliveryDays} Days SLA)
              </div>
            </div>
          </form>
        </div>

        <!-- Payment and Review Summary -->
        <div style="display:flex; flex-direction:column; gap:2rem;">
          <!-- Payment Selection -->
          <div style="background-color:var(--white); padding:2.5rem; border-radius:var(--border-radius-lg); border:1px solid var(--border-color); box-shadow:var(--shadow-sm);">
            <h3 style="font-size:1.35rem; border-bottom:1px solid var(--border-color); padding-bottom:1rem; margin-bottom:1.5rem;"><i class="fas fa-wallet"></i> B2B Payment Method</h3>
            <div class="radio-group">
              <label class="radio-label">
                <input type="radio" name="checkout-payment" value="Net 30" checked>
                <div>
                  <strong>Net 30 Credit Terms</strong><br>
                  <span style="font-size:0.8rem; color:var(--text-secondary);">30 days repayment terms for verified industrial clients.</span>
                </div>
              </label>
              <label class="radio-label">
                <input type="radio" name="checkout-payment" value="Bank Transfer">
                <div>
                  <strong>Direct NEFT / RTGS Bank Transfer</strong><br>
                  <span style="font-size:0.8rem; color:var(--text-secondary);">Confirm order and receive proforma invoice for transfer.</span>
                </div>
              </label>
              <label class="radio-label">
                <input type="radio" name="checkout-payment" value="UPI">
                <div>
                  <strong>Immediate UPI Business</strong><br>
                  <span style="font-size:0.8rem; color:var(--text-secondary);">Fastest clearance via corporate UPI scanner.</span>
                </div>
              </label>
              <label class="radio-label">
                <input type="radio" name="checkout-payment" value="Cash on Delivery (Bulk)">
                <div>
                  <strong>Cash on Delivery (Bulk Logistic)</strong><br>
                  <span style="font-size:0.8rem; color:var(--text-secondary);">Pay logistics partner on physical cargo arrival at your plant.</span>
                </div>
              </label>
            </div>
          </div>

          <!-- Checkout Summary -->
          <div style="background-color:var(--white); padding:2rem; border-radius:var(--border-radius-lg); border:1px solid var(--border-color); box-shadow:var(--shadow-sm);">
            <h3 style="font-size:1.25rem; margin-bottom:1.5rem; border-bottom:1px solid var(--border-color); padding-bottom:0.75rem;"><i class="fas fa-list-alt"></i> Purchase Review</h3>
            ${orderSummaryRows}
            <div style="border-top:1px solid var(--border-color); padding-top:1rem; margin-top:1rem; display:flex; flex-direction:column; gap:0.5rem;">
              <div class="summary-row" style="margin-bottom:0;">
                <span>Subtotal</span>
                <span>₹${subtotal.toLocaleString("en-IN")}</span>
              </div>
              <div class="summary-row" style="margin-bottom:0;">
                <span>GST (18%)</span>
                <span>₹${gst.toLocaleString("en-IN")}</span>
              </div>
              <div class="summary-row" style="margin-bottom:0;">
                <span>Freight Logistics Charge</span>
                <span>${shipping === 0 ? '<span style="color:#15803D">FREE</span>' : `₹${shipping.toLocaleString("en-IN")}`}</span>
              </div>
              <div class="summary-row summary-total" style="margin-top:0.5rem; padding-top:0.75rem;">
                <span>Grand Total</span>
                <span>₹${total.toLocaleString("en-IN")}</span>
              </div>
            </div>

            <button type="submit" form="checkout-form" class="btn btn-primary" style="width:100%; margin-top:1.5rem; font-size:1.1rem;">
              <i class="fas fa-check-double"></i> Confirm Purchase Order
            </button>
          </div>
        </div>
      </div>
    `;

    // Process Form Submit
    const form = document.getElementById("checkout-form");
    form?.addEventListener("submit", (e) => {
      e.preventDefault();

      // Gather form entries
      const company = document.getElementById("checkout-company").value;
      const gstVal = document.getElementById("checkout-gst").value;
      const person = document.getElementById("checkout-person").value;
      const phone = document.getElementById("checkout-phone").value;
      const email = document.getElementById("checkout-email").value;
      const address = document.getElementById("checkout-address").value;
      const paymentVal = document.querySelector('input[name="checkout-payment"]:checked').value;

      // Update cached user profile data
      state.user = {
        companyName: company,
        gstNumber: gstVal,
        contactPerson: person,
        phone: phone,
        email: email,
        address: address
      };

      // Create new Order ID
      const newOrderId = "ORD-" + Math.floor(10000 + Math.random() * 90000);
      const today = new Date().toISOString().split("T")[0];

      const newOrder = {
        id: newOrderId,
        date: today,
        company: company,
        gst: gstVal,
        items: state.cart.map(item => {
          const prod = db.products.find(p => p.id === item.productId);
          return {
            productId: item.productId,
            name: prod.name,
            qty: item.qty,
            price: prod.price
          };
        }),
        subtotal: subtotal,
        gstAmount: gst,
        shipping: shipping,
        total: total,
        payment: paymentVal,
        status: "Processing",
        address: address
      };

      // Push to state orders, save, and wipe cart
      state.orders.unshift(newOrder);
      state.cart = [];
      saveState();

      showToast("Order placed successfully!", "success");

      // Redirect to Confirmation page
      window.location.hash = `#/confirmation/${newOrderId}`;
    });
  }

  // 9. ORDER CONFIRMATION VIEW
  function renderConfirmation(params) {
    const orderId = params.id;
    const order = state.orders.find(o => o.id === orderId);
    const container = document.getElementById("app-container");

    if (!order) {
      container.innerHTML = `<div class="section" style="text-align:center;"><h2>Order Not Found</h2><a href="#/" class="btn btn-primary">Return Home</a></div>`;
      return;
    }

    container.innerHTML = `
      <div class="confirmation-container">
        <div class="success-icon">
          <i class="fas fa-check"></i>
        </div>
        <h1 style="font-size:2.2rem; color:var(--primary-blue);">Order Confirmed!</h1>
        <p style="color:var(--text-secondary); margin-top:0.5rem; font-size:1.05rem;">We have received your purchase order and sent a confirmation details to <strong>${state.user.email}</strong>.</p>

        <div class="confirm-details-box">
          <div class="confirm-row">
            <span>Order ID</span>
            <strong>${order.id}</strong>
          </div>
          <div class="confirm-row">
            <span>Order Date</span>
            <strong>${order.date}</strong>
          </div>
          <div class="confirm-row">
            <span>GST Number</span>
            <strong>${order.gst}</strong>
          </div>
          <div class="confirm-row">
            <span>Payment Method</span>
            <strong>${order.payment}</strong>
          </div>
          <div class="confirm-row">
            <span>Estimated Delivery</span>
            <strong style="color:var(--primary-blue);"><i class="fas fa-truck"></i> 3-5 Days SLA</strong>
          </div>
          <div class="confirm-row" style="border-top:1px solid var(--border-color); padding-top:0.75rem; margin-top:0.75rem;">
            <span>Grand Total (Incl. Tax)</span>
            <strong style="color:var(--primary-blue); font-size:1.15rem;">₹${order.total.toLocaleString("en-IN")}</strong>
          </div>
        </div>

        <div style="display:flex; gap:1rem; flex-wrap:wrap; justify-content:center;">
          <button class="btn btn-primary" id="btn-download-invoice"><i class="fas fa-file-download"></i> Download Invoice PDF</button>
          <a href="#/track?id=${order.id}" class="btn btn-dark"><i class="fas fa-map-marker-alt"></i> Track Shipment</a>
          <a href="#/products" class="btn btn-outline" style="border-color:var(--border-color); color:var(--text-primary);">Continue Shopping</a>
        </div>
      </div>
    `;

    document.getElementById("btn-download-invoice")?.addEventListener("click", () => {
      generateInvoicePDF(order);
    });
  }

  // 10. TRACK ORDER VIEW
  function renderTrack() {
    const container = document.getElementById("app-container");
    
    // Parse query params if any
    const hash = window.location.hash;
    const urlParams = new URLSearchParams(hash.includes("?") ? hash.substring(hash.indexOf("?")) : "");
    const searchId = urlParams.get("id") || "";

    container.innerHTML = `
      <div class="track-container">
        <h2 style="font-size:1.75rem; margin-bottom:1.5rem; text-align:center;"><i class="fas fa-shipping-fast" style="color:var(--primary-blue)"></i> Track Purchase Order Shipment</h2>
        <div class="track-search-box">
          <input type="text" class="form-control" id="track-input-id" placeholder="Enter Order ID (e.g. ORD-92837) or Phone Number..." value="${searchId}">
          <button class="btn btn-primary" id="btn-track-submit">Track</button>
        </div>

        <div id="track-results-container">
          <!-- Timelines drawn dynamically -->
        </div>
      </div>
    `;

    if (searchId) {
      performTracking(searchId);
    }

    document.getElementById("btn-track-submit")?.addEventListener("click", () => {
      const val = document.getElementById("track-input-id").value.trim();
      if (!val) {
        showToast("Please enter a valid Order ID or Phone Number", "error");
        return;
      }
      // Update hash without triggering reload, just execute
      window.location.hash = `#/track?id=${val}`;
    });
  }

  const performTracking = (query) => {
    const resultsBox = document.getElementById("track-results-container");
    if (!resultsBox) return;

    // Filter orders match by ID or Phone
    const matched = state.orders.filter(o => 
      o.id.toLowerCase() === query.toLowerCase() || 
      state.user.phone.replace(/\s+/g, '') === query.replace(/\s+/g, '')
    );

    if (matched.length === 0) {
      resultsBox.innerHTML = `
        <div style="padding:2rem; text-align:center; background-color:var(--light-gray); border-radius:var(--border-radius); border:1px solid var(--border-color);">
          <i class="fas fa-search-minus" style="font-size:2.5rem; color:var(--text-secondary); margin-bottom:1rem;"></i>
          <h4>No active shipments found.</h4>
          <p style="color:var(--text-secondary); font-size:0.85rem; margin-top:0.25rem;">Double check the Order ID (e.g. ORD-XXXXX) or ensure the contact number matches the profile.</p>
        </div>
      `;
      return;
    }

    let searchResultsHtml = "";

    matched.forEach(order => {
      // Establish status indices
      const statuses = ["Order Received", "Processing", "Packed", "Dispatched", "In Transit", "Delivered"];
      const currentStatusIdx = statuses.indexOf(order.status);

      let stepsHtml = "";
      statuses.forEach((status, idx) => {
        let stepClass = "";
        let iconHtml = '<i class="fas fa-circle" style="font-size:0.5rem; color:var(--text-secondary)"></i>';

        if (idx < currentStatusIdx) {
          stepClass = "completed";
          iconHtml = '<i class="fas fa-check" style="font-size:0.65rem; color:var(--white)"></i>';
        } else if (idx === currentStatusIdx) {
          stepClass = "active";
          iconHtml = '<i class="fas fa-truck-loading" style="font-size:0.65rem; color:var(--white)"></i>';
        }

        // Generate date offsets relative to order date
        const baseDate = new Date(order.date);
        baseDate.setDate(baseDate.getDate() + idx);
        const dateString = idx <= currentStatusIdx ? baseDate.toLocaleDateString("en-IN", { month: 'short', day: 'numeric', year: 'numeric' }) : "--";

        stepsHtml += `
          <div class="timeline-step ${stepClass}">
            <div class="timeline-icon">${iconHtml}</div>
            <div class="timeline-info">
              <span class="timeline-title">${status}</span>
              <span class="timeline-date">${dateString}</span>
            </div>
          </div>
        `;
      });

      searchResultsHtml += `
        <div style="border:1px solid var(--border-color); border-radius:var(--border-radius-lg); padding:2rem; margin-bottom:2rem; background-color:var(--white); box-shadow:var(--shadow-sm);">
          <div style="display:flex; justify-content:space-between; border-bottom:1px solid var(--border-color); padding-bottom:1rem; margin-bottom:1.5rem; flex-wrap:wrap; gap:0.5rem;">
            <div>
              <span style="font-size:0.8rem; text-transform:uppercase; font-weight:700; color:var(--text-secondary)">Order Reference</span>
              <h3 style="font-size:1.25rem; color:var(--primary-blue);">${order.id}</h3>
            </div>
            <div style="text-align:right;">
              <span style="font-size:0.8rem; text-transform:uppercase; font-weight:700; color:var(--text-secondary)">Current Status</span>
              <h3 style="font-size:1.1rem; color:#15803D;">${order.status}</h3>
            </div>
          </div>

          <div style="margin-bottom:1.5rem; font-size:0.9rem;">
            <strong>Consigned To:</strong> ${order.company}<br>
            <strong>Destination Address:</strong> ${order.address}<br>
            <strong>Repayment Plan:</strong> ${order.payment} terms
          </div>

          <div class="timeline">
            ${stepsHtml}
          </div>
        </div>
      `;
    });

    resultsBox.innerHTML = searchResultsHtml;
  };

  // 11. ABOUT US VIEW
  function renderAbout() {
    const container = document.getElementById("app-container");
    container.innerHTML = `
      <section class="about-header-banner">
        <h1>About Creative Industries</h1>
        <p style="max-width:600px; margin:0.5rem auto 0; font-size:1.1rem; opacity:0.9;">Precision Engineering & Sheet Metal Pressings since 2011.</p>
      </section>

      <section class="about-content-section">
        <p style="margin-bottom:1.5rem;">Creative Industries has been delivering premium automotive sheet metal spare parts to manufacturers, workshops, and distributors across India. Our extensive inventory, strict quality standards, and efficient supply chain enable us to serve OEMs and aftermarket clients with dependable products and timely deliveries.</p>
        <p style="margin-bottom:1.5rem;">Operating out of our core facility MCF-10659, Gali No. 34, Sanjay Colony, Sector-23, Faridabad, Haryana, we deploy high-speed progressive metal stamping presses, state-of-the-art fiber laser cutting tools, and automated welding cells. We verify our raw steel coils (primarily CR3, CR4, and HSS Grades) to certify tensile strength, ensuring aftermarket repair panels that retain exact crash absorption profiles.</p>
        
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:2rem; margin-top:3rem;">
          <div style="background-color:var(--white); border:1px solid var(--border-color); padding:2rem; border-radius:var(--border-radius-lg); box-shadow:var(--shadow-sm);">
            <h3 style="color:var(--primary-blue); margin-bottom:0.75rem;"><i class="fas fa-bullseye"></i> Our Mission</h3>
            <p style="font-size:0.95rem; color:var(--text-secondary);">To engineer high-integrity components conforming to strict ISO limits while upholding rapid 24-hour RFQ SLAs to keep production schedules running smooth.</p>
          </div>
          <div style="background-color:var(--white); border:1px solid var(--border-color); padding:2rem; border-radius:var(--border-radius-lg); box-shadow:var(--shadow-sm);">
            <h3 style="color:var(--primary-red); margin-bottom:0.75rem;"><i class="fas fa-eye"></i> Our Vision</h3>
            <p style="font-size:0.95rem; color:var(--text-secondary);">To establish India's largest micro-logistics depot network for stamping spares, matching tier-1 assembly limits with accessible pricing.</p>
          </div>
        </div>
      </section>
    `;
  }

  // 12. CONTACT US VIEW
  function renderContact() {
    const container = document.getElementById("app-container");

    container.innerHTML = `
      <div class="section-title-wrapper" style="margin-top:3rem; margin-bottom:1rem;">
        <h2 class="section-title">Contact Us</h2>
        <p class="section-subtitle">Reach out to our main office in Sanjay Colony, Faridabad, or send an instant message for custom fabrication quotes.</p>
      </div>

      <div class="contact-layout">
        <!-- Info Panel -->
        <div class="contact-info-panel">
          <div class="contact-item">
            <div class="contact-icon"><i class="fas fa-map-marker-alt"></i></div>
            <div>
              <h3>Office & Works Address</h3>
              <p style="color:var(--text-secondary); margin-top:0.25rem;">
                Creative Industries<br>
                MCF-10659, Gali No. 34<br>
                Sanjay Colony, Sector-23, Faridabad<br>
                Haryana, India - 121005
              </p>
            </div>
          </div>

          <div class="contact-item">
            <div class="contact-icon"><i class="fas fa-phone-alt"></i></div>
            <div>
              <h3>Phone Contacts</h3>
              <p style="color:var(--text-secondary); margin-top:0.25rem;">
                +91 9650577466 (Mobile)<br>
                Proprietor: Osman
              </p>
            </div>
          </div>

          <div class="contact-item">
            <div class="contact-icon"><i class="fas fa-envelope"></i></div>
            <div>
              <h3>Email Queries</h3>
              <p style="color:var(--text-secondary); margin-top:0.25rem;">
                <a href="mailto:creativeindustries1010@gmail.com" style="color:var(--primary-blue); font-weight:600;">creativeindustries1010@gmail.com</a>
              </p>
            </div>
          </div>

          <div class="contact-item">
            <div class="contact-icon"><i class="fas fa-clock"></i></div>
            <div>
              <h3>Business Hours</h3>
              <p style="color:var(--text-secondary); margin-top:0.25rem;">
                Monday – Saturday: 9:00 AM – 6:00 PM<br>
                Sunday: Closed
              </p>
            </div>
          </div>

          <!-- Maps embed -->
          <div class="google-map-wrapper">
            <iframe src="https://maps.google.com/maps?q=MCF-10659%20Gali%20No.%2034%20Sanjay%20Colony%20Sector%2023%20Faridabad&t=&z=14&ie=UTF8&iwloc=&output=embed" width="100%" height="100%" style="border:0;" allowfullscreen="" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>
          </div>
        </div>

        <!-- Form Panel -->
        <div style="background-color:var(--white); padding:3rem; border-radius:var(--border-radius-lg); border:1px solid var(--border-color); box-shadow:var(--shadow-sm); height:fit-content;">
          <h3 style="font-size:1.35rem; margin-bottom:1.5rem;"><i class="fas fa-paper-plane" style="color:var(--primary-blue)"></i> Direct Inquiry Form</h3>
          <form id="contact-form-el">
            <div class="form-group">
              <label for="contact-name">Your Name *</label>
              <input type="text" class="form-control" id="contact-name" placeholder="John Doe" required>
            </div>
            <div class="form-group">
              <label for="contact-company">Company Name</label>
              <input type="text" class="form-control" id="contact-company" placeholder="Auto Parts Ltd.">
            </div>
            <div class="form-group">
              <label for="contact-email">Email Address *</label>
              <input type="email" class="form-control" id="contact-email" placeholder="john@example.com" required>
            </div>
            <div class="form-group">
              <label for="contact-phone">Phone Number *</label>
              <input type="tel" class="form-control" id="contact-phone" placeholder="+91 99999 88888" required>
            </div>
            <div class="form-group">
              <label for="contact-msg">Message *</label>
              <textarea class="form-control" id="contact-msg" rows="4" placeholder="Enter your detailed query here..." required></textarea>
            </div>
            <button type="submit" class="btn btn-primary" style="width:100%; margin-top:1rem;"><i class="fas fa-paper-plane"></i> Send Inquiry</button>
          </form>
        </div>
      </div>
    `;

    document.getElementById("contact-form-el")?.addEventListener("submit", (e) => {
      e.preventDefault();
      showToast("Your inquiry has been received! Our sales engineer will email you within 24 hours.", "success");
      document.getElementById("contact-form-el").reset();
    });
  }

  // 13. CUSTOMER DASHBOARD VIEW
  function renderDashboard() {
    const container = document.getElementById("app-container");

    let orderRows = "";
    state.orders.forEach(o => {
      orderRows += `
        <tr style="border-bottom: 1px solid var(--border-color);">
          <td style="padding:1rem; font-weight:700; color:var(--primary-blue);">${o.id}</td>
          <td style="padding:1rem;">${o.date}</td>
          <td style="padding:1rem;">
            <div style="font-size:0.8rem;">
              ${o.items.map(item => `${item.name} (x${item.qty})`).join("<br>")}
            </div>
          </td>
          <td style="padding:1rem; font-weight:600;">₹${o.total.toLocaleString("en-IN")}</td>
          <td style="padding:1rem;">
            <span style="font-size:0.75rem; font-weight:700; padding:0.2rem 0.5rem; border-radius:30px; 
              background-color:${o.status === 'Delivered' ? '#DCFCE7' : o.status === 'Dispatched' ? '#E0F2FE' : '#FEF3C7'};
              color:${o.status === 'Delivered' ? '#15803D' : o.status === 'Dispatched' ? '#0369A1' : '#B45309'};">
              ${o.status}
            </span>
          </td>
          <td style="padding:1rem; display:flex; gap:0.25rem;">
            <button class="btn btn-outline btn-sm btn-reorder" data-id="${o.id}" title="Reorder Items"><i class="fas fa-redo"></i> Reorder</button>
            <button class="btn btn-secondary btn-sm btn-dash-invoice" data-id="${o.id}" style="color:var(--text-primary)"><i class="fas fa-file-download"></i></button>
          </td>
        </tr>
      `;
    });

    container.innerHTML = `
      <div class="dashboard-layout">
        <!-- Sidebar -->
        <aside class="dashboard-sidebar">
          <div style="text-align:center; padding-bottom:1.5rem; border-bottom:1px solid var(--border-color); margin-bottom:1.5rem;">
            <div style="width:60px; height:60px; border-radius:50%; background-color:var(--primary-blue); color:var(--white); font-weight:800; font-size:1.75rem; display:flex; align-items:center; justify-content:center; margin:0 auto 1rem;">
              ${state.user.contactPerson.charAt(0)}
            </div>
            <h3 style="font-size:1.15rem; color:var(--dark-gray);">${state.user.contactPerson}</h3>
            <span style="font-size:0.75rem; color:var(--text-secondary); font-weight:600;">${state.user.companyName}</span>
          </div>

          <div class="dashboard-nav-item active"><i class="fas fa-history"></i> Purchase Order History</div>
          <div class="dashboard-nav-item" id="btn-dash-edit-profile"><i class="fas fa-user-edit"></i> Edit Business Profile</div>
          <div class="dashboard-nav-item" id="btn-dash-logout" style="margin-top:2rem; color:var(--primary-red);"><i class="fas fa-sign-out-alt"></i> Reset Workspace</div>
        </aside>

        <!-- Main Content Panel -->
        <div class="dashboard-content">
          <h2 style="font-size:1.5rem; margin-bottom:1.5rem; border-bottom:1px solid var(--border-color); padding-bottom:0.75rem;"><i class="fas fa-file-invoice-dollar" style="color:var(--primary-blue);"></i> Active Purchase Orders</h2>

          <div class="table-responsive" style="box-shadow:none; border-radius:0;">
            <table style="width:100%; border-collapse:collapse; text-align:left; font-size:0.9rem;">
              <thead>
                <tr style="background-color:var(--light-gray); border-bottom:2px solid var(--border-color);">
                  <th style="padding:1rem;">Order ID</th>
                  <th style="padding:1rem;">Date</th>
                  <th style="padding:1rem;">Items</th>
                  <th style="padding:1rem;">Total Value</th>
                  <th style="padding:1rem;">Shipment Status</th>
                  <th style="padding:1rem;">Actions</th>
                </tr>
              </thead>
              <tbody>
                ${orderRows}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    // Reorder actions
    container.querySelectorAll(".btn-reorder").forEach(btn => {
      btn.addEventListener("click", () => {
        const orderId = btn.getAttribute("data-id");
        const order = state.orders.find(o => o.id === orderId);
        if (!order) return;

        // Add all order items to cart
        order.items.forEach(oItem => {
          const cartItem = state.cart.find(ci => ci.productId === oItem.productId);
          if (cartItem) {
            cartItem.qty += oItem.qty;
          } else {
            state.cart.push({ productId: oItem.productId, qty: oItem.qty });
          }
        });

        saveState();
        showToast("Previous order items added to cart!", "success");
        window.location.hash = "#/cart";
      });
    });

    // Invoice download trigger
    container.querySelectorAll(".btn-dash-invoice").forEach(btn => {
      btn.addEventListener("click", () => {
        const orderId = btn.getAttribute("data-id");
        const order = state.orders.find(o => o.id === orderId);
        if (order) generateInvoicePDF(order);
      });
    });

    // Logout / Reset trigger
    document.getElementById("btn-dash-logout")?.addEventListener("click", () => {
      if (confirm("This will clear your local cart, wishlist, and custom order history logs. Proceed?")) {
        localStorage.clear();
        showToast("Storage flushed. Reloading...", "info");
        setTimeout(() => window.location.reload(), 1000);
      }
    });

    // Edit profile trigger
    document.getElementById("btn-dash-edit-profile")?.addEventListener("click", () => {
      openProfileEditModal();
    });
  }

  // Edit profile Modal helper
  const openProfileEditModal = () => {
    const overlay = document.getElementById("modal-overlay");
    if (!overlay) return;

    const box = overlay.querySelector(".modal-box");
    if (!box) return;

    box.innerHTML = `
      <div class="modal-header">
        <h3><i class="fas fa-edit"></i> Edit Business Profile</h3>
        <button class="modal-close"><i class="fas fa-times"></i></button>
      </div>
      <div class="modal-body">
        <form id="profile-edit-form">
          <div class="form-group">
            <label>Company Name</label>
            <input type="text" class="form-control" id="edit-comp-name" value="${state.user.companyName}" required>
          </div>
          <div class="form-group">
            <label>GSTIN Number</label>
            <input type="text" class="form-control" id="edit-comp-gst" value="${state.user.gstNumber}" pattern="^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$" required>
          </div>
          <div class="form-group">
            <label>Contact Person</label>
            <input type="text" class="form-control" id="edit-comp-person" value="${state.user.contactPerson}" required>
          </div>
          <div class="form-group">
            <label>Phone Number</label>
            <input type="tel" class="form-control" id="edit-comp-phone" value="${state.user.phone}" required>
          </div>
          <div class="form-group">
            <label>Email Address</label>
            <input type="email" class="form-control" id="edit-comp-email" value="${state.user.email}" required>
          </div>
          <div class="form-group">
            <label>Address</label>
            <textarea class="form-control" id="edit-comp-address" rows="3" required>${state.user.address}</textarea>
          </div>
          <button type="submit" class="btn btn-primary" style="width:100%; margin-top:1rem;">Save Profile Settings</button>
        </form>
      </div>
    `;

    overlay.classList.add("active");

    overlay.querySelector(".modal-close")?.addEventListener("click", () => {
      overlay.classList.remove("active");
    });

    document.getElementById("profile-edit-form")?.addEventListener("submit", (e) => {
      e.preventDefault();
      state.user = {
        companyName: document.getElementById("edit-comp-name").value,
        gstNumber: document.getElementById("edit-comp-gst").value,
        contactPerson: document.getElementById("edit-comp-person").value,
        phone: document.getElementById("edit-comp-phone").value,
        email: document.getElementById("edit-comp-email").value,
        address: document.getElementById("edit-comp-address").value
      };
      saveState();
      overlay.classList.remove("active");
      showToast("Business profile updated successfully!", "success");
      renderDashboard();
    });
  };

  // --- FLOATING RFQ MODAL ---
  const openRfqModal = (prefilledProductId = "") => {
    const overlay = document.getElementById("modal-overlay");
    if (!overlay) return;

    const box = overlay.querySelector(".modal-box");
    if (!box) return;

    let itemsOptions = "";
    db.products.forEach(p => {
      const selected = p.id === prefilledProductId ? "selected" : "";
      itemsOptions += `<option value="${p.name}" ${selected}>${p.name} (SKU: ${p.sku})</option>`;
    });

    box.innerHTML = `
      <div class="modal-header">
        <h3><i class="fas fa-file-invoice-dollar"></i> Request Bulk Quotation (RFQ)</h3>
        <button class="modal-close"><i class="fas fa-times"></i></button>
      </div>
      <div class="modal-body">
        <form id="rfq-modal-form">
          <div class="form-group">
            <label for="rfq-company">Company Name *</label>
            <input type="text" class="form-control" id="rfq-company" value="${state.user.companyName}" required>
          </div>
          <div class="form-group">
            <label for="rfq-email">Email Address *</label>
            <input type="email" class="form-control" id="rfq-email" value="${state.user.email}" required>
          </div>
          <div class="form-group">
            <label for="rfq-product">Select Primary Product *</label>
            <select class="form-control" id="rfq-product" required>
              <option value="" disabled>-- Choose Product --</option>
              ${itemsOptions}
            </select>
          </div>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:1rem;">
            <div class="form-group">
              <label for="rfq-qty">Request Qty (pcs) *</label>
              <input type="number" class="form-control" id="rfq-qty" value="100" min="5" required>
            </div>
            <div class="form-group">
              <label for="rfq-target-price">Target Price per Unit (₹)</label>
              <input type="number" class="form-control" id="rfq-target-price" placeholder="Optional">
            </div>
          </div>
          <div class="form-group">
            <label for="rfq-specs">Additional Custom Fabrication Specs</label>
            <textarea class="form-control" id="rfq-specs" rows="3" placeholder="Specify thickness modifications, special grades, zinc plating depth..."></textarea>
          </div>
          <button type="submit" class="btn btn-primary" style="width:100%; margin-top:1rem;"><i class="fas fa-paper-plane"></i> Submit Quotation Request</button>
        </form>
      </div>
    `;

    overlay.classList.add("active");

    overlay.querySelector(".modal-close")?.addEventListener("click", () => {
      overlay.classList.remove("active");
    });

    document.getElementById("rfq-modal-form")?.addEventListener("submit", (e) => {
      e.preventDefault();
      
      const comp = document.getElementById("rfq-company").value;
      const email = document.getElementById("rfq-email").value;
      const prodName = document.getElementById("rfq-product").value;
      const qty = document.getElementById("rfq-qty").value;
      const targetPrice = document.getElementById("rfq-target-price").value || "Market SLA";
      const specs = document.getElementById("rfq-specs").value || "Standard dimensions apply.";

      overlay.classList.remove("active");
      showToast("RFQ submitted successfully! Generating Quote PDF...", "success");

      // Generate simulated RFQ Response PDF
      setTimeout(() => {
        generateRfqPDF({ comp, email, prodName, qty, targetPrice, specs });
      }, 1000);
    });
  };

  // --- FLOATING COMPARE MODAL ---
  const openComparisonModal = () => {
    const overlay = document.getElementById("modal-overlay");
    if (!overlay) return;

    const box = overlay.querySelector(".modal-box");
    if (!box) return;

    box.style.maxWidth = "800px";

    if (state.compare.length === 0) {
      overlay.classList.remove("active");
      return;
    }

    const comparedProds = state.compare.map(id => db.products.find(p => p.id === id)).filter(Boolean);

    let headingsHtml = "<th>Specification</th>";
    let imgRows = "<td>Visual</td>";
    let nameRows = "<td>Product Name</td>";
    let skuRows = "<td>SKU</td>";
    let materialRows = "<td>Material / Grade</td>";
    let thicknessRows = "<td>Thickness</td>";
    let weightRows = "<td>Unit Weight</td>";
    let sizeRows = "<td>Dimensions</td>";
    let stockRows = "<td>Overall Stock</td>";
    let moqRows = "<td>Minimum Order</td>";
    let actionsRows = "<td>Action</td>";

    comparedProds.forEach(p => {
      const overallStock = Object.values(p.stockByWarehouse).reduce((a, b) => a + b, 0);

      headingsHtml += `<th style="color:var(--primary-blue)">${p.sku}</th>`;
      imgRows += `<td><img class="compare-modal-img" src="${p.image}"></td>`;
      nameRows += `<td><strong>${p.name}</strong></td>`;
      skuRows += `<td>${p.sku}</td>`;
      materialRows += `<td>${p.material}<br><span style="font-size:0.75rem; color:var(--text-secondary)">Grade: ${p.grade}</span></td>`;
      thicknessRows += `<td><strong>${p.thickness}</strong></td>`;
      weightRows += `<td>${p.weight}</td>`;
      sizeRows += `<td>${p.dimensions}</td>`;
      stockRows += `<td style="color:${overallStock > 300 ? '#15803D' : '#B45309'}; font-weight:700;">${overallStock} pcs</td>`;
      moqRows += `<td style="color:var(--primary-red); font-weight:700;">${p.minOrder} pcs</td>`;
      actionsRows += `
        <td>
          <button class="btn btn-primary btn-sm btn-compare-add" data-id="${p.id}" style="margin-bottom:0.5rem; width:100%;"><i class="fas fa-shopping-cart"></i> Add</button>
          <button class="btn btn-outline btn-sm btn-compare-remove" data-id="${p.id}" style="width:100%; border-color:var(--border-color); color:var(--text-secondary);"><i class="fas fa-trash-alt"></i> Remove</button>
        </td>
      `;
    });

    box.innerHTML = `
      <div class="modal-header">
        <h3><i class="fas fa-columns"></i> Side-by-Side Product Comparison</h3>
        <button class="modal-close"><i class="fas fa-times"></i></button>
      </div>
      <div class="modal-body" style="padding:1.5rem;">
        <div class="table-responsive" style="border:none; box-shadow:none;">
          <table class="compare-modal-table">
            <thead>
              <tr>${headingsHtml}</tr>
            </thead>
            <tbody>
              <tr>${imgRows}</tr>
              <tr>${nameRows}</tr>
              <tr>${skuRows}</tr>
              <tr>${materialRows}</tr>
              <tr>${thicknessRows}</tr>
              <tr>${weightRows}</tr>
              <tr>${sizeRows}</tr>
              <tr>${stockRows}</tr>
              <tr>${moqRows}</tr>
              <tr>${actionsRows}</tr>
            </tbody>
          </table>
        </div>
      </div>
    `;

    overlay.classList.add("active");

    overlay.querySelector(".modal-close")?.addEventListener("click", () => {
      overlay.classList.remove("active");
      box.style.maxWidth = "600px";
    });

    // Compare modal button listeners
    box.querySelectorAll(".btn-compare-add").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-id");
        addToCart(id);
      });
    });

    box.querySelectorAll(".btn-compare-remove").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-id");
        toggleCompare(id);
        // Refresh modal
        if (state.compare.length > 0) {
          openComparisonModal();
        } else {
          overlay.classList.remove("active");
          box.style.maxWidth = "600px";
        }
      });
    });
  };

  // --- PDF GENERATOR UTILITIES USING JSPD ---
  
  // 1. Download Product Specification Sheet
  const generateProductPDF = (prod) => {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Border Frame
    doc.setDrawColor(11, 61, 145);
    doc.setLineWidth(1);
    doc.rect(5, 5, 200, 287);

    // Header Title
    doc.setFillColor(11, 61, 145);
    doc.rect(5, 5, 200, 30, "F");
    
    doc.setTextColor(255, 255, 255);
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(22);
    doc.text("CREATIVE INDUSTRIES", 15, 20);
    
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(9);
    doc.text("Precision Sheet Metal Solutions for the Automotive Industry", 15, 27);
    doc.text("Sanjay Colony, Sector-23, Faridabad | creativeindustries1010@gmail.com", 102, 27);

    // Product Header
    doc.setTextColor(32, 33, 36);
    doc.setFontSize(18);
    doc.setFont("Helvetica", "bold");
    doc.text("TECHNICAL DATASHEET SPECIFICATION", 15, 50);
    
    doc.setDrawColor(214, 40, 40);
    doc.setLineWidth(0.8);
    doc.line(15, 53, 195, 53);

    // Body specs Table layout
    doc.setFontSize(11);
    let y = 65;
    const drawSpecRow = (label, val) => {
      doc.setFont("Helvetica", "bold");
      doc.setTextColor(11, 61, 145);
      doc.text(label, 20, y);
      doc.setFont("Helvetica", "normal");
      doc.setTextColor(32, 33, 36);
      doc.text(val, 80, y);
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.3);
      doc.line(20, y + 3, 190, y + 3);
      y += 12;
    };

    drawSpecRow("Product Name", prod.name);
    drawSpecRow("Part SKU Reference", prod.sku);
    drawSpecRow("Base Fabrication Material", prod.material);
    drawSpecRow("Conforming Steel Grade", prod.grade);
    drawSpecRow("Sheet Core Thickness", prod.thickness);
    drawSpecRow("Unit Finished Weight", prod.weight);
    drawSpecRow("Physical Dimensions", prod.dimensions);
    drawSpecRow("Compatible Vehicles", prod.compatibility.join(", "));
    drawSpecRow("Minimum Order Limit (MOQ)", `${prod.minOrder} pcs`);
    drawSpecRow("Est. Stamping SLA", prod.deliveryTime);

    // Description block
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(11, 61, 145);
    doc.text("Finished Product Description:", 20, y + 5);
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(114, 128, 150);
    const splitDesc = doc.splitTextToSize(prod.description, 160);
    doc.text(splitDesc, 20, y + 13);

    // Footer Sign off
    doc.setDrawColor(11, 61, 145);
    doc.setLineWidth(0.5);
    doc.line(15, 260, 195, 260);

    doc.setFontSize(8);
    doc.setTextColor(113, 128, 150);
    doc.text("This document is generated digitally and serves as an official technical datasheet.", 15, 268);
    doc.text("Creative Industries Faridabad Works. Sanjay Colony Stamping Division.", 15, 273);

    doc.save(`Technical-Datasheet-${prod.sku}.pdf`);
  };

  // 2. Download Purchase Order Invoice
  const generateInvoicePDF = (order) => {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Frame Border
    doc.setDrawColor(11, 61, 145);
    doc.setLineWidth(1);
    doc.rect(5, 5, 200, 287);

    // Header banner
    doc.setFillColor(11, 61, 145);
    doc.rect(5, 5, 200, 30, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(22);
    doc.text("CREATIVE INDUSTRIES", 15, 20);
    doc.setFontSize(9);
    doc.setFont("Helvetica", "normal");
    doc.text("Commercial B2B Tax Invoice", 15, 27);
    doc.text("GSTIN: 06AHLPA2151Q1Z9", 150, 20);
    doc.text("Office: Sanjay Colony, Sector-23, Faridabad", 128, 27);

    // Customer Billing Block
    doc.setTextColor(32, 33, 36);
    doc.setFontSize(11);
    doc.setFont("Helvetica", "bold");
    doc.text("Billed To (Purchasing Entity):", 15, 50);
    doc.setFont("Helvetica", "normal");
    doc.text(`Company Name: ${order.company}`, 15, 56);
    doc.text(`GSTIN Number: ${order.gst}`, 15, 62);
    doc.text(`Delivery Location: ${order.address}`, 15, 68);

    // Invoice Metadata Block
    doc.setFont("Helvetica", "bold");
    doc.text("Invoice Metadata:", 130, 50);
    doc.setFont("Helvetica", "normal");
    doc.text(`Invoice ID: ${order.id}`, 130, 56);
    doc.text(`Date of Issue: ${order.date}`, 130, 62);
    doc.text(`Repayment Scheme: ${order.payment}`, 130, 68);

    doc.setDrawColor(226, 232, 240);
    doc.line(15, 75, 195, 75);

    // Table Header
    doc.setFillColor(248, 250, 252);
    doc.rect(15, 80, 180, 8, "F");
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(9);
    doc.text("Component Stamping Details", 17, 85);
    doc.text("Rate (INR)", 110, 85);
    doc.text("Qty (pcs)", 140, 85);
    doc.text("Total Value (INR)", 165, 85);

    doc.line(15, 88, 195, 88);

    // Table Rows
    doc.setFont("Helvetica", "normal");
    let y = 94;
    order.items.forEach(item => {
      doc.text(item.name, 17, y);
      doc.text(`Rs. ${item.price.toLocaleString("en-IN")}`, 110, y);
      doc.text(`${item.qty}`, 142, y);
      doc.text(`Rs. ${(item.price * item.qty).toLocaleString("en-IN")}`, 165, y);
      doc.line(15, y + 2, 195, y + 2);
      y += 8;
    });

    // Summary calculations box
    y += 10;
    doc.setFont("Helvetica", "bold");
    doc.text("Financial Breakdown Details:", 15, y);
    doc.setFont("Helvetica", "normal");
    
    doc.text("Subtotal amount (Excl. Tax):", 110, y);
    doc.text(`Rs. ${order.subtotal.toLocaleString("en-IN")}`, 165, y);
    
    doc.text("IGST / CGST / SGST (18% rate):", 110, y + 6);
    doc.text(`Rs. ${order.gstAmount.toLocaleString("en-IN")}`, 165, y + 6);
    
    doc.text("Logistics Freight charges:", 110, y + 12);
    doc.text(order.shipping === 0 ? "FREE" : `Rs. ${order.shipping.toLocaleString("en-IN")}`, 165, y + 12);

    doc.setDrawColor(11, 61, 145);
    doc.line(110, y + 15, 195, y + 15);

    doc.setFont("Helvetica", "bold");
    doc.text("Grand Final Payable Amount:", 110, y + 20);
    doc.text(`Rs. ${order.total.toLocaleString("en-IN")}`, 165, y + 20);

    // Term conditions block
    doc.setFontSize(8);
    doc.setFont("Helvetica", "bold");
    doc.text("Standard B2B Repayment Terms:", 15, 240);
    doc.setFont("Helvetica", "normal");
    doc.setTextColor(114, 128, 150);
    doc.text("1. All credit terms (e.g. Net 30) must comply with verified corporate contracts.", 15, 245);
    doc.text("2. Delay in repayment beyond 30 days is subject to interest penalty of 18% per annum.", 15, 249);
    doc.text("3. Disputed goods must be flagged to Faridabad Works within 48 hours of cargo landing.", 15, 253);

    // Sign off lines
    doc.setDrawColor(226, 232, 240);
    doc.line(15, 265, 195, 265);
    doc.text("Creative Industries Sales Desk. Email: creativeindustries1010@gmail.com", 15, 273);

    doc.save(`Invoice-${order.id}.pdf`);
  };

  // 3. Download RFQ Quote Response
  const generateRfqPDF = (rfq) => {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Border Frame
    doc.setDrawColor(11, 61, 145);
    doc.setLineWidth(1);
    doc.rect(5, 5, 200, 287);

    // Header title
    doc.setFillColor(11, 61, 145);
    doc.rect(5, 5, 200, 30, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(22);
    doc.text("CREATIVE INDUSTRIES", 15, 20);
    doc.setFontSize(9);
    doc.setFont("Helvetica", "normal");
    doc.text("Simulated B2B RFQ Quotation Offer", 15, 27);
    doc.text("Sanjay Colony, Sector-23, Faridabad | creativeindustries1010@gmail.com", 96, 27);

    // Body
    doc.setTextColor(32, 33, 36);
    doc.setFontSize(14);
    doc.setFont("Helvetica", "bold");
    doc.text("OFFICIAL B2B BULK QUOTATION ESTIMATE", 15, 50);
    doc.line(15, 53, 195, 53);

    doc.setFontSize(10);
    doc.setFont("Helvetica", "normal");
    doc.text(`Reference ID: RFQ-OFFER-${Math.floor(100000 + Math.random() * 900000)}`, 15, 60);
    doc.text(`Date issued: ${new Date().toISOString().split("T")[0]}`, 15, 65);
    doc.text(`Offer Valdity: 15 Calendar Days from issue`, 15, 70);

    doc.setFont("Helvetica", "bold");
    doc.text("Client Information Details:", 15, 85);
    doc.setFont("Helvetica", "normal");
    doc.text(`Requestor Entity: ${rfq.comp}`, 15, 91);
    doc.text(`Inquiry Mailbox: ${rfq.email}`, 15, 96);

    // Offer Details table
    doc.setFillColor(248, 250, 252);
    doc.rect(15, 105, 180, 8, "F");
    doc.setFont("Helvetica", "bold");
    doc.text("Selected Component", 17, 110);
    doc.text("Requested Volume", 110, 110);
    doc.text("Unit Target (INR)", 145, 110);
    doc.text("Approved Unit Offer", 168, 110);

    doc.line(15, 113, 195, 113);
    doc.setFont("Helvetica", "normal");

    // Match index price
    const matchProd = db.products.find(p => p.name === rfq.prodName);
    const regularPrice = matchProd ? matchProd.price : 1000;
    // Standard discount logic for bulk: 15% discount for bulk volumes
    const approvedPrice = Math.round(regularPrice * 0.85);

    const rfqY = 120;
    doc.text(rfq.prodName, 17, rfqY);
    doc.text(`${rfq.qty} pcs`, 110, rfqY);
    doc.text(`Rs. ${rfq.targetPrice}`, 145, rfqY);
    doc.setTextColor(214, 40, 40);
    doc.setFont("Helvetica", "bold");
    doc.text(`Rs. ${approvedPrice.toLocaleString("en-IN")}`, 168, rfqY);
    doc.setTextColor(32, 33, 36);
    doc.setFont("Helvetica", "normal");

    doc.line(15, 124, 195, 124);

    doc.setFont("Helvetica", "bold");
    doc.text("Summary Estimates (Excl. Tax & Freight):", 15, 140);
    doc.setFont("Helvetica", "normal");
    doc.text(`Standard Retail Value: Rs. ${(regularPrice * rfq.qty).toLocaleString("en-IN")}`, 15, 146);
    doc.text(`Approved B2B Contract Value: Rs. ${(approvedPrice * rfq.qty).toLocaleString("en-IN")}`, 15, 151);
    doc.setFont("Helvetica", "bold");
    doc.setTextColor(11, 61, 145);
    doc.text(`Estimated Net Savings: Rs. ${((regularPrice - approvedPrice) * rfq.qty).toLocaleString("en-IN")} (15% bulk discount applied!)`, 15, 157);
    doc.setTextColor(32, 33, 36);

    doc.setFont("Helvetica", "bold");
    doc.text("Requested Custom Modifications & Specs:", 15, 175);
    doc.setFont("Helvetica", "normal");
    const specLines = doc.splitTextToSize(rfq.specs, 170);
    doc.text(specLines, 15, 181);

    // Policy notes
    doc.setFont("Helvetica", "bold");
    doc.text("Logistics Stamping SLA Terms:", 15, 210);
    doc.setFont("Helvetica", "normal");
    doc.text("1. Tooling setups will begin immediately upon signed quote confirmation.", 15, 215);
    doc.text("2. Freight charges calculated based on final depot shipping volume.", 15, 219);
    doc.text("3. Approved prices reflect bulk steel rate calculations at raw coil markets.", 15, 223);

    doc.line(15, 260, 195, 260);
    doc.setFontSize(8);
    doc.setTextColor(114, 128, 150);
    doc.text("This simulated PDF quote estimate is for procurement visualization purposes.", 15, 268);
    doc.text("Creative Industries Sales Division. Faridabad Works.", 15, 273);

    doc.save(`Quotation-Estimate-${rfq.comp.replace(/\s+/g, '')}.pdf`);
  };

  // --- POLICY PAGES RENDERING ---

  // 14. SHIPPING & LOGISTICS POLICY
  function renderShippingPolicy() {
    const container = document.getElementById("app-container");
    container.innerHTML = `
      <div class="section" style="max-width:900px; margin:3rem auto; padding:0 2rem;">
        <h1 style="font-size:2.2rem; margin-bottom:1.5rem; color:var(--primary-blue); border-bottom:2px solid var(--border-color); padding-bottom:0.5rem;">
          Shipping & Logistics Policy
        </h1>
        <p style="color:var(--text-secondary); font-size:0.95rem; margin-bottom:1.5rem; font-style:italic;">
          Last updated: July 2026
        </p>
        
        <div style="display:flex; flex-direction:column; gap:1.5rem; line-height:1.8;">
          <section>
            <h3 style="color:var(--dark-gray); margin-bottom:0.5rem;"><i class="fas fa-warehouse"></i> 1. Single Origin Dispatch</h3>
            <p>All automotive sheet metal products, stampings, and drawing components are manufactured and dispatched exclusively from our centralized works: <strong>MCF-10659, Gali No. 34, Sanjay Colony, Sector-23, Faridabad, Haryana - 121005</strong>. Creative Industries does not operate any other branches, warehouses, or assembly depots. All stock counts shown reflect physical availability at this Faridabad works location.</p>
          </section>

          <section>
            <h3 style="color:var(--dark-gray); margin-bottom:0.5rem;"><i class="fas fa-truck-loading"></i> 2. Cargo Logistics & Carriers</h3>
            <p>B2B orders are packed securely on pallets or custom crating to prevent core panel warping during transport. We partner with national freight carriers (including TCI Freight, Safexpress, and V-Trans) for less-than-truckload (LTL) and full flat-bed truck dispatches to manufacturing plants, workshops, and distribution nodes across India.</p>
          </section>

          <section>
            <h3 style="color:var(--dark-gray); margin-bottom:0.5rem;"><i class="fas fa-shipping-fast"></i> 3. Delivery Service Level Agreements (SLAs)</h3>
            <p>Dispatch occurs within 24 hours of proforma verification. Standard transit times across regional B2B routes include:</p>
            <ul style="padding-left:1.5rem; margin-top:0.5rem;">
              <li><strong>Faridabad & Delhi-NCR:</strong> 1-2 business days.</li>
              <li><strong>North India (Haryana, Punjab, UP, Rajasthan):</strong> 2-4 business days.</li>
              <li><strong>Central & West India (Maharashtra, Gujarat, MP):</strong> 4-6 business days.</li>
              <li><strong>South & East India (Karnataka, Tamil Nadu, West Bengal):</strong> 5-7 business days.</li>
            </ul>
          </section>

          <section>
            <h3 style="color:var(--dark-gray); margin-bottom:0.5rem;"><i class="fas fa-rupee-sign"></i> 4. Freight Charges & Free Delivery Threshold</h3>
            <p>Standard freight charges of ₹3,500 apply to bulk orders to offset commercial truck transport fees. However, to support volume aftermarket distributors and OEM clients, <strong>freight charges are entirely waived (FREE) for all purchase orders exceeding ₹1,0,000</strong> in net value.</p>
          </section>
        </div>
      </div>
    `;
  }

  // 15. PRIVACY POLICY
  function renderPrivacyPolicy() {
    const container = document.getElementById("app-container");
    container.innerHTML = `
      <div class="section" style="max-width:900px; margin:3rem auto; padding:0 2rem;">
        <h1 style="font-size:2.2rem; margin-bottom:1.5rem; color:var(--primary-blue); border-bottom:2px solid var(--border-color); padding-bottom:0.5rem;">
          Privacy Policy
        </h1>
        <p style="color:var(--text-secondary); font-size:0.95rem; margin-bottom:1.5rem; font-style:italic;">
          Last updated: July 2026
        </p>

        <div style="display:flex; flex-direction:column; gap:1.5rem; line-height:1.8;">
          <section>
            <h3 style="color:var(--dark-gray); margin-bottom:0.5rem;"><i class="fas fa-user-shield"></i> 1. Scope of Privacy Protection</h3>
            <p>At Creative Industries, we respect and safeguard the proprietary information of our B2B clients, procurement agents, and automotive workshops. This privacy statement explains the collection, storage, and processing parameters for data submitted on our catalog platform.</p>
          </section>

          <section>
            <h3 style="color:var(--dark-gray); margin-bottom:0.5rem;"><i class="fas fa-file-invoice"></i> 2. Information We Collect</h3>
            <p>To process commercial quotes and verify net billing limits, we collect corporate identifying parameters including: Company Name, Corporate GSTIN (GST Number), Contact Person, Registered Business Address, Phone Contacts, and Email IDs. Custom specifications uploaded during RFQ requests are kept confidential.</p>
          </section>

          <section>
            <h3 style="color:var(--dark-gray); margin-bottom:0.5rem;"><i class="fas fa-database"></i> 3. Local Storage & Data Processing</h3>
            <p>Our platform processes transactions client-side. Your cart configurations, billing profile details, order histories, and recently viewed products are saved inside your local browser's <code>localStorage</code> database for secure visualization and easy proforma reordering. No third-party data broker harvesting takes place.</p>
          </section>

          <section>
            <h3 style="color:var(--dark-gray); margin-bottom:0.5rem;"><i class="fas fa-phone-alt"></i> 4. Contact and Administration</h3>
            <p>If you wish to purge your cached account profiles or submit questions about billing data processing, please reach our proprietor Osman directly at <strong>creativeindustries1010@gmail.com</strong> or mobile <strong>+91 9650577466</strong>.</p>
          </section>
        </div>
      </div>
    `;
  }

  // 16. TERMS & B2B CONDITIONS
  function renderTermsConditions() {
    const container = document.getElementById("app-container");
    container.innerHTML = `
      <div class="section" style="max-width:900px; margin:3rem auto; padding:0 2rem;">
        <h1 style="font-size:2.2rem; margin-bottom:1.5rem; color:var(--primary-blue); border-bottom:2px solid var(--border-color); padding-bottom:0.5rem;">
          Terms & B2B Conditions
        </h1>
        <p style="color:var(--text-secondary); font-size:0.95rem; margin-bottom:1.5rem; font-style:italic;">
          Last updated: July 2026
        </p>

        <div style="display:flex; flex-direction:column; gap:1.5rem; line-height:1.8;">
          <section>
            <h3 style="color:var(--dark-gray); margin-bottom:0.5rem;"><i class="fas fa-stamp"></i> 1. Pricing and Fabrication Tolerances</h3>
            <p>All prices listed are estimates and subject to adjustments based on raw steel coil market fluctuations. Metal stamping thickness tolerances conform to international ISO 2768 standard guidelines (nominal core sheets may deviate by +/- 0.05mm). Minor surface markings from press dies that do not compromise sheet strength are standard aftermarket parameters.</p>
          </section>

          <section>
            <h3 style="color:var(--dark-gray); margin-bottom:0.5rem;"><i class="fas fa-handshake"></i> 2. Net 30 Repayment Credits</h3>
            <p>Access to Net 30 repayment plans is strictly reserved for corporate accounts with verified 15-digit GSTIN details and active credit ratings. Unpaid proforma invoices exceeding 30 calendar days from delivery are subject to late-fee penalties of <strong>18% per annum</strong> computed daily.</p>
          </section>

          <section>
            <h3 style="color:var(--dark-gray); margin-bottom:0.5rem;"><i class="fas fa-box-open"></i> 3. Receiving & Dispute SLAs</h3>
            <p>Upon physical arrival of flat-bed cargo, the buyer must inspect panel counts and verify thickness dimensions. Damaged components or stamping defects must be flagged in writing to <strong>creativeindustries1010@gmail.com</strong> with structural photos <strong>within 48 hours of delivery</strong>. Disputes submitted after 48 hours will not be approved for refunds or replacement pressings.</p>
          </section>

          <section>
            <h3 style="color:var(--dark-gray); margin-bottom:0.5rem;"><i class="fas fa-gavel"></i> 4. Jurisdiction</h3>
            <p>Creative Industries operates solely from Sanjay Colony, Sector-23, Faridabad, Haryana, India. All business interactions, proforma orders, and disputes are subject to the exclusive jurisdiction of the courts in <strong>Faridabad, Haryana, India</strong>.</p>
          </section>
        </div>
      </div>
    `;
  }

  // 17. LOGIN / REGISTER PROFILE
  function renderProfile() {
    const container = document.getElementById("app-container");
    if (state.isLoggedIn) {
      container.innerHTML = `
        <div class="section" style="max-width:650px; margin:4rem auto; padding:3rem 2rem; background-color:var(--white); border-radius:var(--border-radius-lg); border:1px solid var(--border-color); box-shadow:var(--shadow-md);">
          <div style="text-align:center; padding-bottom:1.5rem; border-bottom:1px solid var(--border-color); margin-bottom:1.5rem;">
            <div style="width:70px; height:70px; border-radius:50%; background-color:var(--primary-blue); color:var(--white); font-weight:800; font-size:2rem; display:flex; align-items:center; justify-content:center; margin:0 auto 1rem;">
              ${state.user.contactPerson.charAt(0)}
            </div>
            <h2 style="color:var(--dark-gray); font-size:1.6rem;">Welcome back, ${state.user.contactPerson}</h2>
            <span style="font-size:0.9rem; color:var(--text-secondary); font-weight:600;">${state.user.companyName}</span>
          </div>

          <div style="display:flex; flex-direction:column; gap:1rem; font-size:0.95rem; margin-bottom:2rem;">
            <div style="display:flex; justify-content:space-between; border-bottom:1px solid var(--light-gray); padding-bottom:0.5rem;">
              <span style="color:var(--text-secondary)">GSTIN Number:</span>
              <strong>${state.user.gstNumber}</strong>
            </div>
            <div style="display:flex; justify-content:space-between; border-bottom:1px solid var(--light-gray); padding-bottom:0.5rem;">
              <span style="color:var(--text-secondary)">Phone Contact:</span>
              <strong>${state.user.phone}</strong>
            </div>
            <div style="display:flex; justify-content:space-between; border-bottom:1px solid var(--light-gray); padding-bottom:0.5rem;">
              <span style="color:var(--text-secondary)">Email Address:</span>
              <strong>${state.user.email}</strong>
            </div>
            <div style="display:flex; justify-content:space-between; border-bottom:1px solid var(--light-gray); padding-bottom:0.5rem;">
              <span style="color:var(--text-secondary)">Delivery Site:</span>
              <strong style="text-align:right; max-width:60%;">${state.user.address}</strong>
            </div>
          </div>

          <div style="display:flex; gap:1rem;">
            <a href="#/dashboard" class="btn btn-primary" style="flex:1;"><i class="fas fa-tachometer-alt"></i> Go to Dashboard</a>
            <button class="btn btn-outline" id="btn-profile-logout" style="flex:1; border-color:var(--border-color); color:var(--primary-red);"><i class="fas fa-sign-out-alt"></i> Log Out</button>
          </div>
        </div>
      `;

      document.getElementById("btn-profile-logout")?.addEventListener("click", () => {
        state.isLoggedIn = false;
        saveState();
        showToast("Logged out successfully.", "info");
        renderProfile();
      });
    } else {
      // Not logged in -> Render login/signup tabs
      container.innerHTML = `
        <div class="section" style="max-width:550px; margin:4rem auto; padding:3rem 2rem; background-color:var(--white); border-radius:var(--border-radius-lg); border:1px solid var(--border-color); box-shadow:var(--shadow-md);">
          <div style="display:flex; border-bottom:2px solid var(--border-color); margin-bottom:2rem;">
            <button id="tab-login" class="btn" style="flex:1; background:none; border:none; padding:1rem; border-bottom:3px solid var(--primary-blue); font-weight:700; color:var(--primary-blue); border-radius:0;">B2B Login</button>
            <button id="tab-signup" class="btn" style="flex:1; background:none; border:none; padding:1rem; font-weight:500; color:var(--text-secondary); border-radius:0;">Register Account</button>
          </div>

          <!-- Login Panel -->
          <div id="panel-login">
            <form id="form-login">
              <div class="form-group">
                <label for="login-email">Registered Email *</label>
                <input type="email" class="form-control" id="login-email" value="${state.user.email}" placeholder="procurement@yourcompany.com" required>
              </div>
              <div class="form-group" style="margin-bottom:2rem;">
                <label for="login-pwd">Password *</label>
                <input type="password" class="form-control" id="login-pwd" value="123456" placeholder="Enter password" required>
              </div>
              <button type="submit" class="btn btn-primary" style="width:100%; font-size:1.05rem;"><i class="fas fa-sign-in-alt"></i> Log In</button>
            </form>
          </div>

          <!-- Signup Panel -->
          <div id="panel-signup" style="display:none;">
            <form id="form-signup">
              <div class="form-group">
                <label for="reg-company">Company Name *</label>
                <input type="text" class="form-control" id="reg-company" placeholder="e.g. Maruti Solutions Ltd." required>
              </div>
              <div class="form-group">
                <label for="reg-gst">Corporate GSTIN (15-Digit) *</label>
                <input type="text" class="form-control" id="reg-gst" placeholder="06AABCXXXXX1Z0" pattern="^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$" required>
              </div>
              <div class="form-group">
                <label for="reg-person">Contact Person *</label>
                <input type="text" class="form-control" id="reg-person" placeholder="e.g. Amit Sharma" required>
              </div>
              <div style="display:grid; grid-template-columns:1fr 1fr; gap:1rem;">
                <div class="form-group">
                  <label for="reg-phone">Phone *</label>
                  <input type="tel" class="form-control" id="reg-phone" placeholder="+91 9XXXX XXXXX" required>
                </div>
                <div class="form-group">
                  <label for="reg-email">Email Address *</label>
                  <input type="email" class="form-control" id="reg-email" placeholder="amit@company.com" required>
                </div>
              </div>
              <div class="form-group">
                <label for="reg-address">Delivery Address *</label>
                <textarea class="form-control" id="reg-address" rows="2" placeholder="Factory address for cargo freight delivery..." required></textarea>
              </div>
              <div class="form-group" style="margin-bottom:2rem;">
                <label for="reg-pwd">Create Password *</label>
                <input type="password" class="form-control" id="reg-pwd" placeholder="Min 6 characters" minlength="6" required>
              </div>
              <button type="submit" class="btn btn-primary" style="width:100%; font-size:1.05rem;"><i class="fas fa-user-plus"></i> Submit Registration</button>
            </form>
          </div>
        </div>
      `;

      // Tabs triggers
      const tabLogin = document.getElementById("tab-login");
      const tabSignup = document.getElementById("tab-signup");
      const panelLogin = document.getElementById("panel-login");
      const panelSignup = document.getElementById("panel-signup");

      tabLogin?.addEventListener("click", () => {
        tabLogin.style.borderBottom = "3px solid var(--primary-blue)";
        tabLogin.style.fontWeight = "700";
        tabLogin.style.color = "var(--primary-blue)";
        
        tabSignup.style.borderBottom = "none";
        tabSignup.style.fontWeight = "500";
        tabSignup.style.color = "var(--text-secondary)";

        panelLogin.style.display = "block";
        panelSignup.style.display = "none";
      });

      tabSignup?.addEventListener("click", () => {
        tabSignup.style.borderBottom = "3px solid var(--primary-blue)";
        tabSignup.style.fontWeight = "700";
        tabSignup.style.color = "var(--primary-blue)";
        
        tabLogin.style.borderBottom = "none";
        tabLogin.style.fontWeight = "500";
        tabLogin.style.color = "var(--text-secondary)";

        panelSignup.style.display = "block";
        panelLogin.style.display = "none";
      });

      // Login form submit
      document.getElementById("form-login")?.addEventListener("submit", (e) => {
        e.preventDefault();
        state.isLoggedIn = true;
        saveState();
        showToast(`Welcome back, ${state.user.contactPerson}!`, "success");
        window.location.hash = "#/dashboard";
      });

      // Signup form submit
      document.getElementById("form-signup")?.addEventListener("submit", (e) => {
        e.preventDefault();
        state.user = {
          companyName: document.getElementById("reg-company").value,
          gstNumber: document.getElementById("reg-gst").value.toUpperCase(),
          contactPerson: document.getElementById("reg-person").value,
          phone: document.getElementById("reg-phone").value,
          email: document.getElementById("reg-email").value,
          address: document.getElementById("reg-address").value
        };
        state.isLoggedIn = true;
        saveState();
        showToast("Registration completed and logged in!", "success");
        window.location.hash = "#/dashboard";
      });
    }
  }

  // --- INITIALIZE SYSTEM BOOTSTRAP ---
  const init = () => {
    // Initial badge values
    updateBadges();

    // Route on launch
    router();

    // Autocomplete Search setup
    initSearchAutocomplete();

    // Start live updates
    startLiveStockSimulation();

    // Set up responsive mobile humburger toggle
    const toggleBtn = document.getElementById("mobile-menu-toggle");
    const navLinks = document.getElementById("nav-links");
    toggleBtn?.addEventListener("click", () => {
      navLinks.classList.toggle("active");
    });

    // Request quote float button triggers RFQ
    document.getElementById("floating-rfq")?.addEventListener("click", () => openRfqModal());
  };

  // Bootstrap when DOM loads
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
