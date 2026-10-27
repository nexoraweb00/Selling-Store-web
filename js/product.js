
import { DB, formatPrice, showToast, updateCartBadge } from './data.js';

const urlParams = new URLSearchParams(window.location.search);
const productId = parseInt(urlParams.get("id"));
const container = document.getElementById("productContainer");

container.innerHTML = `<h2 style="text-align:center; margin-top:50px; color:white;">Loading product details...</h2>`;

async function initProductPage() {

  await DB.fetchProducts(); 
  
  const product = DB.getProducts().find(p => p.id === productId);

  if (!product) {
    container.innerHTML = `<h2 style="text-align:center; margin-top:50px; color:white;">Product not found! 😕</h2>`;
    return;
  }

  renderProductDetails(product);
}

function renderProductDetails(product) {
  const out = product.stock <= 0;
  
  const hasDiscount = product.originalPrice && product.originalPrice > product.price;
  const discountPercent = hasDiscount ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100) : 0;
  
  const variantsHTML = product.variants ? product.variants.map((v, i) => `
    <label class="variant-label">
      <input type="radio" name="variant" value="${v}" ${i === 0 ? 'checked' : ''}>
      <span class="variant-btn">${v}</span>
    </label>
  `).join('') : '';
   
  const sizesHTML = product.sizes && product.sizes.length > 0 ? product.sizes.map((s, i) => `
    <label class="variant-label">
      <input type="radio" name="size" value="${s}" ${i === 0 ? 'checked' : ''}>
      <span class="variant-btn">${s}</span>
    </label>
  `).join('') : '';

  const reviews = product.reviews || [];
  const avgRating = reviews.length > 0 ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1) : "0.0";
  const starsHTML = reviews.length > 0 ? "⭐".repeat(Math.round(avgRating)) : "No reviews yet";

  const reviewsListHTML = reviews.map(r => `
    <div class="review-card">
      <div class="review-head">
        <strong>👤 ${r.name}</strong>
        <span class="review-stars">${"⭐".repeat(r.rating)}</span>
      </div>
      <p>${r.comment}</p>
    </div>
  `).join('');

  container.innerHTML = `
    <a href="index.html" onclick="sessionStorage.setItem('skipLoader', 'true')" style="display:inline-block; margin-bottom:20px; color:#fff; text-decoration:none;">← Back to Home</a>
    
    <div class="product-detail-wrap" style="background: white; border-radius: 12px; padding: 20px;">
      <!-- Left Side: Images Gallery -->
      <div class="product-image">
        <img id="mainProductImage" src="${product.images && product.images.length > 0 ? product.images[0] : product.image}" onerror="this.src='https://placehold.co/400x400?text=No+Image'" style="width:100%; border-radius:10px; margin-bottom:10px;" />
        
        <div style="display:flex; gap:10px; overflow-x:auto; padding-bottom:5px;">
          ${product.images && product.images.length > 0 ? product.images.map(img => `
            <img src="${img}" onclick="document.getElementById('mainProductImage').src='${img}'" style="width:60px; height:60px; object-fit:cover; border-radius:6px; cursor:pointer; border: 1px solid #ddd;" />
          `).join('') : ''}
        </div>
      </div>

      <!-- Right Side: Details -->
      <div class="product-details">
        <h1 style="color: #1a1a2e;">${product.name}</h1>
        <div class="rating-summary">
          <span style="color:#f59e0b; font-size:18px;">${starsHTML}</span>
          <span style="font-size:14px; color:#666; margin-left:8px;">(${avgRating} / 5 from ${reviews.length} reviews)</span>
        </div>

        <div class="price-section">
          <span class="current-price">${formatPrice(product.price)}</span>
          ${hasDiscount ? `
            <span class="old-price">${formatPrice(product.originalPrice)}</span>
            <span class="discount-badge">${discountPercent}% OFF</span>
          ` : ''}
        </div>

        <div class="warranty-info">
          🛡️ <strong>Warranty:</strong> ${product.warranty || "No Warranty"}
        </div>

        <p class="product-desc">${product.description || "No description available."}</p>

        ${product.variants ? `
          <div class="variant-section">
            <strong>Select Variant:</strong><br><br>
            ${variantsHTML}
          </div>
        ` : ''}

        ${product.sizes && product.sizes.length > 0 ? `
          <div class="variant-section" style="margin-top: 15px;">
            <strong>Select Size:</strong><br><br>
            ${sizesHTML}
          </div>
        ` : ''}

        <div class="stock-info ${out ? 'text-danger' : 'text-success'}">
          ${out ? '❌ Out of Stock' : `✅ In Stock (${product.stock} available)`}
        </div>

        <button class="btn btn-block btn-lg" ${out ? 'disabled' : ''} onclick="window.addDetailToCart()">
          ${out ? 'Out of Stock' : '🛒 Add to Cart'}
        </button>
      </div>
    </div>

    <div class="reviews-section" style="margin-top: 20px;">
      <h3 style="color: white;">Customer Reviews</h3>
      <div id="reviewsList">
        ${reviewsListHTML || '<p style="color:#ccc;">Be the first to review this product!</p>'}
      </div>
      
      <h4 style="margin-top:20px; color: white;">Write a Review</h4>
      <form id="reviewForm" onsubmit="window.submitReview(event, '${product.docId}')">
        <div class="form-group">
          <input type="text" id="rName" placeholder="Your Name" required style="width:100%; padding:10px; border-radius:8px; border:1px solid #ddd;" />
        </div>
        <div class="form-group" style="margin-top:10px;">
          <select id="rRating" required style="width:100%; padding:10px; border-radius:8px; border:1px solid #ddd;">
            <option value="">Select Rating</option>
            <option value="5">5 Stars - Excellent</option>
            <option value="4">4 Stars - Good</option>
            <option value="3">3 Stars - Average</option>
            <option value="2">2 Stars - Poor</option>
            <option value="1">1 Star - Terrible</option>
          </select>
        </div>
        <div class="form-group" style="margin-top:10px;">
          <textarea id="rComment" placeholder="Your Review..." rows="3" required style="width:100%; padding:10px; border-radius:8px; border:1px solid #ddd;"></textarea>
        </div>
        <button type="submit" class="btn" style="margin-top:10px;">Submit Review</button>
      </form>
    </div>
  `;
}

