import { auth } from './data.js';
import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

document.getElementById("adminLoginForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("adminUser").value; 
  const password = document.getElementById("adminPass").value;

  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const token = await userCredential.user.getIdTokenResult();
    
    if (token.claims.admin === true) {
      localStorage.setItem("mp_admin", "1");
      showPanel();
    } else {
      showToast("You are not an authorized admin.", "error");
      await auth.signOut(); 
    }
  } catch (error) {
    console.error("Login error:", error);
    showToast("Invalid credentials", "error");
  }
});

window.adminLogout = function() {
  localStorage.removeItem("mp_admin");
  location.reload();
};

async function showPanel() {
  document.getElementById("adminLogin").style.display = "none";
  document.getElementById("adminPanel").style.display = "block";
  
  document.getElementById("ordersList").innerHTML = "<p>Loading orders...</p>";
  document.getElementById("productsList").innerHTML = "<p>Loading products...</p>";

  await DB.fetchOrders();
  await DB.fetchProducts();
  await DB.fetchOffers();

  renderOrders();
  renderProducts();
  updateNotifBadge();
}

document.querySelectorAll(".admin-tabs button").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".admin-tabs button").forEach((b) => b.classList.remove("active"));
    document.querySelectorAll(".tab-content").forEach((t) => t.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById("tab-" + btn.dataset.tab).classList.add("active");
    
    if(btn.dataset.tab === "offers") {
       loadProductsForOfferSelect();
       renderAdminOffers();
    }
  });
});

function renderOrders() {
  const orders = DB.getOrders();
  const list = document.getElementById("ordersList");

  if (orders.length === 0) {
    list.innerHTML = `<div class="empty-state"><div class="icon">📦</div><p>No orders yet</p></div>`;
    return;
  }

  list.innerHTML = orders.map((o) => {
      const itemsHtml = o.items.map((i) => `<li>${i.name} × ${i.qty} — ${formatPrice(i.price * i.qty)}</li>`).join("");
      let actions = "";
      
      if (o.status === "pending") {
        actions = `
          <button class="btn btn-green btn-sm" onclick="updateOrderStatus('${o.docId}','accepted')">✅ Accept</button>
          <button class="btn btn-sm" style="background:#ef4444" onclick="updateOrderStatus('${o.docId}','rejected')">❌ Reject</button>`;
      } else if (o.status === "accepted") {
        actions = `<button class="btn btn-blue btn-sm" onclick="updateOrderStatus('${o.docId}','delivered')">🚚 Mark Delivered</button>`;
      }

      return `
        <div class="order-card ${o.status}">
          <div class="order-head">
            <div class="order-id">${o.id} — 👤 ${o.user}</div>
            <span class="order-status status-${o.status}">${o.status.toUpperCase()}</span>
          </div>
          <div class="order-meta">
            ${new Date(o.date).toLocaleString()} • Payment: <strong>${o.payment.toUpperCase()}</strong>
          </div>
          <div class="order-meta" style="background: #f0f4ff; padding: 10px; border-radius: 8px; margin-bottom: 10px;">
            📞 <strong>Phone:</strong> ${o.phone || "Not provided"} <br>
            📍 <strong>Address:</strong> ${o.address || "Not provided"}
          </div>
          <ul class="order-items">${itemsHtml}</ul>
          <div class="order-meta">Total: <strong>${formatPrice(o.total)}</strong></div>
          <div class="order-actions">${actions}</div>
        </div>`;
    }).join("");
}

window.updateOrderStatus = async function(docId, status) {
  await DB.updateOrderStatus(docId, status);
  renderOrders();
  updateNotifBadge();
  showToast("Order " + status);
};

function updateNotifBadge() {
  const orders = DB.getOrders();
  const pending = orders.filter((o) => o.status === "pending").length;
  const badge = document.getElementById("notifBadge");
  if (badge) {
    if (pending > 0) {
      badge.style.display = "inline-block";
      badge.textContent = pending;
    } else {
      badge.style.display = "none";
    }
  }
}

function renderProducts() {
  const products = DB.getProducts();
  const list = document.getElementById("productsList");

  if (products.length === 0) {
    list.innerHTML = `<div class="empty-state"><div class="icon">🛍️</div><p>No products yet</p></div>`;
    return;
  }

  list.innerHTML = products.map((p) => {
      const out = p.stock <= 0;
      return `
      <div class="cart-item">
        <img src="${p.image}" onerror="this.src='https://placehold.co/100x100?text=Item'" />
        <div class="cart-item-info">
          <h4>${p.name}</h4>
          <p>${p.category} • ${formatPrice(p.price)}</p>
          <span class="stock-badge ${out ? "stock-out" : "stock-in"}">
            ${out ? "❌ Out of Stock" : "✅ Stock: " + p.stock}
          </span>
        </div>
        <button class="btn btn-sm btn-blue" onclick="editProduct('${p.docId}')">✏️ Edit</button>
        <button class="btn btn-sm" style="background:#ef4444" onclick="deleteProduct('${p.docId}')">🗑️</button>
      </div>`;
    }).join("");
}

