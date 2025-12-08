import { QuoteAssistant } from "@/components/quote-assistant";

export default function Home() {
  return (
    <main style={{ display: "flex", justifyContent: "center", padding: "48px 16px" }}>
      <div style={{ maxWidth: 960, width: "100%", display: "grid", gap: 24 }}>
        <header>
          <h1>M2M Moving</h1>
          <p>Talk or text with our AI assistant to plan your move.</p>
        </header>
        <QuoteAssistant />
      </div>
    </main>
  );
}
