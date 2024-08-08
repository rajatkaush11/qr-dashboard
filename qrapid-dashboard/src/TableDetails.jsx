import React, { useEffect, useState } from 'react';
import { collection, query, where, orderBy, getDocs, writeBatch, doc, setDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { backendDb, db, auth } from './firebase-config';
import './TableDetails.css';
import successSound from './assets/success.mp3';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrash } from '@fortawesome/free-solid-svg-icons';

const TableDetails = ({ tableNumber, onBackClick, updateTableColor }) => {
  const [orders, setOrders] = useState([]);
  const [currentOrder, setCurrentOrder] = useState([]);
  const [restaurant, setRestaurant] = useState({ name: 'QRapid', address: '', contact: '' });
  const [completedOrderIds, setCompletedOrderIds] = useState([]);
  const [orderFetched, setOrderFetched] = useState(false);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [items, setItems] = useState([]);
  const [temporaryOrders, setTemporaryOrders] = useState([]);
  const [kotTime, setKotTime] = useState('');

  const playSound = () => {
    const audio = new Audio(successSound);
    audio.play().catch(error => console.error('Error playing sound:', error));
  };

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
    const q = query(
      collection(backendDb, 'orders'),
      where('tableNo', '==', normalizedTableNumber),
      where('status', 'in', ['pending', 'KOT']),
      orderBy('createdAt', 'desc')
    );

    const unsubscribeOrders = onSnapshot(q, (querySnapshot) => {
      const ordersData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setOrders(ordersData);
      setOrderFetched(true);
    });

    const fetchTemporaryOrders = async () => {
      const tempOrdersRef = collection(backendDb, 'manual-orders');
      const tempOrdersSnapshot = await getDocs(tempOrdersRef);
      const tempOrdersData = tempOrdersSnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(order => order.tableNo === normalizedTableNumber && order.status !== 'deleted');
      setTemporaryOrders(tempOrdersData);
    };

    const fetchCompletedOrderIds = async () => {
      const q = query(collection(db, 'bills'));
      const querySnapshot = await getDocs(q);
      const ids = querySnapshot.docs.map(doc => doc.data().orderId);
      setCompletedOrderIds(ids);
    };

    fetchTemporaryOrders();
    fetchCompletedOrderIds();

    return () => unsubscribeOrders();
  }, [tableNumber, updateTableColor, orderFetched]);

  useEffect(() => {
    const kotOrders = [...orders, ...temporaryOrders].filter(order => order.status === 'KOT');
    if (kotOrders.length > 0) {
      updateTableColor(tableNumber, 'running-kot');
      if (!kotTime) {
        // Set KOT time in IST if not already set
        const now = new Date();
        const istTime = new Date(now.getTime() + 5.5 * 60 * 60 * 1000).toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
          timeZone: 'Asia/Kolkata',
        });
        setKotTime(istTime);
      }
    } else {
      updateTableColor(tableNumber, 'blank');
      setKotTime('');
    }
  }, [orders, temporaryOrders, tableNumber, updateTableColor, kotTime]);

  const connectBluetoothPrinter = async () => {
    try {
      const device = await navigator.bluetooth.requestDevice({
        filters: [{ services: ['battery_service'] }]
      });
      const server = await device.gatt.connect();
      const service = await server.getPrimaryService('battery_service');
      const characteristic = await service.getCharacteristic('battery_level');
      return characteristic;
    } catch (error) {
      console.error('Error connecting to Bluetooth device:', error);
      throw error;
    }
  };

  const printContent = async (orders, isKOT) => {
    try {
      if (orders.length === 0) {
        alert('No items to print');
        return;
      }
      const characteristic = await connectBluetoothPrinter();
      let content = '';
      content += '\x1b\x21\x30';
      content += `*** ${restaurant.name.toUpperCase()} ***\n`;
      content += `${restaurant.address}\nContact: ${restaurant.contact}\n\n`;
      content += '\x1b\x21\x00';
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

      const encoder = new TextEncoder();
      const encodedContent = encoder.encode(content);
      await characteristic.writeValue(encodedContent);
      console.log(isKOT ? 'KOT printed successfully' : 'Bill printed successfully');
    } catch (error) {
      console.error('Failed to print content via Bluetooth:', error);
    }
  };

  const handleGenerateKOT = async () => {
    if (currentOrder.length === 0) {
      const kotOrders = temporaryOrders.filter(order => order.status === 'KOT');
      if (kotOrders.length === 0) {
        alert('No items to print');
        return;
      }
      await printContent(kotOrders, true);
      return;
    }

    // Get the current time in IST
    const now = new Date();
    const istTime = new Date(now.getTime() + 5.5 * 60 * 60 * 1000).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Kolkata',
    });

    // Temporarily store current order as a new order
    const newOrder = {
      id: `temp-${Date.now()}`, // Generate a temporary unique ID
      tableNo: tableNumber.slice(1),
      items: currentOrder,
      status: 'KOT',
      createdAt: now,
      istTime,
      name: 'Temporary Order'
    };
    await setDoc(doc(collection(backendDb, 'manual-orders'), newOrder.id), newOrder);
    setTemporaryOrders(prev => [...prev, newOrder]);
    setOrders([...orders, newOrder]);
    setCurrentOrder([]);
    setKotTime(istTime); // Set KOT time in IST

    await printContent([...temporaryOrders, newOrder], true);
    updateTableColor(tableNumber, 'running-kot');
    await updateOrderStatus([...temporaryOrders, newOrder], 'KOT');
    setOrders(prevOrders =>
      prevOrders.map(order =>
        [...temporaryOrders, newOrder].some(updatedOrder => updatedOrder.id === order.id)
          ? { ...order, status: 'KOT' }
          : order
      )
    );
  };

  const handleGenerateBill = async () => {
    const filteredOrders = orders.filter(order => order.status === 'KOT');
    if (filteredOrders.length === 0) return;
    await printContent(filteredOrders, false);
    updateTableColor(tableNumber, 'green');
    await updateOrderStatus(filteredOrders, 'billed');
  };

  const handleCompleteOrder = async () => {
    const filteredOrders = orders.filter(order => order.status === 'billed');
    const batch = writeBatch(db);
    filteredOrders.forEach(order => {
      const billRef = doc(collection(db, 'bills'));
      batch.set(billRef, { orderId: order.id, ...order });
    });
    await batch.commit();
    await updateOrderStatus(filteredOrders, 'completed');
    setCompletedOrderIds([...completedOrderIds, ...filteredOrders.map(order => order.id)]);
    setOrders(prevOrders => prevOrders.filter(order => !filteredOrders.map(o => o.id).includes(order.id)));
    updateTableColor(tableNumber, 'blank');
    setOrderFetched(false);

    const tempOrderIds = filteredOrders.filter(order => order.id.startsWith('temp-')).map(order => order.id);
    const batchDelete = writeBatch(backendDb);
    tempOrderIds.forEach(id => {
      batchDelete.delete(doc(backendDb, 'manual-orders', id));
    });
    await batchDelete.commit();
    setTemporaryOrders(prev => prev.filter(order => !tempOrderIds.includes(order.id)));
  };

  const updateOrderStatus = async (orders, status) => {
    const batch = writeBatch(backendDb);
    orders.forEach(order => {
      const orderRef = doc(backendDb, 'orders', order.id);
      batch.update(orderRef, { status });
    });
    await batch.commit();
  };

  const handleItemClick = (item) => {
    setCurrentOrder((prevOrder) => {
      const existingItem = prevOrder.find((orderItem) => orderItem.id === item.id);
      if (existingItem) {
        return prevOrder.map((orderItem) =>
          orderItem.id === item.id ? { ...orderItem, quantity: orderItem.quantity + 1 } : orderItem
        );
      }
      playSound();
      return [...prevOrder, { ...item, quantity: 1 }];
    });
  };

  const handleIncrement = (itemId) => {
    setCurrentOrder((prevOrder) =>
      prevOrder.map((orderItem) =>
        orderItem.id === itemId ? { ...orderItem, quantity: orderItem.quantity + 1 } : orderItem
      )
    );
  };

  const handleDecrement = (itemId) => {
    setCurrentOrder((prevOrder) =>
      prevOrder
        .map((orderItem) =>
          orderItem.id === itemId ? { ...orderItem, quantity: orderItem.quantity - 1 } : orderItem
        )
        .filter((orderItem) => orderItem.quantity > 0)
    );
  };

  const handleDelete = async (itemId) => {
    const itemToDelete = currentOrder.find(orderItem => orderItem.id === itemId);
    if (itemToDelete) {
      const reason = prompt('Please provide a reason for deleting this item:');
      if (reason) {
        setCurrentOrder((prevOrder) => prevOrder.filter((orderItem) => orderItem.id !== itemId));
      }
    } else {
      const reason = prompt('Please provide a reason for deleting this order:');
      if (reason) {
        await updateDoc(doc(backendDb, 'manual-orders', itemId), { status: 'deleted', deleteReason: reason });
        setTemporaryOrders((prevOrders) => prevOrders.filter(order => order.id !== itemId));
        setOrders(prevOrders => prevOrders.filter(order => order.id !== itemId));
      }
    }
  };

  return (
    <div className="table-details">
      <div className="right-content">
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
          <h3>KOT Generated <span>{kotTime}</span></h3>
          {[...orders, ...temporaryOrders].filter(order => order.status === 'KOT').map((order, orderIndex) => (
            <div className="order-item" key={orderIndex}>
              <FontAwesomeIcon icon={faTrash} className="delete-button" onClick={() => handleDelete(order.id)} />
              <p><strong>{order.name}</strong></p>
              <p>{order.items.map(item => `${item.quantity} x ${item.name}`).join(', ')}</p>
              <p><strong>{order.items.reduce((total, item) => total + item.price * item.quantity, 0).toFixed(2)}</strong></p>
            </div>
          ))}
        </div>
        <div className="current-orders">
          <h3>Current Orders</h3>
          {orders.length === 0 ? (
            <p>No digital orders.</p>
          ) : (
            orders
              .filter(order => order.status !== 'completed' && order.status !== 'KOT' && order.status !== 'billed')
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
          {currentOrder.length === 0 ? (
            <p>No items in current order.</p>
          ) : (
            currentOrder.map((item, index) => (
              <div className="current-order-item" key={index}>
                <div className="order-text">
                  <p>{item.name}</p>
                  <p>{item.price * item.quantity}</p>
                </div>
                <div className="order-actions">
                  <button className="action-button decrement" onClick={() => handleDecrement(item.id)}>-</button>
                  <span>{item.quantity}</span>
                  <button className="action-button increment" onClick={() => handleIncrement(item.id)}>+</button>
                  <button className="action-button delete" onClick={() => handleDelete(item.id)}>
                    <FontAwesomeIcon icon={faTrash} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
        <div className="action-buttons">
          <button onClick={handleGenerateKOT} className="action-button generate-kot">Generate KOT</button>
          <button onClick={handleGenerateBill} className="action-button generate-bill">Generate Bill</button>
          <button onClick={handleCompleteOrder} className="action-button complete">Complete Order</button>
        </div>
      </div>
      <div className="left-menu">
        <div className="item-list">
          <div className="items">
            <h3>{selectedCategory ? `${selectedCategory.name} Items` : 'Items'}</h3>
            <div className="item-grid">
              {items.length === 0 ? (
                <p>Select a category to view items</p>
              ) : (
                items.map((item) => (
                  <div key={item.id} className="menu-item" onClick={() => handleItemClick(item)}>
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