document.getElementById("addProductForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  
  const docId = document.getElementById("editId").value;
  const name = document.getElementById("pName").value.trim();
  const category = document.getElementById("pCategory").value.trim();
  const price = Number(document.getElementById("pPrice").value);
  const stock = Number(document.getElementById("pStock").value);
  

  const originalPrice = Number(document.getElementById("pOriginalPrice")?.value) || price;
  const warranty = document.getElementById("pWarranty")?.value.trim() || "";
  const description = document.getElementById("pDescription")?.value.trim() || "";
  const variantsInput = document.getElementById("pVariants")?.value.trim() || "";
  const variants = variantsInput ? variantsInput.split(",").map(v => v.trim()) : ["Standard"];
  const sizesInput = document.getElementById("pSizes")?.value.trim() || "";
  const sizes = sizesInput ? sizesInput.split(",").map(s => s.trim()) : [];

  const imagesData = document.getElementById("pImagesData").value;
  const images = imagesData ? JSON.parse(imagesData) : [];
  const mainImage = images.length > 0 ? images[0] : "https://placehold.co/300x300?text=No+Image";

  document.getElementById("saveProductBtn").textContent = "Saving...";
  document.getElementById("saveProductBtn").disabled = true;

  if (docId) {
  
    const updateData = { name, category, price, stock, originalPrice, warranty, description, variants, sizes };
    if(images.length > 0) {
        updateData.image = mainImage;
        updateData.images = images;
    }
    await DB.updateProduct(docId, updateData);
    showToast("Product updated ✅");
  } else {
    
    const products = DB.getProducts();
    const newId = products.length ? Math.max(...products.map((p) => p.id)) + 1 : 1;
    
    const newProduct = { 
      id: newId, name, category, price, stock, originalPrice, warranty, description, variants, sizes,
      image: mainImage, images: images, reviews: [] 
    };
    
    await DB.addProduct(newProduct);
    showToast("Product added ✅");
  }

  document.getElementById("saveProductBtn").textContent = "Add Product";
  document.getElementById("saveProductBtn").disabled = false;
  
  renderProducts();
  cancelEdit();
});

window.editProduct = function(docId) {
  const p = DB.getProducts().find((x) => x.docId === docId);
  if (!p) return;
  
  document.getElementById("editId").value = p.docId;
  document.getElementById("pName").value = p.name;
  document.getElementById("pCategory").value = p.category;
  document.getElementById("pPrice").value = p.price;
  document.getElementById("pStock").value = p.stock;
  
  if(document.getElementById("pOriginalPrice")) document.getElementById("pOriginalPrice").value = p.originalPrice || p.price;
  if(document.getElementById("pWarranty")) document.getElementById("pWarranty").value = p.warranty || "";
  if(document.getElementById("pDescription")) document.getElementById("pDescription").value = p.description || "";
  if(document.getElementById("pVariants")) document.getElementById("pVariants").value = p.variants ? p.variants.join(", ") : "";
  if(document.getElementById("pSizes")) document.getElementById("pSizes").value = p.sizes ? p.sizes.join(", ") : "";
  
  document.getElementById("addFormTitle").textContent = "Edit Product";
  document.getElementById("saveProductBtn").textContent = "Update Product";
  document.getElementById("cancelEditBtn").style.display = "block";

  // Switch tab
  document.querySelectorAll(".admin-tabs button").forEach((b) => b.classList.remove("active"));
  document.querySelectorAll(".tab-content").forEach((t) => t.classList.remove("active"));
  document.querySelector('[data-tab="addProduct"]').classList.add("active");
  document.getElementById("tab-addProduct").classList.add("active");
  window.scrollTo({ top: 0, behavior: "smooth" });
};

window.cancelEdit = function() {
  document.getElementById("addProductForm").reset();
  document.getElementById("editId").value = "";
  document.getElementById("pImagesData").value = "";
  document.getElementById("imagePreview").style.display = "none";
  document.getElementById("addFormTitle").textContent = "Add New Product";
  document.getElementById("saveProductBtn").textContent = "Add Product";
  document.getElementById("cancelEditBtn").style.display = "none";
};

