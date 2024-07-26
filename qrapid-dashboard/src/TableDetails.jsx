import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faTrash } from '@fortawesome/free-solid-svg-icons';
import './TableDetails.css';

const TableDetails = ({ tableNumber, onBackClick, onGenerateKOT, onGenerateBill, onComplete }) => {
    return (
        <div className="table-details">
            <div className="back-button-container">
                <button className="back-button" onClick={onBackClick}>
                    <FontAwesomeIcon icon={faArrowLeft} />
                    <span>Back</span>
                </button>
            </div>
            <h2 className="table-title">Table {tableNumber}</h2>
            <div className="current-orders">
                <h3>Current Orders</h3>
                <div className="order-item active">
                    <div className="order-text">
                        <span>Pesto Pasta</span>
                        <span>$15</span>
                    </div>
                    <button className="delete-button">
                        <FontAwesomeIcon icon={faTrash} />
                    </button>
                </div>
            </div>
            <div className="kot-generated">
                <h3>KOT Generated</h3>
                <div className="order-item">
                    <span>Pesto Pasta</span>
                    <span>$15</span>
                </div>
                <div className="order-item">
                    <span>Ahi Tuna Poke Bowl</span>
                    <span>$17</span>
                </div>
            </div>
            <div className="actions">
                <button className="action-button add-item">Add Item</button>
            </div>
            <div className="action-buttons">
                <button className="action-button generate-kot" onClick={onGenerateKOT}>Generate - KOT</button>
                <button className="action-button generate-bill" onClick={onGenerateBill}>Generate - Bill</button>
                <button className="action-button complete" onClick={onComplete}>Complete</button>
            </div>
        </div>
    );
};

export default TableDetails;
