import { useState } from "react"
import { collection, getDocs, writeBatch, doc, setDoc, serverTimestamp } from "firebase/firestore"
import { db, auth } from "../firebase"

// O Firestore permite até 500 operações por lote. Usamos 450 por segurança.
const LIMITE_LOTE = 450

function EnviarComunicado() {
  const [texto, setTexto] = useState("")
  const [link, setLink] = useState("")
  const [enviando, setEnviando] = useState(false)
  const [progresso, setProgresso] = useState("")
  const [confirmando, setConfirmando] = useState(false)

  async function enviar(apenasTeste) {
    const textoLimpo = texto.trim()
    if (!textoLimpo) return

    const linkLimpo = link.trim()
    if (linkLimpo && !linkLimpo.startsWith("/")) {
      setProgresso("⚠️ O link precisa ser interno e começar com / (ex: /contribua)")
      return
    }

    setEnviando(true)
    setProgresso("Buscando usuários...")

    try {
      let uids = []
      if (apenasTeste) {
        if (!auth.currentUser) {
          setProgresso("⚠️ Sessão expirada. Recarregue a página.")
          setEnviando(false)
          return
        }
        uids = [auth.currentUser.uid]
      } else {
        const snap = await getDocs(collection(db, "usuarios"))
        uids = snap.docs.map(d => d.id)
      }

      const total = uids.length
      let enviados = 0

      for (let i = 0; i < total; i += LIMITE_LOTE) {
        const fatia = uids.slice(i, i + LIMITE_LOTE)
        const lote = writeBatch(db)
        fatia.forEach(uid => {
          const refNot = doc(collection(db, "notificacoes", uid, "itens"))
          lote.set(refNot, {
            tipo: "comunicado",
            texto: textoLimpo,
            link: linkLimpo || null,
            lida: false,
            data: serverTimestamp(),
          })
        })
        await lote.commit()
        enviados += fatia.length
        setProgresso(`Enviando... ${enviados} de ${total}`)
      }

      // Histórico (só para envios reais, não para testes)
      if (!apenasTeste) {
        await setDoc(doc(collection(db, "comunicadosEnviados")), {
          texto: textoLimpo,
          link: linkLimpo || null,
          destinatarios: total,
          enviadoPor: auth.currentUser?.uid || "",
          data: serverTimestamp(),
        })
        setTexto("")
        setLink("")
      }

      setProgresso(
        apenasTeste
          ? "✅ Teste enviado! Confira o seu sininho aqui em cima."
          : `✅ Comunicado enviado para ${total} usuários.`
      )
    } catch (e) {
      console.error("Falha no envio do comunicado:", e)
      setProgresso("❌ Erro no envio: " + (e?.message || "desconhecido"))
    } finally {
      setEnviando(false)
      setConfirmando(false)
    }
  }

  const inputBase = {
    width: "100%",
    padding: "10px 12px",
    border: "1px solid #e8e8e4",
    borderRadius: "8px",
    fontSize: "14px",
    fontFamily: "'DM Sans', sans-serif",
    boxSizing: "border-box",
  }

  return (
    <div style={{ maxWidth: "600px", fontFamily: "'DM Sans', sans-serif" }}>
      <p style={{ fontSize: "13px", color: "#666", lineHeight: 1.5, marginTop: 0 }}>
        Envia uma notificação no sininho para <strong>todos</strong> os usuários cadastrados.
        Não dá para desfazer — sempre teste antes.
      </p>

      <label style={{ fontSize: "13px", fontWeight: 700, display: "block", marginBottom: "6px" }}>
        Texto do comunicado
      </label>
      <textarea
        value={texto}
        onChange={(e) => setTexto(e.target.value.slice(0, 160))}
        placeholder="Ex: A página de Produtoras está no ar! Confira."
        rows={3}
        disabled={enviando}
        style={{ ...inputBase, resize: "vertical" }}
      />
      <p style={{ fontSize: "11px", color: "#aaa", margin: "4px 0 16px", textAlign: "right" }}>
        {texto.length}/160
      </p>

      <label style={{ fontSize: "13px", fontWeight: 700, display: "block", marginBottom: "6px" }}>
        Link interno (opcional)
      </label>
      <input
        type="text"
        value={link}
        onChange={(e) => setLink(e.target.value)}
        placeholder="/contribua"
        disabled={enviando}
        style={inputBase}
      />
      <p style={{ fontSize: "11px", color: "#aaa", margin: "4px 0 20px" }}>
        Só caminhos do próprio site, começando com barra. Links externos não funcionam aqui.
      </p>

      {/* Pré-visualização de como vai aparecer no sininho */}
      {texto.trim() && (
        <div style={{
          border: "1px solid #e8e8e4",
          borderRadius: "10px",
          overflow: "hidden",
          marginBottom: "20px",
        }}>
          <div style={{ padding: "8px 14px", background: "#faf9f6", fontSize: "11px", color: "#888", fontWeight: 700 }}>
            PRÉVIA
          </div>
          <div style={{ padding: "12px 16px", background: "#fffbea", display: "flex", gap: "10px", alignItems: "flex-start" }}>
            <span style={{ fontSize: "20px", flexShrink: 0, marginTop: "1px" }}>📢</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: "13px", color: "#1a1a1a", margin: 0, lineHeight: 1.4 }}>{texto.trim()}</p>
              <p style={{ fontSize: "11px", color: "#aaa", margin: "3px 0 0", lineHeight: 1 }}>agora</p>
            </div>
            <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#F5C518", flexShrink: 0, marginTop: "5px" }} />
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
        <button
          onClick={() => enviar(true)}
          disabled={enviando || !texto.trim()}
          style={{
            padding: "10px 18px",
            border: "1px solid #b8960a",
            background: "#fff",
            color: "#b8960a",
            borderRadius: "8px",
            fontSize: "14px",
            fontWeight: 700,
            cursor: enviando || !texto.trim() ? "not-allowed" : "pointer",
            opacity: enviando || !texto.trim() ? 0.5 : 1,
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          Enviar teste só para mim
        </button>

        {!confirmando ? (
          <button
            onClick={() => setConfirmando(true)}
            disabled={enviando || !texto.trim()}
            style={{
              padding: "10px 18px",
              border: "none",
              background: "#1a1a1a",
              color: "#F5C518",
              borderRadius: "8px",
              fontSize: "14px",
              fontWeight: 700,
              cursor: enviando || !texto.trim() ? "not-allowed" : "pointer",
              opacity: enviando || !texto.trim() ? 0.5 : 1,
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            Enviar para todos
          </button>
        ) : (
          <>
            <button
              onClick={() => enviar(false)}
              disabled={enviando}
              style={{
                padding: "10px 18px",
                border: "none",
                background: "#c0392b",
                color: "#fff",
                borderRadius: "8px",
                fontSize: "14px",
                fontWeight: 700,
                cursor: enviando ? "not-allowed" : "pointer",
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              Confirmar envio para TODOS
            </button>
            <button
              onClick={() => setConfirmando(false)}
              disabled={enviando}
              style={{
                padding: "10px 18px",
                border: "1px solid #e8e8e4",
                background: "#fff",
                color: "#666",
                borderRadius: "8px",
                fontSize: "14px",
                cursor: "pointer",
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              Cancelar
            </button>
          </>
        )}
      </div>

      {progresso && (
        <p style={{ fontSize: "13px", marginTop: "16px", color: "#1a1a1a", fontWeight: 600 }}>
          {progresso}
        </p>
      )}
    </div>
  )
}

export default EnviarComunicado