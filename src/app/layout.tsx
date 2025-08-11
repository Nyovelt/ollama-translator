import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Ollama Translator',
  description: 'A web translator using LLM backends like Ollama',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-gray-50">{children}</body>
    </html>
  )
}