window.addDetailToCart = function() {
  const product = DB.getProducts().find(p => p.id === productId);
  
  const selectedVariant = document.querySelector('input[name="variant"]:checked')?.value || "";
  const selectedSize = document.querySelector('input[name="size"]:checked')?.value || ""; 
  
  let cartName = product.name;
  if (selectedVariant && selectedVariant !== "Standard") cartName += ` (${selectedVariant})`;
  if (selectedSize) cartName += ` - Size: ${selectedSize}`;

  const cart = DB.getCart();
  const existing = cart.find(i => i.id === product.id && i.name === cartName);

  if (existing) {
    if (existing.qty >= product.stock) return showToast("Stock limit reached", "error");
    existing.qty++;
  } else {
    cart.push({ id: product.id, name: cartName, price: product.price, qty: 1, image: product.image });
  }
  DB.setCart(cart);
  updateCartBadge();
  showToast("Added to cart ✅");
};

window.submitReview = async function(e, docId) {
  e.preventDefault();
  const name = document.getElementById("rName").value;
  const rating = parseInt(document.getElementById("rRating").value);
  const comment = document.getElementById("rComment").value;

  const product = DB.getProducts().find(p => p.id === productId);
  let updatedReviews = product.reviews || [];
  updatedReviews.unshift({ name, rating, comment });

  await DB.updateProduct(docId, { reviews: updatedReviews });
  
  showToast("Review added ✅");
  setTimeout(() => location.reload(), 1000);
};

// Cart Badge Update & Init
document.addEventListener("DOMContentLoaded", () => {
  updateCartBadge();
});
initProductPage();