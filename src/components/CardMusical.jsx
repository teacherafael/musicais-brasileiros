import { useEffect, useState, useRef } from "react"
import { createPortal } from "react-dom"

export default function CardMusical({
  musical, tamanho,
  usuario, jaViSet, queroVerSet, listas, musicaisNasListas,
  dropdownAberto, onToggleJaVi, onToggleQueroVer, onAbrirDropdown,
  onToggleNaLista, onCriarLista,
  metaExtra, esconderDirecao
}) {
  const [hovered, setHovered] = useState(false)
  const [criandoLista, setCriandoLista] = useState(false)
  const [novaListaNome, setNovaListaNome] = useState("")
  const [usandoModal, setUsandoModal] = useState(false)
  const [posDropdown, setPosDropdown] = useState({ top: 0, left: 0, width: 200 })
  const btnListasRef = useRef(null)

  const emAlgumaLista = (musicaisNasListas[musical.id]?.size || 0) > 0
  const pequeno = tamanho === "pequeno"

  useEffect(() => {
    if (!dropdownAberto) {
      setCriandoLista(false)
      setNovaListaNome("")
      setUsandoModal(false)
    }
  }, [dropdownAberto])

  // Bloqueia scroll do body quando modal mobile está aberto
  useEffect(() => {
    if (dropdownAberto && usandoModal) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => { document.body.style.overflow = "" }
  }, [dropdownAberto, usandoModal])

  // Atualiza posição do dropdown portal se a janela for redimensionada ou scrollada
  useEffect(() => {
    if (!dropdownAberto || usandoModal || !pequeno) return
    function atualizar() {
      if (!btnListasRef.current) return
      const r = btnListasRef.current.getBoundingClientRect()
      setPosDropdown({ top: r.bottom + 8, left: r.left, width: Math.max(r.width, 200) })
    }
    atualizar()
    window.addEventListener("scroll", atualizar, true)
    window.addEventListener("resize", atualizar)
    return () => {
      window.removeEventListener("scroll", atualizar, true)
      window.removeEventListener("resize", atualizar)
    }
  }, [dropdownAberto, usandoModal, pequeno])

  function handleAbrirListas(e) {
    const mobile = window.innerWidth <= 600
    if (!mobile && pequeno && btnListasRef.current) {
      const r = btnListasRef.current.getBoundingClientRect()
      setPosDropdown({ top: r.bottom + 8, left: r.left, width: Math.max(r.width, 200) })
    }
    setUsandoModal(mobile)
    onAbrirDropdown(e, musical.id)
  }

  // Conteúdo interno reutilizado no modal e nos dois tipos de dropdown
  const conteudoListas = (
    <>
      <p style={{ fontSize: "11px", fontWeight: "700", color: "#aaa", textTransform: "uppercase", letterSpacing: "1px", padding: "4px 14px 8px" }}>Minhas listas</p>
      {listas.length === 0 && !criandoLista && (
        <p style={{ fontSize: "13px", color: "#888", padding: "0 14px 8px", fontStyle: "italic" }}>Nenhuma lista ainda.</p>
      )}
      {listas.map(lista => {
        const marcado = musicaisNasListas[musical.id]?.has(lista.id)
        return (
          <div key={lista.id}
            role="button" tabIndex={0}
            onClick={e => onToggleNaLista(e, musical, lista.id)}
            style={{ display: "flex", alignItems: "center", gap: "10px", padding: "11px 14px", cursor: "pointer", background: marcado ? "#fffbe6" : "transparent", WebkitTapHighlightColor: "transparent" }}
            onMouseEnter={e => e.currentTarget.style.background = marcado ? "#fff8d6" : "#f9f9f9"}
            onMouseLeave={e => e.currentTarget.style.background = marcado ? "#fffbe6" : "transparent"}
          >
            <span style={{ width: "16px", height: "16px", border: "2px solid", borderColor: marcado ? "#b8960a" : "#ccc", borderRadius: "4px", background: marcado ? "#b8960a" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: "10px", color: "#fff" }}>
              {marcado ? "✓" : ""}
            </span>
            <span style={{ fontSize: "13px", color: "#1a1a1a", fontFamily: "'DM Sans', sans-serif" }}>{lista.nome}</span>
          </div>
        )
      })}
      <div style={{ borderTop: "1px solid #f0f0f0", marginTop: "4px", paddingTop: "4px" }}>
        {criandoLista ? (
          <div style={{ padding: "6px 10px", display: "flex", gap: "6px" }} onClick={e => { e.preventDefault(); e.stopPropagation() }}>
            <input
              autoFocus
              type="text"
              placeholder="Nome da lista"
              value={novaListaNome}
              onChange={e => setNovaListaNome(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter") { onCriarLista(e, musical, novaListaNome, () => { setCriandoLista(false); setNovaListaNome("") }) }
                if (e.key === "Escape") setCriandoLista(false)
              }}
              style={{ flex: 1, padding: "5px 8px", border: "1px solid #e8e8e4", borderRadius: "6px", fontFamily: "'DM Sans', sans-serif", fontSize: "12px", outline: "none" }}
            />
            <button
              onClick={e => onCriarLista(e, musical, novaListaNome, () => { setCriandoLista(false); setNovaListaNome("") })}
              style={{ background: "#b8960a", border: "none", borderRadius: "6px", padding: "5px 10px", fontFamily: "'DM Sans', sans-serif", fontSize: "12px", fontWeight: "600", cursor: "pointer", color: "#fff" }}>
              OK
            </button>
          </div>
        ) : (
          <div
            role="button" tabIndex={0}
            onClick={e => { e.preventDefault(); e.stopPropagation(); setCriandoLista(true) }}
            style={{ display: "flex", alignItems: "center", gap: "8px", padding: "9px 14px", cursor: "pointer", color: "#b8960a", fontSize: "13px", fontFamily: "'DM Sans', sans-serif", fontWeight: "600", WebkitTapHighlightColor: "transparent" }}
            onMouseEnter={e => e.currentTarget.style.background = "#fffbe6"}
            onMouseLeave={e => e.currentTarget.style.background = "transparent"}
          >
            + Nova lista
          </div>
        )}
      </div>
    </>
  )

  // Modal bottom sheet — mobile, qualquer tamanho de card
  const modalMobile = dropdownAberto && usandoModal && createPortal(
    <div
      data-listas-dropdown
      onClick={e => { if (e.target === e.currentTarget) onAbrirDropdown(e, musical.id) }}
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
        zIndex: 9999, display: "flex", alignItems: "flex-end", justifyContent: "center"
      }}
    >
      <div style={{
        background: "#fff", borderRadius: "16px 16px 0 0", width: "100%", maxWidth: "480px",
        paddingBottom: "24px", maxHeight: "70vh", overflowY: "auto",
        boxShadow: "0 -4px 24px rgba(0,0,0,0.15)"
      }}>
        <div style={{ display: "flex", justifyContent: "center", padding: "12px 0 4px" }}>
          <div style={{ width: "40px", height: "4px", borderRadius: "2px", background: "#e0e0e0" }} />
        </div>
        <p style={{ fontSize: "13px", fontWeight: "700", color: "#1a1a1a", padding: "4px 14px 8px", margin: 0, borderBottom: "1px solid #f0f0f0" }}>
          {musical.titulo}
        </p>
        {conteudoListas}
      </div>
    </div>,
    document.body
  )

  // Dropdown via portal — desktop + card pequeno (carrossel)
  // Renderiza no body com posição fixa calculada via getBoundingClientRect
  const dropdownPortal = dropdownAberto && !usandoModal && pequeno && createPortal(
    <div
      data-listas-dropdown
      style={{
        position: "fixed",
        top: posDropdown.top,
        left: posDropdown.left,
        minWidth: posDropdown.width,
        background: "#fff", border: "1px solid #e8e8e4", borderRadius: "10px",
        boxShadow: "0 8px 24px rgba(0,0,0,0.14)", zIndex: 9999, padding: "8px 0"
      }}
    >
      {conteudoListas}
    </div>,
    document.body
  )

  // Dropdown normal relativo — desktop + card grande (grid e perfil)
  const dropdownRelativo = dropdownAberto && !usandoModal && !pequeno && (
    <div
      data-listas-dropdown
      style={{
        position: "absolute",
        top: "calc(100% + 6px)", left: "0", right: "0",
        background: "#fff", border: "1px solid #e8e8e4", borderRadius: "10px",
        boxShadow: "0 8px 24px rgba(0,0,0,0.12)", zIndex: 200, padding: "8px 0", minWidth: "200px"
      }}
    >
      {conteudoListas}
    </div>
  )

  const barraBotoes = usuario && (
    <div style={{
      position: "absolute", bottom: 0, left: 0, right: 0,
      background: "linear-gradient(transparent, rgba(0,0,0,0.85))",
      padding: pequeno ? "20px 4px 6px" : "24px 6px 8px",
      display: "flex", gap: "4px", justifyContent: "center", flexWrap: "wrap",
      opacity: hovered || dropdownAberto ? 1 : 0, transition: "opacity 0.2s ease",
      pointerEvents: hovered || dropdownAberto ? "auto" : "none"
    }}>
      <button
        onClick={e => onToggleJaVi(e, musical)}
        style={{ background: jaViSet.has(musical.id) ? "#F5C518" : "rgba(255,255,255,0.15)", border: jaViSet.has(musical.id) ? "none" : "1px solid rgba(255,255,255,0.4)", borderRadius: "20px", padding: pequeno ? "3px 8px" : "4px 10px", fontFamily: "'DM Sans', sans-serif", fontSize: pequeno ? "10px" : "11px", fontWeight: "600", color: jaViSet.has(musical.id) ? "#1a1a1a" : "#fff", cursor: "pointer", backdropFilter: "blur(4px)" }}>
        {jaViSet.has(musical.id) ? "✓ Já vi" : "Já vi"}
      </button>
      <button
        onClick={e => onToggleQueroVer(e, musical)}
        style={{ background: queroVerSet.has(musical.id) ? "#F5C518" : "rgba(255,255,255,0.15)", border: queroVerSet.has(musical.id) ? "none" : "1px solid rgba(255,255,255,0.4)", borderRadius: "20px", padding: pequeno ? "3px 8px" : "4px 10px", fontFamily: "'DM Sans', sans-serif", fontSize: pequeno ? "10px" : "11px", fontWeight: "600", color: queroVerSet.has(musical.id) ? "#1a1a1a" : "#fff", cursor: "pointer", backdropFilter: "blur(4px)" }}>
        {queroVerSet.has(musical.id) ? "★ Quero ver" : "☆ Quero ver"}
      </button>
      <button
        ref={btnListasRef}
        data-btn-listas={musical.id}
        onClick={handleAbrirListas}
        style={{ background: emAlgumaLista ? "#F5C518" : "rgba(255,255,255,0.15)", border: emAlgumaLista ? "none" : "1px solid rgba(255,255,255,0.4)", borderRadius: "20px", padding: pequeno ? "3px 8px" : "4px 10px", fontFamily: "'DM Sans', sans-serif", fontSize: pequeno ? "10px" : "11px", fontWeight: "600", color: emAlgumaLista ? "#1a1a1a" : "#fff", cursor: "pointer", backdropFilter: "blur(4px)" }}>
        {emAlgumaLista ? "✓ Listas" : "+ Listas"}
      </button>
    </div>
  )

  if (pequeno) {
    return (
      <div style={{ position: "relative", width: "140px", flexShrink: 0 }}>
        <a
          href={"/musical/" + musical.id}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          style={{ textDecoration: "none", color: "inherit", display: "flex", flexDirection: "column", alignItems: "center", width: "140px" }}
        >
          <div style={{ width: "140px", height: "200px", marginBottom: "10px", borderRadius: "6px", overflow: "hidden", position: "relative" }}>
            {musical.capa
              ? <img src={musical.capa?.replace("/upload/", "/upload/f_auto,q_auto,w_280/")} alt={musical.titulo} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#1a1a1a", color: "#F5C518", fontSize: "12px", padding: "8px", textAlign: "center" }}>{musical.titulo}</div>}
            {barraBotoes}
          </div>
          <div style={{ width: "100%" }}>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: "600", fontSize: "13px", margin: "0 0 4px", lineHeight: "1.3" }}>{musical.titulo}</p>
            {metaExtra}
          </div>
        </a>
        {modalMobile}
        {dropdownPortal}
      </div>
    )
  }

  return (
    <div style={{ position: "relative" }}>
      <a
        href={"/musical/" + musical.id}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          textDecoration: "none", color: "inherit", display: "flex", flexDirection: "column", width: "100%",
          background: "#fff", border: hovered ? "1px solid #F5C518" : "1px solid #e8e8e4",
          borderRadius: "12px", overflow: "hidden",
          transition: "border-color 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease",
          transform: hovered ? "translateY(-2px)" : "translateY(0)",
          boxShadow: hovered ? "0 6px 20px rgba(0,0,0,0.1)" : "0 2px 8px rgba(0,0,0,0.06)",
        }}
      >
        <div style={{ width: "100%", aspectRatio: "2/3", position: "relative", overflow: "hidden" }}>
          {musical.capa
            ? <img src={musical.capa?.replace("/upload/", "/upload/f_auto,q_auto,w_400/")} alt={musical.titulo} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#1a1a1a", color: "#F5C518", fontSize: "12px", padding: "12px", textAlign: "center" }}>{musical.titulo}</div>}
          {barraBotoes}
        </div>
        <div style={{ padding: "10px 12px 12px" }}>
          <p style={{ fontFamily: "'Playfair Display', serif", fontWeight: "700", fontSize: "14px", margin: "0 0 3px", lineHeight: "1.3", color: "#1a1a1a" }}>{musical.titulo}</p>
          {metaExtra
            ? metaExtra
            : (!esconderDirecao && <p style={{ fontSize: "12px", color: "#888", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{musical.direcao || "—"}</p>)}
        </div>
      </a>
      {modalMobile}
      {dropdownRelativo}
    </div>
  )
}
