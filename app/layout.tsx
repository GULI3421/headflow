import type { Metadata } from "next";
import "./globals.css";
import { ContactWidget } from "@/components/ContactWidget";
import { Footer } from "@/components/footer";
import { MobileQuickActions } from "@/components/mobile-quick-actions";
import { NavigationShell } from "@/components/navigation-shell";

export const metadata: Metadata = {
  title: "HeatFlow | Boilers, Radiators and Underfloor Heating",
  description:
    "Industrial-grade heating equipment store with boilers, radiators, underfloor heating systems and expert installation consultation.",
  keywords: [
    "heating equipment",
    "boilers",
    "radiators",
    "underfloor heating",
    "heating calculator",
    "HVAC store",
  ],
  openGraph: {
    title: "HeatFlow Heating Equipment",
    description: "Modern heating systems, expert sizing and fast delivery.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html className="dark" lang="en" suppressHydrationWarning>
      <body className="antialiased">
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var theme = localStorage.getItem('heatflow-theme') || 'dark';
                document.documentElement.classList.toggle('dark', theme === 'dark');
                document.documentElement.style.colorScheme = theme;
              } catch (_) {}
            `,
          }}
        />
        <NavigationShell />
        <main>{children}</main>
        <div>
          <Footer />
        </div>
        <ContactWidget />
        <MobileQuickActions />
      </body>
    </html>
  );
}
