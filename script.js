const API = window.DECKBAR_API_URL || "";
const $ = (s) => document.querySelector(s);

const state = {
  points: Number(localStorage.getItem("points") || 0),
  token: localStorage.getItem("super_token") || null,
  role: localStorage.getItem("super_role") || null,
  logoClicks: 0,
  lastClickAt: 0
};

const pointsValue = $("#points-value");
const btnAddPoint = $("#btn-add-point");

const orderNo = $("#orderNo");
const amountPaid = $("#amountPaid");
const btnGenerate = $("#btn-generate");
const qrWrap = $("#qr-result");
const qrHint = $("#qr-hint");

const logo = $("#logo");
const superModal = $("#super-modal");
const superUser = $("#super-user");
const superPass = $("#super-pass");
const btnSuperLogin = $("#btn-super-login");

function refreshUI(){
  pointsValue.textContent = state.points;

  const superLogged = Boolean(state.token) && state.role === "superadmin";
  orderNo.disabled = !superLogged;
  amountPaid.disabled = !superLogged;
  btnGenerate.disabled = !superLogged;
  qrHint.style.display = superLogged ? "none" : "block";
}

refreshUI();

// mock points
btnAddPoint.addEventListener("click", () => {
  state.points += 1;
  localStorage.setItem("points", String(state.points));
  refreshUI();
});

// 7 clicks to open super admin modal
logo.addEventListener("click", () => {
  const now = Date.now();
  if (now - state.lastClickAt > 1200) state.logoClicks = 0;
  state.lastClickAt = now;
  state.logoClicks += 1;
  if (state.logoClicks >= 7){
    state.logoClicks = 0;
    superModal.showModal();
  }
});

btnSuperLogin.addEventListener("click", async (e) => {
  e.preventDefault();
  try {
    if (!API) return alert("API não configurada (window.DECKBAR_API_URL).");
    const r = await fetch(API.replace(/\/$/,'') + "/auth-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user: superUser.value.trim(), pass: superPass.value.trim() })
    });
    const data = await r.json();
    if (!r.ok) return alert(data.error || "Falha no login");
    if (data.role !== "superadmin") return alert("Acesso permitido apenas para Super Admin");
    state.token = data.token;
    state.role = data.role;
    localStorage.setItem("super_token", state.token);
    localStorage.setItem("super_role", state.role);
    superModal.close();
    refreshUI();
  } catch (err) {
    alert("Erro de rede no login");
  }
});

btnGenerate.addEventListener("click", async () => {
  const order = orderNo.value.trim();
  const amount = amountPaid.value.trim();
  if (!order) return alert("orderNo é obrigatório");
  if (!amount) return alert("Informe o valor pago");

  try {
    const r = await fetch(API.replace(/\/$/,'') + "/qr-generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${state.token || ""}`
      },
      body: JSON.stringify({ orderNo: order, amountPaid: Number(amount) })
    });
    const data = await r.json();
    if (!r.ok) return alert(`Erro: ${data.error || "falha ao gerar"}`);

    qrWrap.innerHTML = "";
    new QRCode(qrWrap, {
      text: data.token,
      width: 200,
      height: 200
    });
  } catch (err) {
    alert("Falha de rede ao gerar QR");
  }
});
