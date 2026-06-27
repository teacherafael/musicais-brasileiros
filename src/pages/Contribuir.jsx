import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function Contribuir() {
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "Contribuir – MCDb";
  }, []);

  function copiarChave() {
    navigator.clipboard.writeText("musicalcastbr@gmail.com");
    alert("Chave Pix copiada!");
  }

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f4f4f0", paddingBottom: 60 }}>
      <div style={{ maxWidth: 680, margin: "0 auto", padding: "48px 24px" }}>

        <button
          onClick={() => navigate(-1)}
          style={{ background: "none", border: "none", cursor: "pointer", color: "#666", fontSize: 14, marginBottom: 32, padding: 0 }}
        >
          ← Voltar
        </button>

        <h1 style={{ fontFamily: "Playfair Display, serif", fontSize: 36, fontWeight: 700, color: "#1a1a1a", marginBottom: 8 }}>
          Apoie o MCDb
        </h1>
        <div style={{ width: 48, height: 4, backgroundColor: "#F5C518", borderRadius: 2, marginBottom: 32 }} />

        <div style={{ fontSize: 17, lineHeight: 1.75, color: "#333", display: "flex", flexDirection: "column", gap: 20 }}>
          <p>
            O <strong>Musical Cast</strong> existe desde 2015. Mais de uma década dedicado a cobrir, documentar e celebrar o teatro musical brasileiro — sem patrocínio, sem real retorno financeiro. Só paixão.
          </p>
          <p>
            O <strong>MCDb</strong> nasceu dessa mesma paixão: a vontade de criar o maior arquivo digital do teatro musical brasileiro. Um lugar onde qualquer pessoa pode descobrir o que foi encenado, quem esteve no palco, e o que a plateia achou.
          </p>
          <p>
            Manter isso no ar tem custo. Dias e mais dias de pesquisa, hospedagem, ferramentas, e anos de trabalho que nunca viraram renda. Se o MCDb já foi útil pra você — seja pra lembrar um espetáculo, descobrir um novo, ou simplesmente sentir que o teatro musical brasileiro tem o registro que merece — considere contribuir.
          </p>
          <p>
            Qualquer valor ajuda a manter o catálogo crescendo e o projeto independente.
          </p>
        </div>

        <div style={{ backgroundColor: "#fff", border: "1px solid #e8e8e4", borderRadius: 12, padding: 32, marginTop: 40, textAlign: "center" }}>
          <p style={{ fontFamily: "Playfair Display, serif", fontSize: 22, fontWeight: 700, marginBottom: 24, color: "#1a1a1a" }}>
            Contribuir via Pix
          </p>
          <img
            src="https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=musicalcastbr@gmail.com"
            alt="QR Code Pix"
            style={{ width: 180, height: 180, borderRadius: 8, marginBottom: 20 }}
          />
          <p style={{ color: "#555", fontSize: 14, marginBottom: 6 }}>Chave Pix (e-mail):</p>
          <p style={{ fontWeight: 700, fontSize: 16, color: "#1a1a1a", marginBottom: 24 }}>musicalcastbr@gmail.com</p>
          <button
            onClick={copiarChave}
            style={{ backgroundColor: "#F5C518", color: "#1a1a1a", border: "none", borderRadius: 8, padding: "14px 32px", fontSize: 16, fontWeight: 700, cursor: "pointer", width: "100%", maxWidth: 320 }}
          >
            Copiar chave Pix
          </button>
        </div>

        <p style={{ marginTop: 32, fontSize: 14, color: "#888", textAlign: "center" }}>
          Obrigado por fazer parte disso. 🎭
        </p>

      </div>
    </div>
  );
}