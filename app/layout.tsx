import "./globals.css"; // Isso vai trazer de volta todo o design do Tailwind!
import ActiveLayoutClient from "./ActiveLayoutClient";

export const metadata = {
  title: "Almoço Betelitas",
  description: "Sistema de gestão de almoços",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className="antialiased text-slate-600 bg-slate-50">
        <ActiveLayoutClient>{children}</ActiveLayoutClient>
      </body>
    </html>
  );
}