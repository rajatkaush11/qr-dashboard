import React, { useEffect, useState } from 'react';
import { backendDb, db, auth } from './firebase-config';
import { collection, query, where, onSnapshot, orderBy, getDocs, writeBatch, doc } from 'firebase/firestore';
import './TableDetails.css';

const TableDetails = ({ tableNumber, onBackClick, updateTableColor }) => {
  const [orders, setOrders] = useState([]);
  const [restaurant, setRestaurant] = useState({ name: 'QRapid', address: '', contact: '' });
  const [completedOrderIds, setCompletedOrderIds] = useState([]);
  const [orderFetched, setOrderFetched] = useState(false);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [items, setItems] = useState([]);

  useEffect(() => {
    const fetchCategories = async () => {
      const userId = auth.currentUser ? auth.currentUser.uid : null;
      const categoriesRef = collection(db, 'restaurants', userId, 'categories');
      const querySnapshot = await getDocs(categoriesRef);
      const categoriesData = querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
      setCategories(categoriesData);
    };

    fetchCategories();
  }, []);

  useEffect(() => {
    const fetchItems = async () => {
      if (selectedCategory) {
        const userId = auth.currentUser ? auth.currentUser.uid : null;
        const itemsRef = collection(db, 'restaurants', userId, 'categories', selectedCategory.id, 'items');
        const querySnapshot = await getDocs(itemsRef);
        const itemsData = querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
        setItems(itemsData);
      }
    };

    fetchItems();
  }, [selectedCategory]);

  useEffect(() => {
    const normalizedTableNumber = tableNumber.startsWith('T') ? tableNumber.slice(1) : tableNumber;
    console.log(`Querying for table number: ${normalizedTableNumber}`);

    const q = query(
      collection(backendDb, 'orders'),
      where('tableNo', '==', normalizedTableNumber),
      orderBy('createdAt', 'desc')
    );

    const fetchCompletedOrderIds = async () => {
      const q = query(collection(db, 'bills'));
      const querySnapshot = await getDocs(q);
      const ids = querySnapshot.docs.map(doc => doc.data().orderId);
      setCompletedOrderIds(ids);
    };

    fetchCompletedOrderIds();
  }, [tableNumber, updateTableColor, orderFetched]);

  const printContent = async (orders, isKOT) => {
    if ('serial' in navigator) {
      try {
        const port = await navigator.serial.requestPort();
        await port.open({ baudRate: 9600 });

        const writer = port.writable.getWriter();
        const encoder = new TextEncoder();
        let content = '';

        content += `\x1b\x21\x30`;
        content += `*** ${restaurant.name.toUpperCase()} ***\n`;
        content += `${restaurant.address}\nContact: ${restaurant.contact}\n\n`;
        content += `\x1b\x21\x00`;
        content += `Date: ${new Date().toLocaleDateString()}    Time: ${new Date().toLocaleTimeString()}\n`;
        content += `Table No: ${tableNumber}\n\n`;

        if (isKOT) {
          orders.forEach(order => {
            order.items.forEach(item => {
              content += `${item.name} (${item.specialNote || ''}) - ${item.quantity}\n`;
            });
          });
          const totalItems = orders.reduce((sum, order) => sum + order.items.reduce((itemSum, item) => itemSum + item.quantity, 0), 0);
          content += `Total Items to Prepare: ${totalItems}\n\n`;
        } else {
          let totalAmount = 0;
          orders.forEach(order => {
            order.items.forEach(item => {
              const itemTotal = item.price * item.quantity;
              totalAmount += itemTotal;
              content += `${item.name} - ${item.quantity} x ${item.price} = ${itemTotal}\n`;
            });
          });
          const discount = orders.reduce((sum, order) => sum + (order.discount || 0), 0);
          const cgst = totalAmount * 0.025;
          const sgst = totalAmount * 0.025;
          const grandTotal = totalAmount - discount + cgst + sgst;
          content += `Sub Total: ${totalAmount}\n`;
          content += `Discount: -${discount}\n`;
          content += `CGST: +${cgst}\n`;
          content += `SGST: +${sgst}\n`;
          content += `Grand Total: ${grandTotal}\n\n`;
          content += 'Thank you for dining with us!\n';
          content += '--------------------------------\n';
        }

        await writer.write(encoder.encode(content));
        writer.releaseLock();
        await port.close();
        console.log(isKOT ? 'KOT printed successfully' : 'Bill printed successfully');
      } catch (error) {
        console.error("Failed to print content via serial:", error);
      }
    } else {
      console.error("Web Serial API not supported.");
    }
  };

  const handleGenerateKOT = async () => {
    const filteredOrders = orders.filter(order => !completedOrderIds.includes(order.id));
    if (filteredOrders.length === 0) return;
    await printContent(filteredOrders, true);
    await updateTableColor(tableNumber, 'orange');
    await updateOrderStatus(filteredOrders, 'KOT');
  };

  const handleGenerateBill = async () => {
    const filteredOrders = orders.filter(order => !completedOrderIds.includes(order.id));
    if (filteredOrders.length === 0) return;
    await printContent(filteredOrders, false);
    await updateTableColor(tableNumber, 'green');
    await updateOrderStatus(filteredOrders, 'billed');
  };

  const handleCompleteOrder = async () => {
    const filteredOrders = orders.filter(order => !completedOrderIds.includes(order.id));
    const batch = writeBatch(db);

    filteredOrders.forEach(order => {
      const billRef = doc(collection(db, 'bills'));
      batch.set(billRef, { orderId: order.id, ...order });
    });

    await batch.commit();
    await updateOrderStatus(filteredOrders, 'completed');

    setCompletedOrderIds([...completedOrderIds, ...filteredOrders.map(order => order.id)]);
    setOrders(prevOrders => prevOrders.filter(order => !filteredOrders.map(o => o.id).includes(order.id)));
    await updateTableColor(tableNumber, 'blank');
    setOrderFetched(false); // Reset orderFetched to false to listen for new orders
  };

  const updateOrderStatus = async (orders, status) => {
    const batch = writeBatch(backendDb);
    orders.forEach(order => {
      const orderRef = doc(backendDb, 'orders', order.id);
      batch.update(orderRef, { status });
    });
    await batch.commit();
  };

  return (
    <div className="table-details">
      <div className="left-menu">
        <button className="back-button" onClick={onBackClick}>Back</button>
        <div className="menu-category">MENU</div>
        {categories.map((category) => (
          <div
            key={category.id}
            className={`menu-category ${selectedCategory && selectedCategory.id === category.id ? 'active' : ''}`}
            onClick={() => setSelectedCategory(category)}
          >
            {category.name}
          </div>
        ))}
      </div>
      <div className="middle-content">
        <div className="table-title">Table {tableNumber}</div>
        <div className="kot-generated">
          <h3>KOT Generated</h3>
          {orders.filter(order => order.status === 'KOT').map((order, orderIndex) => (
            <div className="order-item" key={orderIndex}>
              <p><strong>Name:</strong> {order.name}</p>
              <p><strong>Items:</strong></p>
              <ul>
                {order.items && order.items.map((item, index) => (
                  <li key={index}>{item.name} - {item.price} x {item.quantity}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="current-orders">
          <h3>Current Orders</h3>
          {orders.length === 0 ? (
            <p>No current orders.</p>
          ) : (
            orders
              .filter(order => order.status !== 'completed' && order.status !== 'KOT')
              .map((order, orderIndex) => (
                <div className="order-item" key={orderIndex}>
                  <p><strong>Name:</strong> {order.name}</p>
                  <p><strong>Items:</strong></p>
                  <ul>
                    {order.items && order.items.map((item, index) => (
                      <li key={index}>{item.name} - {item.price} x {item.quantity}</li>
                    ))}
                  </ul>
                </div>
              ))
          )}
        </div>
        <div className="action-buttons">
          <button onClick={() => handleGenerateKOT()} className="action-button generate-kot">Generate KOT</button>
          <button onClick={() => handleGenerateBill()} className="action-button generate-bill">Generate Bill</button>
          <button onClick={() => handleCompleteOrder()} className="action-button complete">Complete Order</button>
        </div>
      </div>
      <div className="right-content">
        <div className="item-list">
          <div className="items">
            <h3>{selectedCategory ? `${selectedCategory.name} Items` : 'Items'}</h3>
            <div className="item-grid">
              {items.length === 0 ? (
                <p>Select a category to view items</p>
              ) : (
                items.map((item) => (
                  <div key={item.id} className="menu-item">
                    <p>{item.name}</p>
                    <p>{item.price}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TableDetails;
