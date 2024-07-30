const functions = require('firebase-functions');
const admin = require('firebase-admin');
const cors = require('cors')({ origin: true });

// Initialize Firebase Admin SDK
admin.initializeApp();
const db = admin.firestore();

// Function to print Kitchen Order Ticket (KOT)
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

      // Assume sendToPrinter is a function that handles printing logic
      await sendToPrinter(kotContent);

      return res.status(200).send({ success: true, message: "KOT printed successfully" });
    } catch (error) {
      return res.status(500).send(error.message);
    }
  });
});

// Function to print a bill
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

      // Assume sendToPrinter is a function that handles printing logic
      await sendToPrinter(billContent);

      return res.status(200).send({ success: true, message: "Bill printed successfully" });
    } catch (error) {
      return res.status(500).send(error.message);
    }
  });
});

async function sendToPrinter(content) {
  // This function should include the logic to send content to your printer
  // You can implement this according to your printer's specifications and API
  console.log('Printing:', content);
}
