import React, { useEffect, useState } from 'react';
import { backendDb, db, auth } from './firebase-config';
import { collection, query, where, orderBy, getDocs, writeBatch, doc, setDoc, deleteDoc } from 'firebase/firestore';
import './TableDetails.css';
import successSound from './assets/success.mp3';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrash } from '@fortawesome/free-solid-svg-icons';

const TableDetails = ({ tableNumber, onBackClick, updateTableColor }) => {
  const [orders, setOrders] = useState([]);
  const [currentOrder, setCurrentOrder] = useState([]);
  const [completedOrderIds, setCompletedOrderIds] = useState([]);
  const [orderFetched, setOrderFetched] = useState(false);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [items, setItems] = useState([]);
  const [temporaryOrders, setTemporaryOrders] = useState([]);
  const [kotTime, setKotTime] = useState('');

  // Fetch categories from Firestore
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

  // Fetch items based on selected category from Firestore
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

  // Fetch orders, temporary orders, and completed order IDs from Firestore
  // useEffect(() => {
  //   const normalizedTableNumber = tableNumber.startsWith('T') ? tableNumber.slice(1) : tableNumber;
  //   const q = query(
  //     collection(backendDb, 'orders'),
  //     where('tableNo', '==', normalizedTableNumber),
  //     orderBy('createdAt', 'desc')
  //   );

  //   const fetchOrders = async () => {
  //     const querySnapshot = await getDocs(q);
  //     const ordersData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  //     setOrders(ordersData);
  //     setOrderFetched(true);
  //   };

  //   const fetchTemporaryOrders = async () => {
  //     const tempOrdersRef = collection(backendDb, 'manual-orders');
  //     const tempOrdersSnapshot = await getDocs(tempOrdersRef);
  //     const tempOrdersData = tempOrdersSnapshot.docs
  //       .map(doc => ({ id: doc.id, ...doc.data() }))
  //       .filter(order => order.tableNo === normalizedTableNumber);
  //     setTemporaryOrders(tempOrdersData);
  //   };

  //   const fetchCompletedOrderIds = async () => {
  //     const q = query(collection(db, 'bills'));
  //     const querySnapshot = await getDocs(q);
  //     const ids = querySnapshot.docs.map(doc => doc.data().orderId);
  //     setCompletedOrderIds(ids);
  //   };

  //   fetchOrders();
  //   fetchTemporaryOrders();
  //   fetchCompletedOrderIds();
  // }, [tableNumber, updateTableColor, orderFetched]);

  // Manage KOT timing and table color updates based on order status
  useEffect(() => {
    const kotOrders = [...orders, ...temporaryOrders].filter(order => order.status === 'KOT');
    if (kotOrders.length > 0) {
      updateTableColor(tableNumber, 'running-kot');
      if (!kotTime) {
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

  // Play sound effect when an item is added to the current order
  const playSound = () => {
    const audio = new Audio(successSound);
    audio.play().catch(error => console.error('Error playing sound:', error));
  };

  // Add item to the current order or increase its quantity if it already exists
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

  // Increment the quantity of an item in the current order
  const handleIncrement = (itemId) => {
    setCurrentOrder((prevOrder) =>
      prevOrder.map((orderItem) =>
        orderItem.id === itemId ? { ...orderItem, quantity: orderItem.quantity + 1 } : orderItem
      )
    );
  };

  // Decrement the quantity of an item in the current order
  const handleDecrement = (itemId) => {
    setCurrentOrder((prevOrder) =>
      prevOrder
        .map((orderItem) =>
          orderItem.id === itemId ? { ...orderItem, quantity: orderItem.quantity - 1 } : orderItem
        )
        .filter((orderItem) => orderItem.quantity > 0)
    );
  };

  // Delete an item from the current order or delete a temporary order
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
        await deleteDoc(doc(collection(backendDb, 'manual-orders'), itemId));
        setTemporaryOrders((prevOrders) => prevOrders.filter(order => order.id !== itemId));
      }
    }
  };

  // Generate KOT and print it using the selected printer
  const handleGenerateKOT = async () => {
    try {
      const printerIp = localStorage.getItem('selectedPrinter');
      const response = await fetch('/printKOT', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tableNumber,
          orderIds: orders.map(order => order.id),
          printerIp
        }),
      });

      const result = await response.json();
      if (result.success) {
        console.log('KOT printed successfully');
        handlePrintKOT(); // Call print function after generating KOT
      } else {
        console.log('Failed to print KOT');
      }
    } catch (error) {
      console.error('Error generating KOT:', error);
    }
  };

  // Generate bill and print it using the selected printer
  const handleGenerateBill = async () => {
    try {
      const printerIp = localStorage.getItem('selectedPrinter');
      const response = await fetch('/printBill', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tableNumber,
          orderIds: orders.map(order => order.id),
          printerIp
        }),
      });

      const result = await response.json();
      if (result.success) {
        console.log('Bill printed successfully');
        handlePrintBill(); // Call print function after generating Bill
      } else {
        console.log('Failed to print bill');
      }
    } catch (error) {
      console.error('Error generating bill:', error);
    }
  };

  // Trigger the print dialog for KOT
  const handlePrintKOT = () => {
    window.print(); // Opens the print dialog for the user to select a printer and print KOT
  };

  // Trigger the print dialog for Bill
  const handlePrintBill = () => {
    window.print(); // Opens the print dialog for the user to select a printer and print Bill
  };

  // Complete the order and update the status in Firestore
  const handleCompleteOrder = async () => {
    try {
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
      setOrderFetched(false);

      const tempOrderIds = filteredOrders.filter(order => order.id.startsWith('temp-')).map(order => order.id);
      const batchDelete = writeBatch(backendDb);
      tempOrderIds.forEach(id => {
        batchDelete.delete(doc(backendDb, 'manual-orders', id));
      });
      await batchDelete.commit();
      setTemporaryOrders(prev => prev.filter(order => !tempOrderIds.includes(order.id)));
      console.log('Order completed successfully');
    } catch (error) {
      console.error('Error completing order:', error);
    }
  };

  // Update the status of orders in Firestore
  const updateOrderStatus = async (orders, status) => {
    const batch = writeBatch(backendDb);
    orders.forEach(order => {
      const orderRef = doc(backendDb, 'orders', order.id);
      batch.update(orderRef, { status });
    });
    await batch.commit();
    console.log(`Order status updated to ${status}`);
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
          <div className="print-area">
            {[...orders, ...temporaryOrders].filter(order => order.status === 'KOT').map((order, orderIndex) => (
              <div className="order-item" key={orderIndex}>
                <FontAwesomeIcon icon={faTrash} className="delete-button" onClick={() => handleDelete(order.id)} />
                <p><strong>{order.name}</strong></p>
                <p>{order.items.map(item => `${item.quantity} x ${item.name}`).join(', ')}</p>
                <p><strong>{order.items.reduce((total, item) => total + item.price * item.quantity, 0).toFixed(2)}</strong></p>
              </div>
            ))}
          </div>
        </div>
        <div className="current-orders">
          <h3>Current Orders</h3>
          {orders.length === 0 ? (
            <p>No digital orders.</p>
          ) : (
            orders.filter(order => order.status !== 'completed' && order.status !== 'KOT').map((order, orderIndex) => (
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
