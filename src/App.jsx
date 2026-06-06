import { BrowserRouter, Routes, Route } from "react-router-dom"
import Header from "./components/Header"
import Home from "./pages/Home"
import Musical from "./pages/Musical"
import Perfil from "./pages/Perfil"
import Sugestao from "./pages/Sugestao"
import Admin from "./pages/Admin"
import NotFound from "./pages/NotFound"

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
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App