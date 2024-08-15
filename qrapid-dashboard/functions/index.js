const functions = require('firebase-functions');
const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors({ origin: true }));
app.use(express.json());

// Endpoint to get the list of printers
app.get('/printers', (req, res) => {
  const printers = ['POS-58', 'POS-80', 'Microsoft Print to PDF', 'Save as PDF'];
  res.json(printers);
});

// Endpoint to handle print jobs
app.post('/print', (req, res) => {
  const { printerName, data } = req.body;

  // Mock print job
  console.log(`Printing to ${printerName}...`);
  console.log('Data to print:', data);

  res.status(200).send(`Print job sent to ${printerName}`);
});

exports.api = functions.https.onRequest(app);
