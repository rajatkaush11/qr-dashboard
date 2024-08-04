import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { collection, addDoc, getDocs, doc, deleteDoc, setDoc } from 'firebase/firestore';
import { db, auth } from './firebase-config';
import './ItemList.css';

const ItemList = () => {
  const { categoryId } = useParams();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [newItem, setNewItem] = useState({ name: '', price: '', description: '', image: '', weight: '', unit: '' });
  const [editingItem, setEditingItem] = useState(null);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const apiBaseUrl = import.meta.env.VITE_BACKEND_API;
  const formRef = useRef(null); // Reference for the form element

  useEffect(() => {
    fetchItems();
  }, [categoryId]);

  const fetchItems = async () => {
    console.log(`Fetching items for category ID: ${categoryId}`);
    try {
      const user = auth.currentUser;
      if (user) {
        const itemsRef = collection(db, 'restaurants', user.uid, 'categories', categoryId, 'items');
        const querySnapshot = await getDocs(itemsRef);
        const itemsData = querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
        setItems(itemsData);
      }

      const response = await fetch(`${apiBaseUrl}/api/items/${categoryId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setItems(data);
      } else {
        console.error('Failed to fetch items from MongoDB');
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
        const user = auth.currentUser;
        if (user) {
          const itemsRef = collection(db, 'restaurants', user.uid, 'categories', categoryId, 'items');
          const docRef = await addDoc(itemsRef, newItem);

          const response = await fetch(`${apiBaseUrl}/api/items`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('token')}`,
            },
            body: JSON.stringify({ ...newItem, categoryId }),
          });

          if (!response.ok) {
            throw new Error('Failed to save item in MongoDB');
          }

          const addedItem = await response.json();
          setItems([...items, { ...addedItem, id: docRef.id }]);
          setNewItem({ name: '', price: '', description: '', image: '', weight: '', unit: '' });
        } else {
          console.error('User not authenticated');
        }
      } catch (error) {
        console.error('Error adding item:', error);
      }
    }
  };

  const handleEditItem = (item) => {
    setEditingItem(item);
    setNewItem({ name: item.name, price: item.price, description: item.description, image: item.image, weight: item.weight, unit: item.unit });
    formRef.current.scrollIntoView({ behavior: 'smooth' }); // Scroll to the form
  };

  const handleUpdateItem = async () => {
    if (newItem.name && newItem.price && newItem.description && newItem.weight && newItem.unit && editingItem) {
      try {
        const user = auth.currentUser;
        if (user) {
          const itemDocRef = doc(db, 'restaurants', user.uid, 'categories', categoryId, 'items', editingItem.id);
          await setDoc(itemDocRef, newItem);

          const response = await fetch(`${apiBaseUrl}/api/items/${editingItem.id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('token')}`,
            },
            body: JSON.stringify({ ...newItem, categoryId }),
          });

          if (!response.ok) {
            throw new Error('Failed to update item in MongoDB');
          }

          const updatedItems = items.map(item => (item.id === editingItem.id ? { ...newItem, id: editingItem.id } : item));
          setItems(updatedItems);
          setNewItem({ name: '', price: '', description: '', image: '', weight: '', unit: '' });
          setEditingItem(null);
        } else {
          console.error('User not authenticated');
        }
      } catch (error) {
        console.error('Error updating item:', error);
      }
    }
  };

  const handleDeleteItem = async () => {
    if (itemToDelete) {
      try {
        const user = auth.currentUser;
        if (user) {
          const itemDocRef = doc(db, 'restaurants', user.uid, 'categories', categoryId, 'items', itemToDelete.id);
          await deleteDoc(itemDocRef);

          const response = await fetch(`${apiBaseUrl}/api/items/${itemToDelete._id}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`,
            },
          });

          if (!response.ok) {
            throw new Error('Failed to delete item in MongoDB');
          }

          setItems(items.filter(item => item.id !== itemToDelete.id));
          setShowDeleteConfirmation(false);
          setItemToDelete(null);
        } else {
          console.error('User not authenticated');
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
    navigate(-1);
  };

  return (
    <div className="item-list-container">
      <button onClick={handleBack} className="back-button">Back to Categories</button>
      <h1>Items</h1>
      <div ref={formRef} className="new-item-form">
        <input type="file" accept="image/*" onChange={handleFileChange} />
        <input type="text" name="name" placeholder="Name" value={newItem.name} onChange={handleInputChange} />
        <input type="number" name="price" placeholder="Price" value={newItem.price} onChange={handleInputChange} />
        <input type="text" name="description" placeholder="Description" value={newItem.description} onChange={handleInputChange} />
        <input type="number" name="weight" placeholder="Weight" value={newItem.weight} onChange={handleInputChange} />
        <input type="text" name="unit" placeholder="Unit" value={newItem.unit} onChange={handleInputChange} />
        <button onClick={editingItem ? handleUpdateItem : handleAddItem}>
          {editingItem ? 'Update Item' : 'Add Item'}
        </button>
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
                <button onClick={() => handleEditItem(item)}>Edit</button>
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
