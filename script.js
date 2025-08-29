// ======= CONFIG =======
const BASE_API_URL = "http://localhost:4000/api"; // ajuste para seu backend
const ADMIN_DEFAULT = { user: "seomar", pass: "160590" };
const FIVE_CLICK_WINDOW_MS = 3000;

// ======= HELPERS =======
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

function brMoney(n) {
  const num = Number(n || 0);
  return num.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function fixAmountInput(val) {
  // aceita "25,14" ou "25.14"
  return Number(String(val).replace(/\./g, "").replace(",", "."));
}
function maskCPF(v) {
  return v.replace(/\D/g, "")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2")
    .slice(0,14);
}

// ======= STATE =======
let state = {
  clicks: { count: 0, timer: null },
  adminToken: localStorage.getItem("adminToken") || null,
  activeQR: null, // { token, expiresAt, qrDataUrl }
  countdownId: null,
  scanner: null
};

// ======= API =======
async function api(path, options = {}) {
  const res = await fetch(`${BASE_API_URL}${path}`, options);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || data.message || "Erro na requisição");
  return data;
}

// CLIENT
async function checkCpf(cpf) {
  return api(`/client/check-cpf`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ cpf })
  });
}
async function registerClient(name, cpf) {
  return api(`/client/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, cpf })
  });
}
async function getSummary(cpf) {
  return api(`/client/summary?cpf=${encodeURIComponent(cpf)}`);
}
async function useQr(cpf, token) {
  return api(`/client/use-qr`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ cpf, token })
  });
}

// ADMIN
function authHeaders() {
  return state.adminToken ? { Authorization: `Bearer ${state.adminToken}` } : {};
}
async function adminLogin(username, password) {
  const data = await api(`/admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password })
  });
  state.adminToken = data.token;
  localStorage.setItem("adminToken", data.token);
  return data;
}
async function adminGenerate(orderNo, amountPaid) {
  const data = await api(`/admin/qr/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ orderNo, amountPaid })
  });
  return data;
}
async function adminInvalidate(token) {
  return api(`/admin/qr/invalidate`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ token })
  });
}
async function reportCustomers() {
  return api(`/admin/report/customers`, { headers: { ...authHeaders() } });
}
async function reportTransactions() {
  return api(`/admin/report/transactions`, { headers: { ...authHeaders() } });
}

// ======= UI ACTIONS (Cliente) =======
function initClientUI() {
  const elCPF = $("#cpf");
  elCPF.addEventListener("input", (e) => e.target.value = maskCPF(e.target.value));

  $("#btn-check").addEventListener("click", onCheckCpf);
  $("#btn-register").addEventListener("click", onRegister);

  $("#btn-scan").addEventListener("click", startScan);

  // 5 cliques na logo para abrir admin
  $("#logo").addEventListener("click", handleLogoClicks);

  // se já existe cpf no input e o usuário der enter
  elCPF.addEventListener("keydown", (e) => { if (e.key === "Enter") $("#btn-check").click(); });
}

async function onCheckCpf() {
  const cpf = $("#cpf").value.trim();
  const msg = $("#cpf-msg");
  msg.textContent = "";
  $("#register-area").classList.add("hidden");

  try {
    const r = await checkCpf(cpf);
    if (r.exists) {
      const sum = await getSummary(cpf);
      renderSummary(sum);
    } else {
      msg.textContent = r.message || "CPF incorreto ou não cadastrado";
      $("#register-area").classList.remove("hidden");
    }
  } catch (err) {
    msg.textContent = err.message;
  }
}

async function onRegister() {
  const name = $("#name").value.trim();
  const cpf = $("#cpf").value.trim();
  const msg = $("#cpf-msg");
  msg.textContent = "";

  if (!name) { msg.textContent = "Informe seu nome"; return; }

  try {
    await registerClient(name, cpf);
    const sum = await getSummary(cpf);
    renderSummary(sum);
  } catch (err) {
    msg.textContent = err.message;
  }
}

function renderSummary(sum) {
  $("#card-cpf").classList.add("hidden");
  $("#card-summary").classList.remove("hidden");

  $("#hello").textContent = `Olá, ${sum.customer.name}`;
  $("#kpi-visits").textContent = sum.visits;
  $("#kpi-extra").textContent = Number(sum.extraPoints).toFixed(2).replace(".", ",");
  $("#kpi-total").textContent = Number(sum.totalPoints).toFixed(2).replace(".", ",");

  if (sum.milestoneImage) {
    $("#milestone-img").src = `./${sum.milestoneImage}`;
    $("#milestone").classList.remove("hidden");
  } else {
    $("#milestone").classList.add("hidden");
  }

  const ul = $("#history");
  ul.innerHTML = "";
  (sum.history || []).forEach(h => {
    const li = document.createElement("li");
    const dt = new Date(h.date);
    li.textContent = `${dt.toLocaleString()} — Pedido ${h.orderNo}`;
    ul.appendChild(li);
  });
}

function startScan() {
  const container = $("#qr-reader");
  const btn = $("#btn-scan");
  btn.disabled = true;
  container.classList.remove("hidden");

  // Html5QrcodeScanner(global) loaded by CDN
  const { Html5QrcodeScanner } = window;
  state.scanner = new Html5QrcodeScanner("qr-reader", { fps: 10, qrbox: 250 }, false);

  const cpf = $("#cpf").value.trim();
  state.scanner.render(async (decodedText) => {
    try {
      const data = JSON.parse(decodedText);
      if (!data.t) throw new Error("QR inválido");
      await useQr(cpf, data.t);
      const sum = await getSummary(cpf);
      renderSummary(sum);
      stopScan();
    } catch (e) {
      alert(e.message || "Não foi possível ler este QR");
      stopScan();
    }
  }, () => { /* ignore errors */ });
}
function stopScan() {
  if (state.scanner) {
    state.scanner.clear().catch(()=>{});
    state.scanner = null;
  }
  $("#qr-reader").classList.add("hidden");
  $("#btn-scan").disabled = false;
}

// ======= UI ACTIONS (Admin) =======
function handleLogoClicks() {
  const now = Date.now();
  clearTimeout(state.clicks.timer);
  state.clicks.count += 1;
  state.clicks.timer = setTimeout(() => (state.clicks.count = 0), FIVE_CLICK_WINDOW_MS);
  if (state.clicks.count >= 5) {
    state.clicks.count = 0;
    openAdmin();
  }
}

function openAdmin() {
  const dlg = $("#admin-dialog");
  dlg.showModal();

  // estado inicial
  $("#admin-login").classList.toggle("hidden", !!state.adminToken);
  $("#admin-app").classList.toggle("hidden", !state.adminToken);

  // listeners
  $("#btn-admin-login").onclick = onAdminLogin;
  $("#btn-logout").onclick = onAdminLogout;

  $("#tab-qr").onclick = () => switchTab("qr");
  $("#tab-reports").onclick = () => switchTab("reports");

  $("#btn-generate").onclick = onGenerateQR;
  $("#btn-invalidate").onclick = onInvalidateQR;
  $("#btn-refresh").onclick = onRefreshReports;

  // preencher usuário padrão como dica
  $("#admin-user").value = ADMIN_DEFAULT.user;
  $("#admin-pass").value = ADMIN_DEFAULT.pass;
}
function closeAdmin() {
  const dlg = $("#admin-dialog");
  dlg.close();
  clearCountdown();
}
window.ui = { closeAdmin };

async function onAdminLogin() {
  const u = $("#admin-user").value.trim();
  const p = $("#admin-pass").value.trim();
  const msg = $("#admin-msg"); msg.textContent = "";
  try {
    await adminLogin(u, p);
    $("#admin-login").classList.add("hidden");
    $("#admin-app").classList.remove("hidden");
  } catch (e) {
    msg.textContent = e.message;
  }
}

function onAdminLogout() {
  state.adminToken = null;
  localStorage.removeItem("adminToken");
  $("#admin-app").classList.add("hidden");
  $("#admin-login").classList.remove("hidden");
  clearQR();
}

function switchTab(name) {
  $("#tab-qr").classList.toggle("active", name === "qr");
  $("#tab-reports").classList.toggle("active", name === "reports");
  $("#pane-qr").classList.toggle("hidden", name !== "qr");
  $("#pane-reports").classList.toggle("hidden", name !== "reports");
  if (name === "reports") onRefreshReports();
}

async function onGenerateQR() {
  const orderNo = $("#order-no").value.trim();
  const amountPaid = fixAmountInput($("#amount-paid").value);
  const msg = $("#qr-msg"); msg.textContent = "";
  if (!orderNo) { msg.textContent = "Informe o nº do pedido"; return; }

  try {
    const r = await adminGenerate(orderNo, isNaN(amountPaid) ? 0 : amountPaid);
    state.activeQR = r;
    renderQR(r);
  } catch (e) {
    msg.textContent = e.message;
  }
}
async function onInvalidateQR() {
  const msg = $("#qr-msg"); msg.textContent = "";
  if (!state.activeQR?.token) { msg.textContent = "Não há QR ativo"; return; }
  try {
    await adminInvalidate(state.activeQR.token);
    clearQR();
    msg.textContent = "QR invalidado.";
  } catch (e) {
    msg.textContent = e.message;
  }
}

function renderQR({ token, qrDataUrl, expiresAt }) {
  $("#qr-token").textContent = token;
  $("#qr-img").src = qrDataUrl;
  $("#qr-output").classList.remove("hidden");

  clearCountdown();
  const end = new Date(expiresAt).getTime();
  state.countdownId = setInterval(() => {
    const left = Math.max(0, Math.floor((end - Date.now()) / 1000));
    $("#qr-countdown").textContent = left;
    if (left <= 0) clearCountdown();
  }, 500);
}
function clearQR() {
  clearCountdown();
  state.activeQR = null;
  $("#qr-output").classList.add("hidden");
  $("#qr-token").textContent = "";
  $("#qr-img").src = "";
  $("#qr-countdown").textContent = "–";
}
function clearCountdown() {
  if (state.countdownId) { clearInterval(state.countdownId); state.countdownId = null; }
}

async function onRefreshReports() {
  // Clientes
  const tbC = $("#tbl-customers");
  tbC.innerHTML = "<tr><td colspan='6'>Carregando...</td></tr>";
  try {
    const rows = await reportCustomers();
    tbC.innerHTML = "";
    rows.forEach(r => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${escapeHtml(r.name)}</td>
        <td>${escapeHtml(r.cpf)}</td>
        <td>${r.visits}</td>
        <td>${Number(r.extraPoints).toFixed(2).replace(".", ",")}</td>
        <td><strong>${Number(r.totalPoints).toFixed(2).replace(".", ",")}</strong></td>
        <td><strong>${brMoney(r.totalSpent)}</strong></td>
      `;
      tbC.appendChild(tr);
    });
    if (!rows.length) tbC.innerHTML = "<tr><td colspan='6'>Sem dados</td></tr>";
  } catch (e) {
    tbC.innerHTML = `<tr><td colspan='6' style="color:#b94a48">${escapeHtml(e.message)}</td></tr>`;
  }

  // Transações
  const tbT = $("#tbl-transactions");
  tbT.innerHTML = "<tr><td colspan='7'>Carregando...</td></tr>";
  try {
    const rows = await reportTransactions();
    tbT.innerHTML = "";
    rows.forEach(t => {
      const tr = document.createElement("tr");
      const dt = new Date(t.visitedAt);
      tr.innerHTML = `
        <td>${dt.toLocaleString()}</td>
        <td>${escapeHtml(t.name)}</td>
        <td>${escapeHtml(t.cpf)}</td>
        <td>${escapeHtml(t.orderNo)}</td>
        <td>${brMoney(t.amountPaid)}</td>
        <td>${t.visitPoints}</td>
        <td>${t.extraPoints}</td>
      `;
      tbT.appendChild(tr);
    });
    if (!rows.length) tbT.innerHTML = "<tr><td colspan='7'>Sem dados</td></tr>";
  } catch (e) {
    tbT.innerHTML = `<tr><td colspan='7' style="color:#b94a48">${escapeHtml(e.message)}</td></tr>`;
  }
}

function escapeHtml(s="") {
  return String(s)
    .replaceAll("&","&amp;").replaceAll("<","&lt;")
    .replaceAll(">","&gt;").replaceAll("\"","&quot;").replaceAll("'","&#039;");
}

// ======= BOOT =======
window.addEventListener("DOMContentLoaded", () => {
  initClientUI();
});
