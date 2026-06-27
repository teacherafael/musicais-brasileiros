import { BrowserRouter, Routes, Route } from "react-router-dom"
import Header from "./components/Header"
import Footer from "./components/Footer"
import Home from "./pages/Home"
import Musical from "./pages/Musical"
import Perfil from "./pages/Perfil"
import Sugestao from "./pages/Sugestao";
import Contribuir from "./pages/Contribuir";
import Admin from "./pages/Admin"
import NotFound from "./pages/NotFound"
import Ranking from "./pages/Ranking"
import Termos from "./pages/Termos"
import Sobre from "./pages/Sobre"
import Pessoa from "./pages/Pessoa"
import Teatro from "./pages/Teatro"
import Mensagens from "./pages/Mensagens"
import Conversa from "./pages/Conversa"
import { useState, useEffect } from "react"
import NProgress from "nprogress"
import "nprogress/nprogress.css"
import { useLocation } from "react-router-dom"

function VoltarAoTopo() {
  const [visivel, setVisivel] = useState(false)

  useEffect(() => {
    const onScroll = () => setVisivel(window.scrollY > 300)
    window.addEventListener("scroll", onScroll)
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  if (!visivel) return null

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      style={{
        position: "fixed", bottom: "24px", right: "24px",
        background: "#1a1a1a", color: "#F5C518", border: "none",
        borderRadius: "50%", width: "44px", height: "44px",
        fontSize: "20px", cursor: "pointer", zIndex: 999,
        boxShadow: "0 4px 12px rgba(0,0,0,0.2)"
      }}
    >
      ↑
    </button>
  )
}

function BarraProgresso() {
  const location = useLocation()

  useEffect(() => {
    NProgress.configure({ color: "#F5C518", showSpinner: false })
    NProgress.start()
    const timer = setTimeout(() => NProgress.done(), 300)
    return () => clearTimeout(timer)
  }, [location])

  return null
}

function ScrollToTop() {
  const location = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [location.pathname])
  return null
}

function App() {
  return (
    <BrowserRouter>
      <Header />
      <ScrollToTop />
      <BarraProgresso />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/musical/:id" element={<Musical />} />
        <Route path="/perfil/:userId" element={<Perfil />} />
        <Route path="/sugestao" element={<Sugestao />} />
        <Route path="/sugestao" element={<Sugestao />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/ranking" element={<Ranking />} />
        <Route path="/termos" element={<Termos />} />
        <Route path="/sobre" element={<Sobre />} />
        <Route path="*" element={<NotFound />} />
        <Route path="/pessoa/:nome" element={<Pessoa />} />
        <Route path="/teatro/:id" element={<Teatro />} />
        <Route path="/mensagens" element={<Mensagens />} />
        <Route path="/mensagens/:conversaId" element={<Conversa />} />
      </Routes>
      <VoltarAoTopo />
      <Footer />
    </BrowserRouter>
  )
}

export default App
