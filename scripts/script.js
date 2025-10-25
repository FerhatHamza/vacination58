import { loginUser } from "./auth.js";
import { getAllUsernames } from "./api.js";
const loginBtn = document.getElementById("loginBtn");
const errorP = document.getElementById("errorId");
const option = document.getElementById("etablissement");

loginBtn.addEventListener('click', login)

document.addEventListener("DOMContentLoaded", () => {
  init();
})

function init() {
  fillUsernames();
}

async function login() {
  const etablissement = option.value;
  const password = document.getElementById("password").value;

  console.log('etab: ', etablissement, 'password: ', password)
  if (!etablissement || !password) {
    alert("Veuillez remplir tous les champs !");
    return;
  }

  try {
    console.log(etablissement, password);
    const user = await loginUser(etablissement, password);
    console.log("✅ Logged in:", user);
    if (user.role === "admin") {
      window.location.href = "dashboard.html";
    } else if (user.role === "soadmin") {
      window.location.href = "storeManager.html";
    } else {
      window.location.href = "daily.html";
    }

  } catch (error) {
    errorP.textContent = error.message;
    console.error("❌ Login failed:", error.message);
  }

}

const nom = {
  'DSP El Menia': 'DSP El Menia',
  'EPH El Menia': 'EPH El Menia',
  'EPSP El Menia': 'EPSP El Menia',
  'EPSP Centre 1': 'CV Hassi Gara',
  'EPSP Centre 2': 'CV Centre Ville',
  'EPSP Centre 3': 'CV 200 Logt',
  'EPSP Centre 4': 'CV Vieux Ksar',
  'EPSP Centre 5': 'CV Hassi Ghanem',
  'EPSP Centre 6': 'CV  Hassi Fehal',
  'EPSP Centre 7': 'Equipe Mobile',
}
async function fillUsernames() {
  const res = await getAllUsernames();
  console.log(res);

  let html = '<option value="">-- Sélectionner --</option>';



  res.data.forEach(item => {
    html += `
      <option value="${item.username}" >${nom[item.etab]}</option>
    `
  });

  option.innerHTML = html;

}

function checkAccess(requiredRole) {
  const USER_KEY = "userSession";
  const role = JSON.parse(localStorage.getItem(USER_KEY));

  if (!role) {
    window.location.href = "index.html";
    return;
  }

  if (requiredRole === "admin" && role.role !== "admin") {
    window.location.href = "index.html";
  }
  if (requiredRole === "soadmin" && role.role !== "soadmin") {
    window.location.href = "index.html";
  }

  if (requiredRole === "coordinateur" && role.role !== "coordinateur") {
    window.location.href = "index.html";
  }
}