window.deleteProduct = async function(docId) {
  if (!confirm("Delete this product from database?")) return;
  await DB.deleteProduct(docId);
  renderProducts();
  showToast("Product deleted");
};

document.getElementById("offerImageFile")?.addEventListener("change", function(e) {
  const file = e.target.files[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = function(event) {
    document.getElementById("offerImageData").value = event.target.result;
    document.getElementById("offerPreviewImg").src = event.target.result;
    document.getElementById("offerImagePreview").style.display = "block";
  };
  reader.readAsDataURL(file);
});

function renderAdminOffers() {
  const offers = DB.getOffers();
  const list = document.getElementById("offersList");
  
  if (offers.length === 0) {
    list.innerHTML = `<p style="color:#888;">No offers added yet.</p>`;
    return;
  }

  list.innerHTML = offers.map(o => `
    <div class="cart-item" style="display: flex; align-items: center; gap: 15px;">
      <img src="${o.image}" style="width: 120px; height: 60px; object-fit: cover; border-radius: 8px;" />
      <div style="flex: 1;">
        <h4 style="margin-bottom: 5px;">${o.title}</h4>
        <p style="font-size: 13px; color: #666;">${o.productIds.length} Items included</p>
      </div>
      <button class="btn btn-sm" style="background:#ef4444" onclick="deleteOffer('${o.docId}')">🗑️ Delete</button>
    </div>
  `).join("");
}

document.getElementById("addOfferForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  
  const title = document.getElementById("offerTitle").value.trim();
  const image = document.getElementById("offerImageData").value;
  
  const select = document.getElementById("offerProducts");
  const selectedOptions = Array.from(select.selectedOptions);
  const productIds = selectedOptions.map(opt => Number(opt.value));

  if (!image) return showToast("Please upload a banner image", "error");
  if (productIds.length === 0) return showToast("Please select at least one product", "error");

  const offers = DB.getOffers();
  const newId = offers.length ? Math.max(...offers.map(o => o.id)) + 1 : 1;
  
  await DB.addOffer({ id: newId, title, image, productIds });
  
  showToast("Offer added ✅");
  document.getElementById("addOfferForm").reset();
  document.getElementById("offerImagePreview").style.display = "none";
  document.getElementById("offerImageData").value = "";
  select.selectedIndex = -1;
  
  renderAdminOffers();
});

window.deleteOffer = async function(docId) {
  if (!confirm("Delete this offer?")) return;
  await DB.deleteOffer(docId);
  renderAdminOffers();
  showToast("Offer deleted");
};

function loadProductsForOfferSelect() {
  const products = DB.getProducts();
  const select = document.getElementById("offerProducts");
  if(select) {
    select.innerHTML = products.map(p => `<option value="${p.id}">${p.name} (Rs. ${p.price})</option>`).join("");
  }
}

document.getElementById("pImageFile")?.addEventListener("change", async function (e) {
  const files = e.target.files;
  if (!files.length) return;

  const previewContainer = document.getElementById("imagePreview");
  previewContainer.style.display = "flex";

  const hiddenInput = document.getElementById("pImagesData");
  let existingImages = hiddenInput.value ? JSON.parse(hiddenInput.value) : [];

  const readFile = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (event) => resolve(event.target.result);
      reader.readAsDataURL(file);
    });
  };

  for (let file of files) {
    if (file.size > 500 * 1024) { 
      showToast(`${file.name} is over 500KB. Please compress it.`, "error");
      continue;
    }
    const base64 = await readFile(file);
    existingImages.push(base64);

    const img = document.createElement("img");
    img.src = base64;
    img.style.width = "60px";
    img.style.height = "60px";
    img.style.objectFit = "cover";
    img.style.borderRadius = "6px";
    img.style.border = "1px solid #ddd";
    previewContainer.appendChild(img);
  }

  hiddenInput.value = JSON.stringify(existingImages);
  this.value = ""; 
});

function showExistingImages(imagesArray) {
  const previewContainer = document.getElementById("imagePreview");
  if(!previewContainer) return;
  previewContainer.innerHTML = "";
  if (!imagesArray || imagesArray.length === 0) {
    previewContainer.style.display = "none";
    return;
  }
  previewContainer.style.display = "flex";
  imagesArray.forEach(base64 => {
    const img = document.createElement("img");
    img.src = base64;
    img.style.width = "60px";
    img.style.height = "60px";
    img.style.objectFit = "cover";
    img.style.borderRadius = "6px";
    img.style.border = "1px solid #ddd";
    previewContainer.appendChild(img);
  });
}

if (isAdminLoggedIn()) showPanel();
