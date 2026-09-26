import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "FrictionOS — Operations, in motion", description: "AI agents for logistics and warehouse operations." };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body className="min-h-screen">{children}</body></html>; }
