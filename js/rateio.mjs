const toCents = (value) => Math.round((Number(value) || 0) * 100);
const toMoney = (value) => value / 100;

// Arredonda cada lançamento em centavos e deixa o centavo residual com Yuri.
export function splitEntrada(row, pct = 0) {
  const recebido = toCents(row.valor);
  const empresa = Math.round(recebido * pct);
  const distribuivel = recebido - empresa;
  const rennan = Math.round(distribuivel * (row.base_antiga ? 0.40 : 0.50));
  const yuri = distribuivel - rennan;
  return { recebido: toMoney(recebido), empresa: toMoney(empresa), rennan: toMoney(rennan), yuri: toMoney(yuri) };
}

export function calcRateio(entradas, saidas, pct = 0) {
  let base = 0, comum = 0, empresa = 0, rennanBruto = 0, yuriBruto = 0;
  for (const row of entradas) {
    const part = splitEntrada(row, pct);
    if (row.base_antiga) base += toCents(part.recebido);
    else comum += toCents(part.recebido);
    empresa += toCents(part.empresa);
    rennanBruto += toCents(part.rennan);
    yuriBruto += toCents(part.yuri);
  }
  const saidasCents = toCents(saidas);
  const socios = rennanBruto + yuriBruto;
  const rennanPct = socios > 0 ? rennanBruto / socios : 0.50;
  const saidasRennan = Math.round(saidasCents * rennanPct);
  const saidasYuri = saidasCents - saidasRennan;
  return {
    base: toMoney(base), comum: toMoney(comum), total: toMoney(base + comum),
    saidas: toMoney(saidasCents), empresa: toMoney(empresa),
    rennanPct, yuriPct: 1 - rennanPct,
    saidasRennan: toMoney(saidasRennan), saidasYuri: toMoney(saidasYuri),
    rennanBruto: toMoney(rennanBruto), yuriBruto: toMoney(yuriBruto),
    rennan: toMoney(rennanBruto - saidasRennan),
    yuri: toMoney(yuriBruto - saidasYuri),
    liquido: toMoney(base + comum - saidasCents),
  };
}

// Cada loja rateia suas próprias saídas; o consolidado soma valores já fechados.
export function calcRateioPorLoja(entradas, saidas, pctByStore) {
  const ids = new Set([...entradas, ...saidas].map((row) => row.store_id));
  const fields = ["base", "comum", "total", "saidas", "empresa", "saidasRennan", "saidasYuri", "rennanBruto", "yuriBruto", "rennan", "yuri", "liquido"];
  const total = Object.fromEntries(fields.map((field) => [field, 0]));
  for (const id of ids) {
    const rows = entradas.filter((row) => row.store_id === id);
    const gasto = toMoney(saidas.filter((row) => row.store_id === id).reduce((sum, row) => sum + toCents(row.valor), 0));
    const r = calcRateio(rows, gasto, pctByStore[id] ?? 0);
    for (const field of fields) total[field] += toCents(r[field]);
  }
  for (const field of fields) total[field] = toMoney(total[field]);
  const socios = total.rennanBruto + total.yuriBruto;
  const rennanPct = total.saidas > 0
    ? total.saidasRennan / total.saidas
    : socios > 0 ? total.rennanBruto / socios : 0.50;
  return { ...total, rennanPct, yuriPct: 1 - rennanPct };
}
