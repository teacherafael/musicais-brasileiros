import { useEffect, useState } from "react"
import { collection, getDocs } from "firebase/firestore"
import { db } from "../firebase"

function Stats() {
  const [stats, setStats] = useState(null)

  useEffect(() => {
    async function calcular() {
      const snap = await getDocs(collection(db, "musicais"))
      const lista = snap.docs.map(d => ({ id: d.id, ...d.data() }))

      const totalMusicais = lista.length
      const totalVotos = lista.reduce((acc, m) => acc + (m.totalVotos || 0), 0)
      const comVotos = lista.filter(m => m.totalVotos > 0)

      const maisVotado = comVotos.sort((a, b) => b.totalVotos - a.totalVotos)[0]
      const melhorAvaliado = comVotos.sort((a, b) =>
        (b.somaEstrelas / b.totalVotos) - (a.somaEstrelas / a.totalVotos)
      )[0]

      const direcaoCount = {}
      lista.forEach(m => {
        if (!m.direcao) return
        m.direcao.split(",").forEach(nome => {
          const n = nome.trim()
          if (n) direcaoCount[n] = (direcaoCount[n] || 0) + 1
        })
      })
      const dirMaisFrequente = Object.entries(direcaoCount)
        .sort((a, b) => b[1] - a[1])[0]

      const anoCount = {}
      lista.forEach(m => {
        if (m.ano) anoCount[m.ano] = (anoCount[m.ano] || 0) + 1
      })
      const anoMaisAtivo = Object.entries(anoCount)
        .sort((a, b) => b[1] - a[1])[0]

      setStats({ totalMusicais, totalVotos, maisVotado, melhorAvaliado, dirMaisFrequente, anoMaisAtivo })
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

  return (
    <main>
      <p className="section-label">MBDb</p>
      <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "32px", fontWeight: "700", margin: "8px 0 32px" }}>
        Estatísticas
      </h1>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "16px" }}>
        {bloco("Total de musicais", stats.totalMusicais)}
        {bloco("Total de avaliações", stats.totalVotos)}
        {stats.maisVotado && bloco(
          "Musical mais votado",
          stats.maisVotado.titulo,
          `${stats.maisVotado.totalVotos} votos`
        )}
        {stats.melhorAvaliado && bloco(
          "Melhor avaliado",
          stats.melhorAvaliado.titulo,
          `★ ${(stats.melhorAvaliado.somaEstrelas / stats.melhorAvaliado.totalVotos).toFixed(1)}`
        )}
        {stats.dirMaisFrequente && bloco(
          "Diretor mais presente",
          stats.dirMaisFrequente[0],
          `${stats.dirMaisFrequente[1]} musicais`
        )}
        {stats.anoMaisAtivo && bloco(
          "Ano mais ativo",
          stats.anoMaisAtivo[0],
          `${stats.anoMaisAtivo[1]} musicais`
        )}
      </div>
    </main>
  )
}

export default Stats