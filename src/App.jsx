import { BrowserRouter, Routes, Route } from "react-router-dom"
import Header from "./components/Header"
import Footer from "./components/Footer"
import Home from "./pages/Home"
import Musical from "./pages/Musical"
import Perfil from "./pages/Perfil"
import Sugestao from "./pages/Sugestao"
import Admin from "./pages/Admin"
import NotFound from "./pages/NotFound"
import Ranking from "./pages/Ranking"
import Termos from "./pages/Termos"
import Politica from "./pages/Politica"
import Pessoa from "./pages/Pessoa"

function App() {
  return (
    <BrowserRouter>
      <Header />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/musical/:id" element={<Musical />} />
        <Route path="/perfil/:userId" element={<Perfil />} />
        <Route path="/sugestao" element={<Sugestao />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/ranking" element={<Ranking />} />
        <Route path="/termos" element={<Termos />} />
        <Route path="/politica" element={<Politica />} />
        <Route path="*" element={<NotFound />} />
        <Route path="/pessoa/:nome" element={<Pessoa />} />
      </Routes>
      <Footer />
    </BrowserRouter>
  )
}

export default App