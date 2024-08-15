import React, { useState, useEffect } from 'react';
import './Settings.css';

const Settings = () => {
  const [printers, setPrinters] = useState([]);
  const [selectedPrinter, setSelectedPrinter] = useState(localStorage.getItem('selectedPrinter') || '');

  useEffect(() => {
    const fetchPrinters = async () => {
      try {
        // Mocking available printers - in a real environment, replace this with actual printer data fetching.
        const availablePrinters = [
          'Brother HL-L2350DW',
          'HP OfficeJet 5255',
          'Canon PIXMA TS9120',
          'Epson EcoTank ET-2720'
        ];  // Example printer names
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
