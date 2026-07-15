// Substitua o código do app/casas/layout.tsx por este:
import DashboardTemplate from "@/app/dashboard/DashboardTemplate";

export default function LayoutCasas({ children }: { children: React.ReactNode }) {
  return (
    <DashboardTemplate>
      {children}
    </DashboardTemplate>
  );
}