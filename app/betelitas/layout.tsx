import DashboardTemplate from "../dashboard/DashboardTemplate";

export default function LayoutBetelitas({ children }: { children: React.ReactNode }) {
  return <DashboardTemplate>{children}</DashboardTemplate>;
}