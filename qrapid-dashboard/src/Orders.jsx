import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { backendDb } from './firebase-config';
import './Orders.css';

const Orders = () => {
  const [view, setView] = useState('Table Service');
  const [searchTerm, setSearchTerm] = useState('');
  const [tableServiceOrders, setTableServiceOrders] = useState([]);
  const [parcelOrders, setParcelOrders] = useState([]);

  useEffect(() => {
    const q = query(collection(backendDb, 'orders'));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const tableOrders = [];
      const parcelOrders = [];

      querySnapshot.forEach((doc) => {
        const order = doc.data();
        if (order.type === 'table') {
          tableOrders.push(order);
        } else if (order.type === 'parcel') {
          parcelOrders.push(order);
        }
      });

      setTableServiceOrders(tableOrders);
      setParcelOrders(parcelOrders);
    });

    return () => unsubscribe();
  }, []);

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };

  const orders = view === 'Table Service' ? tableServiceOrders : parcelOrders;
  const filteredOrders = orders.filter(order =>
    order.id.toString().includes(searchTerm) ||
    order.table.toString().includes(searchTerm) ||
    order.status.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="order-container">
      <div className="sidebar">
        <div className={`sidebar-item ${view === 'Table Service' ? 'active' : ''}`} onClick={() => setView('Table Service')}>
          Table Service
        </div>
        <div className={`sidebar-item ${view === 'Parcel' ? 'active' : ''}`} onClick={() => setView('Parcel')}>
          Parcel
        </div>
      </div>
      <div className="main-content">
        <h1>Order History</h1>
        <div className="search-bar">
          <input
            type="text"
            placeholder="Search for orders"
            value={searchTerm}
            onChange={handleSearch}
          />
        </div>
        <div className="status-filters">
          <button>All</button>
          <button>Open</button>
          <button>In Progress</button>
          <button>Ready</button>
          <button>Served</button>
          <button>Cancelled</button>
        </div>
        <table className="order-table">
          <thead>
            <tr>
              <th>Order</th>
              <th>{view === 'Table Service' ? 'Table' : 'Parcel'}</th>
              <th>Status</th>
              <th>Time</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.map(order => (
              <tr key={order.id}>
                <td>#{order.id}</td>
                <td>{order.table}</td>
                <td className={`status ${order.status.replace(' ', '-').toLowerCase()}`}>{order.status}</td>
                <td>{order.time}</td>
                <td><button className="details-button">Details</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Orders;
