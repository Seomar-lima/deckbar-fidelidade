const $ = sel => document.querySelector(sel);
const API_URL = document.querySelector('meta[name="api-url"]').content || '';
function toast(msg, ms=1800){ const el=$("#toast"); el.textContent=msg; el.classList.remove('hidden'); setTimeout(()=>el.classList.add('hidden'),ms); }
async function api(path, opts={}, needAuth=false){
  const h = {'Content-Type':'application/json', ...(opts.headers||{})};
  if(needAuth){ const t = localStorage.getItem('adminToken'); if(t) h['Authorization']='Bearer '+t; }
  const r = await fetch(API_URL+path, {...opts, headers:h});
  const txt = await r.text();
  if(!r.ok) throw new Error(txt || r.statusText);
  try { return JSON.parse(txt); } catch { return txt; }
}
const viewStart = $("#cliente-card");
const viewHome  = $("#home-card");
const viewAdmin = $("#admin-card");
function show(v){ [viewStart,viewHome,viewAdmin].forEach(x=>x.classList.add('hidden')); v.classList.remove('hidden'); }
let tapCount=0, tapTimer=null;
$("#logo").addEventListener('click',()=>{
  tapCount++; if(tapTimer) clearTimeout(tapTimer);
  tapTimer=setTimeout(()=>tapCount=0,1500);
  if(tapCount>=5){ tapCount=0; show(viewAdmin); $("#btn-admin-sair").classList.toggle('hidden', !localStorage.getItem('adminToken')); }
});
$("#btn-verificar").addEventListener('click', async ()=>{
  const cpf = $("#cpf").value.trim();
  if(!cpf){ toast("Informe o CPF"); return; }
  try{
    const lookup = await api('/api/clients/lookup',{method:'POST', body:JSON.stringify({cpf})});
    if(lookup.exists){
      localStorage.setItem('cpf', cpf);
      await carregarHome(cpf);
      show(viewHome);
    }else{
      if(confirm("CPF incorreto ou não cadastrado.\nDeseja cadastrar?")){
        await api('/api/clients/register',{method:'POST', body:JSON.stringify({cpf, nome:"Cliente"})});
        localStorage.setItem('cpf', cpf);
        await carregarHome(cpf);
        show(viewHome);
      }
    }
  }catch(e){ toast("Erro: "+e.message); }
});
async function carregarHome(cpf){
  const r = await api('/api/clients/summary',{method:'POST', body:JSON.stringify({cpf})});
  $("#hello-nome").textContent = `Olá, ${r.nome}!`;
  $("#pontos").textContent = r.pontos;
  $("#total-visitas").textContent = r.pontos;
  const list = $("#lista-historico"); list.innerHTML="";
  (r.historico||[]).forEach(h=>{
    const div = document.createElement('div');
    const dt = new Date(h.data);
    div.className='row';
    div.innerHTML = `<span><b>${dt.toLocaleDateString()}</b> | Pedido #${h.pedido}</span>`;
    list.appendChild(div);
  });
  document.getElementById('premio').classList.toggle('hidden', (r.pontos%5)!==0 || r.pontos===0);
}
$("#btn-lerqr").addEventListener('click', async ()=>{
  const t = prompt('Cole aqui o token "t" da URL do QR');
  if(!t) return;
  const cpf = localStorage.getItem('cpf');
  try{
    await api(`/api/qr/scan?t=${encodeURIComponent(t)}`,{method:'POST', body:JSON.stringify({cpf})});
    toast("Ponto computado!");
    await carregarHome(cpf);
  }catch(e){ toast("Erro: "+e.message); }
});
$("#btn-admin-login").addEventListener('click', async ()=>{
  const user = $("#admin-user").value.trim();
  const pass = $("#admin-pass").value.trim();
  try{
    const r = await api('/api/admin/login',{method:'POST', body:JSON.stringify({user,pass})});
    localStorage.setItem('adminToken', r.token);
    $("#btn-admin-sair").classList.remove('hidden');
    toast("Admin OK");
  }catch(e){ toast("Login inválido"); }
});
$("#btn-admin-sair").addEventListener('click', ()=>{
  localStorage.removeItem('adminToken');
  $("#btn-admin-sair").classList.add('hidden');
  toast("Saiu do admin");
});
$("#btn-gerar").addEventListener('click', async ()=>{
  const orderNo = $("#order-no").value.trim();
  const amount = parseFloat($("#amount").value.trim().replace(',','.'));
  if(!orderNo || !amount){ toast("Informe pedido e valor"); return; }
  try{
    const r = await api('/api/qr/generate',{method:'POST', body:JSON.stringify({orderNo, amount})}, true);
    $("#qr-output").innerHTML = `<p><b>URL:</b> ${r.url}</p><p><b>Expira:</b> ${new Date(r.expiresAt).toLocaleTimeString()}</p>`;
  }catch(e){ toast("Erro: "+e.message); }
});
$("#btn-conferir").addEventListener('click', async ()=>{
  try{
    const r = await api('/api/admin/points',{}, true);
    const el = $("#tabela-admin");
    const rows = (r.items||[]).map(i=>`
      <tr>
        <td>${i.nome||''}</td>
        <td>${i.cpf||''}</td>
        <td>${i.pontos||0}</td>
        <td>${i.pedido||''}</td>
        <td>${Number(i.valor||0).toFixed(2)}</td>
        <td>${new Date(i.data).toLocaleString()}</td>
      </tr>`).join('');
    el.innerHTML = `<div class="table"><table>
      <thead><tr><th>Nome</th><th>CPF</th><th>Pontos</th><th>Pedido</th><th>Valor</th><th>Data/Hora</th></tr></thead>
      <tbody>${rows}</tbody></table></div>`;
  }catch(e){ toast("Erro: "+e.message); }
});
