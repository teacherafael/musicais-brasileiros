import { useState } from "react";

const CHAVE_PIX = "musicalcastbr@gmail.com";
const MARCOS = [10, 25, 50];

// Incrementa o contador local e devolve o marco atingido (ou null).
// Não faz nenhuma leitura/escrita no Firestore.
export function registrarAvaliacao() {
  try {
    if (localStorage.getItem("mcdb_apoiador") === "1") return null;

    const total = Number(localStorage.getItem("mcdb_avaliacoes") || 0) + 1;
    localStorage.setItem("mcdb_avaliacoes", String(total));

    if (!MARCOS.includes(total)) return null;

    const vistos = JSON.parse(localStorage.getItem("mcdb_marcos_vistos") || "[]");
    if (vistos.includes(total)) return null;

    vistos.push(total);
    localStorage.setItem("mcdb_marcos_vistos", JSON.stringify(vistos));
    return total;
  } catch {
    return null; // localStorage bloqueado (aba privada) — segue sem pedir
  }
}

export default function ModalContribuir({ marco, onFechar }) {
  const [copiado, setCopiado] = useState(false);

  function copiarPix() {
    navigator.clipboard.writeText(CHAVE_PIX).then(() => {
      setCopiado(true);
      try {
        localStorage.setItem("mcdb_apoiador", "1");
      } catch {}
      setTimeout(() => setCopiado(false), 2500);
    });
  }

  if (!marco) return null;

  return (
    <div
      onClick={onFechar}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: "20px",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#0a2c59",
          color: "#fff",
          borderRadius: "8px",
          maxWidth: "420px",
          width: "100%",
          padding: "28px 24px",
          textAlign: "center",
          boxShadow: "0 10px 40px rgba(0,0,0,0.4)",
        }}
      >
        <h3
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: "1.4rem",
            margin: "0 0 12px",
            color: "#F5C518",
            lineHeight: 1.3,
          }}
        >
          Você já avaliou {marco} musicais no MCDb
        </h3>

        <p style={{ fontSize: "0.95rem", lineHeight: 1.6, margin: "0 0 20px", opacity: 0.9 }}>
          O site é feito e mantido por uma pessoa só, sem anúncios e sem patrocínio.
          Se ele te for útil, uma contribuição de <strong>R$ 10</strong> ajuda a pagar
          os custos de servidor e manter tudo no ar.
        </p>

        <div
          style={{
            background: "rgba(255,255,255,0.06)",
            border: "1px dashed rgba(245,197,24,0.5)",
            borderRadius: "8px",
            padding: "14px 16px",
            marginBottom: "16px",
          }}
        >
          <div
            style={{
              fontSize: "0.7rem",
              letterSpacing: "1px",
              color: "#F5C518",
              fontWeight: 700,
              marginBottom: "8px",
            }}
          >
            CHAVE PIX
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              justifyContent: "center",
              flexWrap: "wrap",
            }}
          >
            <span
              style={{
                fontSize: "1.05rem",
                fontWeight: 600,
                color: "#fff",
                wordBreak: "break-all",
                userSelect: "all",
              }}
            >
              {CHAVE_PIX}
            </span>

            <button
              onClick={copiarPix}
              style={{
                background: "transparent",
                color: "#F5C518",
                border: "1px solid #F5C518",
                borderRadius: "6px",
                padding: "6px 12px",
                fontSize: "0.8rem",
                fontWeight: 600,
                cursor: "pointer",
                whiteSpace: "nowrap",
                flexShrink: 0,
              }}
            >
              {copiado ? "✓ Copiado" : "Copiar"}
            </button>
          </div>

          <div style={{ fontSize: "0.75rem", opacity: 0.6, marginTop: "8px" }}>
            (chave por e-mail)
          </div>
        </div>

        <button
          onClick={onFechar}
          style={{
            width: "100%",
            background: "transparent",
            color: "#fff",
            border: "1px solid rgba(255,255,255,0.3)",
            borderRadius: "6px",
            padding: "10px",
            fontSize: "0.9rem",
            cursor: "pointer",
            opacity: 0.8,
          }}
        >
          Agora não
        </button>
      </div>
    </div>
  );
}