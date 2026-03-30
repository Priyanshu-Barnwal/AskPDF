import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AskPDF — Chat with your PDFs",
  description:
    "Upload a PDF and ask anything. AskPDF uses RAG to parse, chunk, embed, and answer natural language questions about your documents.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased">{children}</body>
    </html>
  );
}
