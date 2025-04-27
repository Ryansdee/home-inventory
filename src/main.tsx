import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { NavBar, Button } from 'antd-mobile';
import { useNavigate } from 'react-router-dom';
import InventoryPage from './App';
import ShoppingListPage from './ShoppingListPage';
import './index.css';
import * as serviceWorkerRegistration from './serviceWorkerRegistration';

// Le composant App avec le routage
const AppWithRouting = () => {
  const navigate = useNavigate();

  return (
    <div className="app">
      <NavBar back={null} style={{ textAlign: 'center' }}>
        Gestion de l'inventaire
      </NavBar>

      <div style={{ padding: '16px' }}>
        <Button
          block
          color="primary"
          size="large"
          style={{ marginBottom: '8px' }}
          onClick={() => navigate('/')}
        >
          Inventaire
        </Button>

        <Button
          block
          color="primary"
          size="large"
          style={{ marginBottom: '8px' }}
          onClick={() => navigate('/shopping-list')}
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
  );
};

// Rendu de l'application avec le service worker
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Router>
      <AppWithRouting />
    </Router>
  </React.StrictMode>
);

serviceWorkerRegistration.register();
