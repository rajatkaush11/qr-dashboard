const functions = require('firebase-functions');
const admin = require('firebase-admin');
const cors = require('cors')({ origin: true });
const ESC_POS = require('esc-pos-encoder');

admin.initializeApp();
const db = admin.firestore();

exports.printKOT = functions.https.onCall(async (data, context) => {
  return new Promise((resolve, reject) => {
    cors((req, res) => {
      const { tableNumber, orderId } = data;

      // Fetch order details
      db.collection('orders').doc(orderId).get()
        .then(orderDoc => {
          if (!orderDoc.exists) {
            reject(new functions.https.HttpsError('not-found', 'Order not found'));
            return;
          }

          const order = orderDoc.data();

          // Generate KOT content
          let kotContent = `Table No: ${tableNumber}\n`;
          kotContent += `Order ID: ${orderId}\n`;
          kotContent += `Items:\n`;
          order.items.forEach(item => {
            kotContent += `${item.name} x ${item.quantity}\n`;
          });

          // Send KOT to printer (pseudo-code, replace with actual print command)
          const encoder = new ESC_POS();
          encoder.initialize();
          encoder.text(kotContent);
          encoder.cut();

          const encodedData = encoder.encode();
          // Here you would send 'encodedData' to the printer via Bluetooth/USB

          resolve({ success: true });
        })
        .catch(error => {
          reject(new functions.https.HttpsError('internal', error.message));
        });
    })(data, context);
  });
});

exports.printBill = functions.https.onCall(async (data, context) => {
  return new Promise((resolve, reject) => {
    cors((req, res) => {
      const { tableNumber, orderId } = data;

      // Fetch order details
      db.collection('orders').doc(orderId).get()
        .then(orderDoc => {
          if (!orderDoc.exists) {
            reject(new functions.https.HttpsError('not-found', 'Order not found'));
            return;
          }

          const order = orderDoc.data();

          // Generate Bill content
          let billContent = `Bill for Table No: ${tableNumber}\n\nItems:\n`;
          let totalAmount = 0;
          order.items.forEach(item => {
            const itemTotal = item.price * item.quantity;
            totalAmount += itemTotal;
            billContent += `${item.name} - ${item.price} x ${item.quantity} = ${itemTotal}\n`;
          });
          billContent += `\nTotal Amount: ${totalAmount}\nThank you for dining with us!`;

          // Send Bill to printer (pseudo-code, replace with actual print command)
          const encoder = new ESC_POS();
          encoder.initialize();
          encoder.text(billContent);
          encoder.cut();

          const encodedData = encoder.encode();
          // Here you would send 'encodedData' to the printer via Bluetooth/USB

          resolve({ success: true });
        })
        .catch(error => {
          reject(new functions.https.HttpsError('internal', error.message));
        });
    })(data, context);
  });
});
