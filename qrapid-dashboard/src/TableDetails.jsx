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

  useEffect(() => {
    const ePosDevice = new epson.ePOSDevice();
    ePosDevice.connect('192.168.29.12', epson.ePOSDevice.DEVICE_TYPE_PRINTER, (deviceObj, errorCode) => {
      if (deviceObj) {
        printer = new epson.Printer(deviceObj, epson.Printer.TYPE_TCP, {
          success: () => {
            console.log('Printer connected successfully');
          },
          error: (error) => {
            console.error('Error connecting to printer:', error);
          },
        });
      } else {
        console.error('Failed to connect to the printer:', errorCode);
      }
    });
  }, []);

  const playSound = () => {
    const audio = new Audio(successSound);
    audio.play().catch(error => console.error('Error playing sound:', error));
  };

  useEffect(() => {
    // Fetch categories and items
    // Your existing fetchCategories and fetchItems code
  }, [selectedCategory]);

  useEffect(() => {
    // Fetch orders, temporary orders, and completed order IDs
    // Your existing useEffect to handle fetching
  }, [tableNumber, updateTableColor, orderFetched]);

  useEffect(() => {
    // Update table color based on orders
    // Your existing useEffect to handle table color update
  }, [orders, temporaryOrders, tableNumber, updateTableColor, kotTime]);

  const printKOT = (order) => {
    if (printer) {
      printer.addTextAlign(printer.ALIGN_CENTER);
      printer.addText(`KOT\n`);
      printer.addText(`Table No: ${tableNumber}\n`);
      order.items.forEach(item => {
        printer.addText(`${item.quantity} x ${item.name}\n`);
      });
      printer.addText(`------------------------------\n`);
  
      // Send the print job and handle the response
      printer.sendData({
        success: () => {
          console.log('KOT printed successfully');
          // You can trigger any additional logic here, like updating the UI or sending a notification
          // Optionally, play a success sound or send a notification to the user/admin
        },
        error: (error) => {
          console.error('Error printing KOT:', error);
          // Handle the error accordingly
          // Optionally, send a notification to the user/admin about the failure
        }
      });
    } else {
      console.log('Printer not connected');
    }
  };
  

  const printBill = (order) => {
    if (printer) {
      printer.addTextAlign(printer.ALIGN_CENTER);
      printer.addText(`BILL\n`);
      printer.addText(`Table No: ${tableNumber}\n`);
      let total = 0;
      order.items.forEach(item => {
        printer.addText(`${item.quantity} x ${item.name} - ${item.price * item.quantity}\n`);
        total += item.price * item.quantity;
      });
      printer.addText(`------------------------------\n`);
      printer.addText(`Total: ${total.toFixed(2)}\n`);
      printer.sendData();
    } else {
      console.log('Printer not connected');
    }
  };

  const handleGenerateKOT = async () => {
    try {
      const filteredOrders = orders.filter(order => !completedOrderIds.includes(order.id));
      if (filteredOrders.length === 0 && currentOrder.length === 0) {
        console.log('No orders to generate KOT');
        return;
      }

      if (currentOrder.length > 0) {
        const now = new Date();
        const istTime = new Date(now.getTime() + 5.5 * 60 * 60 * 1000).toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
          timeZone: 'Asia/Kolkata',
        });

        const newOrder = {
          id: `temp-${Date.now()}`,
          tableNo: tableNumber.slice(1),
          items: currentOrder,
          status: 'KOT',
          createdAt: now,
          istTime,
          name: 'Temporary Order',
        };
        await setDoc(doc(collection(backendDb, 'manual-orders'), newOrder.id), newOrder);
        setTemporaryOrders(prev => [...prev, newOrder]);
        filteredOrders.push(newOrder);
        setOrders([...orders, newOrder]);
        setCurrentOrder([]);
        setKotTime(istTime);
        console.log('Temporary order created:', newOrder);
      }

      // Print each order for KOT
      filteredOrders.forEach(order => printKOT(order));
      updateTableColor(tableNumber, 'running-kot');
      await updateOrderStatus(filteredOrders, 'KOT');
      setOrders(prevOrders =>
        prevOrders.map(order =>
          filteredOrders.some(filteredOrder => filteredOrder.id === order.id)
            ? { ...order, status: 'KOT' }
            : order
        )
      );
      console.log('KOT generated and printed successfully');
    } catch (error) {
      console.error('Error generating KOT:', error);
    }
  };

  const handleGenerateBill = async () => {
    try {
      const filteredOrders = orders.filter(order => !completedOrderIds.includes(order.id));
      if (filteredOrders.length === 0) {
        console.log('No orders to generate Bill');
        return;
      }

      // Print each order for Bill
      filteredOrders.forEach(order => printBill(order));
      await updateTableColor(tableNumber, 'green');
      await updateOrderStatus(filteredOrders, 'billed');
      console.log('Bill generated and printed successfully');
    } catch (error) {
      console.error('Error generating Bill:', error);
    }
  };

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

  const updateOrderStatus = async (orders, status) => {
    const batch = writeBatch(backendDb);
    orders.forEach(order => {
      const orderRef = doc(backendDb, 'orders', order.id);
      batch.update(orderRef, { status });
    });
    await batch.commit();
    console.log(`Order status updated to ${status}`);
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
        await deleteDoc(doc(collection(backendDb, 'manual-orders'), itemId));
        setTemporaryOrders((prevOrders) => prevOrders.filter(order => order.id !== itemId));
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
