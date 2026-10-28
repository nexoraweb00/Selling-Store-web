
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, collection, getDocs, addDoc, deleteDoc, doc, updateDoc, query, orderBy, onSnapshot, increment } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyDN4-wD_xodwaWjB6CxPgTutX_SzIIW_lQ",
  authDomain: "vacation-selling.firebaseapp.com",
  projectId: "vacation-selling",
  storageBucket: "vacation-selling.firebasestorage.app",
  messagingSenderId: "301977408938",
  appId: "1:301977408938:web:63931c908fa683fb4807d3",
  measurementId: "G-L14VWLJP6C"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export const ADMIN_WHATSAPP = "94775029744";
export const ADMIN_USERNAME = "admin";
export const ADMIN_PASSWORD = "123456";


let cachedProducts = [];
let cachedOrders = [];
let cachedOffers = [];

export const DB = {

  getProducts: () => cachedProducts,
  
  fetchProducts: async () => {
    const q = query(collection(db, "products"), orderBy("id", "desc"));
    const snapshot = await getDocs(q);
    cachedProducts = snapshot.docs.map(doc => ({ docId: doc.id, ...doc.data() }));
    return cachedProducts;
  },

  listenProducts: (callback) => {
    const q = query(collection(db, "products"), orderBy("id", "desc"));
    onSnapshot(q, (snapshot) => {
      cachedProducts = snapshot.docs.map(doc => ({ docId: doc.id, ...doc.data() }));
      if (callback) callback(cachedProducts);
    });
  },

  decreaseStock: async (docId, qty) => {
    const productRef = doc(db, "products", docId);
    await updateDoc(productRef, { stock: increment(-qty) });
  },
     
  increaseStock: async (docId, qty) => {
    const productRef = doc(db, "products", docId);
    await updateDoc(productRef, { stock: increment(qty) });
  },
  
  addProduct: async (productData) => {
    const docRef = await addDoc(collection(db, "products"), productData);
    cachedProducts.unshift({ docId: docRef.id, ...productData });
  },

  updateProduct: async (docId, updatedData) => {
    const productRef = doc(db, "products", docId);
    await updateDoc(productRef, updatedData);
    const index = cachedProducts.findIndex(p => p.docId === docId);
    if(index > -1) cachedProducts[index] = { ...cachedProducts[index], ...updatedData };
  },

  deleteProduct: async (docId) => {
    await deleteDoc(doc(db, "products", docId));
    cachedProducts = cachedProducts.filter(p => p.docId !== docId);
  },

  getOrders: () => cachedOrders,
  
  fetchOrders: async () => {
    const q = query(collection(db, "orders"), orderBy("date", "desc"));
    const snapshot = await getDocs(q);
    cachedOrders = snapshot.docs.map(doc => ({ docId: doc.id, ...doc.data() }));
    return cachedOrders;
  },

  addOrder: async (orderData) => {
    const docRef = await addDoc(collection(db, "orders"), orderData);
    cachedOrders.unshift({ docId: docRef.id, ...orderData });
  },

  updateOrderStatus: async (docId, status) => {
    await updateDoc(doc(db, "orders", docId), { status: status });
    const index = cachedOrders.findIndex(o => o.docId === docId);
    if(index > -1) cachedOrders[index].status = status;
  },

  getOffers: () => cachedOffers,
  
  fetchOffers: async () => {
    const snapshot = await getDocs(collection(db, "offers"));
    cachedOffers = snapshot.docs.map(doc => ({ docId: doc.id, ...doc.data() }));
    return cachedOffers;
  },

  addOffer: async (offerData) => {
    const docRef = await addDoc(collection(db, "offers"), offerData);
    cachedOffers.push({ docId: docRef.id, ...offerData });
  },

  deleteOffer: async (docId) => {
    await deleteDoc(doc(db, "offers", docId));
    cachedOffers = cachedOffers.filter(o => o.docId !== docId);
  },
  
  getUsers: () => JSON.parse(localStorage.getItem("mp_users") || "[]"),
  setUsers: (u) => localStorage.setItem("mp_users", JSON.stringify(u)),
  
  getCurrentUser: () => JSON.parse(localStorage.getItem("mp_currentUser") || "null"),
  setCurrentUser: (u) => u ? localStorage.setItem("mp_currentUser", JSON.stringify(u)) : localStorage.removeItem("mp_currentUser"),
  
  getCart: () => JSON.parse(localStorage.getItem("mp_cart") || "[]"),
  setCart: (c) => localStorage.setItem("mp_cart", JSON.stringify(c)),
  getCurrentUser: () => JSON.parse(localStorage.getItem("mp_currentUser") || "null"),
  setCurrentUser: (u) => u ? localStorage.setItem("mp_currentUser", JSON.stringify(u)) : localStorage.removeItem("mp_currentUser"),
  
  getCart: () => JSON.parse(localStorage.getItem("mp_cart") || "[]"),
  setCart: (c) => localStorage.setItem("mp_cart", JSON.stringify(c)),
};

export function formatPrice(n) {
  return "Rs. " + n.toLocaleString("en-LK");
}

export function updateCartBadge() {
  const cart = DB.getCart();
  const count = cart.reduce((s, i) => s + i.qty, 0);
  document.querySelectorAll(".cart-count").forEach((el) => (el.textContent = count));
}

export function showToast(msg, type = "success") {
  const div = document.createElement("div");
  div.className = "toast toast-" + type;
  div.textContent = msg;
  document.body.appendChild(div);
  setTimeout(() => div.remove(), 3000);
}

document.addEventListener("DOMContentLoaded", function () {
  const toggle = document.getElementById("menuToggle");
  const nav = document.getElementById("mainNav");
  if (toggle && nav) {
    toggle.addEventListener("click", () => {
      nav.classList.toggle("show");
      toggle.textContent = nav.classList.contains("show") ? "✕" : "☰";
    });
  }
  updateCartBadge();
});