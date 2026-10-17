import { useState } from "react"
import { collection, addDoc, serverTimestamp } from "firebase/firestore"
import { db } from "../firebase"

const estiloCampo = {
  width: "100%",
  padding: "8px",
  borderRadius: "6px",
  border: "1px solid #e8e8e4",
  fontFamily: "var(--fonte-corpo)",
  fontSize: "14px",
  marginBottom: "12px",
  boxSizing: "border-box"
}

const estiloRotulo = {
  display: "block",
  fontSize: "13px",
  fontWeight: "500",
  color: "#555",
  marginBottom: "4px"
}

function ReportarErro({ musicalId, musicalTitulo, usuario }) {
  const [aberto, setAberto] = useState(false)
  const [texto, setTexto] = useState("")
  const [correcao, setCorrecao] = useState("")
  const [fonte, setFonte] = useState("")
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [erro, setErro] = useState("")

  const podeEnviar = texto.trim() && correcao.trim() && !enviando

  function fechar() {
    setAberto(false)
    setErro("")
  }

  async function enviar() {
    if (!usuario || !podeEnviar) return
    setEnviando(true)
    setErro("")
    try {
      await addDoc(collection(db, "relatorios"), {
        musicalId,
        musicalTitulo,
        texto: texto.trim(),
        correcao: correcao.trim(),
        fonte: fonte.trim(),
        nome: usuario.displayName || "Sem nome",
        userId: usuario.uid,
        data: serverTimestamp()
      })
      setTexto("")
      setCorrecao("")
      setFonte("")
      setEnviado(true)
      setTimeout(() => {
        setEnviado(false)
        setAberto(false)
      }, 3000)
    } catch (e) {
      console.error("Erro ao enviar relato:", e)
      setErro("Não foi possível enviar. Tente de novo em instantes.")
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div style={{ marginBottom: "24px" }}>
      {!aberto ? (
        <button
          onClick={() => setAberto(true)}
          style={{ background: "none", border: "none", fontSize: "13px", color: "#888", cursor: "pointer", padding: 0, textDecoration: "underline" }}
        >
          Reportar erro ou pedir mudança
        </button>
      ) : (
        <div style={{ background: "#fff8f8", border: "1px solid #f0e0e0", borderRadius: "8px", padding: "16px" }}>
          <p style={{ fontSize: "14px", fontWeight: "500", marginBottom: "12px" }}>Reportar erro ou pedir mudança em {musicalTitulo}</p>

          {!usuario ? (
            <>
              <p style={{ fontSize: "14px", color: "#555", lineHeight: "1.5", marginBottom: "8px" }}>
                Para reportar um erro, entre com sua conta Google pelo botão "Entrar" no topo da página. Assim conseguimos falar com você se precisarmos de mais detalhes.
              </p>
              <p style={{ fontSize: "13px", color: "#888", lineHeight: "1.5", marginBottom: "12px" }}>
                Não consegue entrar? Escreva para <a href="mailto:musicalcastbr@gmail.com" style={{ color: "#555" }}>musicalcastbr@gmail.com</a>.
              </p>
              <button className="btn-sair" onClick={fechar}>Fechar</button>
            </>
          ) : enviado ? (
            <p style={{ fontSize: "14px", color: "#888" }}>Obrigado! Sua mensagem foi enviada.</p>
          ) : (
            <>
              <label style={estiloRotulo}>O que está errado ou faltando?</label>
              <textarea
                value={texto}
                onChange={e => setTexto(e.target.value)}
                maxLength={2000}
                placeholder="Ex.: a produtora está errada; meu nome não aparece entre os músicos."
                style={{ ...estiloCampo, height: "70px" }}
              />

              <label style={estiloRotulo}>Qual é a informação correta?</label>
              <textarea
                value={correcao}
                onChange={e => setCorrecao(e.target.value)}
                maxLength={2000}
                placeholder="Ex.: a produção é da Empresa X; meu nome é Fulano de Tal e toquei reed 1 e 2 na temporada de São Paulo."
                style={{ ...estiloCampo, height: "70px" }}
              />

              <label style={estiloRotulo}>Fonte (opcional)</label>
              <input
                type="text"
                value={fonte}
                onChange={e => setFonte(e.target.value)}
                maxLength={500}
                placeholder="Link, programa da peça ou &quot;eu participei da montagem&quot;"
                style={estiloCampo}
              />

              {erro && (
                <p style={{ fontSize: "13px", color: "#c0392b", marginBottom: "8px" }}>{erro}</p>
              )}

              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  className="btn-comentar"
                  onClick={enviar}
                  disabled={!podeEnviar}
                  style={{ opacity: podeEnviar ? 1 : 0.5, cursor: podeEnviar ? "pointer" : "default" }}
                >
                  {enviando ? "Enviando..." : "Enviar"}
                </button>
                <button className="btn-sair" onClick={fechar}>Cancelar</button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

export default ReportarErro