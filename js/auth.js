
import { DB, showToast, auth } from './data.js';
import { GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

getRedirectResult(auth)
  .then((result) => {
    if (result) {
      const user = result.user;
      const userData = {
        username: user.displayName || user.email.split('@')[0],
        email: user.email,
        photoURL: user.photoURL,
        uid: user.uid
      };
      DB.setCurrentUser(userData);
      showToast(`Welcome, ${userData.username}! ✅`);
      setTimeout(() => { location.href = redirect; }, 1000);
    }
  }).catch((error) => {
    console.error("Redirect Login Error:", error);
    showToast("Google Login failed. Please try again.", "error");
  });


window.googleLogin = async function() {
  try {
    const provider = new GoogleAuthProvider();
    
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (isMobile) {

      await signInWithRedirect(auth, provider);
    } else {

      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      const userData = {
        username: user.displayName || user.email.split('@')[0],
        email: user.email,
        photoURL: user.photoURL,
        uid: user.uid
      };
      DB.setCurrentUser(userData);
      showToast(`Welcome, ${userData.username}! ✅`);
      setTimeout(() => { location.href = redirect; }, 1000);
    }
  } catch (error) {
    console.error("Google Login Error:", error);
    showToast("Google Login failed. Please try again.", "error");
  }
};
let isRegister = false;
const params = new URLSearchParams(location.search);
const redirect = params.get("redirect") || "index.html";

document.getElementById("switchLink").addEventListener("click", (e) => {
  e.preventDefault();
  isRegister = !isRegister;
  document.getElementById("formTitle").textContent = isRegister ? "Register" : "Login";
  document.getElementById("submitBtn").textContent = isRegister ? "Register" : "Login";
  document.getElementById("switchText").textContent = isRegister ? "Already have an account?" : "Don't have an account?";
  document.getElementById("switchLink").textContent = isRegister ? "Login" : "Register";
  document.getElementById("emailGroup").style.display = isRegister ? "block" : "none";
  
  document.getElementById("phoneGroup").style.display = isRegister ? "block" : "none";
  document.getElementById("addressGroup").style.display = isRegister ? "block" : "none";
});


document.getElementById("authForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value;
  const email = document.getElementById("email")?.value.trim() || "";
  
  const phone = document.getElementById("phone")?.value.trim() || "";
  const address = document.getElementById("address")?.value.trim() || "";

  if (username.length < 3) return showToast("Username must be at least 3 characters", "error");
  if (password.length < 4) return showToast("Password must be at least 4 characters", "error");

  const users = DB.getUsers();

  if (isRegister) {
    if (users.find((u) => u.username === username)) return showToast("Username already taken", "error");
    
    users.push({ username, password, email, phone, address });
    DB.setUsers(users);
    DB.setCurrentUser({ username, phone, address });
    
    showToast("Registered successfully ✅");
  } else {
    const user = users.find((u) => u.username === username && u.password === password);
    if (!user) return showToast("Invalid username or password", "error");
    
    DB.setCurrentUser(user); 
    showToast("Logged in ✅");
  }

  setTimeout(() => (location.href = redirect), 600);
});

window.googleLogin = async function() {
  try {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    const user = result.user;
    
    const userData = {
      username: user.displayName || user.email.split('@')[0],
      email: user.email,
      photoURL: user.photoURL,
      uid: user.uid
    };

    DB.setCurrentUser(userData);
    showToast(`Welcome, ${userData.username}! ✅`);
    
    setTimeout(() => { location.href = redirect; }, 1000);
    
  } catch (error) {
    console.error("Google Login Error:", error);
    showToast("Google Login failed. Please try again.", "error");
  }
};