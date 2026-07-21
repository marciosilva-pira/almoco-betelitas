"use client";

import DashboardTemplate from "../dashboard/DashboardTemplate"; // Ajuste o caminho conforme a sua pasta de componentes

export default function LayoutHospedagem({ children }: { children: React.ReactNode }) {
  return (
    <DashboardTemplate>
      {children}
    </DashboardTemplate>
  );
}