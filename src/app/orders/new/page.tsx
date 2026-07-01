import { AppShell } from "@/components/AppShell";
import { ServiceOrderForm } from "@/components/forms";

export default function NewOrderPage() {
  return <AppShell title="Nova ordem de serviço"><ServiceOrderForm /></AppShell>;
}
