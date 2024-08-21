import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getAuth } from 'firebase/auth'; // Import Firebase authentication
import './ItemList.css';

const ItemList = () => {
  const { categoryId } = useParams();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [newItem, setNewItem] = useState({
    name: '',
    price: '',
    description: '',
    image: '',
    weight: '',
    unit: '',
    variations: [],
  });
  const [newVariation, setNewVariation] = useState({
    name: '',
    price: '',
    weight: '',
    unit: '',
  });
  const [editingItem, setEditingItem] = useState(null);
  const [notification, setNotification] = useState(null);
  const [showVariations, setShowVariations] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [bestTimeToken, setBestTimeToken] = useState(null);
  const apiBaseUrl = import.meta.env.VITE_BACKEND_API;
  const formRef = useRef(null);

  const auth = getAuth(); // Initialize auth

  useEffect(() => {
    const fetchTokenAndItems = async () => {
      try {
        const uid = auth.currentUser?.uid; // Get current user's UID

        if (!uid) {
          throw new Error('User UID not found. Ensure the user is authenticated.');
        }

        const response = await fetch(`${apiBaseUrl}/restaurant/${uid}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch bestTimeToken: ${response.statusText}`);
        }

        const { bestTimeToken } = await response.json();

        if (bestTimeToken) {
          setBestTimeToken(bestTimeToken);
          localStorage.setItem('bestTimeToken', bestTimeToken);
          await fetchItems(bestTimeToken);
        } else {
          throw new Error('bestTimeToken is missing from the response.');
        }
      } catch (error) {
        console.error('Error fetching bestTimeToken:', error.message);
        showNotification('Failed to retrieve token.');
      }
    };

    fetchTokenAndItems();
  }, [categoryId]);

  const fetchItems = async (token) => {
    try {
      const response = await fetch(`${apiBaseUrl}/items/${categoryId}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch items');
      }

      const data = await response.json();
      setItems(data);
    } catch (error) {
      console.error('Error fetching items:', error.message);
      showNotification(error.message);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewItem({ ...newItem, [name]: value });
  };

  const handleVariationChange = (e) => {
    const { name, value } = e.target;
    setNewVariation({ ...newVariation, [name]: value });
  };

  const handleAddVariation = () => {
    if (newVariation.name && newVariation.price && newVariation.weight && newVariation.unit) {
      setNewItem((prevState) => ({
        ...prevState,
        variations: [...prevState.variations, newVariation],
      }));
      setNewVariation({ name: '', price: '', weight: '', unit: '' });
    }
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
    if (!bestTimeToken) {
      showNotification('No token available, unable to add item.');
      return;
    }

    if (newItem.name && (!showVariations || newItem.variations.length > 0)) {
      try {
        const response = await fetch(`${apiBaseUrl}/items`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${bestTimeToken}`,
          },
          body: JSON.stringify({ ...newItem, categoryId }),
        });

        if (!response.ok) {
          throw new Error('Failed to save item');
        }

        const addedItem = await response.json();
        setItems([...items, addedItem]);
        setNewItem({ name: '', price: '', description: '', image: '', weight: '', unit: '', variations: [] });
        setShowVariations(false);
        await fetchItems(bestTimeToken);
        showNotification('Item added successfully');
      } catch (error) {
        console.error('Error adding item:', error.message);
        showNotification(error.message);
      }
    } else {
      showNotification('Name is required and variations must be added if enabled.');
    }
  };

  const handleEditItem = (item) => {
    setEditingItem(item);
    setNewItem({
      name: item.name,
      price: item.price,
      description: item.description,
      image: item.image,
      weight: item.weight,
      unit: item.unit,
      variations: item.variations || [],
    });
    setShowVariations(item.variations && item.variations.length > 0);
    formRef.current.scrollIntoView({ behavior: 'smooth' });
  };

  const handleUpdateItem = async () => {
    if (!bestTimeToken) {
      showNotification('No token available, unable to update item.');
      return;
    }

    if (newItem.name && editingItem && (!showVariations || newItem.variations.length > 0)) {
      try {
        const response = await fetch(`${apiBaseUrl}/items/${editingItem._id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${bestTimeToken}`,
          },
          body: JSON.stringify({ ...newItem, categoryId }),
        });

        if (!response.ok) {
          throw new Error('Failed to update item');
        }

        const updatedItems = items.map((item) =>
          item._id === editingItem._id ? { ...newItem, _id: editingItem._id } : item
        );
        setItems(updatedItems);
        setNewItem({ name: '', price: '', description: '', image: '', weight: '', unit: '', variations: [] });
        setEditingItem(null);
        setShowVariations(false);
        await fetchItems(bestTimeToken);
        showNotification('Item updated successfully');
      } catch (error) {
        console.error('Error updating item:', error.message);
        showNotification(error.message);
      }
    } else {
      showNotification('Name is required and variations must be added if enabled.');
    }
  };

  const handleDeleteItem = async () => {
    if (!bestTimeToken) {
      showNotification('No token available, unable to delete item.');
      return;
    }

    if (itemToDelete) {
      try {
        const response = await fetch(`${apiBaseUrl}/items/${itemToDelete._id}`, {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${bestTimeToken}`,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to delete item');
        }

        setItems(items.filter((item) => item._id !== itemToDelete._id));
        setShowDeleteConfirmation(false);
        setItemToDelete(null);
        showNotification('Item deleted successfully');
      } catch (error) {
        console.error('Error deleting item:', error.message);
        showNotification(error.message);
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

  const showNotification = (message) => {
    setNotification(message);
    setTimeout(() => setNotification(null), 3000);
  };

  return (
    <div className="item-list-container">
      <button onClick={handleBack} className="back-button">Back to Categories</button>
      <h1>Items</h1>
      <div ref={formRef} className="new-item-form">
        <input type="file" accept="image/*" onChange={handleFileChange} />
        <input type="text" name="name" placeholder="Name" value={newItem.name} onChange={handleInputChange} />
        {!showVariations && (
          <>
            <input type="text" name="price" placeholder="Price" value={newItem.price} onChange={handleInputChange} />
            <input type="number" name="weight" placeholder="Weight" value={newItem.weight} onChange={handleInputChange} />
          </>
        )}
        <input type="text" name="description" placeholder="Description" value={newItem.description} onChange={handleInputChange} />
        {!showVariations && (
          <input type="text" name="unit" placeholder="Unit" value={newItem.unit} onChange={handleInputChange} />
        )}
        <button onClick={() => setShowVariations(!showVariations)}>
          {showVariations ? 'Remove Variations' : 'Add Variations'}
        </button>

        {showVariations && (
          <div className="variations">
            <h3>Variations</h3>
            {newItem.variations.map((variation, index) => (
              <div key={index} className="variation">
                <p>Name: {variation.name}</p>
                <p>Price: {variation.price}</p>
                <p>Weight: {variation.weight} {variation.unit}</p>
              </div>
            ))}
            <input type="text" name="name" placeholder="Variation Name" value={newVariation.name} onChange={handleVariationChange} />
            <input type="text" name="price" placeholder="Variation Price" value={newVariation.price} onChange={handleVariationChange} />
            <input type="number" name="weight" placeholder="Variation Weight" value={newVariation.weight} onChange={handleVariationChange} />
            <input type="text" name="unit" placeholder="Variation Unit" value={newVariation.unit} onChange={handleVariationChange} />
            <button onClick={handleAddVariation}>Add Variation</button>
          </div>
        )}
        
        <button onClick={editingItem ? handleUpdateItem : handleAddItem}>
          {editingItem ? 'Update Item' : 'Add Item'}
        </button>
      </div>

      <div className="item-list">
        {items.map((item) => (
          <div className="item" key={item._id}>
            <img src={item.image} alt={item.name} />
            <div className="item-details">
              <h2>{item.name}</h2>
              <p>Price: {item.price}</p>
              <p>Description: {item.description}</p>
              <p>Weight: {item.weight} {item.unit}</p>
              <div className="item-variations">
                <h4>Variations:</h4>
                {item.variations && item.variations.length > 0 ? (
                  item.variations.map((variation, index) => (
                    <div key={index} className="variation">
                      <p>Name: {variation.name}</p>
                      <p>Price: {variation.price}</p>
                      <p>Weight: {variation.weight} {variation.unit}</p>
                    </div>
                  ))
                ) : (
                  <p>No variations</p>
                )}
              </div>
              <div className="item-actions">
                <button onClick={() => handleEditItem(item)}>Edit</button>
                <button onClick={() => confirmDeleteItem(item)}>Delete</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {notification && (
        <div className="notification">
          {notification}
        </div>
      )}
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
