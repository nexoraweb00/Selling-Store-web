import { DB, formatPrice, updateCartBadge, showToast } from './data.js';

const urlParams = new URLSearchParams(window.location.search);
const offerId = parseInt(urlParams.get("id"));

async function initOffer() {
  document.getElementById("productGrid").innerHTML = "<p style='color:white;'>Loading...</p>";
  
  await DB.fetchOffers();
  await DB.fetchProducts();

  const currentOffer = DB.getOffers().find(o => o.id === offerId);
  const allProducts = DB.getProducts().sort((a, b) => b.id - a.id);

  if (!currentOffer) {
    window.location.href = "index.html";
    return;
  }

  document.getElementById("activeOfferBanner").style.display = "block";
  document.getElementById("offerBannerImg").src = currentOffer.image;
  document.getElementById("offerBannerTitle").textContent = currentOffer.title;
  
  const offerProducts = allProducts.filter(p => currentOffer.productIds.includes(p.id));
  renderOfferProducts("", offerProducts);
  
  document.getElementById("searchInput").addEventListener("input", (e) => {
    renderOfferProducts(e.target.value, offerProducts);
  });
}

function renderOfferProducts(filter = "", productsList) {
  const grid = document.getElementById("productGrid");
  const empty = document.getElementById("emptyState");

  const filtered = productsList.filter(
    (p) => p.name.toLowerCase().includes(filter.toLowerCase()) || p.category.toLowerCase().includes(filter.toLowerCase())
  );

  if (filtered.length === 0) {
    grid.innerHTML = "";
    empty.style.display = "block";
    return;
  }
  empty.style.display = "none";

  grid.innerHTML = filtered.map((p) => {
      const out = p.stock <= 0;
      return `
      <div class="product-card">
        <a href="product.html?id=${p.id}" style="text-decoration:none; color:inherit;">
          <img src="${p.image}" alt="${p.name}" onerror="this.src='https://placehold.co/300x300?text=No+Image'" />
        </a>
        <div class="product-info">
          <a href="product.html?id=${p.id}" style="text-decoration:none; color:inherit;">
            <h3>${p.name}</h3>
          </a>
          <div class="category">${p.category}</div>
          <div class="price">${formatPrice(p.price)}</div>
          <span class="stock-badge ${out ? "stock-out" : "stock-in"}">${out ? "❌ Out of Stock" : "✅ Stock: " + p.stock}</span>
          <button class="btn btn-block" ${out ? "disabled" : ""} onclick="window.addToCart(${p.id})">${out ? "Out of Stock" : "🛒 Add to Cart"}</button>
        </div>
      </div>`;
    }).join("");
}

window.addToCart = function(id) {
  const product = DB.getProducts().find((p) => p.id === id);
  if (!product || product.stock <= 0) return showToast("Out of stock", "error");

  const cart = DB.getCart();
  const existing = cart.find((i) => i.id === id);

  if (existing) {
    if (existing.qty >= product.stock) return showToast("Stock limit reached", "error");
    existing.qty++;
  } else {
    cart.push({ id, name: product.name, price: product.price, qty: 1, image: product.image });
  }

  DB.setCart(cart);
  updateCartBadge();
  showToast("Added to cart ✅");
};

function renderUserArea() {
  const user = DB.getCurrentUser();
  const area = document.getElementById("userArea");
  if (!area) return;
  if (user) area.innerHTML = `<span class="user-tag">👤 ${user.username}</span>`;
  else area.innerHTML = `<a href="login.html">Login</a>`;
}

updateCartBadge();
renderUserArea();
initOffer();