import { useState } from "react";
import { ehAdmin } from "../admins";

const FAIXAS = ["0.5", "1", "1.5", "2", "2.5", "3", "3.5", "4", "4.5", "5"];

export default function PainelDebugAdmin({ musical, usuario }) {
  const [aberto, setAberto] = useState(false);

  if (!usuario || !ehAdmin(usuario.uid)) return null;

  const totalVotos = Number(musical?.totalVotos || 0);
  const somaEstrelas = Number(musical?.somaEstrelas || 0);
  const media = totalVotos > 0 ? somaEstrelas / totalVotos : 0;

  const dist = musical?.distribuicao || {};
  const somaDist = FAIXAS.reduce((acc, f) => acc + Number(dist[f] || 0), 0);
  const somaNotasDist = FAIXAS.reduce(
    (acc, f) => acc + Number(f) * Number(dist[f] || 0),
    0
  );

  const bateContagem = somaDist === totalVotos;
  const bateSoma = Math.abs(somaNotasDist - somaEstrelas) < 0.01;

  return (
    <div
      style={{
        marginTop: "2rem",
        border: "1px solid #e8e8e4",
        borderRadius: 8,
        background: "#fafafa",
        fontSize: "0.85rem",
      }}
    >
      <button
        onClick={() => setAberto(!aberto)}
        style={{
          width: "100%",
          padding: "0.75rem 1rem",
          background: "none",
          border: "none",
          cursor: "pointer",
          textAlign: "left",
          fontWeight: 600,
          fontFamily: "inherit",
          fontSize: "0.85rem",
        }}
      >
        🔧 Debug de notas (admin) {aberto ? "▲" : "▼"}
      </button>

      {aberto && (
        <div style={{ padding: "0 1rem 1rem" }}>
          <div style={{ fontFamily: "monospace", lineHeight: 1.8 }}>
            <div>totalVotos: <strong>{totalVotos}</strong></div>
            <div>somaEstrelas: <strong>{somaEstrelas}</strong></div>
            <div>média calculada: <strong>{media.toFixed(4)}</strong></div>
          </div>

          <div style={{ marginTop: "1rem", fontWeight: 600 }}>distribuicao</div>
          <div style={{ fontFamily: "monospace", lineHeight: 1.8 }}>
            {FAIXAS.map((f) => {
              const bruto = dist[f];
              const suspeito = bruto !== undefined && typeof bruto !== "number";
              return (
                <div key={f}>
                  {f} ★ → {Number(bruto || 0)}
                  {suspeito && (
                    <span style={{ color: "#c0392b" }}>
                      {" "}⚠️ tipo inválido ({typeof bruto})
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: "1rem", lineHeight: 1.8 }}>
            <div>
              Soma da distribuicao: <strong>{somaDist}</strong> vs totalVotos{" "}
              <strong>{totalVotos}</strong> {bateContagem ? "✅" : "❌ NÃO BATE"}
            </div>
            <div>
              Soma das notas na distribuicao:{" "}
              <strong>{somaNotasDist.toFixed(1)}</strong> vs somaEstrelas{" "}
              <strong>{somaEstrelas}</strong> {bateSoma ? "✅" : "❌ NÃO BATE"}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}