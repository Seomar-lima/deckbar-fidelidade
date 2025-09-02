// ===== Estado simples local (fase pré-ajustes) =====
const state = {
  points: Number(localStorage.getItem("points") || 0),
  isAdmin: localStorage.getItem("isAdmin") === "true",
  logoClicks: 0,
  lastClickAt: 0
};

const $ = (sel) => document.querySelector(sel);

// ===== UI Elements =====
const pointsValue = $("#points-value");
const btnAddPoint = $("#btn-add-point");

const orderNo = $("#orderNo");
const amountPaid = $("#amountPaid");
const btnGenerate = $("#btn-generate");
const qrWrap = $("#qr-result");

const adminPanel = $("#admin-panel");
const adminModal = $("#admin-modal");
const btnAdminLogin = $("#btn-admin-login");
const btnLogout = $("#btn-logout");

const adminUser = $("#admin-user");
const adminPass = $("#admin-pass");
const logo = $("#logo");

// ===== Init =====
function refreshUI(){
  pointsValue.textContent = state.points;

  if (state.isAdmin){
    adminPanel.classList.remove("hidden");
  } else {
    adminPanel.classList.add("hidden");
  }
}
refreshUI();

// ===== Pontos (mock para teste visual) =====
btnAddPoint.addEventListener("click", () => {
  state.points += 1;
  localStorage.setItem("points", String(state.points));
  refreshUI();
});

// ===== Easter egg: 5 cliques na logo abre modal admin =====
logo.addEventListener("click", () => {
  const now = Date.now();
  // zera sequência se passou >1,2s entre cliques
  if (now - state.lastClickAt > 1200){
    state.logoClicks = 0;
  }
  state.lastClickAt = now;
  state.logoClicks += 1;

  if (state.logoClicks >= 5){
    state.logoClicks = 0;
    adminModal.showModal();
  }
});

// ===== Login Admin (NESTA FASE estava pré-preenchido) =====
btnAdminLogin.addEventListener("click", (e) => {
  e.preventDefault();
  const u = adminUser.value.trim();
  const p = adminPass.value.trim();

  // Checagem básica local (protótipo)
  if (u === "seomar" && p === "160590"){
    state.isAdmin = true;
    localStorage.setItem("isAdmin", "true");
    adminModal.close();
    refreshUI();
  } else {
    alert("Credenciais inválidas.");
  }
});

// ===== Logout =====
btnLogout?.addEventListener("click", () => {
  state.isAdmin = false;
  localStorage.removeItem("isAdmin");
  refreshUI();
});

// ===== Gerar QR CODE (visível sem login nesta fase) =====
btnGenerate.addEventListener("click", () => {
  const order = orderNo.value.trim();
  const amount = amountPaid.value.trim();

  if (!order){
    alert("orderNo é obrigatório (estado anterior gerava esse erro no backend).");
    return;
  }
  if (!amount){
    alert("Informe o valor pago.");
    return;
  }

  // Nesta etapa, o QR era gerado localmente, só para teste visual
  // payload simples; o backend viria depois
  const payload = {
    orderNo: order,
    amountPaid: Number(amount),
    ts: Date.now()
  };

  // Limpa e gera novo
  qrWrap.innerHTML = "";
  new QRCode(qrWrap, {
    text: JSON.stringify(payload),
    width: 200,
    height: 200
  });
});
