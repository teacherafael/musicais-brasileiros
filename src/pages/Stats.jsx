import { useEffect, useState } from "react"
import { collection, getDocs } from "firebase/firestore"
import { db } from "../firebase"
import { useNavigate } from "react-router-dom"

function Stats() {
  const [stats, setStats] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    async function calcular() {
      const snap = await getDocs(collection(db, "musicais"))
      const lista = snap.docs.map(d => ({ id: d.id, ...d.data() }))

      const totalMusicais = lista.length
      const totalVotos = lista.reduce((acc, m) => acc + (m.totalVotos || 0), 0)
      const comVotos = lista.filter(m => m.totalVotos > 0)

      const mediaNota = comVotos.length > 0
        ? comVotos.reduce((acc, m) => acc + m.somaEstrelas / m.totalVotos, 0) / comVotos.length
        : 0

      const top3Votados = [...comVotos]
        .sort((a, b) => b.totalVotos - a.totalVotos)
        .slice(0, 3)

      const top3Avaliados = [...comVotos]
        .sort((a, b) => (b.somaEstrelas / b.totalVotos) - (a.somaEstrelas / a.totalVotos))
        .slice(0, 3)

      const notaMaisAlta = top3Avaliados[0]

      // Comentários
      let totalComentarios = 0
      const comentariosPorMusical = {}
      await Promise.all(
        lista.map(async m => {
          const subSnap = await getDocs(collection(db, "musicais", m.id, "comentarios"))
          comentariosPorMusical[m.id] = subSnap.size
          totalComentarios += subSnap.size
        })
      )
      const top3Comentados = [...lista]
        .sort((a, b) => (comentariosPorMusical[b.id] || 0) - (comentariosPorMusical[a.id] || 0))
        .filter(m => (comentariosPorMusical[m.id] || 0) > 0)
        .slice(0, 3)

      // Diretor
      const direcaoCount = {}
      lista.forEach(m => {
        if (!m.direcao) return
        m.direcao.split(",").forEach(nome => {
          const n = nome.trim()
          if (n) direcaoCount[n] = (direcaoCount[n] || 0) + 1
        })
      })
      const dirMaisFrequente = Object.entries(direcaoCount).sort((a, b) => b[1] - a[1])[0]
      const top3Diretores = Object.entries(direcaoCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)

      // Direção musical
      const direcaoMusicalCount = {}
      lista.forEach(m => {
        if (!m.direcaoMusical) return
        m.direcaoMusical.split(",").forEach(nome => {
          const n = nome.trim()
          if (n) direcaoMusicalCount[n] = (direcaoMusicalCount[n] || 0) + 1
        })
      })
      const top3DiretoresMusicais = Object.entries(direcaoMusicalCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)

      // Elenco (elenco + elencoAdicional somados)
      const elencoCount = {}
      lista.forEach(m => {
        const nomes = [
          ...(m.elenco ? m.elenco.split(",") : []),
          ...(m.elencoAdicional ? m.elencoAdicional.split(",") : [])
        ]
        nomes.forEach(nome => {
          const n = nome.trim()
          if (n) elencoCount[n] = (elencoCount[n] || 0) + 1
        })
      })
      const top3Elenco = Object.entries(elencoCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)

      // Teatro
      const teatroCount = {}
      lista.forEach(m => {
        if (!m.teatro) return
        const t = m.teatro.trim()
        if (t) teatroCount[t] = (teatroCount[t] || 0) + 1
      })
      const teatroMaisFrequente = Object.entries(teatroCount).sort((a, b) => b[1] - a[1])[0]

      // Por ano
      const anoCount = {}
      lista.forEach(m => {
        if (m.ano) anoCount[m.ano] = (anoCount[m.ano] || 0) + 1
      })
      const anosSorted = Object.entries(anoCount).sort((a, b) => a[0].localeCompare(b[0]))
      const maxPorAno = Math.max(...anosSorted.map(([, v]) => v))

      // Usuários
      const usuariosSnap = await getDocs(collection(db, "usuarios"))
      const totalUsuarios = usuariosSnap.size

      setStats({
        totalMusicais, totalVotos, totalComentarios, mediaNota,
        totalUsuarios,
        top3Votados, top3Avaliados, top3Comentados,
        notaMaisAlta, dirMaisFrequente, teatroMaisFrequente,
        top3Diretores, top3DiretoresMusicais, top3Elenco,
        anosSorted, maxPorAno, comentariosPorMusical
      })
    }
    calcular()
  }, [])

  if (!stats) return <main><p>Carregando...</p></main>

  const bloco = (label, valor, sub) => (
    <div style={{
      background: "#fff", border: "1px solid #e8e8e4", borderRadius: "8px",
      padding: "20px 24px"
    }}>
      <p style={{ fontSize: "12px", fontWeight: "600", color: "#888", textTransform: "uppercase", letterSpacing: "1px", margin: "0 0 8px" }}>{label}</p>
      <p style={{ fontSize: "28px", fontWeight: "700", fontFamily: "'Playfair Display', serif", color: "#F5C518", margin: "0 0 4px" }}>{valor}</p>
      {sub && <p style={{ fontSize: "13px", color: "#888", margin: 0 }}>{sub}</p>}
    </div>
  )

  const medalha = (i) => ["🥇", "🥈", "🥉"][i]

  const blocoTop3 = (label, lista, getSub) => (
    <div style={{
      background: "#fff", border: "1px solid #e8e8e4", borderRadius: "8px",
      padding: "20px 24px"
    }}>
      <p style={{ fontSize: "12px", fontWeight: "600", color: "#888", textTransform: "uppercase", letterSpacing: "1px", margin: "0 0 16px" }}>{label}</p>
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {lista.map((m, i) => (
          <div
            key={m.id}
            onClick={() => navigate(`/musical/${m.id}`)}
            style={{ display: "flex", alignItems: "center", gap: "12px", cursor: "pointer" }}
          >
            <span style={{ fontSize: "22px", width: "28px", flexShrink: 0 }}>{medalha(i)}</span>
            <img
              src={m.capa}
              alt={m.titulo}
              style={{ width: "36px", height: "52px", objectFit: "cover", borderRadius: "4px", flexShrink: 0 }}
            />
            <div style={{ minWidth: 0 }}>
              <p style={{
                margin: 0, fontWeight: "600", fontSize: "14px",
                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis"
              }}>{m.titulo}</p>
              <p style={{ margin: 0, fontSize: "12px", color: "#888" }}>{getSub(m)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  // Top 3 de pessoas (elenco, diretores, diretores musicais) — sem capa, clicável para /pessoa/:nome
  const blocoTop3Pessoas = (label, listaPares) => (
    <div style={{
      background: "#fff", border: "1px solid #e8e8e4", borderRadius: "8px",
      padding: "20px 24px"
    }}>
      <p style={{ fontSize: "12px", fontWeight: "600", color: "#888", textTransform: "uppercase", letterSpacing: "1px", margin: "0 0 16px" }}>{label}</p>
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {listaPares.map(([nome, qtd], i) => (
          <div
            key={nome}
            onClick={() => navigate(`/pessoa/${encodeURIComponent(nome)}`)}
            style={{ display: "flex", alignItems: "center", gap: "12px", cursor: "pointer" }}
          >
            <span style={{ fontSize: "22px", width: "28px", flexShrink: 0 }}>{medalha(i)}</span>
            <div style={{ minWidth: 0 }}>
              <p style={{
                margin: 0, fontWeight: "600", fontSize: "14px",
                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis"
              }}>{nome}</p>
              <p style={{ margin: 0, fontSize: "12px", color: "#888" }}>{qtd} musicai{qtd === 1 ? "" : "s"}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <main>
      <p className="section-label">MBDb</p>
      <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "32px", fontWeight: "700", margin: "8px 0 32px" }}>
        Estatísticas
      </h1>

      {/* Números gerais */}
      <h2 style={{ fontSize: "14px", fontWeight: "600", color: "#888", textTransform: "uppercase", letterSpacing: "1px", margin: "0 0 12px" }}>Números gerais</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "16px", marginBottom: "40px" }}>
        {bloco("Total de musicais", stats.totalMusicais)}
        {bloco("Usuários cadastrados", stats.totalUsuarios)}
        {bloco("Total de avaliações", stats.totalVotos)}
        {bloco("Total de comentários", stats.totalComentarios)}
        {bloco("Nota média geral", `★ ${stats.mediaNota.toFixed(2)}`)}
        {stats.notaMaisAlta && bloco(
          "Nota mais alta",
          stats.notaMaisAlta.titulo,
          `★ ${(stats.notaMaisAlta.somaEstrelas / stats.notaMaisAlta.totalVotos).toFixed(2)}`
        )}
        {stats.dirMaisFrequente && bloco(
          "Diretor(a) mais presente",
          stats.dirMaisFrequente[0],
          `${stats.dirMaisFrequente[1]} musicais`
        )}
        {stats.teatroMaisFrequente && bloco(
          "Teatro mais presente",
          stats.teatroMaisFrequente[0],
          `${stats.teatroMaisFrequente[1]} musicais`
        )}
      </div>

      {/* Top 3s de musicais */}
      <h2 style={{ fontSize: "14px", fontWeight: "600", color: "#888", textTransform: "uppercase", letterSpacing: "1px", margin: "0 0 12px" }}>Rankings</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "16px", marginBottom: "40px" }}>
        {blocoTop3(
          "Mais votados",
          stats.top3Votados,
          m => `${m.totalVotos} avaliações`
        )}
        {blocoTop3(
          "Melhor avaliados",
          stats.top3Avaliados,
          m => `★ ${(m.somaEstrelas / m.totalVotos).toFixed(2)}`
        )}
        {stats.top3Comentados.length > 0 && blocoTop3(
          "Mais comentados",
          stats.top3Comentados,
          m => `${stats.comentariosPorMusical[m.id]} comentários`
        )}
      </div>

      {/* Top 3s de pessoas */}
      <h2 style={{ fontSize: "14px", fontWeight: "600", color: "#888", textTransform: "uppercase", letterSpacing: "1px", margin: "0 0 12px" }}>Mais presentes</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "16px", marginBottom: "40px" }}>
        {stats.top3Elenco.length > 0 && blocoTop3Pessoas("Elenco mais presente", stats.top3Elenco)}
        {stats.top3Diretores.length > 0 && blocoTop3Pessoas("Diretores mais presentes", stats.top3Diretores)}
        {stats.top3DiretoresMusicais.length > 0 && blocoTop3Pessoas("Direção musical mais presente", stats.top3DiretoresMusicais)}
      </div>

      {/* Por ano */}
      {stats.anosSorted.length > 0 && (
        <>
          <h2 style={{ fontSize: "14px", fontWeight: "600", color: "#888", textTransform: "uppercase", letterSpacing: "1px", margin: "0 0 12px" }}>Musicais por ano</h2>
          <div style={{
            background: "#fff", border: "1px solid #e8e8e4", borderRadius: "8px",
            padding: "24px", marginBottom: "40px"
          }}>
            <div style={{ display: "flex", alignItems: "flex-end", gap: "8px", height: "120px" }}>
              {stats.anosSorted.map(([ano, qtd]) => (
                <div key={ano} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "6px", height: "100%" }}>
                  <span style={{ fontSize: "11px", fontWeight: "700", color: "#555" }}>{qtd}</span>
                  <div style={{ width: "100%", display: "flex", alignItems: "flex-end", flex: 1 }}>
                    <div style={{
                      width: "100%",
                      height: `${(qtd / stats.maxPorAno) * 100}%`,
                      background: "#F5C518",
                      borderRadius: "4px 4px 0 0",
                      minHeight: "4px"
                    }} />
                  </div>
                  <span style={{
                    fontSize: "10px", color: "#888", writingMode: "vertical-rl",
                    transform: "rotate(180deg)", whiteSpace: "nowrap"
                  }}>{ano}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </main>
  )
}

export default Stats