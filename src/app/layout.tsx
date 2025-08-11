import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Ollama Translator",
  description: "A web translator using LLM backends like Ollama",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-gray-50">
        <div className="min-h-screen flex flex-col">
          <div className="flex-1">{children}</div>
          <footer className="border-t bg-white/60 backdrop-blur supports-[backdrop-filter]:bg-white/40">
            <div className="mx-auto max-w-5xl px-4 py-4 text-center text-sm text-gray-600">
              <a
                href="https://github.com/Nyovelt/ollama-translator"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-600 hover:text-gray-900 underline"
              >
                View source on GitHub: github.com/Nyovelt/ollama-translator
              </a>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
