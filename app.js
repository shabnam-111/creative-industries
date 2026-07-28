// app.js
// Main Application Controller for Creative Industries B2B SPA

(function () {
  // Ensure data has loaded
  const db = window.CreativeData;
  if (!db) {
    console.error("Data script (data.js) not loaded!");
    return;
  }

const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.protocol === 'file:';
const API_BASE_URL = isLocal ? "http://localhost:5000/api" : "/api";
const TOKEN_KEY = "ci_token";

  function getAuthHeaders() {
    const token = localStorage.getItem(TOKEN_KEY);
    return {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    };
  }

  async function apiCall(endpoint, options = {}) {
    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: getAuthHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'API Error');
    return data;
  }

  // Add to Cart
  async function addToCart(productId, qty = null) {
    const prod = db.products.find(p => p.id === productId);
    const minQty = prod?.minOrder || prod?.min_order_qty || 1;
    const finalQty = qty && qty > minQty ? qty : minQty;

    const existing = state.cart.find(item => item.productId === productId);
    const newQty = existing ? existing.qty + finalQty : finalQty;

    if (existing) {
      existing.qty = newQty;
    } else {
      state.cart.push({ productId, qty: newQty });
    }
    saveState();
    showToast(`Added to cart (Min order: ${minQty} pcs)`, "success");

    try {
      await apiCall('/cart/add', {
        method: 'POST',
        body: JSON.stringify({ productId, quantity: newQty })
      });
    } catch (err) {
      console.error("Cart sync failed:", err.message);
    }
  }
  window.addToCart = addToCart;


  // --- STATE MANAGEMENT ---
  const state = {
    cart: JSON.parse(localStorage.getItem("ci_cart")) || [],
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
    localStorage.setItem("ci_compare", JSON.stringify(state.compare));
    localStorage.setItem("ci_recently_viewed", JSON.stringify(state.recentlyViewed));
    localStorage.setItem("ci_orders", JSON.stringify(state.orders));
    localStorage.setItem("ci_user", JSON.stringify(state.user));
    localStorage.setItem("ci_logged_in", JSON.stringify(state.isLoggedIn));
    updateBadges();
  };

  // --- NOTIFICATION ENGINE ---
  const showConfirmModal = (title, message, onConfirm) => {
    const overlay = document.getElementById("modal-overlay");
    if (!overlay) {
      if (confirm(message)) onConfirm();
      return;
    }
    const box = overlay.querySelector(".modal-box");
    if (!box) return;

    box.innerHTML = `
      <div class="modal-header">
        <h3>${title}</h3>
        <button class="modal-close"><i class="fas fa-times"></i></button>
      </div>
      <div class="modal-body" style="padding:1.5rem; text-align:center;">
        <p style="margin-bottom:1.5rem;">${message}</p>
        <div style="display:flex; justify-content:center; gap:1rem;">
          <button class="btn btn-outline" id="confirm-cancel">Cancel</button>
          <button class="btn btn-primary" id="confirm-ok" style="background:#D62828; border-color:#D62828;">Yes, Delete</button>
        </div>
      </div>
    `;

    overlay.classList.add("active");

    const closeModal = () => overlay.classList.remove("active");

    overlay.querySelector(".modal-close").addEventListener("click", closeModal);
    document.getElementById("confirm-cancel").addEventListener("click", closeModal);
    
    document.getElementById("confirm-ok").addEventListener("click", () => {
      closeModal();
      onConfirm();
    });
  };

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

  function confirmFieldUpdate(fieldLabel, payload, onSuccess) {
    const overlay = document.getElementById("modal-overlay");
    if (!overlay) return;
    const box = overlay.querySelector(".modal-box");
    if (!box) return;

    box.innerHTML = `
      <div class="modal-header">
        <h3>Update ${fieldLabel}?</h3>
        <button class="modal-close"><i class="fas fa-times"></i></button>
      </div>
      <div class="modal-body" style="padding:1.5rem;">
        <p>Save this change to your account permanently?</p>
        <div style="display:flex; gap:1rem; margin-top:1.5rem;">
          <button id="confirm-update-yes" class="btn btn-primary" style="flex:1;">Yes, Update</button>
          <button id="confirm-update-no" class="btn btn-outline" style="flex:1;">No, Cancel</button>
        </div>
      </div>
    `;
    overlay.classList.add("active");

    const close = () => {
      overlay.classList.remove("active");
    };
    box.querySelector(".modal-close")?.addEventListener("click", close);
    document.getElementById("confirm-update-no")?.addEventListener("click", close);
    document.getElementById("confirm-update-yes")?.addEventListener("click", async () => {
      try {
        await apiCall('/profile', { method: 'PUT', body: JSON.stringify(payload) });
        if (typeof onSuccess === 'function') onSuccess();
        showToast(`${fieldLabel} updated successfully`, "success");
      } catch (err) {
        showToast(err.message || `Failed to update ${fieldLabel}`, "error");
      } finally {
        close();
      }
    });
  }

  // --- LIVE BADGES UPDATE ---
  const updateBadges = () => {
    const cartCount = state.cart.reduce((sum, item) => sum + item.qty, 0);
    const cartBadge = document.getElementById("cart-badge");
    if (cartBadge) {
      cartBadge.textContent = cartCount;
      cartBadge.style.display = cartCount > 0 ? "flex" : "none";
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

  // ===================== EMPLOYEE DASHBOARD =====================
  const DELIVERY_STATUSES = [
    'assigned', 'accepted', 'started', 'arrived_pickup', 'picked_up',
    'in_transit', 'arrived_destination', 'delivered', 'failed', 'cancelled'
  ];
  const STATUS_LABELS = {
    assigned: 'Assigned', accepted: 'Accept Delivery', started: 'Start Delivery',
    arrived_pickup: 'Arrived at Pickup', picked_up: 'Picked Up Order',
    in_transit: 'In Transit', arrived_destination: 'Arrived at Destination',
    delivered: 'Delivered', failed: 'Delivery Failed', cancelled: 'Cancelled'
  };
  let gpsWatchId = null;
  let gpsActiveDeliveryId = null;

  function renderEmployeeDashboard() {
    const container = document.getElementById("app-container");
    container.innerHTML = `
      <div class="section" style="max-width:1200px; margin:0 auto;">
        <h1 class="section-title">Employee Dashboard</h1>
        <div style="display:flex; gap:1rem; margin-bottom:2rem; flex-wrap:wrap;">
          <button id="btn-assigned-deliveries" class="btn btn-primary">Assigned Deliveries</button>
          <button id="btn-update-delivery" class="btn btn-primary">Update Delivery</button>
          <button id="btn-start-gps" class="btn btn-primary">Start GPS Tracking</button>
        </div>
        <div id="employee-content" style="background:var(--white); padding:2rem; border-radius:var(--border-radius-lg);">
          <p>Select an option above.</p>
        </div>
      </div>
    `;
    document.getElementById("btn-assigned-deliveries").addEventListener("click", () => viewAssignedDeliveries());
    document.getElementById("btn-update-delivery").addEventListener("click", () => viewAssignedDeliveries(true));
    document.getElementById("btn-start-gps").addEventListener("click", () => {
      if (!gpsActiveDeliveryId) {
        document.getElementById("employee-content").innerHTML = `
          <div style="text-align:center; padding:3rem; background:var(--white); border:1px solid var(--border-color); border-radius:var(--border-radius-lg);">
            <i class="fas fa-location-slash" style="font-size:3rem; color:var(--text-secondary); margin-bottom:1rem;"></i>
            <h3 style="color:var(--dark-gray);">No Active Delivery</h3>
            <p style="color:var(--text-secondary); margin-bottom:1.5rem;">You must start a delivery before GPS tracking can begin.</p>
            <button class="btn btn-primary" onclick="document.getElementById('btn-assigned-deliveries').click()">Go to Assigned Deliveries</button>
          </div>
        `;
        return;
      }
      startGPS(gpsActiveDeliveryId);
    });
  }

  async function viewAssignedDeliveries(focusUpdate = false) {
    const content = document.getElementById("employee-content");
    content.innerHTML = `<p>Loading assigned deliveries...</p>`;
    try {
      const res = await apiCall('/employee/deliveries');
      const deliveries = res.data || [];

      if (deliveries.length === 0) {
        if (focusUpdate) {
          content.innerHTML = `<h3>Update Delivery</h3><p>You don't have any active deliveries to update right now.</p>`;
        } else {
          content.innerHTML = `<h3>Assigned Deliveries</h3><p>No deliveries currently assigned to you.</p>`;
        }
        return;
      }

      const rows = deliveries.map(d => `
        <tr data-id="${d.id}">
          <td>${d.orders?.order_number || '—'}</td>
          <td>
            ${d.orders?.users?.customers?.company_name || d.orders?.users?.email || '—'}<br>
            <span style="font-size:0.8rem; color:var(--text-secondary)">${d.orders?.users?.phone || ''}</span>
          </td>
          <td>${d.pickup_location || '—'}</td>
          <td>${d.destination || '—'}</td>
          <td>${d.expected_delivery_time ? new Date(d.expected_delivery_time).toLocaleString() : '—'}</td>
          <td>${d.vehicles?.vehicle_number || '—'}</td>
          <td><span class="status-badge">${(d.status || 'assigned').replace('_', ' ')}</span></td>
          <td><button class="btn btn-primary btn-sm btn-manage-delivery">Manage</button></td>
        </tr>
      `).join("");

      content.innerHTML = `
        <h3>Assigned Deliveries (${deliveries.length})</h3>
        <div style="overflow-x:auto;">
          <table class="admin-table" style="width:100%; border-collapse:collapse; margin-top:1rem;">
            <thead><tr><th>Order #</th><th>Customer</th><th>Pickup</th><th>Destination</th><th>Expected By</th><th>Vehicle</th><th>Status</th><th></th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
        <div id="delivery-manage-panel" style="margin-top:2rem;"></div>
      `;

      content.querySelectorAll(".btn-manage-delivery").forEach(btn => {
        btn.addEventListener("click", (e) => {
          const id = e.target.closest("tr").getAttribute("data-id");
          const delivery = deliveries.find(d => String(d.id) === String(id));
          renderDeliveryManagePanel(delivery);
          document.getElementById("delivery-manage-panel").scrollIntoView({ behavior: "smooth" });
        });
      });

      if (focusUpdate && deliveries[0]) {
        // If clicking 'Update Delivery', hide the table and just show the first/active delivery's manage panel
        content.querySelector('.admin-table').parentElement.style.display = 'none';
        content.querySelector('h3').style.display = 'none';
        renderDeliveryManagePanel(deliveries[0]);
      }
    } catch (e) {
      content.innerHTML = `<p style="color:#e74c3c;">Failed to load deliveries: ${e.message}</p>`;
    }
  }

  function renderDeliveryManagePanel(delivery) {
    const panel = document.getElementById("delivery-manage-panel");
    if (!panel || !delivery) return;

    const currentIdx = DELIVERY_STATUSES.indexOf(delivery.status);
    const destQuery = encodeURIComponent(delivery.destination || '');

    panel.innerHTML = `
      <div class="dashboard-card" style="border:1px solid var(--border-color); border-radius:var(--border-radius-lg); padding:1.5rem;">
        <h3>Manage Delivery — ${delivery.orders?.order_number || delivery.id}</h3>
        <p style="color:var(--text-secondary);">Current status: <strong style="text-transform:capitalize;">${(delivery.status || 'assigned').replace('_', ' ')}</strong></p>
        <div style="display:flex; gap:0.5rem; flex-wrap:wrap; margin:1rem 0;">
          ${DELIVERY_STATUSES.map((s, i) => `
            <button class="btn btn-sm btn-set-status" data-status="${s}"
              style="background:${i <= currentIdx ? '#ccc' : (s === 'failed' || s === 'cancelled' ? '#D62828' : '#0B3D91')}; color:#fff;">
              ${STATUS_LABELS[s]}
            </button>
          `).join("")}
        </div>
        <div style="display:flex; gap:1rem; flex-wrap:wrap;">
          <a href="https://www.google.com/maps/dir/?api=1&destination=${destQuery}" target="_blank" class="btn btn-outline">
            <i class="fas fa-map-marked-alt"></i> Open in Google Maps
          </a>
          <button class="btn btn-outline btn-call-customer" data-phone="${delivery.orders?.users?.phone || ''}">
            <i class="fas fa-phone"></i> Call Customer
          </button>
        </div>
      </div>
    `;

    panel.querySelectorAll(".btn-set-status").forEach(btn => {
      btn.addEventListener("click", async (e) => {
        const status = e.target.getAttribute("data-status");
        if (status === 'started' && !('geolocation' in navigator)) {
          showToast("GPS is required before starting a delivery", "error");
          return;
        }
        if (status === 'cancelled' && !confirm("Cancelling requires admin approval. Send request?")) return;

        try {
          await apiCall(`/employee/deliveries/${delivery.id}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status })
          });
          delivery.status = status;
          showToast(`Marked as: ${STATUS_LABELS[status]}`, "success");

          if (status === 'started') {
            gpsActiveDeliveryId = delivery.id;
            startGPS(delivery.id);
          }
          if (['delivered', 'failed', 'cancelled'].includes(status)) stopGPS();

          renderDeliveryManagePanel(delivery);
        } catch (err) {
          showToast(err.message || "Failed to update status", "error");
        }
      });
    });

    panel.querySelectorAll(".btn-call-customer").forEach(btn => {
      btn.addEventListener("click", () => {
        const phone = btn.getAttribute("data-phone");
        if (phone) {
          showToast(`Customer Phone: ${phone}`, "info");
        } else {
          showToast("Customer phone not available", "error");
        }
      });
    });
  }

  function startGPS(deliveryId) {
    if (!('geolocation' in navigator)) {
      showToast("GPS is not available on this device/browser", "error");
      return;
    }
    if (gpsWatchId !== null) {
      showToast("GPS tracking already active", "info");
      return;
    }
    gpsActiveDeliveryId = deliveryId;

    gpsWatchId = navigator.geolocation.watchPosition(
      async (pos) => {
        try {
          await apiCall(`/employee/deliveries/${deliveryId}/location`, {
            method: 'POST',
            body: JSON.stringify({
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
              speed: pos.coords.speed,
              heading: pos.coords.heading
            })
          });
        } catch (err) {
          console.error("Location ping failed:", err.message);
        }
      },
      (err) => {
        showToast("GPS permission denied or unavailable: " + err.message, "error");
        stopGPS();
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 }
    );
    showToast("GPS tracking started", "success");
  }

  function stopGPS() {
    if (gpsWatchId !== null) {
      navigator.geolocation.clearWatch(gpsWatchId);
      gpsWatchId = null;
      gpsActiveDeliveryId = null;
      showToast("GPS tracking stopped", "info");
    }
  }
  function renderCustomerDashboard() {
    const container = document.getElementById("app-container");
    container.innerHTML = `
      <div class="section">
        <h2>Customer Dashboard</h2>
        <p>Your orders, track deliveries, profile.</p>
      </div>
    `;
  }

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
    "/admin": renderAdminDashboard,
    "/employee": renderEmployeeDashboard,
    "/customer": renderDashboard,
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
      const cleanPath = hash.split("?")[0];

      // Route Guard Logic
      const authRequired = ['#/admin', '#/employee', '#/customer', '#/dashboard'];
      if (authRequired.includes(cleanPath)) {
        const token = localStorage.getItem(TOKEN_KEY);
        if (!token) {
          showToast("Please log in to access this page", "error");
          window.location.hash = "#/";
          return;
        }

        const role = state.user?.role;
        if (cleanPath === '#/admin' && role !== 'admin') {
          showToast("Unauthorized access: Admins only", "error");
          window.location.hash = "#/";
          return;
        }
        if (cleanPath === '#/employee' && role !== 'employee') {
          showToast("Unauthorized access: Employees only", "error");
          window.location.hash = "#/";
          return;
        }
        if ((cleanPath === '#/customer' || cleanPath === '#/dashboard') && role !== 'customer' && role !== 'client') {
          showToast("Unauthorized access: Customers only", "error");
          window.location.hash = "#/";
          return;
        }
      }

      // Set active link in header based on hash
      const matchingLink = document.querySelector(`.nav-link[href="${cleanPath}"]`);
      if (matchingLink) matchingLink.classList.add("active");

      matchedRenderer(params);
      window.scrollTo(0, 0);

      const rfqBtn = document.getElementById("floating-rfq");
      if (rfqBtn) {
        const role = state.user?.role;
        rfqBtn.style.display = (role === 'client') ? '' : 'none';
      }
    } else {
      container.innerHTML = `
        <div class="section" style="max-width:550px; margin:4rem auto; padding:3rem 2rem; background-color:var(--white); border-radius:var(--border-radius-lg); border:1px solid var(--border-color); box-shadow:var(--shadow-md);">
          <div id="tabs-header" style="display:flex; border-bottom:2px solid var(--border-color); margin-bottom:2rem;">
            <button id="tab-login" class="btn" style="flex:1; border-bottom:3px solid var(--primary-blue);">Login</button>
            <button id="tab-signup" class="btn" style="flex:1; border-bottom:none;">Register</button>
          </div>

          <div id="panel-login">
            <form id="form-login">
              <div class="form-group">
                <input type="email" class="form-control" id="login-email" placeholder="Email" required>
              </div>
              <div class="form-group">
                <input type="password" class="form-control" id="login-pwd" placeholder="Password" required>
              </div>
              <button type="submit" class="btn btn-primary" style="width:100%;">Login</button>
              <div style="text-align:center; margin-top:1rem;">
                <a href="#" id="link-forgot-pwd" style="color:var(--primary-blue); font-size:0.9em; text-decoration:none;">Forgot Password?</a>
              </div>
            </form>
          </div>

          <div id="panel-signup" style="display:none;">
            <form id="form-signup">
              <div class="form-group">
                <input type="text" class="form-control" id="reg-company" placeholder="Company Name" required>
              </div>
              <div class="form-group">
                <input type="text" class="form-control" id="reg-name" placeholder="Contact Person Name" required>
              </div>
              <div class="form-group">
                <input type="text" class="form-control" id="reg-gst" placeholder="GSTIN Number (15-Digit)" pattern="^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$" required>
              </div>
              <div class="form-group">
                <textarea class="form-control" id="reg-address" placeholder="Business Address" rows="2" required></textarea>
              </div>
              <div class="form-group">
                <input type="email" class="form-control" id="reg-email" placeholder="Email" required>
              </div>
              <div class="form-group">
                <input type="password" class="form-control" id="reg-pwd" placeholder="Password" required>
              </div>
              <button type="submit" class="btn btn-primary" style="width:100%;">Continue</button>
            </form>
          </div>

          <div id="panel-reg-otp" style="display:none; text-align:center;">
             <h3>Verify Email</h3>
             <p>An OTP has been sent to your email.</p>
             <form id="form-reg-otp">
               <div class="form-group" style="margin-top:1rem;">
                 <input type="text" class="form-control" id="reg-otp" placeholder="Enter 6-digit OTP" required style="text-align:center; font-size:1.2rem; letter-spacing:2px;">
               </div>
               <button type="submit" class="btn btn-primary" style="width:100%;">Verify & Register</button>
               <button type="button" class="btn btn-outline" id="btn-back-reg" style="width:100%; margin-top:1rem;">Back</button>
             </form>
          </div>

          <div id="panel-forgot-pwd" style="display:none;">
             <h3 style="text-align:center;">Forgot Password</h3>
             <form id="form-forgot-pwd">
               <div class="form-group" style="margin-top:1rem;">
                 <input type="email" class="form-control" id="forgot-email" placeholder="Enter your registered email" required>
               </div>
               <button type="submit" class="btn btn-primary" style="width:100%;">Send Reset OTP</button>
               <button type="button" class="btn btn-outline" id="btn-back-login" style="width:100%; margin-top:1rem;">Back to Login</button>
             </form>
          </div>

          <div id="panel-reset-pwd" style="display:none;">
             <h3 style="text-align:center;">Reset Password</h3>
             <p style="text-align:center;">Enter the OTP sent to your email.</p>
             <form id="form-reset-pwd">
               <div class="form-group" style="margin-top:1rem;">
                 <input type="text" class="form-control" id="reset-otp" placeholder="Enter 6-digit OTP" required style="text-align:center; font-size:1.2rem; letter-spacing:2px;">
               </div>
               <div class="form-group">
                 <input type="password" class="form-control" id="reset-new-pwd" placeholder="New Password" required>
               </div>
               <button type="submit" class="btn btn-primary" style="width:100%;">Reset Password</button>
             </form>
          </div>

        </div>
      `;

      const tabLogin = document.getElementById("tab-login");
      const tabSignup = document.getElementById("tab-signup");
      const panelLogin = document.getElementById("panel-login");
      const panelSignup = document.getElementById("panel-signup");
      const panelRegOtp = document.getElementById("panel-reg-otp");
      const panelForgotPwd = document.getElementById("panel-forgot-pwd");
      const panelResetPwd = document.getElementById("panel-reset-pwd");
      const tabsHeader = document.getElementById("tabs-header");
      
      let tempRegData = null;
      let resetEmail = null;

      const resetViews = () => {
        panelLogin.style.display = "none";
        panelSignup.style.display = "none";
        panelRegOtp.style.display = "none";
        panelForgotPwd.style.display = "none";
        panelResetPwd.style.display = "none";
        tabsHeader.style.display = "flex";
      };

      tabLogin?.addEventListener("click", () => {
        resetViews();
        tabLogin.style.borderBottom = "3px solid var(--primary-blue)";
        tabSignup.style.borderBottom = "none";
        panelLogin.style.display = "block";
      });

      tabSignup?.addEventListener("click", () => {
        resetViews();
        tabSignup.style.borderBottom = "3px solid var(--primary-blue)";
        tabLogin.style.borderBottom = "none";
        panelSignup.style.display = "block";
      });

      document.getElementById("link-forgot-pwd")?.addEventListener("click", (e) => {
        e.preventDefault();
        resetViews();
        tabsHeader.style.display = "none";
        panelForgotPwd.style.display = "block";
      });

      document.getElementById("btn-back-login")?.addEventListener("click", () => {
        tabLogin.click();
      });

      document.getElementById("btn-back-reg")?.addEventListener("click", () => {
        tabSignup.click();
      });

      // 1. Login Submit
      document.getElementById("form-login")?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const email = document.getElementById("login-email").value;
        const password = document.getElementById("login-pwd").value;

        try {
          const data = await apiCall("/auth/login", {
            method: "POST",
            body: JSON.stringify({ email, password })
          });

          const normalizedUser = {
            ...data.user,
            companyName: data.user.companyName || data.user.company_name || "",
            contactPerson: data.user.contactPerson || data.user.company_name || email.split("@")[0],
          };

          localStorage.setItem("ci_token", data.token);
          localStorage.setItem("ci_user", JSON.stringify(normalizedUser));
          state.isLoggedIn = true;
          state.user = normalizedUser;
          saveState();
          showToast("Login successful", "success");
          window.location.hash = getRoleRoute(data.user?.role || normalizedUser.role);
        } catch (err) {
          showToast(err.message, "error");
        }
      });

      // 2. Register Submit (Send OTP)
      document.getElementById("form-signup")?.addEventListener("submit", async (e) => {
        e.preventDefault();
        tempRegData = {
          company_name: document.getElementById("reg-company").value,
          full_name: document.getElementById("reg-name").value,
          gst_number: document.getElementById("reg-gst").value,
          address: document.getElementById("reg-address").value,
          email: document.getElementById("reg-email").value,
          password: document.getElementById("reg-pwd").value
        };

        try {
          await apiCall("/auth/send-register-otp", {
            method: "POST",
            body: JSON.stringify({ email: tempRegData.email })
          });
          
          showToast("OTP sent to your email", "success");
          resetViews();
          tabsHeader.style.display = "none";
          panelRegOtp.style.display = "block";
        } catch (err) {
          showToast(err.message, "error");
        }
      });

      // 3. Register Verify OTP
      document.getElementById("form-reg-otp")?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const otp = document.getElementById("reg-otp").value;
        
        try {
          const data = await apiCall("/auth/register", {
            method: "POST",
            body: JSON.stringify({ ...tempRegData, otp })
          });

          const normalizedUser = {
            ...data.user,
            companyName: data.user.companyName || data.user.company_name || tempRegData.company_name,
            contactPerson: data.user.contactPerson || tempRegData.full_name,
          };

          localStorage.setItem("ci_token", data.token);
          localStorage.setItem("ci_user", JSON.stringify(normalizedUser));
          state.isLoggedIn = true;
          state.user = normalizedUser;
          saveState();
          showToast("Registration successful", "success");
          window.location.hash = getRoleRoute(data.user?.role || normalizedUser.role);
        } catch (err) {
          showToast(err.message, "error");
        }
      });

      // 4. Forgot Password Submit
      document.getElementById("form-forgot-pwd")?.addEventListener("submit", async (e) => {
        e.preventDefault();
        resetEmail = document.getElementById("forgot-email").value;

        try {
          await apiCall("/auth/forgot-password", {
            method: "POST",
            body: JSON.stringify({ email: resetEmail })
          });
          showToast("Password reset OTP sent to your email", "success");
          resetViews();
          tabsHeader.style.display = "none";
          panelResetPwd.style.display = "block";
        } catch (err) {
          showToast(err.message, "error");
        }
      });

      // 5. Reset Password Submit
      document.getElementById("form-reset-pwd")?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const otp = document.getElementById("reset-otp").value;
        const newPassword = document.getElementById("reset-new-pwd").value;

        try {
          await apiCall("/auth/reset-password", {
            method: "POST",
            body: JSON.stringify({ email: resetEmail, otp, newPassword })
          });
          showToast("Password successfully reset! You can now login.", "success");
          tabLogin.click();
        } catch (err) {
          showToast(err.message, "error");
        }
      });
    }
  }

  // --- INITIALIZE SYSTEM BOOTSTRAP ---
  const init = async () => {
    // Fetch live product catalog from backend
    try {
      const res = await apiCall('/products');
      if (res && res.data) {
        db.products = res.data.map(p => ({
          id: p.id,
          name: p.name,
          sku: p.sku,
          price: p.price,
          stock: p.stock,
          minOrder: p.min_order_qty,
          grade: p.specs?.grade || p.material,
          compatibility: p.compatibility || [],
          image: p.image_url || 'assets/default-product.png',
          stockByWarehouse: { "Faridabad Works": p.stock },
          technicalSpecs: p.specs || {},
          compliance: [],
          leadTime: "14-21 Days"
        }));
      }
    } catch (e) {
      console.error("Failed to load live products from backend:", e);
    }

    // Initial badge values
    updateBadges();

    // Route on launch
    router();

    // Autocomplete Search setup
    initSearchAutocomplete();

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