const escpos = require('escpos');
escpos.USB = require('escpos-usb');
const express = require('express');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

// Create a printer instance with the connected USB printer
const device = new escpos.USB();
const printer = new escpos.Printer(device);

// API endpoint to receive print requests
app.post('/print', (req, res) => {
  const { text } = req.body;

  device.open((err) => {
    if (err) {
      console.error('Failed to open USB device:', err);
      return res.status(500).send('Failed to connect to the printer');
    }

    printer.align('ct')
      .text(text)
      .cut()
      .close();

    res.send('Print successful');
  });
});

// Start the server on port 3000
app.listen(3000, () => {
  console.log('Print server running on port 3000');
});
