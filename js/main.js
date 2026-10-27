
let activeOfferId = null;

function renderOffers() {
  const offers = DB.getOffers();
  const container = document.getElementById("offersContainer");
  const grid = document.getElementById("offersGrid");

  if (offers.length === 0) {
    container.style.display = "none";
    return;
  }

  container.style.display = "block";
  
 
  const duplicatedOffers = [...offers, ...offers];

  let html = duplicatedOffers.map(o => `
  
    <div class="offer-card" onclick="window.location.href='offer.html?id=${o.id}'">
      <img src="${o.image}" alt="${o.title}" />
      <div class="offer-title">${o.title}</div>
    </div>
  `).join('');

  grid.innerHTML = html;
}

function renderProducts(filter = "") {
  const grid = document.getElementById("productGrid");
  const empty = document.getElementById("emptyState");
  let products = DB.getProducts().sort((a, b) => b.id - a.id);

  if (activeOfferId !== null) {
    const offer = DB.getOffers().find(o => o.id === activeOfferId);
    if (offer) {
      products = products.filter(p => offer.productIds.includes(p.id));
    }
  }

  const filtered = products.filter(
    (p) =>
      p.name.toLowerCase().includes(filter.toLowerCase()) ||
      p.category.toLowerCase().includes(filter.toLowerCase())
  );

  if (filtered.length === 0) {
    grid.innerHTML = "";
    empty.style.display = "block";
    return;
  }
  empty.style.display = "none";

  grid.innerHTML = filtered
    .map((p) => {
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
          <span class="stock-badge ${out ? "stock-out" : "stock-in"}">
            ${out ? "❌ Out of Stock" : "✅ Stock: " + p.stock}
          </span>
          <button class="btn btn-block" ${out ? "disabled" : ""} onclick="addToCart(${p.id})">
            ${out ? "Out of Stock" : "🛒 Add to Cart"}
          </button>
        </div>
      </div>`;
    })
    .join("");
}

function addToCart(id) {
  const products = DB.getProducts();
  const product = products.find((p) => p.id === id);
  if (!product || product.stock <= 0) return showToast("Out of stock", "error");

  const cart = DB.getCart();
  const existing = cart.find((i) => i.id === id);

  if (existing) {
    if (existing.qty >= product.stock)
      return showToast("Stock limit reached", "error");
    existing.qty++;
  } else {
    cart.push({
      id,
      name: product.name,
      price: product.price,
      qty: 1,
      image: product.image,
    });
  }

  DB.setCart(cart);
  updateCartBadge();
  showToast("Added to cart ✅");
}

function renderUserArea() {
  const user = DB.getCurrentUser();
  const area = document.getElementById("userArea");
  if (!area) return;
  if (user) {
    area.innerHTML = `<span class="user-tag">👤 ${user.username}</span>
      <a href="#" onclick="logout();return false;">Logout</a>`;
  } else {
    area.innerHTML = `<a href="login.html">Login</a>`;
  }
}

function logout() {
  DB.setCurrentUser(null);
  showToast("Logged out");
  setTimeout(() => location.reload(), 500);
}

document.getElementById("searchInput").addEventListener("input", (e) => {
  renderProducts(e.target.value);
});

renderOffers();
renderProducts();
renderUserArea();
updateCartBadge();
