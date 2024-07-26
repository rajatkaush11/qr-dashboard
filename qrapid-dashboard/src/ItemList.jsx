import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './ItemList.css';

const ItemList = () => {
    const { categoryId } = useParams();
    const navigate = useNavigate(); // useNavigate hook to handle navigation
    const [items, setItems] = useState([]);
    const [newItem, setNewItem] = useState({ name: '', price: '', description: '', image: '', weight: '', unit: '' });
    const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
    const [itemToDelete, setItemToDelete] = useState(null);
    const apiBaseUrl = import.meta.env.VITE_BACKEND_API; // Use the environment variable for the base URL

    useEffect(() => {
        fetchItems();
    }, [categoryId]); // Adding categoryId here to refetch items on change

    const fetchItems = async () => {
        console.log(`Fetching items for category ID: ${categoryId}`);
        try {
            const response = await fetch(`${apiBaseUrl}/items/${categoryId}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`, // Add token if required
                },
            });
            if (response.ok) {
                const data = await response.json();
                setItems(data);
            } else {
                console.error('Failed to fetch items');
            }
        } catch (error) {
            console.error('Error fetching items:', error);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setNewItem({ ...newItem, [name]: value });
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setNewItem({ ...newItem, image: reader.result });
            };
            reader.readAsDataURL(file);
        }
    };

    const handleAddItem = async () => {
        if (newItem.name && newItem.price && newItem.description && newItem.weight && newItem.unit) {
            try {
                const response = await fetch(`${apiBaseUrl}/items`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token')}`, // Add token if required
                    },
                    body: JSON.stringify({ ...newItem, categoryId }),
                });
                if (response.ok) {
                    const addedItem = await response.json();
                    setItems([...items, addedItem]);
                    setNewItem({ name: '', price: '', description: '', image: '', weight: '', unit: '' });
                } else {
                    console.error('Failed to add item');
                }
            } catch (error) {
                console.error('Error adding item:', error);
            }
        }
    };

    const handleDeleteItem = async () => {
        if (itemToDelete) {
            try {
                const response = await fetch(`${apiBaseUrl}/items/${itemToDelete._id}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`, // Add token if required
                    },
                });
                if (response.ok) {
                    setItems(items.filter(item => item._id !== itemToDelete._id));
                    setShowDeleteConfirmation(false);
                    setItemToDelete(null);
                } else {
                    console.error('Failed to delete item');
                }
            } catch (error) {
                console.error('Error deleting item:', error);
            }
        }
    };

    const confirmDeleteItem = (item) => {
        setItemToDelete(item);
        setShowDeleteConfirmation(true);
    };

    const cancelDeleteItem = () => {
        setItemToDelete(null);
        setShowDeleteConfirmation(false);
    };

    const handleBack = () => {
        navigate(-1); // Navigate back to the previous page
    };

    return (
        <div className="item-list-container">
            <button onClick={handleBack} className="back-button">Back to Categories</button>
            <h1>Items</h1>
            <div className="new-item-form">
                <input type="file" accept="image/*" onChange={handleFileChange} />
                <input type="text" name="name" placeholder="Name" value={newItem.name} onChange={handleInputChange} />
                <input type="number" name="price" placeholder="Price" value={newItem.price} onChange={handleInputChange} />
                <input type="text" name="description" placeholder="Description" value={newItem.description} onChange={handleInputChange} />
                <input type="number" name="weight" placeholder="Weight" value={newItem.weight} onChange={handleInputChange} />
                <input type="text" name="unit" placeholder="Unit" value={newItem.unit} onChange={handleInputChange} />
                <button onClick={handleAddItem}>Add Item</button>
            </div>
            <div className="item-list">
                {items.map((item, index) => (
                    <div className="item" key={index}>
                        <img src={item.image} alt={item.name} />
                        <div className="item-details">
                            <h2>{item.name}</h2>
                            <p>Price: {item.price}</p>
                            <p>Description: {item.description}</p>
                            <p>Weight: {item.weight} {item.unit}</p>
                            <div className="item-actions">
                                <button onClick={() => confirmDeleteItem(item)}>Delete</button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            {showDeleteConfirmation && (
                <div className="delete-confirmation">
                    <p>Are you sure you want to delete this item?</p>
                    <button onClick={handleDeleteItem}>Yes</button>
                    <button onClick={cancelDeleteItem}>No</button>
                </div>
            )}
        </div>
    );
};

export default ItemList;
