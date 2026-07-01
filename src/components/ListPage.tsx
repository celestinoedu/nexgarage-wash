import { Plus, Search } from "lucide-react";

export function ListPage({
  title,
  placeholder,
  form,
  children
}: {
  title: string;
  placeholder: string;
  form?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_420px]">
      <section className="space-y-4">
        <div className="flex gap-2 rounded-lg border border-line bg-white p-3 shadow-soft">
          <span className="sr-only">{title}</span>
          <Search size={22} className="mt-3 text-slate-400" />
          <input className="focus-ring min-h-12 flex-1 rounded-md border border-line px-4" placeholder={placeholder} />
          <button className="hidden min-h-12 items-center gap-2 rounded-md bg-lotus px-4 font-black text-white sm:flex"><Plus size={18} />Novo</button>
        </div>
        {children}
      </section>
      {form ? <aside>{form}</aside> : null}
    </div>
  );
}
