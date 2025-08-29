let clickCount = 0;
let loggedIn = false;

document.getElementById("logo").addEventListener("click", () => {
  clickCount++;
  if (clickCount >= 5) {
    document.getElementById("login-area").classList.remove("hidden");
    clickCount = 0;
  }
});

function login() {
  const user = document.getElementById("username").value;
  const pass = document.getElementById("password").value;
  if (user === "seomar" && pass === "160590") {
    loggedIn = true;
    document.getElementById("admin-area").classList.remove("hidden");
    document.getElementById("logout").classList.remove("hidden");
    alert("Login realizado com sucesso!");
  } else {
    alert("Usuário ou senha incorretos.");
  }
}

function logout() {
  loggedIn = false;
  document.getElementById("admin-area").classList.add("hidden");
  document.getElementById("logout").classList.add("hidden");
  document.getElementById("username").value = "";
  document.getElementById("password").value = "";
}

function verificarPontos() {
  const cpf = document.getElementById("cpf").value;
  const pontosArea = document.getElementById("pontos-area");
  pontosArea.innerHTML = `<p>CPF: ${cpf}</p><p>Pontos: 12</p>`;

  if (12 >= 15) {
    pontosArea.innerHTML += '<img src="assets/15pontos.jpg" alt="Prêmio 15 pontos">';
  } else if (12 >= 10) {
    pontosArea.innerHTML += '<img src="assets/10pontos.jpg" alt="Prêmio 10 pontos">';
  } else if (12 >= 5) {
    pontosArea.innerHTML += '<img src="assets/5pontos.jpg" alt="Prêmio 5 pontos">';
  }
}

function gerarQRCode() {
  if (!loggedIn) {
    alert("Acesso negado.");
    return;
  }
  const orderNo = document.getElementById("orderNo").value;
  const amount = document.getElementById("amount").value;
  const qrResult = document.getElementById("qr-result");
  qrResult.innerHTML = `<p>QR gerado para Pedido ${orderNo}, valor R$${amount}</p>`;
}
