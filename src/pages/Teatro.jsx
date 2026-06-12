// src/pages/Teatro.jsx
import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { teatros, encontrarTeatroPorNome } from "../data/teatros";

export default function Teatro() {
  const { id } = useParams();
  const teatro = teatros.find((t) => t.id === id);

  const [musicais, setMusicais] = useState([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    if (!teatro) return;

    async function buscarMusicais() {
      setCarregando(true);
      const snapshot = await getDocs(collection(db, "musicais"));
      const todos = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

      // Filtra musicais cujo campo "teatro" bate com o nomeOficial ou qualquer alias
      const nomesDoTeatro = [teatro.nomeOficial, ...teatro.aliases].map((n) =>
        n.trim().toLowerCase()
      );

      const filtrados = todos
        .filter((m) => {
          const teatroDoMusical = (m.teatro || "").trim().toLowerCase();
          return nomesDoTeatro.includes(teatroDoMusical);
        })
        .sort((a, b) => (b.ano || "").localeCompare(a.ano || ""));

      setMusicais(filtrados);
      setCarregando(false);
    }

    buscarMusicais();
  }, [id]);

  // Teatro não cadastrado no arquivo teatros.js
  if (!teatro) {
    return (
      <div style={{ maxWidth: 800, margin: "60px auto", padding: "0 20px", textAlign: "center" }}>
        <h2 style={{ fontFamily: "Playfair Display, serif", color: "#F5C518" }}>
          Teatro não encontrado
        </h2>
        <p style={{ color: "#ccc" }}>
          Este teatro ainda não está cadastrado na base de dados.
        </p>
        <Link to="/" style={{ color: "#F5C518" }}>← Voltar para a Home</Link>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 900, margin: "40px auto", padding: "0 20px" }}>

      {/* Cabeçalho do teatro */}
      <div style={{ marginBottom: 32 }}>
        <Link
          to="/"
          style={{ color: "#1a1a1a", fontSize: 14, textDecoration: "none" }}
        >
          ← Voltar para a Home
        </Link>
        <h1
          style={{
            fontFamily: "Playfair Display, serif",
            fontSize: 32,
            color: "#F5C518",
            margin: "12px 0 4px",
          }}
        >
          {teatro.nomeOficial}
        </h1>

        {/* Info do teatro */}
        <div style={{ color: "##1a1a1a", fontSize: 17, lineHeight: 1.7 }}>
          {teatro.endereco && <div>📍 {teatro.endereco}</div>}
          {teatro.bairro && teatro.cidade && (
            <div>
              {teatro.bairro} · {teatro.cidade}
            </div>
          )}
          {teatro.aliases.length > 0 && (
            <div style={{ marginTop: 6, fontSize: 13, color: "#1a1a1a" }}>
              Também conhecido como:{" "}
              {teatro.aliases.join(", ")}
            </div>
          )}
        </div>
      </div>

      {/* Lista de musicais */}
      <h2
        style={{
          fontFamily: "Playfair Display, serif",
          fontSize: 24,
          color: "#1a1a1a",
          borderBottom: "1px solid #333",
          paddingBottom: 10,
          marginBottom: 20,
        }}
      >
        Musicais neste teatro
      </h2>

      {carregando ? (
        <p style={{ color: "#aaa" }}>Carregando...</p>
      ) : musicais.length === 0 ? (
        <p style={{ color: "#aaa" }}>
          Nenhum musical cadastrado para este teatro ainda.
        </p>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
            gap: 16,
          }}
        >
          {musicais.map((musical) => {
            const media =
              musical.totalVotos > 0
                ? (musical.somaEstrelas / musical.totalVotos).toFixed(1)
                : null;

            return (
              <Link
                key={musical.id}
                to={`/musical/${musical.id}`}
                style={{ textDecoration: "none" }}
              >
                <div
                  style={{
                    background: "#222",
                    borderRadius: 6,
                    border: "1px solid #333",
                    overflow: "hidden",
                    transition: "border-color 0.2s",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.borderColor = "#F5C518")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.borderColor = "#333")
                  }
                >
                  {/* Capa */}
                  {musical.capa ? (
                    <img
                      src={musical.capa}
                      alt={musical.titulo}
                      style={{
                        width: "100%",
                        aspectRatio: "2/3",
                        objectFit: "cover",
                        display: "block",
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: "100%",
                        aspectRatio: "2/3",
                        background: "#333",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#555",
                        fontSize: 12,f
                      }}
                    >
                      sem capa
                    </div>
                  )}

                  {/* Info */}
                  <div style={{ padding: "10px 10px 12px" }}>
                    <div
                      style={{
                        color: "#e8e8e4",
                        fontWeight: 600,
                        fontSize: 13,
                        lineHeight: 1.3,
                        marginBottom: 4,
                      }}
                    >
                      {musical.titulo}
                    </div>
                    <div style={{ color: "#888", fontSize: 12 }}>
                      {musical.ano || "—"}
                    </div>
                    {media && (
                      <div
                        style={{
                          marginTop: 6,
                          color: "#F5C518",
                          fontSize: 12,
                          fontWeight: 600,
                        }}
                      >
                        ★ {media}
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}