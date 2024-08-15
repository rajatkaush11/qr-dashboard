import React, { useEffect, useState } from 'react';
import axios from 'axios';

const Settings = () => {
  const [printers, setPrinters] = useState([]);
  const [selectedPrinter, setSelectedPrinter] = useState('');

  useEffect(() => {
    // Placeholder function to get the list of printers.
    // Replace this with the actual method to fetch connected printers.
    const fetchPrinters = async () => {
      try {
        // Simulate fetching printers; in real-world applications, this should be replaced with actual code
        // to detect printers connected to the computer.
        const response = await axios.get('/api/getPrinters');
        setPrinters(response.data);
      } catch (error) {
        console.error('Error fetching printers:', error);
      }
    };

    fetchPrinters();
  }, []);

  const handlePrinterChange = (event) => {
    setSelectedPrinter(event.target.value);
    // Save the selected printer to localStorage or database
    localStorage.setItem('selectedPrinter', event.target.value);
  };

  return (
    <div>
      <h1>Settings</h1>
      <div>
        <label htmlFor="printer-select">Select Printer:</label>
        <select
          id="printer-select"
          value={selectedPrinter}
          onChange={handlePrinterChange}
        >
          <option value="">Select a printer</option>
          {printers.map((printer) => (
            <option key={printer.ip} value={printer.ip}>
              {printer.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

export default Settings;
