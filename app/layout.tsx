// app/layout.tsx
import "./globals.css";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-br">
      <body className="bg-gray-100 min-h-screen flex items-center justify-center">
        {children}
      </body>
    </html>
  );
}