import type { Metadata } from "next";
import "./globals.css";
import Sidenav from "./components/Sidenav";

export const metadata: Metadata = {
  title: "Council Events Dashboard",
  description: "View upcoming council events with AI assistant",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <Sidenav />
      <body>
        <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
          {children}
        </main>
      </body>
    </html>
  );
}
