import { useState } from "react"
import { collection, getDocs, doc, updateDoc } from "firebase/firestore"
import { db } from "../firebase"

const COLECAO = "musicais"
const CAMPO = "titulo"

const ARTIGOS = "A|O|As|Os|Um|Uma|Uns|Umas|The|Les|La|Le|El|Los|Las|Il|Lo|Der|Die|Das"

// Titulos que NAO devem ser alterados. Cole aqui o texto exato se algum vier errado.
const EXCECOES = []

function normalizarTitulo(titulo) {
  const t = String(titulo).trim()
  if (EXCECOES.includes(t)) return t

  // Caso 1: artigo no fim de tudo -> "Pequena Sereia - O Musical, A"
  const fim = new RegExp(`^(.+?),\\s*(${ARTIGOS})$`, "i")
  const m1 = t.match(fim)
  if (m1) return `${m1[2]} ${m1[1]}`

  // Caso 2: artigo antes do subtitulo -> "Pequena Sereia, A - O Musical"
  const meio = new RegExp(`^(.+?),\\s*(${ARTIGOS})(\\s*[-–]\\s*.+)$`, "i")
  const m2 = t.match(meio)
  if (m2) return `${m2[2]} ${m2[1]}${m2[3]}`

  return t
}

export default function AdminTitulos() {
  const [linhas, setLinhas] = useState([])
  const [status, setStatus] = useState("")
  const [carregando, setCarregando] = useState(false)

  async function simular() {
    setCarregando(true)
    setStatus("Lendo o banco...")
    try {
      const snap = await getDocs(collection(db, COLECAO))
      const lista = []

      snap.docs.forEach((d) => {
        const atual = d.data()[CAMPO]
        if (!atual) return

        const novo = normalizarTitulo(atual)
        if (novo !== atual) {
          lista.push({ id: d.id, de: atual, para: novo, marcado: true })
        }
      })

      lista.sort((a, b) => a.de.localeCompare(b.de, "pt-BR"))
      setLinhas(lista)
      setStatus(
        lista.length
          ? `${lista.length} fichas seriam alteradas. Nada foi gravado ainda.`
          : "Nenhuma ficha precisa de ajuste."
      )
    } catch (e) {
      setStatus("Erro: " + e.message)
    }
    setCarregando(false)
  }

  function alternar(id) {
    setLinhas((prev) => prev.map((l) => (l.id === id ? { ...l, marcado: !l.marcado } : l)))
  }

  function marcarTodos(valor) {
    setLinhas((prev) => prev.map((l) => ({ ...l, marcado: valor })))
  }

  async function gravar() {
    const selecionadas = linhas.filter((l) => l.marcado)
    if (!selecionadas.length) return
    if (!window.confirm(`Gravar ${selecionadas.length} alteracoes? Nao da para desfazer.`)) return

    setCarregando(true)
    let n = 0
    try {
      for (const l of selecionadas) {
        await updateDoc(doc(db, COLECAO, l.id), { [CAMPO]: l.para })
        n++
        setStatus(`Gravando... ${n} de ${selecionadas.length}`)
      }
      setStatus(`Pronto. ${n} fichas atualizadas.`)
      setLinhas([])
    } catch (e) {
      setStatus(`Erro apos ${n} gravacoes: ` + e.message)
    }
    setCarregando(false)
  }

  const total = linhas.filter((l) => l.marcado).length

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: 20, fontFamily: "sans-serif" }}>
      <h1 style={{ fontSize: 24, marginBottom: 8 }}>Normalizacao de titulos</h1>
      <p style={{ color: "#666", fontSize: 14, marginBottom: 20, lineHeight: 1.5 }}>
        1. Clique em Simular e confira a tabela.<br />
        2. Desmarque qualquer linha que estiver errada.<br />
        3. Clique em Gravar.
      </p>

      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <button
          onClick={simular}
          disabled={carregando}
          style={{ padding: "10px 18px", fontSize: 15, cursor: "pointer" }}
        >
          1. Simular
        </button>
        <button
          onClick={gravar}
          disabled={carregando || !total}
          style={{
            padding: "10px 18px",
            fontSize: 15,
            cursor: total ? "pointer" : "not-allowed",
            background: total ? "#b00020" : "#ccc",
            color: "#fff",
            border: "none",
          }}
        >
          2. Gravar {total ? `(${total})` : ""}
        </button>
        {linhas.length > 0 && (
          <>
            <button onClick={() => marcarTodos(true)} style={{ padding: "10px 14px", fontSize: 14 }}>
              Marcar todos
            </button>
            <button onClick={() => marcarTodos(false)} style={{ padding: "10px 14px", fontSize: 14 }}>
              Desmarcar todos
            </button>
          </>
        )}
      </div>

      {status && (
        <p style={{ padding: 10, background: "#f4f4f4", fontSize: 14, marginBottom: 16 }}>{status}</p>
      )}

      {linhas.length > 0 && (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <thead>
            <tr style={{ background: "#eee", textAlign: "left" }}>
              <th style={{ padding: 8, width: 40 }}></th>
              <th style={{ padding: 8 }}>Como esta</th>
              <th style={{ padding: 8 }}>Como vai ficar</th>
            </tr>
          </thead>
          <tbody>
            {linhas.map((l) => (
              <tr
                key={l.id}
                style={{ borderBottom: "1px solid #ddd", opacity: l.marcado ? 1 : 0.4 }}
              >
                <td style={{ padding: 8 }}>
                  <input type="checkbox" checked={l.marcado} onChange={() => alternar(l.id)} />
                </td>
                <td style={{ padding: 8, color: "#900" }}>{l.de}</td>
                <td style={{ padding: 8, color: "#060", fontWeight: 600 }}>{l.para}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}