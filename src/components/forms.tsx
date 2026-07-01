const input = "focus-ring min-h-12 rounded-md border border-line px-4";
const label = "grid gap-1 text-sm font-bold text-slate-700";

function Field({ name, placeholder, type = "text" }: { name: string; placeholder: string; type?: string }) {
  return (
    <label className={label}>
      {name}
      <input className={input} type={type} placeholder={placeholder} />
    </label>
  );
}

function TextArea({ name, placeholder }: { name: string; placeholder: string }) {
  return (
    <label className={`${label} md:col-span-2`}>
      {name}
      <textarea className="focus-ring min-h-28 rounded-md border border-line p-4" placeholder={placeholder} />
    </label>
  );
}

export function SimpleForm({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <form className="rounded-lg border border-line bg-white p-4 shadow-soft">
      <h2 className="mb-4 text-lg font-black">{title}</h2>
      <div className="grid gap-3 md:grid-cols-2">{children}</div>
      <button type="button" className="mt-5 min-h-12 rounded-md bg-lotus px-5 text-base font-black text-white">Salvar</button>
    </form>
  );
}

export function CustomerForm() {
  return <SimpleForm title="Cliente"><Field name="Nome" placeholder="Nome do cliente" /><Field name="WhatsApp" placeholder="(00) 00000-0000" /><Field name="E-mail" placeholder="opcional" /><Field name="CPF/CNPJ" placeholder="opcional" /><TextArea name="Observações" placeholder="Preferências, alertas e histórico rápido" /></SimpleForm>;
}

export function CarForm() {
  return <SimpleForm title="Carro"><Field name="Placa" placeholder="ABC1D23" /><Field name="Cliente" placeholder="Buscar cliente" /><Field name="Marca" placeholder="Toyota" /><Field name="Modelo" placeholder="Corolla" /><Field name="Ano" placeholder="2020" /><Field name="Quilometragem" placeholder="78000" /><TextArea name="Observações" placeholder="Detalhes do veículo" /></SimpleForm>;
}

export function PartForm() {
  return <SimpleForm title="Peça"><Field name="Nome" placeholder="Filtro de óleo" /><Field name="Código" placeholder="NX-0001" /><Field name="Categoria" placeholder="Filtros" /><Field name="Fornecedor" placeholder="Fornecedor principal" /><Field name="Quantidade" placeholder="10" /><Field name="Estoque mínimo" placeholder="3" /><Field name="Preço venda" placeholder="89,90" /><Field name="Localização" placeholder="Rua A-1" /></SimpleForm>;
}

export function ServiceForm() {
  return <SimpleForm title="Serviço"><Field name="Nome" placeholder="Troca de óleo" /><Field name="Categoria" placeholder="Preventiva" /><Field name="Tempo médio" placeholder="1h" /><Field name="Valor mão de obra" placeholder="120,00" /><TextArea name="Descrição" placeholder="O que será feito" /></SimpleForm>;
}

export function MechanicForm() {
  return <SimpleForm title="Mecânico"><Field name="Nome" placeholder="Nome" /><Field name="Telefone" placeholder="WhatsApp" /><Field name="E-mail" placeholder="opcional" /><Field name="Especialidade" placeholder="Motor, freio, elétrica" /><TextArea name="Observações" placeholder="Agenda, habilidades e restrições" /></SimpleForm>;
}

export function SupplierForm() {
  return <SimpleForm title="Fornecedor"><Field name="Nome/Razão social" placeholder="Fornecedor" /><Field name="Contato" placeholder="Pessoa responsável" /><Field name="WhatsApp" placeholder="WhatsApp" /><Field name="E-mail" placeholder="email@fornecedor.com" /><Field name="Categoria" placeholder="Peças, óleo, ferramentas" /><TextArea name="Observações" placeholder="Condições, prazos e histórico" /></SimpleForm>;
}

export function ServiceOrderForm() {
  return <SimpleForm title="Nova ordem de serviço"><Field name="Cliente" placeholder="Buscar por nome ou WhatsApp" /><Field name="Placa" placeholder="Buscar placa" /><Field name="Previsão" type="date" placeholder="" /><Field name="Prioridade" placeholder="Normal" /><Field name="Mecânico" placeholder="Responsável" /><Field name="Status" placeholder="Recebido" /><TextArea name="Problema relatado" placeholder="Digite como o cliente explicou o problema" /><TextArea name="Observações internas" placeholder="Informações visíveis apenas para a equipe" /></SimpleForm>;
}

export function TechnicalReportForm() {
  return <SimpleForm title="Relatório técnico"><Field name="Cliente" placeholder="Cliente" /><Field name="Placa" placeholder="Placa" /><Field name="Mecânico" placeholder="Responsável" /><Field name="Data" type="date" placeholder="" /><TextArea name="Diagnóstico" placeholder="O que foi encontrado" /><TextArea name="Conclusão" placeholder="Conclusão técnica" /></SimpleForm>;
}
