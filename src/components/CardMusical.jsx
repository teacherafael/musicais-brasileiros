import { useEffect, useState } from "react"

// CardMusical compartilhado entre Home e Perfil.
// Mostra a barra de Já vi / Quero ver / + Listas no hover (desktop) e no toque (mobile),
// para qualquer usuário logado, em qualquer página.
//
// Props de dados (vêm da página, via cardProps):
//   usuario, jaViSet, queroVerSet, listas, musicaisNasListas
//   onToggleJaVi, onToggleQueroVer, onAbrirDropdown, onToggleNaLista, onCriarLista
// Props por card:
//   musical            -> objeto do musical (precisa de id, titulo, capa, direcao)
//   tamanho            -> "pequeno" (carrossel) ou undefined (grid grande)
//   dropdownAberto     -> bool, se o dropdown de listas deste card está aberto
//   metaExtra          -> (opcional) JSX renderizado abaixo do título (ex.: nota, direção)
//   esconderDirecao    -> (opcional) não mostra a linha de direção padrão do card grande
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
  const emAlgumaLista = (musicaisNasListas[musical.id]?.size || 0) > 0

  useEffect(() => {
    if (!dropdownAberto) { setCriandoLista(false); setNovaListaNome("") }
  }, [dropdownAberto])

  const pequeno = tamanho === "pequeno"

  const dropdownListas = dropdownAberto && (
    <div
      data-listas-dropdown
      style={{
        position: "absolute",
        ...(pequeno
          ? { top: "calc(100% + 6px)", left: "0" }
          : { top: "calc(100% + 6px)", left: "0", right: "0" }),
        background: "#fff", border: "1px solid #e8e8e4", borderRadius: "10px",
        boxShadow: "0 8px 24px rgba(0,0,0,0.12)", zIndex: 200, padding: "8px 0", minWidth: "180px"
      }}
    >
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
            style={{ display: "flex", alignItems: "center", gap: "10px", padding: "9px 14px", cursor: "pointer", background: marcado ? "#fffbe6" : "transparent", WebkitTapHighlightColor: "transparent" }}
            onMouseEnter={e => e.currentTarget.style.background = marcado ? "#fff8d6" : "#f9f9f9"}
            onMouseLeave={e => e.currentTarget.style.background = marcado ? "#fffbe6" : "transparent"}
          >
            <span style={{ width: "16px", height: "16px", border: "2px solid", borderColor: marcado ? "#F5C518" : "#ccc", borderRadius: "4px", background: marcado ? "#F5C518" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: "10px", color: "#1a1a1a" }}>
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
              style={{ background: "#F5C518", border: "none", borderRadius: "6px", padding: "5px 10px", fontFamily: "'DM Sans', sans-serif", fontSize: "12px", fontWeight: "600", cursor: "pointer", color: "#1a1a1a" }}>
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
        data-btn-listas={musical.id}
        onClick={e => onAbrirDropdown(e, musical.id)}
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
              ? <img src={musical.capa} alt={musical.titulo} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#1a1a1a", color: "#F5C518", fontSize: "12px", padding: "8px", textAlign: "center" }}>{musical.titulo}</div>}
            {barraBotoes}
          </div>
          <div style={{ width: "100%" }}>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: "600", fontSize: "13px", margin: "0 0 4px", lineHeight: "1.3" }}>{musical.titulo}</p>
            {metaExtra}
          </div>
        </a>
        {dropdownListas}
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
            ? <img src={musical.capa} alt={musical.titulo} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
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

      {dropdownListas}
    </div>
  )
}
