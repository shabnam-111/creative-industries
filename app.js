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
    // Merge standard headers (like getAuthHeaders) with custom headers (if any)
    const headers = { ...getAuthHeaders(), ...(options.headers || {}) };
    
    // Prevent overriding Content-Type if body is FormData (browser will set it automatically with boundary)
    if (options.body instanceof FormData) {
      delete headers['Content-Type'];
    }

    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers
    });
    
    const data = await res.json();
    
    if (!res.ok) {
      if (res.status === 401 && !endpoint.includes('/auth/')) {
        // Auto logout and redirect to login
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem("ci_user");
        state.isLoggedIn = false;
        state.user = null;
        window.location.hash = "#/profile";
        // Stop execution of the caller by returning a Promise that never resolves
        return new Promise(() => {}); 
      }
      throw new Error(data.message || 'API Error');
    }
    
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
      if (state.isLoggedIn) {
        await apiCall('/cart/add', {
          method: 'POST',
          body: JSON.stringify({ productId, quantity: newQty })
        });
      }
    } catch (err) {
      console.error("Cart sync failed:", err.message);
    }
  }
  window.addToCart = addToCart;

  // Safe wrapper to prevent local storage crashes
  function safeJSONParse(key, fallback) {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : fallback;
    } catch (e) {
      console.warn(`Corrupted localStorage key "${key}" detected. Resetting to fallback.`);
      localStorage.removeItem(key);
      return fallback;
    }
  }

  // --- STATE MANAGEMENT ---
  const state = {
    cart: safeJSONParse("ci_cart", []),
    compare: safeJSONParse("ci_compare", []),
    recentlyViewed: safeJSONParse("ci_recently_viewed", []),
    orders: safeJSONParse("ci_orders", [
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
    ]),
    user: safeJSONParse("ci_user", null),
    isLoggedIn: !!localStorage.getItem("ci_token"),
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
    'pending', 'accepted', 'started', 'reached_pickup',
    'in_transit', 'reached_destination', 'delivered', 'delivery_failed', 'cancelled'
  ];
  const STATUS_LABELS = {
    pending: 'Assigned', accepted: 'Accept Delivery', started: 'Start Delivery',
    reached_pickup: 'Arrived at Pickup', in_transit: 'In Transit',
    reached_destination: 'Arrived at Destination',
    delivered: 'Delivered', delivery_failed: 'Delivery Failed', cancelled: 'Cancelled'
  };
  let gpsWatchId = null;
  let gpsActiveDeliveryId = null;

  function renderEmployeeDashboard() {
    const container = document.getElementById("app-container");
    container.innerHTML = `
      <div class="section" style="max-width:1200px; margin:0 auto;">
        <h1 class="section-title">Employee Dashboard</h1>
        <div style="display:flex; gap:1rem; margin-bottom:2rem; flex-wrap:wrap;">
          <button id="btn-assigned-deliveries" class="btn btn-primary">Manage Deliveries</button>
        </div>
        <div id="employee-content" style="background:var(--white); padding:2rem; border-radius:var(--border-radius-lg);">
          <p>Select an option above.</p>
        </div>
      </div>
    `;
    document.getElementById("btn-assigned-deliveries").addEventListener("click", () => viewAssignedDeliveries());
  }

  async function viewAssignedDeliveries() {
    const content = document.getElementById("employee-content");
    content.innerHTML = `<p>Loading assigned deliveries...</p>`;
    try {
      const res = await apiCall('/employee/deliveries');
      const deliveries = res.data || [];

      if (deliveries.length === 0) {
        content.innerHTML = `<h3>Manage Deliveries</h3><p>No deliveries currently assigned to you.</p>`;
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
          <td><span class="status-badge">${(d.status || 'pending').replace('_', ' ')}</span></td>
          <td><button class="btn btn-primary btn-sm btn-manage-delivery">Manage</button></td>
        </tr>
      `).join("");

      content.innerHTML = `
        <h3>Manage Deliveries (${deliveries.length})</h3>
        <div class="table-responsive">
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

      // Removed focusUpdate logic
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
        <p style="color:var(--text-secondary);">Current status: <strong style="text-transform:capitalize;">${(delivery.status || 'pending').replace('_', ' ')}</strong></p>
        <div style="display:flex; gap:0.5rem; flex-wrap:wrap; margin:1rem 0;">
          ${DELIVERY_STATUSES.map((s, i) => `
            <button class="btn btn-sm btn-set-status" data-status="${s}"
              style="background:${i <= currentIdx ? '#ccc' : (s === 'delivery_failed' || s === 'cancelled' ? '#D62828' : '#0B3D91')}; color:#fff;">
              ${STATUS_LABELS[s]}
            </button>
          `).join("")}
        </div>
        <div style="display:flex; gap:1rem; flex-wrap:wrap; margin-bottom: 1rem;">
          <a href="https://www.google.com/maps/dir/?api=1&destination=${destQuery}" target="_blank" class="btn btn-outline">
            <i class="fas fa-map-marked-alt"></i> Open in Google Maps
          </a>
          <button class="btn btn-outline btn-call-customer" data-phone="${delivery.orders?.users?.phone || ''}">
            <i class="fas fa-phone"></i> Call Customer
          </button>
          ${['started', 'reached_pickup', 'in_transit'].includes(delivery.status) ? `
          <button class="btn btn-primary btn-toggle-gps" style="background:${gpsActiveDeliveryId === delivery.id ? '#D62828' : '#10B981'}; border:none;">
            <i class="fas ${gpsActiveDeliveryId === delivery.id ? 'fa-stop-circle' : 'fa-location-arrow'}"></i> 
            ${gpsActiveDeliveryId === delivery.id ? 'Stop GPS Tracking' : 'Resume / Start GPS'}
          </button>
          ` : ''}
        </div>
        
        <div id="otp-section-${delivery.id}" style="margin-top: 1.5rem; padding: 1.25rem; border: 1px solid var(--border-color); border-radius: var(--border-radius-md); background: #f9fafb;">
          <h4 style="margin-bottom:0.25rem; color:var(--primary-blue);"><i class="fas fa-shield-alt"></i> Verify Delivery</h4>
          <p style="font-size: 0.9rem; color: var(--text-secondary); margin-bottom: 1rem;">To mark this order as delivered, generate and verify the secure delivery OTP.</p>
          <div style="display: flex; gap: 0.75rem; align-items: center; flex-wrap:wrap;">
             <button class="btn btn-primary btn-send-otp" data-id="${delivery.id}"><i class="fas fa-paper-plane"></i> Send Delivery OTP</button>
             <input type="text" id="otp-input-${delivery.id}" placeholder="Enter 6-digit OTP" class="form-control" style="width: 160px; display: none;" />
             <button class="btn btn-success btn-verify-otp" data-id="${delivery.id}" style="display: none; background:#10B981; color:#fff;"><i class="fas fa-check-circle"></i> Verify & Mark Delivered</button>
          </div>
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
        if (status === 'delivered') {
          showToast("Please use the Verify Delivery section below to mark as delivered.", "info");
          document.getElementById(`otp-section-${delivery.id}`).scrollIntoView({ behavior: 'smooth', block: 'center' });
          return;
        }

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
          if (['delivered', 'delivery_failed', 'cancelled'].includes(status)) stopGPS();

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
          window.location.href = `tel:${phone}`;
        } else {
          showToast("Customer phone not available", "error");
        }
      });
    });

    panel.querySelector(".btn-toggle-gps")?.addEventListener("click", () => {
      if (gpsActiveDeliveryId === delivery.id) {
        stopGPS();
      } else {
        if (gpsWatchId) stopGPS(); // Stop any other tracking first
        gpsActiveDeliveryId = delivery.id;
        startGPS(delivery.id);
      }
      renderDeliveryManagePanel(delivery); // Re-render to update the button color/text
    });

    panel.querySelector(".btn-send-otp")?.addEventListener("click", async (e) => {
      const btn = e.target.closest('button');
      const id = btn.getAttribute("data-id");
      const originalText = btn.innerHTML;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
      btn.disabled = true;

      try {
        const res = await apiCall(`/employee/deliveries/${id}/send-otp`, { method: 'POST' });
        showToast(res.message || "OTP Sent successfully!", "success");
        btn.innerHTML = '<i class="fas fa-redo"></i> Resend OTP';
        btn.disabled = false;
        
        document.getElementById(`otp-input-${id}`).style.display = 'block';
        panel.querySelector(".btn-verify-otp").style.display = 'block';
      } catch (err) {
        showToast(err.message || "Failed to send OTP", "error");
        btn.innerHTML = originalText;
        btn.disabled = false;
      }
    });

    panel.querySelector(".btn-verify-otp")?.addEventListener("click", async (e) => {
      const btn = e.target.closest('button');
      const id = btn.getAttribute("data-id");
      const otpInput = document.getElementById(`otp-input-${id}`);
      const otp = otpInput.value.trim();

      if (!otp || otp.length !== 6) {
        showToast("Please enter a valid 6-digit OTP", "error");
        return;
      }

      const originalText = btn.innerHTML;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verifying...';
      btn.disabled = true;

      try {
        await apiCall(`/employee/deliveries/${id}/status`, {
          method: 'PATCH',
          body: JSON.stringify({ status: 'delivered', otp })
        });
        delivery.status = 'delivered';
        showToast(`Delivery marked as Delivered!`, "success");
        stopGPS();
        renderDeliveryManagePanel(delivery);
      } catch (err) {
        showToast(err.message || "Failed to verify OTP and update status", "error");
        btn.innerHTML = originalText;
        btn.disabled = false;
      }
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

  // --- LEAFLET MAP INTEGRATION ---
  let activeMapInterval = null;
  function renderDeliveryMap(containerId, endpoint) {
    const container = document.getElementById(containerId);
    if (!container || !window.L) return;

    if (activeMapInterval) {
      clearInterval(activeMapInterval);
      activeMapInterval = null;
    }

    container.innerHTML = `
      <div style="position:relative; width:100%; height:300px; border-radius:var(--border-radius); overflow:hidden;">
        <div id="leaflet-map" style="height:100%; width:100%; z-index:1;"></div>
        <div id="map-overlay-msg" style="position:absolute; top:0; left:0; width:100%; height:100%; z-index:1000; display:flex; justify-content:center; align-items:center; background:rgba(255,255,255,0.85); flex-direction:column; text-align:center; padding:1rem;">
          <i class="fas fa-satellite-dish fa-fade" style="font-size:2.5rem; color:var(--text-secondary); margin-bottom:1rem;"></i>
          <h4 style="color:var(--dark-gray); margin:0;">Waiting for GPS signal...</h4>
          <p style="color:var(--text-secondary); font-size:0.85rem; margin-top:0.5rem;">The delivery partner has not yet started their GPS tracking or the signal is lost.</p>
        </div>
      </div>
    `;
    
    const map = L.map('leaflet-map').setView([28.6139, 77.2090], 12); // Default Delhi
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    let marker = null;
    let polyline = L.polyline([], {color: 'blue'}).addTo(map);

    const updateMap = async () => {
      try {
        const res = await apiCall(endpoint);
        if (res.success && res.data && res.data.length > 0) {
          const overlayEl = document.getElementById('map-overlay-msg');
          if (overlayEl) overlayEl.style.display = 'none';

          const latlngs = res.data.map(p => [p.latitude, p.longitude]);
          polyline.setLatLngs(latlngs);
          
          const latest = latlngs[latlngs.length - 1];
          if (!marker) {
            marker = L.marker(latest).addTo(map);
            map.fitBounds(polyline.getBounds());
          } else {
            marker.setLatLng(latest);
          }
        }
      } catch (err) {
        console.error("Map update failed:", err);
      }
    };

    updateMap();
    activeMapInterval = setInterval(updateMap, 10000); // Update every 10 seconds
    
    // Clear interval when navigating away
    const origHashChange = window.onhashchange;
    window.onhashchange = (e) => {
      if (activeMapInterval) {
        clearInterval(activeMapInterval);
        activeMapInterval = null;
      }
      if (origHashChange) origHashChange(e);
    };
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
      const authRequired = ['#/admin', '#/employee', '#/customer', '#/dashboard', '#/checkout'];
      if (authRequired.includes(cleanPath)) {
        const token = localStorage.getItem(TOKEN_KEY);
        if (!token) {
          window.location.hash = "#/profile";
          return;
        }

        let role = state.user?.role || state.user?.user?.role;
        if (!role) {
          role = 'client';
          if (state.user) {
            state.user.role = role;
            localStorage.setItem("ci_user", JSON.stringify(state.user));
          }
        }
        role = role.toLowerCase();

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
        if ((cleanPath === '#/customer' || cleanPath === '#/dashboard') && role !== 'customer' && role !== 'client' && role !== 'admin') {
          showToast(`Unauthorized access: Customers only (Debug: role=${role}, user=${state.user ? 'exists' : 'null'})`, "error");
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
        <div class="section" style="text-align:center; padding: 8rem 2rem; display:flex; flex-direction:column; align-items:center; justify-content:center; min-height: 60vh;">
          <i class="fas fa-exclamation-triangle" style="font-size: 5rem; color: var(--primary-red); margin-bottom: 1.5rem;"></i>
          <h2 style="font-size: 4rem; margin-bottom: 0.5rem; color: var(--primary-blue); line-height:1;">404</h2>
          <h3 style="font-size: 1.75rem; margin-bottom: 1rem; color: var(--text-primary);">Oops! Page Not Found</h3>
          <p style="color: var(--text-secondary); max-width: 500px; margin: 0 auto 2.5rem; font-size: 1.1rem; line-height:1.6;">
            The component or page you are looking for might have been removed, had its name changed, or is temporarily unavailable.
          </p>
          <a href="#/" class="btn btn-primary" style="padding: 0.85rem 2.5rem; font-size: 1.1rem; box-shadow: 0 4px 14px rgba(37,99,235,0.3); border-radius: 50px;">
            <i class="fas fa-home" style="margin-right: 0.5rem;"></i> Back to Home
          </a>
        </div>
      `;
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

  async function renderProducts() {
    const container = document.getElementById("app-container");

    container.innerHTML = `
    <div class="section">
      <h2 class="section-title">Our Premium Sheet Metal Components</h2>
      <div id="products-grid" class="products-grid"></div>
    </div>
  `;

    try {
      const result = await apiCall('/products');
      const products = result.data || result || [];

      let html = '';
      products.forEach(p => {
        const stockClass = p.stock > 0 ? 'stock-in' : 'stock-low';
        const stockText = p.stock > 0 ? `${p.stock} pcs In Stock` : 'Out of Stock';

        html += `
        <div class="product-card">
          <div class="product-card-img-wrapper">
            <img src="${p.image_url || p.image}" class="product-card-img" alt="${p.name}">
          </div>
          <div class="product-card-body">
            <h3 class="product-card-title">${p.name}</h3>
            <div class="product-card-specs">
              <span><strong>SKU:</strong> ${p.sku}</span>
              <span><strong>Thickness:</strong> ${p.thickness || 'N/A'}</span>
              <span><strong>Material:</strong> ${p.material || 'Steel'}</span>
            </div>
            <div class="product-card-price-row">
              <div class="product-card-price">
                <span class="price-label">Price per unit</span>
                <span class="price-amount">₹${p.price}</span>
              </div>
              <div class="product-card-stock ${stockClass}">
                ${stockText}
              </div>
            </div>
            <p><strong>Min Order:</strong> ${p.min_order_qty || 1} pcs</p>
            
            <div class="card-actions">
              <button onclick="addToCart('${p.id}', 1)" class="btn btn-primary" style="flex:1;">
                <i class="fas fa-cart-plus"></i> Add to Cart
              </button>
            </div>
          </div>
        </div>
      `;
      });

      document.getElementById("products-grid").innerHTML = html || "<p>No products found.</p>";

    } catch (error) {
      console.error(error);
      document.getElementById("products-grid").innerHTML = `
      <p style="color:red; text-align:center; padding:3rem;">
        Failed to load products from server.
      </p>`;
    }
  }

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

    // Compare details trigger
    document.getElementById("btn-details-compare")?.addEventListener("click", () => {
      toggleCompare(prod.id);
    });

    // PDF Spec trigger
    document.getElementById("btn-download-pdf")?.addEventListener("click", () => {
      generateProductPDF(prod);
    });
  }

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
        ${(!state.user || state.orders.filter(o => o.company === (state.user.companyName || state.user.company_name)).length === 0) ? `
          <p style="color:var(--text-secondary); text-align:center; padding:1.5rem;">${!state.user ? 'Log in to view your purchase orders.' : 'No purchase orders placed yet.'}</p>
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
                ${state.orders.filter(o => o.company === (state.user.companyName || state.user.company_name)).map(o => `
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
      btn.addEventListener("click", async () => {
        const idx = parseInt(btn.getAttribute("data-idx"), 10);
        const item = state.cart[idx];
        const prod = db.products.find(p => p.id === item.productId);
        if (item.qty > prod.minOrder) {
          item.qty--;
          saveState();
          renderCart();
          try {
            if (state.isLoggedIn) await apiCall('/cart/add', { method: 'POST', body: JSON.stringify({ productId: item.productId, quantity: item.qty }) });
          } catch (err) { console.error(err.message); }
        } else {
          showToast(`Cannot order less than MOQ (${prod.minOrder} pcs) for ${prod.name}`, "error");
        }
      });
    });

    document.querySelectorAll(".btn-cart-qty-plus").forEach(btn => {
      btn.addEventListener("click", async () => {
        const idx = parseInt(btn.getAttribute("data-idx"), 10);
        state.cart[idx].qty++;
        saveState();
        renderCart();
        try {
          const item = state.cart[idx];
          if (state.isLoggedIn) await apiCall('/cart/add', { method: 'POST', body: JSON.stringify({ productId: item.productId, quantity: item.qty }) });
        } catch (err) { console.error(err.message); }
      });
    });

    document.querySelectorAll(".cart-qty-val").forEach(input => {
      input.addEventListener("change", async () => {
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
        try {
          if (state.isLoggedIn) await apiCall('/cart/add', { method: 'POST', body: JSON.stringify({ productId: item.productId, quantity: item.qty }) });
        } catch (err) { console.error(err.message); }
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

    // Block checkout if any item is below its minimum order quantity
    const moqIssues = state.cart.filter(item => {
      const prod = db.products.find(p => p.id === item.productId);
      return prod && item.qty < (prod.minOrder || prod.min_order_qty || 1);
    });
    if (moqIssues.length > 0) {
      const names = moqIssues.map(i => db.products.find(p => p.id === i.productId)?.name).join(', ');
      showToast(`Please meet the minimum order quantity for: ${names}`, "error");
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
              <label class="radio-label" style="background:rgba(1,82,204,0.05); border-color:var(--primary-color);">
                <input type="radio" name="checkout-payment" value="Paytm" checked>
                <div style="display:flex; align-items:center; gap:1rem;">
                  <img src="https://logodownload.org/wp-content/uploads/2019/09/paytm-logo-2.png" alt="Paytm" style="height:24px;">
                  <div>
                    <strong style="color:var(--primary-color);">Secure Payment via Paytm</strong><br>
                    <span style="font-size:0.8rem; color:var(--text-secondary);">Pay instantly using UPI, Net Banking, or Credit/Debit Cards.</span>
                  </div>
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
    const submitBtn = document.querySelector('button[form="checkout-form"]');
    
    form?.addEventListener("submit", async (e) => {
      e.preventDefault();
      
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
      }

      const company = document.getElementById("checkout-company").value;
      const gstVal = document.getElementById("checkout-gst").value;
      const person = document.getElementById("checkout-person").value;
      const phone = document.getElementById("checkout-phone").value;
      const email = document.getElementById("checkout-email").value;
      const address = document.getElementById("checkout-address").value;
        const paymentVal = "Paytm";

        state.user = {
          companyName: company,
          gstNumber: gstVal,
          contactPerson: person,
          phone: phone,
          email: email,
          address: address
        };

        try {
          // Explicitly save the updated profile to the backend
          try {
            await apiCall('/profile', {
              method: 'PUT',
              body: JSON.stringify({ companyName: company, gstNumber: gstVal, contactPerson: person, phone: phone, address: address })
            });
          } catch (profileErr) {
            console.warn("Could not save profile during checkout", profileErr);
          }

          // Force sync frontend cart to backend to ensure cart is not empty on the server
          try {
            for (const item of state.cart) {
              await apiCall('/cart/add', { method: 'POST', body: JSON.stringify({ productId: item.productId, quantity: item.qty || item.quantity }) });
            }
          } catch (syncErr) {
            console.warn("Could not sync cart before checkout", syncErr);
          }

          // We create the order first. We will assume the status stays "pending_payment" (handled in db by default or we pass it)
          const res = await apiCall('/orders', {
            method: 'POST',
            body: JSON.stringify({ remarks: paymentVal })
          });
          const order = res.data;

          const realItems = order.items && order.items.length > 0 ? order.items : state.cart.map(item => {
            const prod = db.products.find(p => p.id === item.productId);
            return { productId: item.productId, name: prod?.name, qty: item.qty, price: prod?.price };
          });

          const realSubtotal = realItems.reduce((sum, i) => sum + ((i.price || 0) * (i.qty || i.quantity || 0)), 0);
          const realGst = realSubtotal * 0.18;
          const realShipping = realSubtotal > 100000 ? 0 : (order.total_amount ? 4500 : 3500);
          const orderTotal = order.total_amount || (realSubtotal + realGst + realShipping);

          // Initiate Paytm Transaction
          const paytmRes = await apiCall('/paytm/initiate', {
            method: 'POST',
            body: JSON.stringify({
              orderId: order.id,
              amount: orderTotal
            })
          });

          if (paytmRes.success) {
            if (paytmRes.txnToken === 'MOCK_TXN_TOKEN') {
              // Mock Paytm Modal for Test Environment Without Keys
              const mockModal = document.createElement("div");
              mockModal.style.cssText = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.8); z-index:9999; display:flex; align-items:center; justify-content:center;";
              mockModal.innerHTML = `
                <div style="background:var(--white); padding:2rem; border-radius:12px; text-align:center; max-width:400px; width:90%;">
                  <img src="https://logodownload.org/wp-content/uploads/2019/09/paytm-logo-2.png" alt="Paytm" style="height:32px; margin-bottom:1rem;">
                  <h3 style="margin-bottom:0.5rem;">Test Environment</h3>
                  <p style="color:var(--text-secondary); margin-bottom:1.5rem;">No Paytm API keys found. This is a mock payment screen to simulate the flow.</p>
                  <p style="font-size:1.5rem; font-weight:700; margin-bottom:2rem;">Pay ₹${orderTotal.toLocaleString("en-IN")}</p>
                  <form method="POST" action="/api/paytm/callback">
                    <input type="hidden" name="ORDERID" value="${order.id}">
                    <input type="hidden" name="MOCK" value="true">
                    <button type="submit" class="btn btn-primary" style="width:100%; font-size:1.1rem;">Simulate Successful Payment</button>
                  </form>
                  <button type="button" class="btn btn-outline" style="width:100%; margin-top:1rem;" onclick="this.closest('div').parentElement.remove(); window.location.hash = '#/confirmation/${order.id}?status=failed';">Cancel</button>
                </div>
              `;
              document.body.appendChild(mockModal);
              state.cart = [];
              saveState();
            } else {
              // Real Paytm SDK Initialization
              if (!document.getElementById("paytm-checkout-script")) {
                const script = document.createElement("script");
                script.id = "paytm-checkout-script";
                script.type = "application/javascript";
                script.src = `https://${paytmRes.environment}/merchantpgpui/checkoutjs/merchants/${paytmRes.mid}.js`;
                document.body.appendChild(script);
              }

              const checkPaytmReady = setInterval(() => {
                if (window.Paytm && window.Paytm.CheckoutJS) {
                  clearInterval(checkPaytmReady);
                  
                  const config = {
                    root: "",
                    flow: "DEFAULT",
                    data: {
                      orderId: order.id,
                      token: paytmRes.txnToken,
                      tokenType: "TXN_TOKEN",
                      amount: orderTotal.toString()
                    },
                    handler: {
                      notifyMerchant: function(eventName, data) {
                        console.log("Paytm Event:", eventName, data);
                      }
                    }
                  };

                  state.cart = []; // Empty cart
                  saveState();

                  window.Paytm.CheckoutJS.init(config).then(function onSuccess() {
                    window.Paytm.CheckoutJS.invoke();
                  }).catch(function onError(error) {
                    showToast("Paytm Initialization Failed", "error");
                  });
                }
              }, 500);
            }
          } else {
            if (submitBtn) {
              submitBtn.disabled = false;
              submitBtn.innerHTML = '<i class="fas fa-check-double"></i> Confirm Purchase Order';
            }
            showToast("Failed to initiate Paytm: " + paytmRes.message, "error");
          }
        } catch (err) {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-check-double"></i> Confirm Purchase Order';
          }
          showToast(err.message || "Failed to place order", "error");
        }
      });

    document.getElementById("checkout-person")?.addEventListener("blur", (e) => {
      const newVal = e.target.value.trim();
      if (newVal && newVal !== (state.user?.contactPerson || '')) {
        confirmFieldUpdate("Contact Person Name", { fullName: newVal }, () => {
          state.user.contactPerson = newVal;
          saveState();
        });
      }
    });

    document.getElementById("checkout-company")?.addEventListener("blur", (e) => {
      const newVal = e.target.value.trim();
      if (newVal && newVal !== (state.user?.companyName || '')) {
        confirmFieldUpdate("Company Name", { companyName: newVal }, () => {
          state.user.companyName = newVal;
          saveState();
        });
      }
    });
  }

  // 9. ORDER CONFIRMATION VIEW
  async function renderConfirmation(params) {
    const orderId = params.id;
    let order = state.orders.find(o => o.id === orderId);
    
    // If we loaded the page directly on this URL, orders might not be fetched yet
    if (!order && state.isLoggedIn) {
      try {
        const res = await apiCall('/orders');
        state.orders = res.data.map(o => {
          return {
            id: o.order_number,
            realId: o.id,
            date: (o.created_at || new Date().toISOString()).split("T")[0],
            gst: state.user.gstNumber || "N/A",
            payment: o.payment_method || "Paytm",
            total: Number(o.total_amount || 0),
            status: o.status === 'pending_payment' ? 'Pending Payment' : o.status === 'pending' ? 'Processing' : o.status === 'dispatched' ? 'Dispatched' : o.status === 'delivered' ? 'Delivered' : o.status,
            items: (o.order_items || []).map(i => ({
              productId: i.product_id,
              name: i.products?.name,
              qty: i.quantity,
              price: Number(i.price)
            }))
          };
        });
        order = state.orders.find(o => o.id === orderId || o.realId === orderId);
      } catch (err) {
        console.error("Failed to fetch order for confirmation:", err);
      }
    }

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

  const performTracking = async (query) => {
    const resultsBox = document.getElementById("track-results-container");
    if (!resultsBox) return;

    resultsBox.innerHTML = `<div style="padding:2rem; text-align:center;"><i class="fas fa-circle-notch fa-spin"></i> Searching...</div>`;

    if (!localStorage.getItem("ci_token")) {
      resultsBox.innerHTML = `
        <div style="padding:2rem; text-align:center; background-color:var(--light-gray); border-radius:var(--border-radius); border:1px solid var(--border-color);">
          <i class="fas fa-lock" style="font-size:2.5rem; color:var(--text-secondary); margin-bottom:1rem;"></i>
          <h4>Please log in to track your orders.</h4>
          <a href="#/profile" class="btn btn-primary" style="margin-top:1rem;">Log In</a>
        </div>
      `;
      return;
    }

    let matched = [];
    try {
      const res = await apiCall('/orders');
      const backendOrders = res.data || [];
      matched = backendOrders
        .filter(o =>
          o.order_number.toLowerCase() === query.toLowerCase() ||
          (state.user.phone || '').replace(/\s+/g, '') === query.replace(/\s+/g, '')
        )
        .map(o => {
          let effStatus = o.status;
          
          let deliveriesArray = [];
          if (Array.isArray(o.deliveries)) {
             deliveriesArray = o.deliveries;
          } else if (o.deliveries) {
             deliveriesArray = [o.deliveries];
          }

          return {
          id: o.order_number,
          realId: o.id,
          date: (o.created_at || new Date().toISOString()).split("T")[0],
          company: state.user.companyName,
          address: state.user.address,
          payment: o.remarks || 'Net 30',
          status: effStatus,
          deliveries: deliveriesArray,
          items: (o.items || []).map(i => ({
            productId: i.product_id || i.productId,
            name: i.name,
            qty: i.quantity || i.qty,
            price: i.price
          }))
          };
        });
    } catch (err) {
      resultsBox.innerHTML = `<p style="color:#e74c3c; text-align:center; padding:2rem;">Failed to fetch order: ${err.message}</p>`;
      return;
    }

    if (matched.length === 0) {
      resultsBox.innerHTML = `
        <div style="padding:2rem; text-align:center; background-color:var(--light-gray); border-radius:var(--border-radius); border:1px solid var(--border-color);">
          <i class="fas fa-search-minus" style="font-size:2.5rem; color:var(--text-secondary); margin-bottom:1rem;"></i>
          <h4>No active shipments found.</h4>
          <p style="color:var(--text-secondary); font-size:0.85rem; margin-top:0.25rem;">Double check the Order ID (e.g. ORD-XXXXXX) or ensure the contact number matches your profile.</p>
        </div>
      `;
      return;
    }

    const statusFlow = ["pending", "accepted", "dispatched", "delivered"];
    let searchResultsHtml = "";

    matched.forEach(order => {
      const isRejected = order.status === 'rejected';
      const currentStatusIdx = statusFlow.indexOf(order.status);

      const statusLabels = { pending: "Order Received", accepted: "Processing", dispatched: "Dispatched", delivered: "Delivered", rejected: "Rejected" };
      const displayStatus = statusLabels[order.status] || order.status;

      let stepsHtml = "";
      if (isRejected) {
        stepsHtml = `
          <div class="timeline-step active" style="border-color:#D62828;">
            <div class="timeline-icon" style="background:#D62828;"><i class="fas fa-times" style="font-size:0.65rem; color:var(--white)"></i></div>
            <div class="timeline-info">
              <span class="timeline-title" style="color:#D62828;">Order Rejected</span>
              <span class="timeline-date">Please contact support for details</span>
            </div>
          </div>
        `;
      } else {
        const labels = statusLabels;
        statusFlow.forEach((status, idx) => {
          let stepClass = "";
          let iconHtml = '<i class="fas fa-circle" style="font-size:0.5rem; color:var(--text-secondary)"></i>';

          if (idx < currentStatusIdx || (idx === currentStatusIdx && status === 'delivered')) {
            stepClass = "completed";
            iconHtml = '<i class="fas fa-check" style="font-size:0.65rem; color:var(--white)"></i>';
          } else if (idx === currentStatusIdx) {
            stepClass = "active";
            iconHtml = '<i class="fas fa-truck-loading" style="font-size:0.65rem; color:var(--white)"></i>';
          }

          const baseDate = new Date(order.date);
          baseDate.setDate(baseDate.getDate() + idx);
          const now = new Date();
          if (baseDate > now) {
            baseDate.setTime(now.getTime());
          }
          const dateString = idx <= currentStatusIdx ? baseDate.toLocaleDateString("en-IN", { month: 'short', day: 'numeric', year: 'numeric' }) : "--";

          stepsHtml += `
            <div class="timeline-step ${stepClass}">
              <div class="timeline-icon">${iconHtml}</div>
              <div class="timeline-info">
                <span class="timeline-title">${labels[status]}</span>
                <span class="timeline-date">${dateString}</span>
              </div>
            </div>
          `;
        });
      }

      let deliveryHtml = "";
      if (['dispatched', 'delivered'].includes(order.status) && order.deliveries && order.deliveries.length > 0) {
        const del = order.deliveries[0];
        const delName = del.users?.full_name || "Assigned Driver";
        const delVehicle = del.vehicles?.vehicle_number || "TBD";
        const etaDate = del.expected_delivery_time ? new Date(del.expected_delivery_time).toLocaleString("en-IN", { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : "TBD";
        const mapContainerId = `map-container-${order.id}`;
        deliveryHtml = `
          <div style="margin-top: 1rem; padding: 1rem; background-color: var(--accent-light); border-radius: var(--border-radius); border: 1px solid #cce5ff;">
            <h4 style="color: var(--primary-blue); margin-bottom: 0.5rem; font-size: 0.95rem;"><i class="fas fa-truck"></i> Delivery Details</h4>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; font-size: 0.85rem; color: var(--text-primary);">
              <div><strong style="color:var(--text-secondary)">Driver Name:</strong><br>${delName}</div>
              <div><strong style="color:var(--text-secondary)">Vehicle Number:</strong><br>${delVehicle}</div>
              <div style="grid-column: span 2;"><strong style="color:var(--text-secondary)">Expected Delivery (ETA):</strong><br>${etaDate}</div>
            </div>
            ${order.status === 'dispatched' ? `<div id="${mapContainerId}" style="margin-top: 1rem;"></div>` : ''}
          </div>
        `;
        if (order.status === 'dispatched') {
          setTimeout(() => renderDeliveryMap(mapContainerId, `/orders/${order.realId}/delivery-location`), 100);
        }
      }

      searchResultsHtml += `
        <div style="border:1px solid var(--border-color); border-radius:var(--border-radius-lg); padding:2rem; margin-bottom:2rem; background-color:var(--white); box-shadow:var(--shadow-sm);">
          <div style="display:flex; justify-content:space-between; border-bottom:1px solid var(--border-color); padding-bottom:1rem; margin-bottom:1.5rem; flex-wrap:wrap; gap:0.5rem;">
            <div>
              <span style="font-size:0.8rem; text-transform:uppercase; font-weight:700; color:var(--text-secondary)">Order Reference</span>
              <h3 style="font-size:1.25rem; color:var(--primary-blue);">${order.id}</h3>
            </div>
            <div style="text-align:right;">
              <span style="font-size:0.8rem; text-transform:uppercase; font-weight:700; color:var(--text-secondary)">Current Status</span>
              <h3 style="font-size:1.1rem; color:${isRejected ? '#D62828' : '#15803D'}; text-transform:capitalize;">${displayStatus}</h3>
            </div>
          </div>

          <div style="margin-bottom:1.5rem; font-size:0.9rem;">
            <strong>Consigned To:</strong> ${order.company}<br>
            <strong>Destination Address:</strong> ${order.address}<br>
            <strong>Repayment Plan:</strong> ${order.payment}
            ${deliveryHtml}
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
  async function renderDashboard() {
    const container = document.getElementById("app-container");

    try {
      container.innerHTML = `<div style="padding: 3rem; text-align: center; color: var(--text-secondary);"><i class="fas fa-circle-notch fa-spin"></i> Syncing orders with Supabase...</div>`;
      const res = await apiCall('/orders');
      if (res && res.data) {
        const syncedOrders = res.data.map(o => ({
          id: o.order_number,
          dbId: o.id,
          date: (o.created_at || new Date().toISOString()).split("T")[0],
          company: state.user.companyName,
          items: o.items.map(i => ({
            productId: i.product_id || i.productId,
            name: i.name,
            qty: i.quantity || i.qty,
            price: i.price
          })),
          total: o.total_amount,
          status: o.status.charAt(0).toUpperCase() + o.status.slice(1)
        }));

        // Merge synced orders and keep other companies' orders to avoid wiping mock data
        const otherOrders = state.orders.filter(o => o.company !== state.user.companyName);
        state.orders = [...syncedOrders, ...otherOrders];
        saveState();
      }
    } catch (err) {
      console.error("Failed to sync orders:", err);
    }

    let orderRows = "";
    const userOrders = state.orders.filter(o => o.company === state.user.companyName);
    userOrders.forEach(o => {
      const uncancelableStatuses = ['Dispatched', 'In_transit', 'Arrived_destination', 'Delivered', 'Cancelled', 'Failed'];
      const canCancel = !uncancelableStatuses.includes(o.status);
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
              background-color:${o.status === 'Delivered' ? '#DCFCE7' : o.status === 'Dispatched' ? '#E0F2FE' : o.status === 'Cancelled' ? '#FEE2E2' : '#FEF3C7'};
              color:${o.status === 'Delivered' ? '#15803D' : o.status === 'Dispatched' ? '#0369A1' : o.status === 'Cancelled' ? '#991B1B' : '#B45309'};">
              ${o.status}
            </span>
          </td>
          <td style="padding:1rem; display:flex; gap:0.25rem;">
            <button class="btn btn-outline btn-sm btn-reorder" data-id="${o.id}" title="Reorder Items"><i class="fas fa-redo"></i> Reorder</button>
            <button class="btn btn-secondary btn-sm btn-dash-invoice" data-id="${o.id}" style="color:var(--text-primary)"><i class="fas fa-file-download"></i></button>
            ${canCancel && o.dbId ? `<button class="btn btn-outline btn-sm btn-cancel-order" data-dbid="${o.dbId}" style="color:var(--primary-red); border-color:var(--primary-red);" title="Cancel Order"><i class="fas fa-times"></i> Cancel</button>` : ''}
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

    // Cancel order trigger
    container.querySelectorAll(".btn-cancel-order").forEach(btn => {
      btn.addEventListener("click", async () => {
        const dbId = btn.getAttribute("data-dbid");
        if (!dbId) return;
        
        if (confirm("Are you sure you want to cancel this order? This action cannot be undone.")) {
          try {
            const btnOriginalText = btn.innerHTML;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Cancelling...';
            btn.disabled = true;
            
            const res = await apiCall(`/orders/${dbId}/cancel`, {
              method: 'PATCH'
            });
            
            showToast("Order cancelled successfully", "success");
            renderDashboard(); // Refresh to get the updated status
          } catch (err) {
            showToast(err.message || "Failed to cancel order", "error");
            btn.innerHTML = '<i class="fas fa-times"></i> Cancel';
            btn.disabled = false;
          }
        }
      });
    });

    // Logout / Reset trigger
    document.getElementById("btn-dash-logout")?.addEventListener("click", () => {
      if (confirm("This will clear your local cart and custom order history logs. Proceed?")) {
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
            <input type="text" class="form-control" id="edit-comp-gst" value="${state.user.gstNumber || state.user.gst_number || ''}" pattern="^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$" required>
          </div>
          <div class="form-group">
            <label>Contact Person</label>
            <input type="text" class="form-control" id="edit-comp-person" value="${state.user.contactPerson || ''}" required>
          </div>
          <div class="form-group">
            <label>Phone Number</label>
            <input type="tel" class="form-control" id="edit-comp-phone" value="${state.user.phone || ''}" required>
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
      const payload = {
        fullName: document.getElementById("edit-comp-person").value,
        phone: document.getElementById("edit-comp-phone").value,
        companyName: document.getElementById("edit-comp-name").value,
        gstNumber: document.getElementById("edit-comp-gst").value,
        address: document.getElementById("edit-comp-address").value
      };
      const currentEmail = state.user.email;

      confirmFieldUpdate("Profile", payload, () => {
        state.user = {
          ...state.user,
          companyName: payload.companyName,
          gstNumber: payload.gstNumber,
          contactPerson: payload.fullName,
          phone: payload.phone,
          address: payload.address
        };
        saveState();
        renderDashboard();
      });
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
    doc.text(`Company Name: ${order.company || state.user.companyName || 'N/A'}`, 15, 56);
    doc.text(`GSTIN Number: ${order.gst || state.user.gstNumber || 'N/A'}`, 15, 62);
    const addressText = order.address || state.user.address || 'N/A';
    const offset = (addressText.match(/\n/g) || []).length * 5;
    doc.text(`Delivery Location: ${addressText}`, 15, 68);

    // Invoice Metadata Block
    doc.setFont("Helvetica", "bold");
    doc.text("Invoice Metadata:", 130, 50);
    doc.setFont("Helvetica", "normal");
    doc.text(`Invoice ID: ${order.id}`, 130, 56);
    doc.text(`Date of Issue: ${order.date}`, 130, 62);
    doc.text(`Repayment Scheme: ${order.payment || "Net 30"}`, 130, 68);

    doc.setDrawColor(226, 232, 240);
    doc.line(15, 75 + offset, 195, 75 + offset);

    // Table Header
    doc.setFillColor(248, 250, 252);
    doc.rect(15, 80 + offset, 180, 8, "F");
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(9);
    doc.text("Component Stamping Details", 17, 85 + offset);
    doc.text("Rate (INR)", 110, 85 + offset);
    doc.text("Qty (pcs)", 140, 85 + offset);
    doc.text("Total Value (INR)", 165, 85 + offset);

    doc.line(15, 88 + offset, 195, 88 + offset);

    // Table Rows
    doc.setFont("Helvetica", "normal");
    let y = 94 + offset;
    order.items.forEach(item => {
      const price = item.price || 0;
      const qty = item.qty || item.quantity || 0;
      doc.text(item.name || 'Unknown Item', 17, y);
      doc.text(`Rs. ${price.toLocaleString("en-IN")}`, 110, y);
      doc.text(`${qty}`, 142, y);
      doc.text(`Rs. ${(price * qty).toLocaleString("en-IN")}`, 165, y);
      doc.line(15, y + 2, 195, y + 2);
      y += 8;
    });

    // Summary calculations box
    y += 10;
    doc.setFont("Helvetica", "bold");
    doc.text("Financial Breakdown Details:", 15, y);
    doc.setFont("Helvetica", "normal");

    const calculatedSubtotal = order.subtotal || order.items.reduce((sum, item) => sum + ((item.price || 0) * (item.qty || item.quantity || 0)), 0);
    const calculatedGst = order.gstAmount !== undefined ? order.gstAmount : calculatedSubtotal * 0.18;
    const calculatedShipping = order.shipping !== undefined ? order.shipping : (calculatedSubtotal > 100000 ? 0 : 4500);
    const calculatedTotal = order.total || (calculatedSubtotal + calculatedGst + calculatedShipping);

    doc.text("Subtotal amount (Excl. Tax):", 110, y);
    doc.text(`Rs. ${calculatedSubtotal.toLocaleString("en-IN")}`, 165, y);

    doc.text("IGST / CGST / SGST (18% rate):", 110, y + 6);
    doc.text(`Rs. ${calculatedGst.toLocaleString("en-IN")}`, 165, y + 6);

    doc.text("Logistics Freight charges:", 110, y + 12);
    doc.text(calculatedShipping === 0 ? "FREE" : `Rs. ${calculatedShipping.toLocaleString("en-IN")}`, 165, y + 12);

    doc.setDrawColor(11, 61, 145);
    doc.line(110, y + 15, 195, y + 15);

    doc.setFont("Helvetica", "bold");
    doc.text("Grand Final Payable Amount:", 110, y + 20);
    doc.text(`Rs. ${calculatedTotal.toLocaleString("en-IN")}`, 165, y + 20);

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

  function renderAdminDashboard() {
    const container = document.getElementById("app-container");
    container.innerHTML = `
      <div class="section" style="max-width:1400px; margin:0 auto;">
        <h1 class="section-title">Admin Dashboard - Full Control</h1>
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(280px, 1fr)); gap:1.5rem; margin-bottom:2rem;">
          <div class="dashboard-card">
            <h3>Total Revenue</h3>
            <p id="total-revenue" style="font-size:2rem; font-weight:800;">₹0</p>
          </div>
          <div class="dashboard-card">
            <h3>Total Orders</h3>
            <p id="total-orders" style="font-size:2rem; font-weight:800;">0</p>
          </div>
          <div class="dashboard-card">
            <h3>Pending Orders</h3>
            <p id="pending-orders" style="font-size:2rem; font-weight:800;">0</p>
          </div>
          <div class="dashboard-card">
            <h3>Low Stock Items</h3>
            <p id="low-stock" style="font-size:2rem; font-weight:800; color:#e74c3c;">0</p>
          </div>
        </div>

        <div style="display:flex; gap:1rem; margin-bottom:2rem;">
          <button onclick="manageProducts()" class="btn btn-primary">Manage Products</button>
          <button onclick="manageOrders()" class="btn btn-primary">Manage Orders</button>
          <button onclick="manageUsers()" class="btn btn-primary">Manage Users</button>
          <button onclick="viewAnalytics()" class="btn btn-primary">Analytics & Reports</button>
        </div>

        <div id="admin-content"></div>
      </div>
    `;

    loadDashboardSummary();
  }

  async function loadDashboardSummary() {
    try {
      const data = await apiCall('/admin/dashboard');
      const d = data.data || {};
      document.getElementById("total-revenue").textContent = `₹${d.totalRevenue || 0}`;
      document.getElementById("total-orders").textContent = d.totalOrders || 0;
      document.getElementById("pending-orders").textContent = (d.statusCount && d.statusCount.pending) || 0;
      document.getElementById("low-stock").textContent = d.lowStockProducts || 0;
    } catch (e) {
      showToast(e.message || "Failed to load dashboard summary", "error");
    }
  }

  // ===================== MANAGE PRODUCTS =====================
  async function manageProducts() {
    const content = document.getElementById("admin-content");
    content.innerHTML = `<p>Loading products...</p>`;
    try {
      const res = await apiCall('/products');
      const products = res.data || [];

      let rows = products.map(p => `
        <tr data-id="${p.id}">
          <td>${p.name}</td>
          <td>${p.sku}</td>
          <td><input type="number" class="form-control admin-edit-price" value="${p.price}" style="width:100px;"></td>
          <td><input type="number" class="form-control admin-edit-stock" value="${p.stock}" style="width:90px;"></td>
          <td>
            <button class="btn btn-primary btn-sm btn-save-product">Save</button>
            <button class="btn btn-outline btn-sm btn-delete-product">Delete</button>
          </td>
        </tr>
      `).join("");

      content.innerHTML = `
        <div class="dashboard-card" style="margin-bottom:1.5rem;">
          <h3>Add New Product</h3>
          <form id="form-add-product" style="display:grid; grid-template-columns:repeat(auto-fit,minmax(150px,1fr)); gap:0.75rem; margin-top:1rem;">
            <input required class="form-control" name="name" placeholder="Name">
            <input required class="form-control" name="sku" placeholder="SKU">
            <input required type="number" step="0.01" class="form-control" name="price" placeholder="Price">
            <input required type="number" class="form-control" name="stock" placeholder="Stock">
            <input type="number" class="form-control" name="min_order_qty" placeholder="Min Order Qty" value="1">
            <button type="submit" class="btn btn-primary">Add Product</button>
          </form>
        </div>
        <div class="dashboard-card">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <h3>All Products (${products.length})</h3>
            <select id="admin-stock-filter" class="form-control" style="width:200px;">
              <option value="all">All Products</option>
              <option value="low">Low Stock (≤ 300)</option>
            </select>
          </div>
          <div class="table-responsive">
            <table class="admin-table" style="width:100%; border-collapse:collapse; margin-top:1rem;">
              <thead><tr><th>Name</th><th>SKU</th><th>Price</th><th>Stock</th><th>Actions</th></tr></thead>
              <tbody>${rows || '<tr><td colspan="5">No products found.</td></tr>'}</tbody>
            </table>
          </div>
        </div>
      `;

      document.getElementById("admin-stock-filter")?.addEventListener("change", (e) => {
        const showLowOnly = e.target.value === "low";
        content.querySelectorAll("table.admin-table tbody tr").forEach(row => {
          if (row.querySelector("td[colspan]")) return; // skip empty state row
          const stock = Number(row.querySelector(".admin-edit-stock").value);
          if (showLowOnly && stock > 300) {
            row.style.display = "none";
          } else {
            row.style.display = "";
          }
        });
      });

      document.getElementById("form-add-product").addEventListener("submit", async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        try {
          await apiCall('/products', {
            method: 'POST',
            body: JSON.stringify({
              name: fd.get('name'),
              sku: fd.get('sku'),
              price: Number(fd.get('price')),
              stock: Number(fd.get('stock')),
              min_order_qty: Number(fd.get('min_order_qty')) || 1
            })
          });
          showToast("Product added successfully", "success");
          manageProducts();
        } catch (err) {
          showToast(err.message || "Failed to add product", "error");
        }
      });

      content.querySelectorAll(".btn-save-product").forEach(btn => {
        btn.addEventListener("click", async (e) => {
          const row = e.target.closest("tr");
          const id = row.getAttribute("data-id");
          const price = row.querySelector(".admin-edit-price").value;
          const stock = row.querySelector(".admin-edit-stock").value;
          try {
            await apiCall(`/products/${id}`, {
              method: 'PUT',
              body: JSON.stringify({ price: Number(price), stock: Number(stock) })
            });
            showToast("Product updated", "success");
          } catch (err) {
            showToast(err.message || "Failed to update product", "error");
          }
        });
      });

      content.querySelectorAll(".btn-delete-product").forEach(btn => {
        btn.addEventListener("click", async (e) => {
          const row = e.target.closest("tr");
          const id = row.getAttribute("data-id");
          if (!confirm("Delete this product permanently?")) return;
          try {
            await apiCall(`/products/${id}`, { method: 'DELETE' });
            showToast("Product deleted", "success");
            manageProducts();
          } catch (err) {
            showToast(err.message || "Failed to delete product", "error");
          }
        });
      });

    } catch (e) {
      content.innerHTML = `<p style="color:#e74c3c;">Failed to load products: ${e.message}</p>`;
    }
  }

  // ===================== MANAGE ORDERS =====================
  async function manageOrders() {
    const content = document.getElementById("admin-content");
    content.innerHTML = `<p>Loading orders...</p>`;
    try {
      const res = await apiCall('/admin/orders');
      const orders = res.data || [];
      const statuses = ['pending', 'accepted', 'rejected', 'dispatched', 'delivered', 'cancelled'];

      let rows = orders.map(o => {
        let dStatus = 'unassigned';
        let dId = '';
        let dEmp = '';
        let dVeh = '';
        let dEta = '';

        if (o.deliveries) {
          const delivery = Array.isArray(o.deliveries) ? o.deliveries[0] : o.deliveries;
          if (delivery) {
            dStatus = delivery.status || 'unassigned';
            dId = delivery.id || '';
            dEmp = delivery.users?.full_name || 'Unknown';
            dVeh = delivery.vehicles?.vehicle_number || 'No Vehicle';
            if (delivery.expected_delivery_time) {
              const d = new Date(delivery.expected_delivery_time);
              const day = String(d.getDate()).padStart(2, '0');
              const month = String(d.getMonth() + 1).padStart(2, '0');
              const year = d.getFullYear();
              let hours = d.getHours();
              const minutes = String(d.getMinutes()).padStart(2, '0');
              const ampm = hours >= 12 ? 'PM' : 'AM';
              hours = hours % 12;
              hours = hours ? hours : 12;
              dEta = `${day}/${month}/${year} ${hours}:${minutes} ${ampm}`;
            }
          }
        }
        const dStatusDisplay = dStatus.replace('_', ' ').toUpperCase();
        let deliveryDisplay = `<span class="status-badge" style="font-size:0.75rem; padding:0.25rem 0.5rem; background-color:var(--light-gray); color:var(--text-secondary); border-radius:4px; font-weight:bold;">${dStatusDisplay}</span>`;
        if (dId && dStatus !== 'unassigned') {
          deliveryDisplay += `<br><small style="color:var(--text-secondary); display:block; margin-top:0.3rem;">Assigned to: ${dEmp}</small>`;
          deliveryDisplay += `<small style="color:var(--text-secondary); display:block;">Vehicle: ${dVeh}</small>`;
        }
        
        const actionBtnLabel = dId ? 'Re-Assign' : 'Assign Delivery';
        
        // Convert the existing delivery object to string to pass to the modal
        const deliveryData = (o.deliveries && (Array.isArray(o.deliveries) ? o.deliveries[0] : o.deliveries)) || null;
        const encodedDelivery = deliveryData ? encodeURIComponent(JSON.stringify(deliveryData)) : '';

        let effectiveStatus = o.status;

        let mapBtnHtml = '';
        if (dId && ['in_transit', 'started'].includes(dStatus)) {
          mapBtnHtml = `<button class="btn btn-sm btn-view-map" data-del-id="${dId}" data-order="${o.order_number}" style="margin-left:0.3rem; background:#10B981; color:#fff; border:none;"><i class="fas fa-map-marked-alt"></i> Map</button>`;
        }

        return `
        <tr data-id="${o.id}" data-order-number="${o.order_number}" data-destination="${(o.users?.customers?.shipping_address || o.users?.customers?.address || '').replace(/"/g, '&quot;')}" data-delivery="${encodedDelivery}" style="border-bottom:1px solid #eee;">
          <td style="padding:12px 10px; vertical-align:middle; text-align:left;">${o.order_number}</td>
          <td style="padding:12px 10px; vertical-align:middle; text-align:left;">${o.users?.customers?.company_name || o.users?.email || '—'}</td>
          <td style="padding:12px 10px; vertical-align:middle; text-align:left;">₹${o.total_amount}</td>
          <td style="padding:12px 10px; vertical-align:middle; text-align:left;">
            <select class="form-control admin-order-status" style="width:auto; min-width:130px;">
              ${statuses.map(s => `<option value="${s}" ${s === effectiveStatus ? 'selected' : ''}>${s}</option>`).join("")}
            </select>
          </td>
          <td style="padding:12px 10px; vertical-align:middle; text-align:left;">${deliveryDisplay}</td>
          <td style="padding:12px 10px; vertical-align:middle; text-align:left;">${dEta ? `<span style="font-size:0.85rem;">${dEta}</span>` : '<span style="color:var(--text-secondary); font-size:0.85rem;">—</span>'}</td>
          <td style="padding:12px 10px; vertical-align:middle; text-align:left; white-space:nowrap;">
            <button class="btn btn-primary btn-sm btn-update-order">Update</button>
            ${o.status === 'accepted' ? `<button class="btn btn-sm btn-assign-delivery" style="margin-left:0.3rem; background:#0B3D91; color:#fff; border:none;">${actionBtnLabel}</button>` : ''}
            ${mapBtnHtml}
          </td>
        </tr>
      `}).join("");

      content.innerHTML = `
        <div class="dashboard-card">
          <h3>All Orders (${orders.length})</h3>
          <div class="table-responsive">
            <table class="admin-table" style="width:100%; border-collapse:collapse; margin-top:1rem; text-align:left;">
              <thead>
                <tr style="background:#f8f9fa;">
                  <th style="padding:12px 10px; text-align:left; border-bottom:2px solid #ccc;">Order #</th>
                  <th style="padding:12px 10px; text-align:left; border-bottom:2px solid #ccc;">Customer</th>
                  <th style="padding:12px 10px; text-align:left; border-bottom:2px solid #ccc;">Total</th>
                  <th style="padding:12px 10px; text-align:left; border-bottom:2px solid #ccc;">Status</th>
                  <th style="padding:12px 10px; text-align:left; border-bottom:2px solid #ccc;">Delivery</th>
                  <th style="padding:12px 10px; text-align:left; border-bottom:2px solid #ccc;">Expected ETA</th>
                  <th style="padding:12px 10px; text-align:left; border-bottom:2px solid #ccc;">Actions</th>
                </tr>
              </thead>
              <tbody>${rows || '<tr><td colspan="7">No orders found.</td></tr>'}</tbody>
            </table>
          </div>
        </div>
      `;

      content.querySelectorAll(".btn-update-order").forEach(btn => {
        btn.addEventListener("click", async (e) => {
          const row = e.target.closest("tr");
          const id = row.getAttribute("data-id");
          const status = row.querySelector(".admin-order-status").value;
          try {
            await apiCall(`/admin/orders/${id}/status`, {
              method: 'PATCH',
              body: JSON.stringify({ status })
            });
            showToast("Order status updated", "success");
            manageOrders();
          } catch (err) {
            showToast(err.message || "Failed to update order", "error");
          }
        });
      });

      content.querySelectorAll(".btn-assign-delivery").forEach(btn => {
        btn.addEventListener("click", (e) => {
          const row = e.target.closest("tr");
          const orderId = row.getAttribute("data-id");
          const orderNumber = row.getAttribute("data-order-number");
          const destination = row.getAttribute("data-destination");
          const deliveryDataStr = row.getAttribute("data-delivery");
          let deliveryData = null;
          try {
            deliveryData = deliveryDataStr ? JSON.parse(decodeURIComponent(deliveryDataStr)) : null;
          } catch (e) {
            console.warn("Invalid delivery data payload", e);
          }
          openAssignDeliveryModal(orderId, orderNumber, destination, deliveryData);
        });
      });

      content.querySelectorAll(".btn-view-map").forEach(btn => {
        btn.addEventListener("click", (e) => {
          const delId = btn.getAttribute("data-del-id");
          const orderNum = btn.getAttribute("data-order");
          openDeliveryMapModal(delId, orderNum);
        });
      });

    } catch (e) {
      content.innerHTML = `<p style="color:#e74c3c;">Failed to load orders: ${e.message}</p>`;
    }
  }

  function openDeliveryMapModal(deliveryId, orderNum) {
    const overlay = document.getElementById("modal-overlay");
    if (!overlay) return;
    const box = overlay.querySelector(".modal-box");
    if (!box) return;

    box.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.5rem;">
        <h3 style="margin:0; font-size:1.5rem; color:var(--primary-blue);">Live Tracking - Order #${orderNum}</h3>
        <button id="btn-close-map-modal" style="background:none; border:none; font-size:1.5rem; cursor:pointer; color:var(--text-secondary);">&times;</button>
      </div>
      <div id="admin-map-container" style="height: 300px; width: 100%;"></div>
    `;

    overlay.classList.add("active");

    document.getElementById("btn-close-map-modal").addEventListener("click", () => {
      overlay.classList.remove("active");
      if (activeMapInterval) {
        clearInterval(activeMapInterval);
        activeMapInterval = null;
      }
    });

    setTimeout(() => {
      renderDeliveryMap("admin-map-container", `/admin/deliveries/${deliveryId}/location`);
    }, 100);
  }

  // ===================== ASSIGN DELIVERY MODAL =====================
  async function openAssignDeliveryModal(orderId, orderNumber, defaultDestination = '', existingDelivery = null) {
    const deliveryId = existingDelivery ? existingDelivery.id : '';
    const defEmp = existingDelivery ? existingDelivery.employee_id : '';
    const defVeh = existingDelivery ? existingDelivery.vehicle_id : '';
    const defPickup = existingDelivery ? existingDelivery.pickup_location : 'Faridabad Works';
    const destFromDB = existingDelivery ? existingDelivery.destination : '';
    const defDest = (destFromDB && destFromDB.toLowerCase() !== 'test') ? destFromDB : defaultDestination;
    
    let defEta = '';
    if (existingDelivery && existingDelivery.expected_delivery_time) {
      const d = new Date(existingDelivery.expected_delivery_time);
      defEta = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    }

    const overlay = document.getElementById("modal-overlay");
    if (!overlay) return;
    const box = overlay.querySelector(".modal-box");
    if (!box) return;

    box.innerHTML = `<div class="modal-body" style="padding:2rem; text-align:center;"><i class="fas fa-circle-notch fa-spin"></i> Loading employees & vehicles...</div>`;
    overlay.classList.add("active");

    try {
      const [empRes, vehRes] = await Promise.all([
        apiCall('/admin/employees'),
        apiCall('/admin/vehicles')
      ]);
      const employees = empRes.data || [];
      const vehicles = vehRes.data || [];

      box.innerHTML = `
        <div class="modal-header">
          <h3><i class="fas fa-truck"></i> ${deliveryId ? 'Re-Assign' : 'Assign'} Delivery — ${orderNumber}</h3>
          <button class="modal-close"><i class="fas fa-times"></i></button>
        </div>
        <div class="modal-body" style="padding:1.5rem;">
          <form id="assign-delivery-form">
            <div class="form-group">
              <label>Employee *</label>
              <select class="form-control" id="assign-employee" required>
                <option value="" disabled ${!defEmp ? 'selected' : ''}>-- Select Employee --</option>
                ${employees.map(emp => {
                  const isAssignedToThis = (emp.user_id === defEmp);
                  const disableOpt = (emp.isBusy && !isAssignedToThis) ? 'disabled' : '';
                  const selectedOpt = isAssignedToThis ? 'selected' : '';
                  return `<option value="${emp.user_id}" ${disableOpt} ${selectedOpt}>${emp.users?.full_name || emp.employee_id} (${emp.employee_id})${(emp.isBusy && !isAssignedToThis) ? ' — Currently on a delivery' : ''}</option>`;
                }).join("")}
              </select>
            </div>
            <div class="form-group">
              <label>Vehicle</label>
              <select class="form-control" id="assign-vehicle">
                <option value="" ${!defVeh ? 'selected' : ''}>-- No Vehicle --</option>
                ${vehicles.map(v => {
                  const isAssignedToThis = (v.id === defVeh);
                  const disableOpt = (v.isBusy && !isAssignedToThis) ? 'disabled' : '';
                  const selectedOpt = isAssignedToThis ? 'selected' : '';
                  return `<option value="${v.id}" ${disableOpt} ${selectedOpt}>${v.vehicle_number}${(v.isBusy && !isAssignedToThis) ? ' (Busy)' : ''}</option>`;
                }).join("")}
              </select>
            </div>
            <div class="form-group">
              <label>Pickup Location</label>
              <input type="text" class="form-control" id="assign-pickup" value="${defPickup}">
            </div>
            <div class="form-group">
              <label>Destination *</label>
              <input type="text" class="form-control" id="assign-destination" required value="${defDest}">
            </div>
            <div class="form-group">
              <label>Expected Delivery Date/Time</label>
              <input type="datetime-local" class="form-control" id="assign-eta" value="${defEta}">
            </div>
              <button type="submit" class="btn btn-primary" style="width:100%; margin-top:1rem;">${deliveryId ? 'Re-Assign Delivery' : 'Assign Delivery'}</button>
          </form>
        </div>
      `;

      overlay.querySelector(".modal-close")?.addEventListener("click", () => overlay.classList.remove("active"));

      document.getElementById("assign-delivery-form")?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const employee_id = document.getElementById("assign-employee").value;
        const vehicle_id = document.getElementById("assign-vehicle").value || null;
        const pickup_location = document.getElementById("assign-pickup").value;
        const destination = document.getElementById("assign-destination").value;
        const eta = document.getElementById("assign-eta").value;

        try {
          const endpoint = deliveryId ? `/admin/deliveries/${deliveryId}` : '/admin/deliveries';
          const method = deliveryId ? 'PUT' : 'POST';
          await apiCall(endpoint, {
            method: method,
            body: JSON.stringify({
              order_id: orderId,
              employee_id,
              vehicle_id,
              pickup_location,
              destination,
              expected_delivery_time: eta ? new Date(eta).toISOString() : null
            })
          });
          showToast(deliveryId ? "Delivery reassigned successfully" : "Delivery assigned successfully", "success");
          overlay.classList.remove("active");
          manageOrders();
        } catch (err) {
          showToast(err.message || "Failed to assign delivery", "error");
        }
      });

    } catch (err) {
      box.innerHTML = `<div class="modal-body" style="padding:2rem;"><p style="color:#e74c3c;">Failed to load: ${err.message}</p></div>`;
    }
  }

  // ===================== MANAGE USERS =====================
  async function manageUsers() {
    const content = document.getElementById("admin-content");
    content.innerHTML = `<p>Loading users...</p>`;
    try {
      const res = await apiCall('/admin/users');
      const users = res.data || [];

      let rows = users.map(u => `
        <tr data-id="${u.id}" data-name="${encodeURIComponent(u.full_name || '')}" data-email="${encodeURIComponent(u.email || '')}" data-role="${u.role}" data-company="${encodeURIComponent(u.customers?.company_name || '')}" style="border-bottom:1px solid #eee;">
          <td style="padding:12px 10px; vertical-align:middle;">${u.full_name || u.customers?.company_name || '—'}</td>
          <td style="padding:12px 10px; vertical-align:middle;">${u.email}</td>
          <td style="padding:12px 10px; vertical-align:middle;">${u.role}</td>
          <td style="padding:12px 10px; vertical-align:middle;">${u.customers?.company_name || ''}</td>
          <td style="padding:12px 10px; vertical-align:middle;"><span class="status-badge" style="color:${u.status === 'active' ? '#2E7D32' : '#D62828'};">${u.status}</span></td>
          <td style="padding:12px 10px; vertical-align:middle; white-space:nowrap;">
            ${u.role !== 'admin' ? `
            <button class="btn btn-outline btn-sm btn-toggle-user-status">
              ${u.status === 'active' ? 'Suspend' : 'Activate'}
            </button>
            <button class="btn btn-primary btn-sm btn-edit-user" style="margin-left:0.3rem;">Edit</button>
            <button class="btn btn-sm btn-delete-user" style="margin-left:0.3rem; background:#D62828; color:#fff; border:none;">Delete</button>
            ` : '<span style="color:var(--text-secondary); font-size:0.85rem;">Reserved</span>'}
          </td>
        </tr>
      `).join("");

      content.innerHTML = `
        <div class="dashboard-card">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
            <h3>All Users (${users.length})</h3>
            <button class="btn btn-primary" id="btn-add-user"><i class="fas fa-plus"></i> Add User</button>
          </div>
          <div class="table-responsive">
            <table class="admin-table" style="width:100%; border-collapse:collapse; text-align:left;">
              <thead>
                <tr style="background:#f8f9fa;">
                  <th style="padding:12px 10px; text-align:left; border-bottom:2px solid #ccc;">Name</th>
                  <th style="padding:12px 10px; text-align:left; border-bottom:2px solid #ccc;">Email</th>
                  <th style="padding:12px 10px; text-align:left; border-bottom:2px solid #ccc;">Role</th>
                  <th style="padding:12px 10px; text-align:left; border-bottom:2px solid #ccc;">Company</th>
                  <th style="padding:12px 10px; text-align:left; border-bottom:2px solid #ccc;">Status</th>
                  <th style="padding:12px 10px; text-align:left; border-bottom:2px solid #ccc;">Actions</th>
                </tr>
              </thead>
              <tbody>${rows || '<tr><td colspan="6">No users found.</td></tr>'}</tbody>
            </table>
          </div>
        </div>
      `;

      document.getElementById("btn-add-user")?.addEventListener("click", () => openManageUserModal(null));

      content.querySelectorAll(".btn-edit-user").forEach(btn => {
        btn.addEventListener("click", (e) => {
          const row = e.target.closest("tr");
          openManageUserModal({
            id: row.getAttribute("data-id"),
            name: decodeURIComponent(row.getAttribute("data-name")),
            email: decodeURIComponent(row.getAttribute("data-email")),
            role: row.getAttribute("data-role"),
            company: decodeURIComponent(row.getAttribute("data-company"))
          });
        });
      });

      content.querySelectorAll(".btn-delete-user").forEach(btn => {
        btn.addEventListener("click", (e) => {
          const row = e.target.closest("tr");
          const id = row.getAttribute("data-id");
          
          showConfirmModal(
            "<i class='fas fa-exclamation-triangle' style='color:#D62828;'></i> Confirm Deletion",
            "Are you sure you want to permanently delete this user?<br>This will also securely wipe their associated data and profiles.",
            async () => {
              try {
                await apiCall(`/admin/users/${id}`, { method: 'DELETE' });
                showToast("User deleted successfully", "success");
                manageUsers();
              } catch (err) {
                showToast(err.message || "Failed to delete user", "error");
              }
            }
          );
        });
      });

      content.querySelectorAll(".btn-toggle-user-status").forEach(btn => {
        btn.addEventListener("click", async (e) => {
          const row = e.target.closest("tr");
          const id = row.getAttribute("data-id");
          const currentlyActive = e.target.textContent.trim() === 'Suspend';
          const newStatus = currentlyActive ? 'suspended' : 'active';
          try {
            await apiCall(`/admin/users/${id}/status`, {
              method: 'PATCH',
              body: JSON.stringify({ status: newStatus })
            });
            showToast(`User ${newStatus}`, "success");
            manageUsers();
          } catch (err) {
            showToast(err.message || "Failed to update user status", "error");
          }
        });
      });

    } catch (e) {
      content.innerHTML = `<p style="color:#e74c3c;">Failed to load users: ${e.message}</p>`;
    }
  }

  function openManageUserModal(user) {
    const isEdit = !!user;
    const overlay = document.getElementById("modal-overlay");
    if (!overlay) return;
    const box = overlay.querySelector(".modal-box");
    if (!box) return;

    box.innerHTML = `
      <div class="modal-header">
        <h3><i class="fas fa-user"></i> ${isEdit ? 'Edit User' : 'Add New User'}</h3>
        <button class="modal-close"><i class="fas fa-times"></i></button>
      </div>
      <div class="modal-body" style="padding:1.5rem;">
        <form id="manage-user-form">
          <div class="form-group">
            <label>Full Name *</label>
            <input type="text" class="form-control" id="mu-name" required value="${isEdit ? user.name : ''}">
          </div>
          <div class="form-group">
            <label>Email *</label>
            <input type="email" class="form-control" id="mu-email" required value="${isEdit ? user.email : ''}" ${isEdit ? 'readonly style="background:#f0f0f0; cursor:not-allowed;"' : ''}>
          </div>
          ${!isEdit ? `
          <div class="form-group">
            <label>Password *</label>
            <input type="password" class="form-control" id="mu-password" required placeholder="Enter password for new user">
          </div>
          ` : ''}
          <div class="form-group">
            <label>Role *</label>
            <select class="form-control" id="mu-role" required>
              <option value="employee" ${isEdit && user.role === 'employee' ? 'selected' : ''}>Employee</option>
              <option value="client" ${isEdit && (user.role === 'client' || user.role === 'customer') ? 'selected' : ''}>Client</option>
            </select>
          </div>
          <div class="form-group">
            <label>Company Name (If Customer/Client)</label>
            <input type="text" class="form-control" id="mu-company" value="${isEdit ? user.company : ''}">
          </div>
          <button type="submit" class="btn btn-primary" style="width:100%; margin-top:1rem;">
            ${isEdit ? 'Update User' : 'Create User'}
          </button>
        </form>
      </div>
    `;

    overlay.classList.add("active");
    overlay.querySelector(".modal-close")?.addEventListener("click", () => overlay.classList.remove("active"));

    document.getElementById("manage-user-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const payload = {
        full_name: document.getElementById("mu-name").value,
        role: document.getElementById("mu-role").value,
        company_name: document.getElementById("mu-company").value
      };
      
      if (!isEdit) {
        payload.email = document.getElementById("mu-email").value;
        payload.password = document.getElementById("mu-password").value;
      }

      try {
        if (isEdit) {
          await apiCall(`/admin/users/${user.id}`, { method: 'PUT', body: JSON.stringify(payload) });
          showToast("User updated successfully", "success");
        } else {
          await apiCall('/admin/users', { method: 'POST', body: JSON.stringify(payload) });
          showToast("User created successfully", "success");
        }
        overlay.classList.remove("active");
        manageUsers();
      } catch (err) {
        showToast(err.message || "Failed to save user", "error");
      }
    });
  }

  // ===================== ANALYTICS & REPORTS =====================
  async function viewAnalytics() {
    const content = document.getElementById("admin-content");
    content.innerHTML = `<p>Loading analytics...</p>`;
    try {
      const res = await apiCall('/admin/dashboard');
      const d = res.data || {};
      const sc = d.statusCount || {};

      content.innerHTML = `
        <div class="dashboard-card">
          <h3>Order Status Breakdown</h3>
          <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(150px,1fr)); gap:1rem; margin-top:1rem;">
            ${Object.entries(sc).map(([status, count]) => `
              <div style="text-align:center; padding:1rem; border:1px solid var(--border-color); border-radius:var(--border-radius);">
                <div style="font-size:1.8rem; font-weight:800;">${count}</div>
                <div style="text-transform:capitalize; color:var(--text-secondary);">${status}</div>
              </div>
            `).join("")}
          </div>
          <p style="margin-top:1.5rem;"><strong>Total Revenue:</strong> ₹${d.totalRevenue || 0}</p>
          <p><strong>Total Orders:</strong> ${d.totalOrders || 0}</p>
          <p><strong>Low Stock Products:</strong> ${d.lowStockProducts || 0}</p>
        </div>
      `;
    } catch (e) {
      content.innerHTML = `<p style="color:#e74c3c;">Failed to load analytics: ${e.message}</p>`;
    }
  }

  // Expose admin panel functions for inline onclick="" handlers
  window.manageProducts = manageProducts;
  window.manageOrders = manageOrders;
  window.manageUsers = manageUsers;
  window.viewAnalytics = viewAnalytics;


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
    const token = localStorage.getItem("ci_token");
    const getRoleRoute = (role) => {
      if (role === 'admin') return "#/admin";
      if (role === 'employee') return "#/employee";
      return "#/customer";
    };

    if (token) {
      const displayName = state.user?.contactPerson || state.user?.company_name || state.user?.email?.split('@')[0] || 'User';
      const displayCompany = state.user?.companyName || state.user?.company_name || '';
      const dashboardRoute = getRoleRoute(state.user?.role);

      container.innerHTML = `
        <div class="section" style="max-width:650px; margin:4rem auto; padding:3rem 2rem; background-color:var(--white); border-radius:var(--border-radius-lg); border:1px solid var(--border-color); box-shadow:var(--shadow-md);">
          <div style="text-align:center; padding-bottom:1.5rem; border-bottom:1px solid var(--border-color); margin-bottom:1.5rem;">
            <h2>Welcome, ${displayName}</h2>
            <p>${displayCompany}</p>
          </div>
          <div style="display:flex; gap:1rem;">
            <a href="${dashboardRoute}" class="btn btn-primary" style="flex:1;">Dashboard</a>
            <button id="btn-logout" class="btn btn-outline" style="flex:1;">Log Out</button>
          </div>
        </div>
      `;

      document.getElementById("btn-logout").addEventListener("click", () => {
        localStorage.removeItem("ci_token");
        localStorage.removeItem("ci_user");
        state.isLoggedIn = false;
        state.user = null;
        saveState();
        renderProfile();
      });

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
                <input type="tel" class="form-control" id="reg-phone" placeholder="Phone Number" required>
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
            contactPerson: data.user.contactPerson || data.user.full_name || email.split("@")[0],
            gstNumber: data.user.gstNumber || data.user.gst_number || "",
            phone: data.user.phone || ""
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
          phone: document.getElementById("reg-phone").value,
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

          const user = data.user || data.data?.user;
          const token = data.token || data.data?.token;

          const normalizedUser = {
            role: 'client',
            ...user,
            companyName: user?.companyName || user?.company_name || tempRegData.company_name,
            contactPerson: user?.contactPerson || user?.full_name || tempRegData.full_name,
            gstNumber: user?.gstNumber || user?.gst_number || tempRegData.gst_number,
            phone: user?.phone || tempRegData.phone
          };

          localStorage.setItem("ci_token", token);
          localStorage.setItem("ci_user", JSON.stringify(normalizedUser));
          state.isLoggedIn = true;
          state.user = normalizedUser;
          saveState();
          showToast("Registration successful", "success");
          window.location.hash = getRoleRoute(normalizedUser.role);
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
      const fetchPromise = apiCall('/products');
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout loading products')), 3500));
      const res = await Promise.race([fetchPromise, timeoutPromise]);
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
    
    // Auto-close mobile menu when a link is clicked
    navLinks?.querySelectorAll("a").forEach(link => {
      link.addEventListener("click", () => {
        navLinks.classList.remove("active");
      });
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
