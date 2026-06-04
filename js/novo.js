// Fluxo "Novo Registro" — particular (busca por placa) ou parceiro.
import * as db from "./db.js";
import { $, $$, money, today, esc, norm, toast, openModal, closeModal, formData } from "./ui.js";

function proximoOS(ats) {
  let max = 0;
  ats.forEach((a) => {
    const m = /OS0*(\d+)/i.exec(a.os_numero || "");
    if (m) max = Math.max(max, parseInt(m[1], 10));
  });
  return "OS" + String(max + 1).padStart(3, "0");
}

export async function renderNovoRegistro({ onSaved } = {}) {
  const [cli, parc, servCat, ats] = await Promise.all([
    db.clientes.list(),
    db.parceiros.list(),
    db.servicos.list(),
    db.atendimentos.list(500),
  ]);
  const osNum = proximoOS(ats);

  // Estado do registro em construção
  const st = {
    tipo: "PARTICULAR",
    cliente_id: null,
    carro_id: null,
    parceiro_id: null,
    novoCliente: null, // {nome, telefone, base_antiga}
    veiculo: "",
    placa: "",
    base_antiga: false,
    itens: [], // {nome, valor}
  };

  const { card, close } = openModal(`Novo Registro · ${osNum}`, body(), { wide: true });

  function body() {
    return `
      <div class="seg">
        <button class="seg-btn" data-tipo="PARTICULAR">🚗 Particular</button>
        <button class="seg-btn" data-tipo="PARCEIRO">🤝 Parceiro</button>
      </div>
      <div id="quem"></div>
      <hr/>
      <div id="servicos"></div>
      <hr/>
      <div class="form grid-form">
        <label>Data<input id="data" type="date" value="${today()}"/></label>
        <label>Forma de pagamento
          <select id="forma"><option>PIX</option><option>DINHEIRO</option><option>CARTAO</option></select></label>
        <label>Status
          <select id="status"><option value="PAGO">Pago</option><option value="PENDENTE" selected>Pendente</option></select></label>
        <label>Observações<input id="obs"/></label>
      </div>
      <div class="row between total-bar">
        <div>Total: <strong id="total">R$ 0,00</strong></div>
        <button class="btn primary" id="salvar">Salvar registro</button>
      </div>`;
  }

  function renderQuem() {
    $$("[data-tipo]", card).forEach((b) => b.classList.toggle("active", b.dataset.tipo === st.tipo));
    const host = $("#quem", card);
    if (st.tipo === "PARTICULAR") {
      host.innerHTML = `
        <div class="form">
          <label>Placa
            <div class="row gap">
              <input id="placa" placeholder="ABC1D23" style="text-transform:uppercase"/>
              <button class="btn" id="buscar" type="button">Buscar</button>
            </div>
          </label>
          <div id="placaResult"></div>
        </div>`;
      $("#buscar", card).onclick = buscarPlaca;
      $("#placa", card).onkeydown = (e) => { if (e.key === "Enter") { e.preventDefault(); buscarPlaca(); } };
    } else {
      const opts = parc.map((p) => `<option value="${p.id}">${esc(p.nome)}</option>`).join("");
      host.innerHTML = `
        <div class="grid-form form">
          <label>Parceiro
            <select id="parceiro"><option value="">Selecione…</option>${opts}<option value="__novo">+ Novo parceiro…</option></select></label>
          <label>Veículo<input id="pveiculo" placeholder="Onix, Palio…"/></label>
          <label>Placa (opcional)<input id="pplaca" style="text-transform:uppercase"/></label>
        </div>`;
      $("#parceiro", card).onchange = async (e) => {
        if (e.target.value === "__novo") {
          const nome = prompt("Nome do novo parceiro:");
          if (nome) {
            const p = await db.parceiros.create({ nome });
            parc.push(p);
            renderQuem();
            $("#parceiro", card).value = p.id;
            st.parceiro_id = p.id;
          } else { e.target.value = ""; }
        } else { st.parceiro_id = e.target.value || null; }
      };
    }
  }

  async function buscarPlaca() {
    const placa = $("#placa", card).value.trim();
    if (!placa) return;
    st.placa = placa.toUpperCase();
    const found = await db.carros.byPlaca(placa);
    const res = $("#placaResult", card);
    if (found && found.length) {
      const c = found[0];
      st.carro_id = c.id;
      st.cliente_id = c.cliente_id;
      st.veiculo = c.veiculo || "";
      st.base_antiga = !!c.clientes?.base_antiga;
      res.innerHTML = `<div class="found">
        ✓ <strong>${esc(c.clientes?.nome || "Cliente")}</strong> — ${esc(c.veiculo || "")} (${esc(c.placa)})
        ${c.clientes?.base_antiga ? '<span class="tag yuri">base antiga</span>' : ""}
        <br><small class="muted">${esc(c.clientes?.telefone || "")}</small>
      </div>`;
    } else {
      st.carro_id = null;
      st.cliente_id = null;
      const opts = cli.map((x) => `<option value="${x.id}">${esc(x.nome)}</option>`).join("");
      res.innerHTML = `
        <div class="notfound">Placa não cadastrada. Escolha:</div>
        <div class="seg small">
          <button class="seg-btn active" data-novo="existente">Cliente existente</button>
          <button class="seg-btn" data-novo="novo">Novo cliente</button>
        </div>
        <div id="novoCadastro" class="form">
          <label>Cliente<select id="selCliente"><option value="">Selecione…</option>${opts}</select></label>
          <label>Veículo desta placa<input id="nveiculo" placeholder="HRV, Civic…"/></label>
        </div>`;
      let modo = "existente";
      const drawCadastro = () => {
        const h = $("#novoCadastro", card);
        if (modo === "existente") {
          h.innerHTML = `
            <label>Cliente<select id="selCliente"><option value="">Selecione…</option>${opts}</select></label>
            <label>Veículo desta placa<input id="nveiculo" placeholder="HRV, Civic…"/></label>`;
          $("#selCliente", card).onchange = (e) => {
            st.cliente_id = e.target.value || null;
            const c = cli.find((x) => x.id === st.cliente_id);
            st.base_antiga = !!c?.base_antiga;
            st.novoCliente = null;
          };
        } else {
          h.innerHTML = `
            <div class="grid-form">
              <label>Nome<input id="nnome" placeholder="Nome do cliente"/></label>
              <label>Telefone<input id="ntel" placeholder="11999998888"/></label>
            </div>
            <label class="check"><input type="checkbox" id="nbase"/> Base antiga (tag Yuri → Rennan 40% / Yuri 60%)</label>
            <label>Veículo desta placa<input id="nveiculo" placeholder="HRV, Civic…"/></label>`;
          st.cliente_id = null;
        }
      };
      drawCadastro();
      $$("[data-novo]", res).forEach((b) => (b.onclick = () => {
        modo = b.dataset.novo;
        $$("[data-novo]", res).forEach((x) => x.classList.toggle("active", x === b));
        drawCadastro();
      }));
    }
  }

  function renderServicos() {
    const host = $("#servicos", card);
    const chips = servCat
      .filter((s) => s.ativo !== false)
      .map((s) => `<button class="chip" type="button" data-serv="${esc(s.nome)}" data-preco="${s.preco_base || 0}">${esc(s.nome)} · ${money(s.preco_base)}</button>`)
      .join("");
    host.innerHTML = `
      <h4 class="sec-title">Serviços</h4>
      <div class="chips">${chips}</div>
      <div class="row gap" style="margin:8px 0">
        <input id="servLivre" placeholder="Outro serviço (texto livre)"/>
        <input id="servLivreV" type="number" step="0.01" placeholder="Valor" style="max-width:110px"/>
        <button class="btn small" id="addLivre" type="button">Add</button>
      </div>
      <div id="itens" class="list"></div>`;
    $$("[data-serv]", host).forEach((b) => (b.onclick = () => {
      st.itens.push({ nome: b.dataset.serv, valor: Number(b.dataset.preco || 0) });
      drawItens();
    }));
    $("#addLivre", host).onclick = () => {
      const nome = $("#servLivre", host).value.trim();
      if (!nome) return;
      st.itens.push({ nome, valor: Number($("#servLivreV", host).value || 0) });
      $("#servLivre", host).value = ""; $("#servLivreV", host).value = "";
      drawItens();
    };
    drawItens();
  }

  function drawItens() {
    const host = $("#itens", card);
    host.innerHTML = st.itens.length
      ? st.itens
          .map(
            (it, i) => `<div class="list-row">
        <span>${esc(it.nome)}</span>
        <div class="row gap">
          <input type="number" step="0.01" value="${it.valor}" data-val="${i}" style="max-width:100px"/>
          <button class="btn small ghost" data-rm="${i}">✕</button>
        </div></div>`
          )
          .join("")
      : `<div class="empty small">Nenhum serviço adicionado.</div>`;
    $$("[data-val]", host).forEach((inp) => (inp.oninput = () => { st.itens[inp.dataset.val].valor = Number(inp.value || 0); updateTotal(); }));
    $$("[data-rm]", host).forEach((b) => (b.onclick = () => { st.itens.splice(Number(b.dataset.rm), 1); drawItens(); }));
    updateTotal();
  }

  function total() { return st.itens.reduce((s, it) => s + Number(it.valor || 0), 0); }
  function updateTotal() { $("#total", card).textContent = money(total()); }

  async function salvar() {
    try {
      // Resolve cliente / carro / parceiro
      if (st.tipo === "PARTICULAR") {
        const veicInput = $("#nveiculo", card);
        const veic = veicInput ? veicInput.value.trim() : st.veiculo;
        if (!st.cliente_id && $("#nnome", card)) {
          // novo cliente
          const nome = $("#nnome", card).value.trim();
          if (!nome) return toast("Informe o nome do cliente.", "err");
          const novo = await db.clientes.create({
            nome,
            telefone: $("#ntel", card)?.value.trim() || null,
            base_antiga: !!$("#nbase", card)?.checked,
          });
          st.cliente_id = novo.id;
          st.base_antiga = !!novo.base_antiga;
        }
        if (!st.cliente_id) return toast("Busque a placa ou selecione/cadastre o cliente.", "err");
        // cria carro se a placa não existia ainda
        if (!st.carro_id && st.placa) {
          const carro = await db.carros.create({ cliente_id: st.cliente_id, placa: st.placa, veiculo: veic });
          st.carro_id = carro.id;
          st.veiculo = veic;
        } else if (veic) {
          st.veiculo = veic;
        }
      } else {
        if (!st.parceiro_id) return toast("Selecione o parceiro.", "err");
        st.veiculo = $("#pveiculo", card)?.value.trim() || "";
        st.placa = $("#pplaca", card)?.value.trim().toUpperCase() || "";
        st.base_antiga = false;
      }

      if (!st.itens.length) return toast("Adicione ao menos um serviço.", "err");

      const status = $("#status", card).value;
      const data = $("#data", card).value || today();
      const forma = $("#forma", card).value;
      const obs = $("#obs", card).value.trim();
      const servicosTxt = st.itens.map((i) => i.nome).join(" + ");
      const valor = total();

      const atend = await db.atendimentos.create({
        os_numero: osNum,
        data,
        tipo: st.tipo,
        cliente_id: st.tipo === "PARTICULAR" ? st.cliente_id : null,
        parceiro_id: st.tipo === "PARCEIRO" ? st.parceiro_id : null,
        carro_id: st.carro_id,
        veiculo: st.veiculo,
        placa: st.placa,
        servicos: servicosTxt,
        valor,
        forma_pgto: forma,
        status_pg: status,
        data_pg: status === "PAGO" ? data : null,
        base_antiga: st.base_antiga,
        observacoes: obs,
      });

      // Se já está pago, lança a entrada no financeiro
      if (status === "PAGO") {
        await db.financeiro.create({
          data,
          tipo: "ENTRADA",
          atendimento_id: atend.id,
          descricao: `${osNum} · ${servicosTxt}`,
          valor,
          forma_pgto: forma,
          base_antiga: st.base_antiga,
        });
      }
      toast("Registro salvo!");
      close();
      onSaved && onSaved();
    } catch (err) {
      console.error(err);
      toast(err.message || "Erro ao salvar.", "err");
    }
  }

  // wire-up
  $$("[data-tipo]", card).forEach((b) => (b.onclick = () => { st.tipo = b.dataset.tipo; renderQuem(); }));
  $("#salvar", card).onclick = salvar;
  renderQuem();
  renderServicos();
}
