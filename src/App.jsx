import { BrowserRouter, Routes, Route } from "react-router-dom"
import Header from "./components/Header"
import Home from "./pages/Home"
import Musical from "./pages/Musical"
import Perfil from "./pages/Perfil"

function App() {
  return (
    <BrowserRouter>
      <Header />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/musical/:id" element={<Musical />} />
        <Route path="/perfil/:userId" element={<Perfil />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App