import { useEffect, useState } from "react"
import { doc, getDoc } from "firebase/firestore"
import { db, auth } from "../firebase"
import { onAuthStateChanged } from "firebase/auth"
import { ADMINS } from "../admins"
import { useParams, useNavigate } from "react-router-dom"
import ALIASES from "../aliases.json"

// Mapeamento de aliases para nome canônico
// Chave: nome antigo (lowercase), Valor: nome atual (como aparece nos créditos)

// Remove acentos e deixa minúsculo, pra busca tolerante a acentuação
const normalizar = (texto) =>
  (texto || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")

// Traduz a marcação simples da bio em negrito e links de pessoa.
// **texto** vira negrito. [[Nome]] vira link pra /pessoa/Nome.
// [[texto|Nome]] mostra "texto" mas linka pra /pessoa/Nome.
const renderBio = (texto) => {
  if (!texto) return null
  const partes = (texto || "").split(/(\*\*[^*]+\*\*|\[\[[^\]]+\]\]|\{\{[^}]+\}\})/g)
  return partes.map((parte, i) => {
    if (parte.startsWith("**") && parte.endsWith("**")) {
      return <strong key={i}>{parte.slice(2, -2)}</strong>
    }
    if (parte.startsWith("[[") && parte.endsWith("]]")) {
      const conteudo = parte.slice(2, -2)
      const [rotulo, alvo] = conteudo.includes("|") ? conteudo.split("|") : [conteudo, conteudo]
      return (
        <a key={i} href={"/pessoa/" + encodeURIComponent(alvo.trim())}
          style={{ color: "#b8960a", textDecoration: "none", fontWeight: 600 }}>
          {rotulo.trim()}
        </a>
      )
    }
    if (parte.startsWith("{{") && parte.endsWith("}}")) {
      const conteudo = parte.slice(2, -2)
      const [rotulo, id] = conteudo.includes("|") ? conteudo.split("|") : [conteudo, conteudo]
      return (
        <a key={i} href={"/musical/" + id.trim()}
          style={{ color: "#b8960a", textDecoration: "none", fontWeight: 600 }}>
          {rotulo.trim()}
        </a>
      )
    }
    return parte
  })
}

