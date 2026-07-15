// app/casas/layout.tsx
import DashboardTemplate from "../dashboard/DashboardTemplate";

export default function LayoutCasas({ children }: { children: React.ReactNode }) {
  return (
    <DashboardTemplate>
      {children}
    </DashboardTemplate>
  );
}