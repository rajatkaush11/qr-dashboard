// index.js (Cloud Functions)
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const cors = require('cors')({ origin: true });

admin.initializeApp();
const db = admin.firestore();

async function sendToPrinter(content) {
  console.log('Printing:', content);
}

exports.printKOT = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    if (req.method !== 'POST') {
      return res.status(405).send('Method Not Allowed');
    }
    try {
      const { tableNumber, orderId } = req.body;

      const orderRef = db.collection('orders').doc(orderId);
      const orderDoc = await orderRef.get();

      if (!orderDoc.exists) {
        return res.status(404).send('Order not found');
      }

      const order = orderDoc.data();
      let kotContent = `Table No: ${tableNumber}\nOrder ID: ${orderId}\nItems:\n`;
      order.items.forEach(item => {
        kotContent += `${item.name} x ${item.quantity}\n`;
      });

      await sendToPrinter(kotContent);

      return res.status(200).send({ success: true, message: "KOT printed successfully" });
    } catch (error) {
      return res.status(500).send(error.message);
    }
  });
});

exports.printBill = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    if (req.method !== 'POST') {
      return res.status(405).send('Method Not Allowed');
    }
    try {
      const { tableNumber, orderId } = req.body;

      const orderRef = db.collection('orders').doc(orderId);
      const orderDoc = await orderRef.get();

      if (!orderDoc.exists) {
        return res.status(404).send('Order not found');
      }

      const order = orderDoc.data();
      let billContent = `Bill for Table No: ${tableNumber}\n\nItems:\n`;
      let totalAmount = 0;
      order.items.forEach(item => {
        const itemTotal = item.price * item.quantity;
        totalAmount += itemTotal;
        billContent += `${item.name} - ${item.price} x ${item.quantity} = ${itemTotal}\n`;
      });
      billContent += `\nTotal Amount: ${totalAmount}\nThank you for dining with us!`;

      await sendToPrinter(billContent);

      return res.status(200).send({ success: true, message: "Bill printed successfully" });
    } catch (error) {
      return res.status(500).send(error.message);
    }
  });
});
