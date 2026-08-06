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

// Mesmo selo usado na pagina de Perfil, em escala menor
function SeloVerificado() {
  return (
    <span title="Usuário verificado" style={{ display: "inline-flex", flexShrink: 0 }}>
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="12" fill="#1D9BF0" />
        <path d="M7 13l3 3 7-7" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  )
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

// Quantos musicais do Top 5 deste perfil tambem estao no meu Top 5
function contarEmComum(perfil, meuConjunto) {
  if (!meuConjunto || meuConjunto.size === 0) return 0
  const ids = Array.isArray(perfil.ids) ? perfil.ids : []
  return ids.filter(id => meuConjunto.has(id)).length
}

// Card de perfil. meuConjunto e um Set com os ids do meu Top 5 (ou null).
function CardPerfil({ p, meuConjunto }) {
  const ids = Array.isArray(p.ids) ? p.ids : []
  const emComum = contarEmComum(p, meuConjunto)

  return (
    <Link
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
      <div style={{ display: "flex", alignItems: "flex-start", gap: "10px", marginBottom: "12px" }}>
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
          <div style={{ display: "flex", alignItems: "center", gap: "5px", minWidth: 0 }}>
            <span style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "14px",
              fontWeight: "600",
              color: "#1a1a1a",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis"
            }}>
              {p.nome}
            </span>
            {p.verificado && <SeloVerificado />}
          </div>
          {p.bio && (
            <p style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "12.5px",
              color: "#5f5f5f",
              margin: "3px 0 0",
              lineHeight: "1.35",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden"
            }}>
              {p.bio}
            </p>
          )}
        </div>

        {/* Selo de afinidade: some quando nao ha nada em comum */}
        {emComum > 0 && (
          <span
            title={`${emComum} ${emComum === 1 ? "musical" : "musicais"} do seu Top 5 também está aqui`}
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "11px",
              fontWeight: "600",
              color: "#5a4a00",
              background: "#fff3c4",
              border: "1px solid #f0e0a0",
              borderRadius: "20px",
              padding: "3px 8px",
              whiteSpace: "nowrap",
              flexShrink: 0
            }}
          >
            {emComum} em comum
          </span>
        )}
      </div>

      {/* Faixa das cinco capas. As coincidentes ganham contorno dourado. */}
      <div style={{ display: "flex", gap: "5px" }}>
        {p.capas.map((capa, i) => {
          const coincide = meuConjunto && ids[i] && meuConjunto.has(ids[i])
          return (
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
                display: "block",
                // outline nao ocupa espaco no layout, entao a faixa nao desalinha
                outline: coincide ? "2px solid #b8960a" : "none",
                outlineOffset: "-2px"
              }}
            />
          )
        })}
      </div>
    </Link>
  )
}

function Comunidade() {
  const [perfis, setPerfis] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [usuario, setUsuario] = useState(null)
  const [meusIds, setMeusIds] = useState([])

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

  // Uma leitura extra, so para quem esta logado: o meu proprio Top 5
  useEffect(() => {
    if (!usuario) {
      setMeusIds([])
      return
    }
    async function buscarMeuTop5() {
      try {
        const snap = await getDoc(doc(db, "usuarios", usuario.uid))
        const ids = snap.exists() ? snap.data().top5Ids : null
        setMeusIds(Array.isArray(ids) ? ids : [])
      } catch (e) {
        setMeusIds([])
      }
    }
    buscarMeuTop5()
  }, [usuario])

  const euApareco = usuario && perfis.some(p => p.uid === usuario.uid)
  const meuConjunto = meusIds.length > 0 ? new Set(meusIds) : null

  // Ate 6 pessoas com maior afinidade, sem me incluir
  const combinam = meuConjunto
    ? perfis
        .filter(p => p.uid !== (usuario && usuario.uid))
        .map(p => ({ perfil: p, emComum: contarEmComum(p, meuConjunto) }))
        .filter(x => x.emComum > 0)
        .sort((a, b) => b.emComum - a.emComum)
        .slice(0, 6)
        .map(x => x.perfil)
    : []

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
        Quem faz parte do MCDb, apresentado pelos cinco musicais que cada pessoa
        escolheu como favoritos. É um retrato de gosto: dá para descobrir alguém
        que ama os mesmos espetáculos que você — ou encontrar títulos que ainda
        não conhecia.
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
            para descobrir quem combina com você e entrar na comunidade.
          </p>
        </div>
      )}

      {/* Bloco de afinidade: so aparece para quem tem Top 5 montado */}
      {!carregando && combinam.length > 0 && (
        <div style={{ marginBottom: "34px" }}>
          <h2 style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: "21px",
            color: "#1a1a1a",
            margin: "0 0 4px"
          }}>
            Combina com você
          </h2>
          <p style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: "13px",
            color: "#999",
            margin: "0 0 14px",
            maxWidth: "620px",
            lineHeight: "1.6"
          }}>
            Pessoas cujo Top 5 tem musicais em comum com o seu. As capas com
            contorno dourado são as que vocês compartilham.
          </p>
          <div style={grade}>
            {combinam.map(p => (
              <CardPerfil key={`afinidade-${p.uid}`} p={p} meuConjunto={meuConjunto} />
            ))}
          </div>
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
        <>
          {/* Titulo da grade completa, so quando existe o bloco de afinidade acima */}
          {combinam.length > 0 && (
            <h2 style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: "21px",
              color: "#1a1a1a",
              margin: "0 0 14px"
            }}>
              Todo mundo
            </h2>
          )}
          <div style={grade}>
            {perfis.map(p => (
              <CardPerfil key={p.uid} p={p} meuConjunto={meuConjunto} />
            ))}
          </div>
        </>
      )}

    </div>
  )
}

export default Comunidade
