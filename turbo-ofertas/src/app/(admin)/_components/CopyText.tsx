"use client";

import { useState } from "react";

export default function CopyText({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button type="button" className="small ghost" onClick={copy}>
      {copied ? "Copiado ✓" : "Copiar"}
    </button>
  );
}
