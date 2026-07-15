// app/casas/page.tsx
// Altere a linha 2 para:
import DashboardTemplate from "../dashboard/DashboardTemplate";
import CasasContent from "../components/CasasContent";

export default function Page() {
  return (
    <DashboardTemplate>
      <CasasContent />
    </DashboardTemplate>
  );
}