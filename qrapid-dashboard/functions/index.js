const functions = require('firebase-functions');
const admin = require('firebase-admin');
const cors = require('cors');

// Initialize Firebase Admin SDK
admin.initializeApp();
const db = admin.firestore();

// Configure CORS with dynamic origin support
const corsHandler = cors({
  origin: ['https://qr-dashboard-1107.web.app'], // Allowed origin(s)
  methods: ['GET', 'POST', 'OPTIONS'], // Allowed methods
  allowedHeaders: ['Content-Type', 'Authorization'] // Allowed custom headers
});

// Function to handle CORS, including preflight requests
const handleCors = (req, res, callback) => {
  if (req.method === 'OPTIONS') {
    res.status(200).send('OK'); // Respond to OPTIONS requests
    return;
  }
  return corsHandler(req, res, callback);
};

exports.printKOT = functions.https.onRequest((req, res) => {
  handleCors(req, res, async () => {
    try {
      const { tableNumber, orderId, uid } = req.body;

      // Verify UID and fetch order details from Firestore
      if (!uid || !(await admin.auth().getUser(uid))) {
        return res.status(403).send('Unauthorized');
      }

      const orderRef = db.collection('orders').doc(orderId);
      const orderDoc = await orderRef.get();
      if (!orderDoc.exists) {
        return res.status(404).send('Order not found');
      }

      const order = orderDoc.data();
      let kotContent = `Table No: ${tableNumber}\nOrder ID: ${orderId}\nItems:\n`;
      order.items.forEach(item => kotContent += `${item.name} x ${item.quantity}\n`);

      const ESC_POS = require('esc-pos-encoder');
      const encoder = new ESC_POS();
      encoder.initialize();
      encoder.text(kotContent);
      encoder.cut();
      const encodedData = encoder.encode();

      res.status(200).send({ success: true, message: "KOT printed successfully", data: encodedData });
    } catch (error) {
      res.status(500).send({ success: false, message: error.toString() });
    }
  });
});

exports.printBill = functions.https.onRequest((req, res) => {
  handleCors(req, res, async () => {
    try {
      const { tableNumber, orderId, uid } = req.body;

      if (!uid || !(await admin.auth().getUser(uid))) {
        return res.status(403).send('Unauthorized');
      }

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

      const ESC_POS = require('esc-pos-encoder');
      const encoder = new ESC_POS();
      encoder.initialize();
      encoder.text(billContent);
      encoder.cut();
      const encodedData = encoder.encode();

      res.status(200).send({ success: true, message: "Bill printed successfully", data: encodedData });
    } catch (error) {
      res.status(500).send({ success: false, message: error.toString() });
    }
  });
});
