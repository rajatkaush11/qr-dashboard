import React, { useState, useEffect } from 'react';
import './Settings.css';

const Settings = () => {
  const [printers, setPrinters] = useState([]);
  const [selectedPrinter, setSelectedPrinter] = useState(localStorage.getItem('selectedPrinter') || '');

  useEffect(() => {
    const fetchPrinters = async () => {
      try {
        // Since web browsers cannot list printers directly, this is simulated.
        // You would need a browser extension or a desktop application to access printers.
        const availablePrinters = ['Printer1', 'Printer2', 'Printer3'];  // Example printer names
        setPrinters(availablePrinters);
      } catch (error) {
        console.error('Error fetching printers:', error);
      }
    };

    fetchPrinters();
  }, []);

  const handlePrinterChange = (event) => {
    setSelectedPrinter(event.target.value);
    localStorage.setItem('selectedPrinter', event.target.value);
  };

  return (
    <div className="settings-container">
      <h2>Select Printer</h2>
      <select value={selectedPrinter} onChange={handlePrinterChange}>
        <option value="" disabled>Select your printer</option>
        {printers.map((printer, index) => (
          <option key={index} value={printer}>
            {printer}
          </option>
        ))}
      </select>
    </div>
  );
};

export default Settings;
