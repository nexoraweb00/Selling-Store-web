import { DB, formatPrice, updateCartBadge, showToast, ADMIN_WHATSAPP } from './data.js';

const DELIVERY_FEE = 350;

function renderCart() {
  const cart = DB.getCart();
  const list = document.getElementById("cartList");
  const summary = document.getElementById("cartSummary");
  const empty = document.getElementById("emptyCart");

  if (cart.length === 0) {
    list.innerHTML = "";
    summary.style.display = "none";
    empty.style.display = "block";
    return;
  }
  empty.style.display = "none";
  summary.style.display = "block";

  list.innerHTML = cart.map((item) => `
    <div class="cart-item">
      <img src="${item.image}" onerror="this.src='https://placehold.co/100x100?text=Item'" />
      <div class="cart-item-info">
        <h4>${item.name}</h4>
        <p>${formatPrice(item.price)} each</p>
      </div>
      <div class="qty-controls">
        <button onclick="window.changeQty(${item.id}, -1)">−</button>
        <span>${item.qty}</span>
        <button onclick="window.changeQty(${item.id}, 1)">+</button>
      </div>
      <div class="item-total">${formatPrice(item.price * item.qty)}</div>
      <button class="btn btn-sm btn-outline" onclick="window.removeItem(${item.id})">✕</button>
    </div>`).join("");

  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  document.getElementById("subtotal").textContent = formatPrice(subtotal);
  document.getElementById("grandTotal").textContent = formatPrice(subtotal + DELIVERY_FEE);
}

window.changeQty = function(id, delta) {
  const cart = DB.getCart();
  const products = DB.getProducts();
  const item = cart.find((i) => i.id === id);
  const product = products.find((p) => p.id === id);
  if (!item || !product) return;

  const newQty = item.qty + delta;
  if (newQty <= 0) {
    DB.setCart(cart.filter((i) => i.id !== id));
  } else if (newQty > product.stock) {
    showToast("Stock limit reached", "error");
    return;
  } else {
    item.qty = newQty;
    DB.setCart(cart);
  }
  renderCart();
  updateCartBadge();
};

window.removeItem = function(id) {
  DB.setCart(DB.getCart().filter((i) => i.id !== id));
  renderCart();
  updateCartBadge();
};

document.querySelectorAll(".payment-option").forEach((el) => {
  el.addEventListener("click", () => {
    document.querySelectorAll(".payment-option").forEach((x) => x.classList.remove("selected"));
    el.classList.add("selected");
    el.querySelector("input").checked = true;
    const method = el.dataset.method;
    document.getElementById("cardForm").classList.toggle("show", method === "card");
  });
});

// Main Order Function
window.placeOrder = async function() {
  const user = DB.getCurrentUser();
  if (!user) {
    showToast("Please login to place an order", "error");
    setTimeout(() => (location.href = "login.html?redirect=cart.html"), 800);
    return;
  }

  if (!user.phone || !user.address) {
    document.getElementById("deliveryModal").style.display = "flex";
    return;
  }

  const method = document.querySelector('input[name="payment"]:checked')?.value;
  if (!method) return showToast("Please select a payment method", "error");

  const cart = DB.getCart();
  if (cart.length === 0) return;

  const products = DB.getProducts();
  for (const item of cart) {
    const p = products.find((x) => x.id === item.id);
    if (!p || p.stock < item.qty) {
      showToast(`${item.name} is out of stock`, "error");
      return;
    }
  }

  if (method === "card") {
    const cn = document.getElementById("cardNumber").value.replace(/\s/g, "");
    const cv = document.getElementById("cardCvv").value;
    const exp = document.getElementById("cardExpiry").value;
    if (cn.length < 12 || cv.length < 3 || exp.length < 4)
      return showToast("Please fill in card details", "error");
  }

  document.getElementById("placeOrderBtn").textContent = "Processing...";
  document.getElementById("placeOrderBtn").disabled = true;

  for (const item of cart) {
    const p = products.find((x) => x.id === item.id);
    await DB.updateProduct(p.docId, { stock: p.stock - item.qty });
  }

  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const order = {
    id: "ORD" + Date.now().toString().slice(-8),
    user: user.username,
    phone: user.phone,
    address: user.address,
    items: [...cart],
    subtotal,
    delivery: DELIVERY_FEE,
    total: subtotal + DELIVERY_FEE,
    payment: method,
    status: "pending",
    date: new Date().toISOString(),
  };

  await DB.addOrder(order);
  DB.setCart([]);
  updateCartBadge();

  if (method === "whatsapp") {
    const msg = `🛒 *New Order ${order.id}*\n👤 ${user.username}\n📞 ${user.phone}\n📍 ${user.address}\n\n` +
      cart.map((i) => `• ${i.name} x${i.qty} = ${formatPrice(i.price * i.qty)}`).join("\n") +
      `\n\nDelivery: ${formatPrice(DELIVERY_FEE)}\n*Total: ${formatPrice(order.total)}*`;
    window.open(`https://wa.me/${ADMIN_WHATSAPP}?text=${encodeURIComponent(msg)}`, "_blank");
  }

  showToast("Order placed successfully! ✅");
  setTimeout(() => (location.href = "index.html"), 1500);
};

document.getElementById("placeOrderBtn").addEventListener("click", window.placeOrder);

document.getElementById("saveDetailsBtn").addEventListener("click", () => {
  const phone = document.getElementById("popupPhone").value.trim();
  const address = document.getElementById("popupAddress").value.trim();

  if (phone.length < 9) return showToast("Please enter a valid phone number", "error");
  if (address.length < 10) return showToast("Please enter a complete address", "error");

  let user = DB.getCurrentUser();
  user.phone = phone;
  user.address = address;
  DB.setCurrentUser(user);

  document.getElementById("deliveryModal").style.display = "none";
  showToast("Details saved! Placing order... ✅");
  setTimeout(window.placeOrder, 1000);
});

function renderUserArea() {
  const user = DB.getCurrentUser();
  const area = document.getElementById("userArea");
  if (!area) return;
  if (user) area.innerHTML = `<span class="user-tag">👤 ${user.username}</span>`;
  else area.innerHTML = `<a href="login.html?redirect=cart.html">Login</a>`;

window.logoutUser = function() {
  DB.setCurrentUser(null);
  location.href = 'index.html';
};
}

async function initCart() {
  await DB.fetchProducts();
  renderCart();
  renderUserArea();
  updateCartBadge();
}
initCart();