function Pessoa() {
  const { nome } = useParams()
  const navigate = useNavigate()
  const [musicais, setMusicais] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [entidade, setEntidade] = useState(null)
  const [ehAdmin, setEhAdmin] = useState(false)
  const [fotoAberta, setFotoAberta] = useState(null)
  const [indiceFoto, setIndiceFoto] = useState(null)

  useEffect(() => {
    return onAuthStateChanged(auth, (user) => {
      setEhAdmin(!!user && ADMINS.includes(user.uid))
    })
  }, [])

  const nomeDecodificado = decodeURIComponent(nome).trim()
  const nomeLower = nomeDecodificado.toLowerCase()

  // Se o nome da URL é um alias, redireciona para o nome canônico
  const nomeCanonicoDoAlias = ALIASES[nomeLower]
  useEffect(() => {
    if (nomeCanonicoDoAlias) {
      navigate("/pessoa/" + encodeURIComponent(nomeCanonicoDoAlias), { replace: true })
    }
  }, [nomeCanonicoDoAlias])

  // Descobre todos os aliases que apontam para este nome canônico
  const todosOsNomes = [
  nomeLower,
  ...Object.entries(ALIASES)
    .filter(([alias, canonical]) => canonical.toLowerCase() === nomeLower)
    .map(([alias]) => alias)
]

  const nomeBusca = nomeDecodificado.toLowerCase()

  useEffect(() => {
    document.title = `${nomeDecodificado} | MCDb`
    return () => { document.title = "MCDb — Musical Cast Database" }
  }, [nomeDecodificado])

  useEffect(() => {
    if (nomeCanonicoDoAlias) return // aguarda o redirect
    async function buscar() {
      // Lê o índice pré-pronto (1 leitura) em vez da coleção musicais inteira
      const indiceSnap = await getDoc(doc(db, "indices", "home"))
      const itens = indiceSnap.exists() ? (indiceSnap.data().itens || []) : []
      const lista = itens
        .filter(m => {
          const campos = [
            m.direcao, m.direcaoMusical, m.producao,
            m.elenco, m.elencoAdicional, m.versionista,
            m.textoOriginal, m.musicaOriginal
          ]
          const nomesEquipe = (m.equipeCriativa || []).flatMap(item => item.nomes || [])
          const nomesMusicos = (m.musicos || []).flatMap(item => item.nomes || [])
          // Campos de texto livre (elenco, direção etc.) têm múltiplos nomes separados por vírgula
          const nomesDosCampos = campos
            .filter(Boolean)
            .flatMap(c => c.split(","))
            .map(n => n.trim())
          const todosCampos = [...nomesDosCampos, ...nomesEquipe, ...nomesMusicos]
          // Busca por correspondência EXATA do nome atual OU de qualquer alias
          return todosCampos.some(c =>
            todosOsNomes.some(n => normalizar(c) === normalizar(n))
          )
        })
        .sort((a, b) => {
          const anoA = parseInt(String(a.ano).match(/\d{4}/)?.[0], 10)
          const anoB = parseInt(String(b.ano).match(/\d{4}/)?.[0], 10)
          const validoA = Number.isFinite(anoA)
          const validoB = Number.isFinite(anoB)
          if (!validoA && !validoB) return 0
          if (!validoA) return 1
          if (!validoB) return -1
          return anoA - anoB
        })
      setMusicais(lista)
      setCarregando(false)
    }
    buscar()
  }, [nomeBusca])

  // Perfil enriquecido (coleção "entidades"), lido sob demanda — 1 leitura extra só nesta página
  useEffect(() => {
    if (nomeCanonicoDoAlias) return // aguarda o redirect pro nome canônico
    async function buscarEntidade() {
      try {
        const id = normalizar(nomeDecodificado)
        const snap = await getDoc(doc(db, "entidades", id))
        if (snap.exists() && snap.data().publicado) {
          setEntidade(snap.data())
        } else {
          setEntidade(null)
        }
      } catch (e) {
        setEntidade(null)
      }
    }
    buscarEntidade()
  }, [nomeBusca])

  return (
    <main>
      {fotoAberta && (() => {
        const fotos = (entidade?.fotosTrabalho || []).filter(u => u && u.trim())
        const irPara = (novoIndice) => {
          const total = fotos.length
          const idx = (novoIndice + total) % total
          setIndiceFoto(idx)
          setFotoAberta(fotos[idx])
        }
        return (
          <div onClick={() => setFotoAberta(null)}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "24px", cursor: "zoom-out" }}>
            {fotos.length > 1 && (
              <button onClick={(e) => { e.stopPropagation(); irPara(indiceFoto - 1) }}
                style={{ position: "absolute", left: "24px", top: "50%", transform: "translateY(-50%)", background: "rgba(0,0,0,0.5)", color: "#fff", border: "none", borderRadius: "50%", width: "48px", height: "48px", fontSize: "24px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1001 }} title="Anterior">‹</button>
            )}
            <img src={fotoAberta} alt="Foto ampliada" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", borderRadius: "8px" }} />
            {fotos.length > 1 && (
              <button onClick={(e) => { e.stopPropagation(); irPara(indiceFoto + 1) }}
                style={{ position: "absolute", right: "24px", top: "50%", transform: "translateY(-50%)", background: "rgba(0,0,0,0.5)", color: "#fff", border: "none", borderRadius: "50%", width: "48px", height: "48px", fontSize: "24px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1001 }} title="Próxima">›</button>
            )}
            <button onClick={() => setFotoAberta(null)}
              style={{ position: "absolute", top: "20px", right: "24px", background: "rgba(0,0,0,0.5)", color: "#fff", border: "none", borderRadius: "50%", width: "40px", height: "40px", fontSize: "20px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1001 }} title="Fechar">✕</button>
          </div>
        )
      })()}
      <button className="voltar" onClick={() => navigate(-1)}>← Voltar</button>
      <p className="section-label">Musical Cast Database</p>
      <h1 className="page-title">{nomeDecodificado}</h1>

      {entidade && (
        <div style={{
          background: "#fff",
          border: "1px solid #e8e8e4",
          borderRadius: "12px",
          padding: "24px",
          marginTop: "20px",
          marginBottom: "28px"
        }}>
          {entidade.imagem && (
            entidade.tipoImagem === "logo" ? (
              <div style={{ float: "left", maxWidth: "200px", marginRight: "24px", marginBottom: "16px" }}>
                <img src={entidade.imagem} alt={entidade.nome} style={{ maxWidth: "100%", maxHeight: "120px", objectFit: "contain", display: "block" }} />
              </div>
            ) : (
              <div style={{ float: "left", width: "min(48%, 300px)", aspectRatio: "3 / 4", borderRadius: "10px", overflow: "hidden", background: "#f0f0f0", border: "1px solid #eee", marginRight: "24px", marginBottom: "16px" }}>
                <img src={entidade.imagem} alt={entidade.nome} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
              </div>
            )
          )}

          <div>
            {entidade.bio && (
              <p style={{ fontSize: "15px", lineHeight: 1.65, color: "#333", margin: "0 0 12px", whiteSpace: "pre-wrap" }}>{renderBio(entidade.bio)}</p>
            )}
            {entidade.formacao && (
              <p style={{ fontSize: "14px", color: "#666", margin: "0 0 6px" }}>
                <strong style={{ color: "#333" }}>Formação:</strong> {entidade.formacao}
              </p>
            )}
            {entidade.contato && (
              <p style={{ fontSize: "14px", color: "#666", margin: "0 0 6px" }}>
                <strong style={{ color: "#333" }}>Contato:</strong> {entidade.contato}
              </p>
            )}
            {Array.isArray(entidade.destaques) && entidade.destaques.length > 0 && (
              <p style={{ fontSize: "14px", color: "#666", margin: "6px 0 0" }}>
                <strong style={{ color: "#333" }}>Destaques:</strong> {entidade.destaques.join(" · ")}
              </p>
            )}
            <div style={{ clear: "both" }} />
            {entidade.links && (entidade.links.instagram || entidade.links.facebook || entidade.links.tiktok || entidade.links.x || entidade.links.site || entidade.links.email || (entidade.links.extras || []).length > 0) && (() => {
              const linhaRotulo = { color: "#444", fontSize: "15px", minWidth: "100px", flexShrink: 0 };
              const linhaLink = { color: "#b8960a", textDecoration: "none", fontWeight: 600, fontSize: "16px", wordBreak: "break-all" };
              const tituloBloco = { fontSize: "12px", fontWeight: 700, letterSpacing: "1.4px", textTransform: "uppercase", color: "#8a8a85", margin: "0 0 14px" };
              const molduraBloco = { marginTop: "26px" };
              const soHandle = (valor) => {
                let v = (valor || "").trim();
                if (!v) return "";
                if (v.includes("/")) {
                  try { v = new URL(v.startsWith("http") ? v : "https://" + v).pathname.split("/").filter(Boolean)[0] || ""; }
                  catch { v = v.split("/").filter(Boolean).pop() || ""; }
                }
                return v.replace(/^@/, "").trim();
              };
              const naMidia = (entidade.links.extras || []).filter(ex => ex && ex.url && ex.label);
              const redes = [];
              const addRede = (nome, base, valor, prefixo) => {
                const h = soHandle(valor);
                if (h) redes.push({ nome, texto: prefixo + h, url: base + h });
              };
              addRede("Instagram", "https://instagram.com/", entidade.links.instagram, "@");
              addRede("TikTok", "https://tiktok.com/@", entidade.links.tiktok, "@");
              addRede("X", "https://x.com/", entidade.links.x, "@");
              addRede("Facebook", "https://facebook.com/", entidade.links.facebook, "");
              const site = (entidade.links.site || "").trim();
              const siteUrl = site ? (site.startsWith("http") ? site : "https://" + site) : "";
              const siteTexto = site.replace(/^https?:\/\//i, "").replace(/\/+$/, "");
              const email = (entidade.links.email || "").trim();
              return (
                <div style={{ marginTop: "16px", borderTop: "1px solid #f0f0f0" }}>
                  {redes.length > 0 && (
                    <div style={molduraBloco}>
                      <p style={tituloBloco}>Redes sociais</p>
                      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                        {redes.map((r, i) => (
                          <div key={i} style={{ display: "flex", gap: "10px", alignItems: "baseline" }}>
                            <span style={linhaRotulo}>{r.nome}</span>
                            <a href={r.url} target="_blank" rel="noreferrer" style={linhaLink}>{r.texto}</a>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {naMidia.length > 0 && (
                    <div style={molduraBloco}>
                      <p style={tituloBloco}>Links externos</p>
                      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                        {naMidia.map((l, i) => (
                          <a key={i} href={l.url} target="_blank" rel="noreferrer" style={linhaLink}>{l.label}</a>
                        ))}
                      </div>
                    </div>
                  )}
                  {siteUrl && (
                    <div style={molduraBloco}>
                      <p style={tituloBloco}>Site oficial</p>
                      <a href={siteUrl} target="_blank" rel="noreferrer" style={linhaLink}>{siteTexto}</a>
                    </div>
                  )}
                  {email && (
                    <div style={molduraBloco}>
                      <p style={tituloBloco}>Contato</p>
                      <a href={"mailto:" + email} style={linhaLink}>{email}</a>
                    </div>
                  )}
                </div>
              );
            })()}
            {Array.isArray(entidade.fotosTrabalho) && entidade.fotosTrabalho.length > 0 && (
              <div style={{ marginTop: "20px", paddingTop: "16px", borderTop: "1px solid #f0f0f0" }}>
                <p style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase", color: "#b8960a", margin: "0 0 12px" }}>Fotos</p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(96px, 1fr))", gap: "10px" }}>
                  {entidade.fotosTrabalho.map((url, i) => (
                    url && url.trim() ? (
                      <button key={i} onClick={() => { setFotoAberta(url); setIndiceFoto(entidade.fotosTrabalho.filter(u => u && u.trim()).indexOf(url)) }}
                        style={{ padding: 0, border: "none", background: "none", cursor: "pointer", borderRadius: "8px", overflow: "hidden", aspectRatio: "1", display: "block" }}>
                        <img src={url} alt={"Foto " + (i + 1)} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                      </button>
                    ) : null
                  ))}
                </div>
              </div>
            )}

            {(() => {
              const videos = Array.isArray(entidade.videosYoutube) && entidade.videosYoutube.length > 0
                ? entidade.videosYoutube
                : (entidade.videoYoutube ? [entidade.videoYoutube] : [])
              if (videos.length === 0) return null
              return (
                <div style={{ marginTop: "20px", paddingTop: "16px", borderTop: "1px solid #f0f0f0" }}>
                  <p style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase", color: "#b8960a", margin: "0 0 12px" }}>{videos.length === 1 ? "Vídeo" : "Vídeos"}</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                    {videos.map((id, i) => (
                      <div key={i} style={{ position: "relative", paddingBottom: "28.125%", height: 0, borderRadius: "8px", overflow: "hidden", maxWidth: "50%" }}>
                        <iframe
                          src={"https://www.youtube.com/embed/" + id}
                          title={"Vídeo " + (i + 1)}
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                          style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: "none" }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )
            })()}

            {ehAdmin && (
              <div style={{ marginTop: "16px" }}>
                <button onClick={() => navigate("/admin?editar=" + encodeURIComponent(entidade.nome))}
                  style={{ background: "transparent", color: "#888", border: "1px solid #ccc", borderRadius: "6px", padding: "7px 14px", fontFamily: "'DM Sans', sans-serif", fontSize: "13px", cursor: "pointer" }}>
                  ✏️ Editar perfil
                </button>
              </div>
            )}
          </div>
        </div>
      )}
      <p style={{ fontSize: "15px", color: "#888", marginBottom: "32px", marginTop: entidade ? "4px" : "-8px" }}>
        {carregando ? "Carregando..." : `${musicais.length} ${musicais.length === 1 ? "musical encontrado" : "musicais encontrados"}`}
      </p>

      {carregando ? (
        <div className="grid-pessoa" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "16px" }}>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} style={{ borderRadius: "6px", background: "linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.2s infinite", aspectRatio: "2/3" }} />
          ))}
        </div>
      ) : !carregando && musicais.length === 0 ? (
        <p style={{ color: "#888" }}>Nenhum musical encontrado para esta pessoa.</p>
      ) : (
        <div className="grid-pessoa" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "16px" }}>
          {musicais.map(m => (
            <a key={m.id}
              href={"/musical/" + m.id}
              className="card-musical"
              style={{ textDecoration: "none", color: "inherit", display: "flex", flexDirection: "column", alignItems: "center" }}
            >
              <div style={{ width: "100%", position: "relative", paddingBottom: "140%", marginBottom: "12px" }}>
                <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }}>
                  {m.capa
                    ? <img src={m.capa} alt={m.titulo} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "6px" }} />
                    : <div style={{ width: "100%", height: "100%", background: "#0a2c59", borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center", color: "#b8960a", fontSize: "12px", padding: "8px", textAlign: "center" }}>{m.titulo}</div>
                  }
                </div>
              </div>
              <div style={{ width: "100%" }}>
                <p className="card-titulo">{m.titulo}</p>
                <p className="card-meta">Direção: {m.direcao || "—"}</p>
              </div>
            </a>
          ))}
        </div>
      )}
    </main>
  )
}

export default Pessoa
