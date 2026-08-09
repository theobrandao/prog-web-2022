"use client";

import { useState } from "react";

export default function WhatsappActions({
  postId,
  waMessage,
  initialForwarded,
}: {
  postId: number;
  waMessage: string;
  initialForwarded: boolean;
}) {
  const [forwarded, setForwarded] = useState(initialForwarded);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);

  async function copyAll() {
    try {
      await navigator.clipboard.writeText(waMessage);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  async function toggle(value: boolean) {
    setBusy(true);
    setForwarded(value);
    try {
      const res = await fetch(`/api/admin/posts/${postId}/forwarded`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value }),
      });
      if (!res.ok) setForwarded(!value);
    } catch {
      setForwarded(!value);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="row" style={{ marginTop: "0.5rem" }}>
      <button type="button" className="accent small" onClick={copyAll}>
        {copied ? "Copiado!" : "Copiar tudo"}
      </button>
      <label
        style={{
          display: "inline-flex",
          gap: "0.4rem",
          alignItems: "center",
          margin: 0,
          fontWeight: 600,
        }}
      >
        <input
          type="checkbox"
          checked={forwarded}
          disabled={busy}
          onChange={(e) => toggle(e.target.checked)}
          style={{ width: "auto" }}
        />
        Encaminhei
      </label>
    </div>
  );
}
