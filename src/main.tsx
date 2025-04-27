import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter as Router, Route, Routes, Link } from 'react-router-dom';
import { NavBar, Button } from 'antd-mobile'; // Import des composants Antd Mobile
import InventoryPage from './App';
import ShoppingListPage from './ShoppingListPage';
import './index.css';
import * as serviceWorkerRegistration from './serviceWorkerRegistration';

// Le composant App avec le routage
const AppWithRouting = () => {
  return (
    <Router>
      <div className="app">
        {/* Barre de navigation mobile-friendly */}
        <NavBar back={null} style={{ textAlign: 'center' }}>
          Gestion de l'inventaire
        </NavBar>

        <div style={{ padding: '16px' }}>
          {/* Liens de navigation avec des boutons Antd Mobile */}
          <Button 
            component={Link} 
            to="/" 
            block 
            color="primary" 
            size="large" 
            style={{ marginBottom: '8px' }}
          >
            Inventaire
          </Button>
          <Button 
            component={Link} 
            to="/shopping-list" 
            block 
            color="primary" 
            size="large" 
            style={{ marginBottom: '8px' }}
          >
            Liste de Courses
          </Button>
        </div>

        {/* Définition des routes */}
        <Routes>
          <Route path="/" element={<InventoryPage />} />
          <Route path="/shopping-list" element={<ShoppingListPage />} />
        </Routes>
      </div>
    </Router>
  );
};

// Rendu de l'application avec le service worker
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppWithRouting />
  </React.StrictMode>
);

serviceWorkerRegistration.register();
