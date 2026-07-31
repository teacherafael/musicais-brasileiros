import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { doc, getDoc } from "firebase/firestore"
import { onAuthStateChanged } from "firebase/auth"
import { db, auth } from "../firebase"

// Deriva a miniatura -400.webp a partir da URL -800.webp do R2.
// URLs de outras origens passam sem alteracao.
function miniatura(url) {
  if (!url) return ""
  return url.replace("-800.webp", "-400.webp")
}

// Embaralha uma copia do array (Fisher-Yates)
function embaralhar(lista) {
  const copia = [...lista]
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copia[i], copia[j]] = [copia[j], copia[i]]
  }
  return copia
}

function Comunidade() {
  const [perfis, setPerfis] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [usuario, setUsuario] = useState(null)

  useEffect(() => {
    const desinscrever = onAuthStateChanged(auth, u => setUsuario(u))
    return () => desinscrever()
  }, [])

  useEffect(() => {
    async function buscar() {
      try {
        const snap = await getDoc(doc(db, "indices", "comunidade"))
        if (snap.exists() && Array.isArray(snap.data().perfis)) {
          setPerfis(embaralhar(snap.data().perfis))
        }
      } catch (e) {
        // silencioso: a pagina mostra o estado vazio
      }
      setCarregando(false)
    }
    buscar()
    window.scrollTo(0, 0)
  }, [])

  const euApareco = usuario && perfis.some(p => p.uid === usuario.uid)

  const grade = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))",
    gap: "14px"
  }

  return (
    <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "32px 20px 60px" }}>

      <h1 style={{
        fontFamily: "'Playfair Display', serif",
        fontSize: "30px",
        color: "#1a1a1a",
        margin: "0 0 10px"
      }}>
        Comunidade
      </h1>

      <p style={{
        fontFamily: "'DM Sans', sans-serif",
        fontSize: "15px",
        color: "#555",
        margin: "0 0 8px",
        maxWidth: "620px",
        lineHeight: "1.6"
      }}>
        Aqui é um espaço de quem faz parte do MCDb e já escolheu seus cinco musicais favoritos no Top 5. É um retrato de gosto: dá para descobrir alguém que ama os mesmos espetáculos que você, ou encontrar títulos que ainda não conhecia.
      </p>

      <p style={{
        fontFamily: "'DM Sans', sans-serif",
        fontSize: "13px",
        color: "#999",
        margin: "0 0 24px",
        maxWidth: "620px",
        lineHeight: "1.6"
      }}>
        Aparecem aqui os perfis com o Top 5 completo. Clique em qualquer um para
        ver as avaliações, listas e sessões da pessoa.
        {perfis.length > 0 && ` No momento, ${perfis.length} perfis.`}
      </p>

      {/* Convite para quem esta logado e ainda nao aparece */}
      {!carregando && usuario && !euApareco && (
        <div style={{
          background: "#fffbe8",
          border: "1px solid #f0e0a0",
          borderRadius: "10px",
          padding: "14px 16px",
          marginBottom: "26px",
          maxWidth: "620px"
        }}>
          <p style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: "14px",
            color: "#5a4a00",
            margin: 0,
            lineHeight: "1.5"
          }}>
            Você ainda não está nesta página. Escolha seus cinco musicais
            favoritos no{" "}
            <Link
              to={`/perfil/${usuario.uid}#top5`}
              style={{ color: "#b8960a", fontWeight: "600" }}
            >
              seu perfil
            </Link>{" "}
            para entrar na comunidade.
          </p>
        </div>
      )}

      {carregando ? (
        <div style={grade}>
          {[0, 1, 2, 3, 4, 5, 6, 7].map(i => (
            <div key={i} style={{ background: "#f0efec", borderRadius: "10px", height: "132px" }} />
          ))}
        </div>
      ) : perfis.length === 0 ? (
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "15px", color: "#888" }}>
          Nenhum perfil por aqui ainda. Monte seu Top 5 para aparecer nesta página.
        </p>
      ) : (
        <div style={grade}>
          {perfis.map(p => (
            <Link
              key={p.uid}
              to={`/perfil/${p.uid}`}
              style={{
                textDecoration: "none",
                background: "#fff",
                border: "1px solid #e8e8e4",
                borderRadius: "10px",
                padding: "14px",
                display: "block"
              }}
            >
              {/* Cabecalho: avatar + nome + bio */}
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
                {p.foto ? (
                  <img
                    src={p.foto}
                    alt=""
                    referrerPolicy="no-referrer"
                    style={{
                      width: "34px",
                      height: "34px",
                      borderRadius: "50%",
                      objectFit: "cover",
                      flexShrink: 0
                    }}
                  />
                ) : (
                  <div style={{
                    width: "34px",
                    height: "34px",
                    borderRadius: "50%",
                    background: "#e8e8e4",
                    flexShrink: 0
                  }} />
                )}

                <div style={{ minWidth: 0, flex: 1 }}>
                  <p style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: "14px",
                    fontWeight: "600",
                    color: "#1a1a1a",
                    margin: 0,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis"
                  }}>
                    {p.nome}
                  </p>
                  {p.bio && (
                    <p style={{
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: "11px",
                      color: "#999",
                      margin: "1px 0 0",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis"
                    }}>
                      {p.bio}
                    </p>
                  )}
                </div>
              </div>

              {/* Faixa das cinco capas */}
              <div style={{ display: "flex", gap: "5px" }}>
                {p.capas.map((capa, i) => (
                  <img
                    key={i}
                    src={miniatura(capa)}
                    alt=""
                    loading="lazy"
                    style={{
                      flex: "1 1 0",
                      minWidth: 0,
                      aspectRatio: "3 / 4",
                      objectFit: "cover",
                      borderRadius: "3px",
                      background: "#e8e8e4",
                      display: "block"
                    }}
                  />
                ))}
              </div>
            </Link>
          ))}
        </div>
      )}

    </div>
  )
}

export default Comunidade
