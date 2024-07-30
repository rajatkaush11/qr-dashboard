import React, { useState } from 'react';
import './Order.css';

const Order = () => {
  const [view, setView] = useState('Table Service');
  const [searchTerm, setSearchTerm] = useState('');

  const tableServiceOrders = [
    { id: 345, table: 1, status: 'In Progress', time: '12:45 PM' },
    { id: 346, table: 2, status: 'Open', time: '12:50 PM' },
    { id: 347, table: 3, status: 'In Progress', time: '12:55 PM' },
    { id: 348, table: 4, status: 'Ready', time: '01:00 PM' },
    { id: 349, table: 5, status: 'Served', time: '01:05 PM' },
    { id: 350, table: 6, status: 'Cancelled', time: '01:10 PM' },
    { id: 351, table: 7, status: 'Open', time: '01:15 PM' },
  ];

  const parcelOrders = [
    { id: 401, table: 'Parcel 1', status: 'In Progress', time: '02:00 PM' },
    { id: 402, table: 'Parcel 2', status: 'Open', time: '02:15 PM' },
    { id: 403, table: 'Parcel 3', status: 'Ready', time: '02:30 PM' },
    { id: 404, table: 'Parcel 4', status: 'Served', time: '02:45 PM' },
    { id: 405, table: 'Parcel 5', status: 'Cancelled', time: '03:00 PM' },
  ];

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

export default Order;
