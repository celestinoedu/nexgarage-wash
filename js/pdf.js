import * as db from "./db.js?v=2.2.8";

let library;
function pdfLibrary() {
  if (window.jspdf) return Promise.resolve(window.jspdf.jsPDF);
  if (!library) library = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = new URL("../assets/vendor/jspdf.umd.min.js", import.meta.url).href;
    script.onload = () => resolve(window.jspdf.jsPDF);
    script.onerror = () => { library = null; script.remove(); reject(new Error("Não foi possível carregar o gerador PDF. Tente novamente.")); };
    document.head.appendChild(script);
  });
  return library;
}

const money = (n) => Number(n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const date = (d) => String(d || "").slice(0, 10).split("-").reverse().join("/");
const clean = (value) => String(value ?? "").replace(/[\u0000-\u0008\u000b-\u001f]/g, "");
const fileName = (s) => String(s).normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9_-]+/g, "-");

async function documentFor(title, stores, { orientation = "portrait", format = "a4", documentLabel = "DOCUMENTO OPERACIONAL", subtitle = "" } = {}) {
  if (!stores.length) throw new Error("Selecione uma loja para emitir o PDF.");
  const [PDF, business] = await Promise.all([pdfLibrary(), db.business.get(stores[0].account_id)]);
  const doc = new PDF({ unit: "mm", format, orientation, compress: true });
  doc.setProperties({ title, author: "NexWash", creator: "NexWash" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 10;
  const contentWidth = pageWidth - margin * 2;
  const footerTop = pageHeight - 14;
  let y = 0;

  const header = () => {
    const tradeName = business?.trade_name || stores[0].name;
    const legalName = business?.legal_name;
    const businessWidth = contentWidth * 0.57;
    const documentX = margin + businessWidth + 6;
    const documentWidth = contentWidth - businessWidth - 6;
    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(doc.splitTextToSize(clean(tradeName), businessWidth), margin, 9);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    let businessY = 14;
    if (legalName) { doc.text(doc.splitTextToSize(clean(legalName), businessWidth), margin, businessY); businessY += 5; }
    if (business?.cnpj) { doc.text(`CNPJ: ${clean(business.cnpj)}`, margin, businessY); businessY += 5; }
    if (business?.email) { doc.text(`E-mail: ${clean(business.email)}`, margin, businessY); businessY += 5; }
    if (business?.phone) doc.text(`Telefone: ${clean(business.phone)}`, margin, businessY);
    if (documentLabel) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.setTextColor(71, 85, 105);
      doc.text(clean(documentLabel), documentX, 9);
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(format === "a5" ? 10 : 11.5);
    doc.setTextColor(15, 23, 42);
    doc.text(doc.splitTextToSize(clean(title), documentWidth), documentX, documentLabel ? 15 : 11);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.2);
    doc.setTextColor(71, 85, 105);
    if (subtitle) doc.text(doc.splitTextToSize(clean(subtitle), documentWidth), documentX, 20);
    doc.text(doc.splitTextToSize(clean(stores.map((store) => store.name).join(" • ")), documentWidth), documentX, subtitle ? 27 : 22);
    doc.text(`Emitido em ${new Date().toLocaleString("pt-BR")}`, pageWidth - margin, 34, { align: "right" });
    doc.setDrawColor(148, 163, 184);
    doc.line(margin, 39, pageWidth - margin, 39);
    y = 44;
  };

  const addPage = () => { doc.addPage(); header(); };
  const ensure = (height) => { if (y + height > footerTop) addPage(); };
  const getY = () => y;
  const gap = (height = 3) => { y += height; };

  const row = (cells, widths, options = {}) => {
    const fontSize = options.fontSize ?? 7.5;
    const paddingX = options.paddingX ?? 2;
    const paddingY = options.paddingY ?? 1.5;
    const lineHeight = options.lineHeight ?? 3.3;
    doc.setFont("helvetica", options.bold ? "bold" : "normal");
    doc.setFontSize(fontSize);
    const lines = cells.map((cell, index) => doc.splitTextToSize(clean(cell), Math.max(1, widths[index] - paddingX * 2)));
    const height = Math.max(options.minHeight ?? 0, Math.max(...lines.map((parts) => parts.length), 1) * lineHeight + paddingY * 2);
    if (!options.skipEnsure) ensure(height);
    let x = margin;
    cells.forEach((cell, index) => {
      const width = widths[index];
      if (options.fill) { doc.setFillColor(...options.fill); doc.rect(x, y, width, height, "F"); }
      doc.setDrawColor(...(options.borderColor || [148, 163, 184]));
      doc.setLineWidth(options.lineWidth ?? 0.18);
      doc.rect(x, y, width, height, "S");
      doc.setTextColor(...(options.textColor || [30, 41, 59]));
      const align = options.alignments?.[index] || "left";
      const textX = align === "right" ? x + width - paddingX : align === "center" ? x + width / 2 : x + paddingX;
      doc.text(lines[index], textX, y + paddingY + fontSize * 0.34, { align });
      x += width;
    });
    y += height;
    return height;
  };

  const labelValueRow = (entries, widths) => {
    row(entries.map(([label, value]) => `${label}\n${value || "—"}`), widths, { fontSize: 7.3, lineHeight: 3.4, minHeight: 10, paddingY: 1.6 });
  };

  const finish = (name) => {
    const pages = doc.getNumberOfPages();
    for (let i = 1; i <= pages; i++) {
      doc.setPage(i);
      doc.setDrawColor(203, 213, 225);
      doc.line(margin, footerTop, pageWidth - margin, footerTop);
      doc.setTextColor(100, 116, 139);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.text("Documento gerado eletronicamente para controle operacional e financeiro.", margin, pageHeight - 8);
      doc.text(`Página ${i} de ${pages}`, pageWidth - margin, pageHeight - 8, { align: "right" });
    }
    doc.save(`${fileName(name)}.pdf`);
  };

  header();
  return { doc, contentWidth, footerTop, row, labelValueRow, ensure, addPage, getY, gap, finish };
}

function servicesFor(order) {
  const items = Array.isArray(order.itens_servicos) ? order.itens_servicos : [];
  if (items.length) return items.map((item) => ({ nome: item.nome || item.servico || "Serviço", valor: Number(item.valor || 0), desconto: Number(item.desconto || 0) }));
  return [{ nome: order.servicos || "Serviço não informado", valor: Number(order.valor || 0) + Number(order.desconto || 0), desconto: Number(order.desconto || 0) }];
}

function orderTotals(order) {
  const items = servicesFor(order);
  const gross = items.reduce((sum, item) => sum + item.valor, 0);
  const discount = items.reduce((sum, item) => sum + item.desconto, 0);
  return { items, gross, discount, net: gross - discount };
}

function customerName(order) {
  return order.tipo === "PARCEIRO" ? order.parceiros?.nome || "Parceiro não informado" : order.clientes?.nome || "Cliente não informado";
}

function drawSummary(pdf, rows) {
  const totals = rows.reduce((sum, order) => {
    const values = orderTotals(order);
    sum.gross += values.gross;
    sum.discount += values.discount;
    sum.net += values.net;
    if (order.status_pg === "PAGO") sum.paid += values.net;
    else sum.pending += values.net;
    return sum;
  }, { gross: 0, discount: 0, net: 0, paid: 0, pending: 0 });
  const widths = [42, 47, 47, 47, 47, 47];
  pdf.row(["QUANTIDADE DE OS", "VALOR BRUTO", "DESCONTOS", "VALOR LÍQUIDO", "TOTAL PAGO", "TOTAL PENDENTE"], widths, {
    fill: [51, 65, 85], textColor: [255, 255, 255], bold: true, fontSize: 6.8, alignments: ["center", "center", "center", "center", "center", "center"], minHeight: 7,
  });
  pdf.row([String(rows.length), money(totals.gross), money(totals.discount), money(totals.net), money(totals.paid), money(totals.pending)], widths, {
    fill: [248, 250, 252], bold: true, fontSize: 8.3, alignments: ["center", "right", "right", "right", "right", "right"], minHeight: 8,
  });
  return totals;
}

function drawOrderBlock(pdf, order, index) {
  const { items, gross, discount, net } = orderTotals(order);
  const os = order.os_numero || String(order.id || "—").slice(0, 8);
  const displayOs = /^OS/i.test(os) ? os : `OS ${os}`;
  const identificationWidths = [46, 34, 54, 143];
  const servicesWidths = [12, 154, 37, 37, 37];
  const orderHeader = (continued = false) => pdf.row(
    [`${displayOs}${continued ? " (continuação)" : ""}`, `DATA\n${date(order.data)}`, `LOJA\n${db.access.storeName(order.store_id)}`, `CLIENTE / PARCEIRO\n${customerName(order)}`],
    identificationWidths,
    { fill: [226, 232, 240], bold: true, fontSize: 7.5, minHeight: 10 },
  );
  const servicesHeader = () => pdf.row(["ITEM", "DESCRIÇÃO DO SERVIÇO", "VALOR BRUTO", "DESCONTO", "TOTAL"], servicesWidths, {
    fill: [71, 85, 105], textColor: [255, 255, 255], bold: true, fontSize: 6.8, alignments: ["center", "left", "right", "right", "right"], minHeight: 7,
  });
  pdf.ensure(39);
  orderHeader();
  pdf.labelValueRow([
    ["TIPO", order.tipo === "PARCEIRO" ? "Parceiro" : "Particular"], ["VEÍCULO", order.veiculo || "—"], ["PLACA", order.placa || "—"],
    ["PAGAMENTO", order.forma_pgto || "Não informado"], ["SITUAÇÃO", order.status_pg || "PENDENTE"], ["DATA PGTO.", order.data_pg ? date(order.data_pg) : "—"],
  ], [37, 67, 30, 50, 48, 45]);
  servicesHeader();
  items.forEach((item, itemIndex) => {
    const lines = pdf.doc.splitTextToSize(clean(item.nome), servicesWidths[1] - 4);
    const estimatedHeight = Math.max(7, lines.length * 3.3 + 3);
    if (pdf.getY() + estimatedHeight > pdf.footerTop) { pdf.addPage(); orderHeader(true); servicesHeader(); }
    pdf.row([String(itemIndex + 1).padStart(2, "0"), item.nome, money(item.valor), money(item.desconto), money(item.valor - item.desconto)], servicesWidths, {
      fontSize: 7.3, alignments: ["center", "left", "right", "right", "right"], skipEnsure: true, minHeight: 7,
    });
  });
  pdf.row(["TOTAIS DA ORDEM DE SERVIÇO", money(gross), money(discount), money(net)], [166, 37, 37, 37], {
    fill: [241, 245, 249], bold: true, fontSize: 7.4, alignments: ["right", "right", "right", "right"], minHeight: 8,
  });
  if (order.observacoes) pdf.row([`OBSERVAÇÕES: ${order.observacoes}`], [277], { fontSize: 7, fill: [248, 250, 252], minHeight: 7 });
  if (index !== null) pdf.gap(3);
}

export async function downloadOrder(order) {
  order = await db.atendimentos.byId(order.id);
  const store = db.access.knownStores().find((s) => s.id === order.store_id);
  if (!store) throw new Error("A loja da OS não está disponível neste acesso.");
  const pdf = await documentFor(`ORDEM DE SERVIÇO Nº ${order.os_numero || order.id}`, [store], { format: "a5", documentLabel: "" });
  const half = pdf.contentWidth / 2;
  const phone = order.tipo === "PARCEIRO" ? order.parceiros?.telefone : order.clientes?.telefone;
  pdf.labelValueRow([["NÚMERO DA OS", order.os_numero || order.id], ["DATA DA OS", date(order.data)]], [half, half]);
  pdf.labelValueRow([["CLIENTE / PARCEIRO", customerName(order)], ["TELEFONE", phone || "Não informado"]], [half, half]);
  pdf.labelValueRow([["TIPO DE ATENDIMENTO", order.tipo === "PARCEIRO" ? "Parceiro" : "Particular"], ["LOJA", store.name]], [half, half]);
  pdf.labelValueRow([["VEÍCULO", order.veiculo || "—"], ["PLACA", order.placa || "—"]], [half, half]);
  pdf.labelValueRow([["FORMA DE PAGAMENTO", order.forma_pgto || "Não informada"], ["SITUAÇÃO / DATA", `${order.status_pg || "PENDENTE"}${order.data_pg ? ` • ${date(order.data_pg)}` : ""}`]], [half, half]);
  pdf.gap(4);
  const totals = orderTotals(order);
  const itemWidths = [10, pdf.contentWidth - 70, 20, 20, 20];
  pdf.row(["ITEM", "DESCRIÇÃO DO SERVIÇO", "BRUTO", "DESCONTO", "TOTAL"], itemWidths, { fill: [51, 65, 85], textColor: [255, 255, 255], bold: true, fontSize: 6.8, alignments: ["center", "left", "right", "right", "right"], minHeight: 8 });
  totals.items.forEach((item, index) => pdf.row([String(index + 1).padStart(2, "0"), item.nome, money(item.valor), money(item.desconto), money(item.valor - item.desconto)], itemWidths, { fontSize: 7.2, alignments: ["center", "left", "right", "right", "right"], minHeight: 8 }));
  pdf.row(["TOTAIS", money(totals.gross), money(totals.discount), money(totals.net)], [pdf.contentWidth - 60, 20, 20, 20], { fill: [241, 245, 249], bold: true, fontSize: 7.5, alignments: ["right", "right", "right", "right"], minHeight: 9 });
  if (order.observacoes) { pdf.gap(4); pdf.row([`OBSERVAÇÕES\n${order.observacoes}`], [pdf.contentWidth], { fontSize: 7.5, minHeight: 14 }); }
  pdf.gap(5);
  pdf.row(["RECEBIDO / CONFERIDO POR\n\n________________________________________", "DATA\n\n____/____/________"], [pdf.contentWidth * 0.7, pdf.contentWidth * 0.3], { fontSize: 7, minHeight: 20, alignments: ["center", "center"] });
  pdf.finish(`Ordem-de-Servico-${store.name}-${order.os_numero || order.id}`);
}

export async function downloadPeriod({ start, end, partnerIds = [], partnerName = "Todos os parceiros e particulares" }) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end) || start > end) throw new Error("Informe um período válido: início anterior ou igual ao fim.");
  const ids = [...db.access.storeIds()];
  const stores = db.access.knownStores().filter((store) => ids.includes(store.id));
  const rows = await db.atendimentos.report({ start, end, partnerIds, ids });
  const pdf = await documentFor("Relatório de Ordens de Serviço", stores, {
    orientation: "landscape",
    documentLabel: "",
    subtitle: `Período: ${date(start)} a ${date(end)}`,
  });
  pdf.labelValueRow([["PERÍODO INICIAL", date(start)], ["PERÍODO FINAL", date(end)], ["PARCEIRO SELECIONADO", partnerName], ["UNIDADES", stores.map((store) => store.name).join(" • ")]], [42, 42, 91, 102]);
  pdf.gap(3);
  drawSummary(pdf, rows);
  pdf.gap(5);
  if (!rows.length) {
    pdf.row(["NENHUMA ORDEM DE SERVIÇO ENCONTRADA PARA OS FILTROS INFORMADOS."], [277], { fill: [248, 250, 252], bold: true, fontSize: 8, alignments: ["center"], minHeight: 16 });
  } else {
    rows.forEach((order, index) => drawOrderBlock(pdf, order, index));
    pdf.ensure(26);
    pdf.row(["RESUMO FINAL DO PERÍODO"], [277], { fill: [30, 41, 59], textColor: [255, 255, 255], bold: true, fontSize: 8, minHeight: 8 });
    drawSummary(pdf, rows);
  }
  pdf.finish(`NexWash-Relatorio-Analitico-${partnerIds.length ? partnerName : "Geral"}-${start}-${end}`);
}
