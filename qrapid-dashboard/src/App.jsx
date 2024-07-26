import React, { Suspense, lazy, useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import './App.css';

// Lazy loading components
const Navbar = lazy(() => import('./Navbar'));
const TableOverview = lazy(() => import('./TableOverview'));
const TableDetails = lazy(() => import('./TableDetails'));
const Menu = lazy(() => import('./Menu'));
const ItemList = lazy(() => import('./ItemList'));
const RestaurantDetails = lazy(() => import('./RestaurantDetails'));
const LoginPage = lazy(() => import('./LoginPage'));

function Home() {
  return (
    <div className="card">
      <p>Edit <code>src/App.jsx</code> and save to test HMR</p>
    </div>
  );
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [tables, setTables] = useState(Array.from({ length: 15 }, (_, index) => `T${index + 1}`));
  const [selectedTable, setSelectedTable] = useState(null);
  const [tableColors, setTableColors] = useState(Array(15).fill('blank'));
  const [restaurantName, setRestaurantName] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      setIsAuthenticated(true);
    }
  }, []);

  const handleLogin = (token) => {
    localStorage.setItem('token', token);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsAuthenticated(false);
  };

  const handleSelectTable = (tableId) => {
    setSelectedTable(tableId);
  };

  const updateTableColor = (tableId, color) => {
    const index = tables.findIndex(t => t === tableId);
    const newColors = [...tableColors];
    newColors[index] = color;
    setTableColors(newColors);
  };

  const handleGenerateKOT = (tableId) => {
    updateTableColor(tableId, 'running-kot');
  };

  const handleGenerateBill = (tableId) => {
    updateTableColor(tableId, 'printed');
  };

  const handleCompleteOrder = (tableId) => {
    updateTableColor(tableId, 'paid');
    setTimeout(() => {
      updateTableColor(tableId, 'blank');
    }, 6000);
  };

  return (
    <Router>
      <Suspense fallback={<div>Loading...</div>}>
        <Navbar isAuthenticated={isAuthenticated} onLogout={handleLogout} />
        <div className="app-content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<LoginPage onLogin={handleLogin} />} />
            <Route path="/register" element={<RestaurantDetails />} />
            <Route path="/menu" element={<Menu />} />
            <Route path="/table/:tableId" element={
              <TableDetails
                onGenerateKOT={handleGenerateKOT}
                onGenerateBill={handleGenerateBill}
                onCompleteOrder={handleCompleteOrder}
              />
            } />
            <Route path="/category/:categoryId/items" element={<ItemList />} />
            <Route path="/table-overview" element={
              <TableOverview
                tables={tables}
                onSelectTable={handleSelectTable}
                tableColors={tableColors}
                onLogout={handleLogout}
              />
            } />
          </Routes>
        </div>
      </Suspense>
    </Router>
  );
}

export default App;
