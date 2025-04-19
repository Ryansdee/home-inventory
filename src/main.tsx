import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter as Router, Route, Routes, Link } from 'react-router-dom'
import InventoryPage from './App'
import ShoppingListPage from './ShoppingListPage'
import './index.css'
import * as serviceWorkerRegistration from './serviceWorkerRegistration'

// Le composant App reste inchangé et contiendra la logique de routage
const AppWithRouting = () => {
  return (
    <Router>
      <div className="app">
        <header>
          <nav>
            <Link to="/" className="btn">Inventaire</Link> 
            <span> | </span>
            <Link to="/shopping-list" className="btn">Liste de Courses</Link>
          </nav>
        </header>

        <Routes>
          <Route path="/" element={<InventoryPage />} />
          <Route path="/shopping-list" element={<ShoppingListPage />} />
        </Routes>
      </div>
    </Router>
  )
}

// Rendu de l'application avec le service worker
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppWithRouting />
  </React.StrictMode>
)

serviceWorkerRegistration.register();
