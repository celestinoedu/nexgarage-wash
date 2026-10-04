// Pagina leituras usadas em totais; PostgREST pode limitar cada resposta.
export async function allPages(makeQuery, pageSize = 500) {
  const rows = [];
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await makeQuery().range(offset, offset + pageSize - 1);
    if (error) throw error;
    const page = data ?? [];
    rows.push(...page);
    if (page.length < pageSize) return rows;
  }
}
