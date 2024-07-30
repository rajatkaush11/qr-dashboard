const functions = require('firebase-functions');
const admin = require('firebase-admin');
const cors = require('cors');

// Initialize Firebase Admin SDK
admin.initializeApp();
const db = admin.firestore();

// Configure CORS with dynamic origin support in a more secure manner
const corsHandler = cors({
  origin: ['https://qr-dashboard-1107.web.app'], // Allowed origin(s)
  methods: ['GET', 'POST', 'OPTIONS'], // Allowed methods
  allowedHeaders: ['Content-Type', 'Authorization'] // Allowed custom headers
});

// Function to handle CORS, including preflight requests
const handleCors = (req, res, callback) => {
  if (req.method === 'OPTIONS') {
    // Send response to OPTIONS requests
    res.status(200).end();
    return;
  }
  return corsHandler(req, res, callback);
};

// Cloud Function to print Kitchen Order Ticket (KOT)
exports.printKOT = functions.https.onRequest((req, res) => {
  handleCors(req, res, async () => {
    try {
      const { tableNumber, orderId } = req.body;

      // Fetch order details from Firestore
      const orderRef = db.collection('orders').doc(orderId);
      const orderDoc = await orderRef.get();

      if (!orderDoc.exists) {
        res.status(404).send('Order not found');
        return;
      }

      const order = orderDoc.data();

      // Generate KOT content
      let kotContent = `Table No: ${tableNumber}\nOrder ID: ${orderId}\nItems:\n`;
      order.items.forEach(item => {
        kotContent += `${item.name} x ${item.quantity}\n`;
      });

      // Send KOT to printer (logic needs to be implemented)
      const ESC_POS = require('esc-pos-encoder');
      const encoder = new ESC_POS();
      encoder.initialize();
      encoder.text(kotContent);
      encoder.cut();
      const encodedData = encoder.encode(); // This data should be sent to the printer

      res.status(200).send({ success: true, message: "KOT printed successfully" });
    } catch (error) {
      res.status(500).send(error.message);
    }
  });
});

// Cloud Function to print a bill
exports.printBill = functions.https.onRequest((req, res) => {
  handleCors(req, res, async () => {
    try {
      const { tableNumber, orderId } = req.body;

      // Fetch order details from Firestore
      const orderRef = db.collection('orders').doc(orderId);
      const orderDoc = await orderRef.get();

      if (!orderDoc.exists) {
        res.status(404).send('Order not found');
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

      // Send Bill to printer (logic needs to be implemented)
      const ESC_POS = require('esc-pos-encoder');
      const encoder = new ESC_POS();
      encoder.initialize();
      encoder.text(billContent);
      encoder.cut();
      const encodedData = encoder.encode(); // This data should be sent to the printer

      res.status(200).send({ success: true, message: "Bill printed successfully" });
    } catch (error) {
      res.status(500).send(error.message);
    }
  });
});
