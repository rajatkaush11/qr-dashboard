import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './ItemList.css';

const ItemList = () => {
  const { categoryId } = useParams();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [newItem, setNewItem] = useState({ name: '', price: '', description: '', image: '', weight: '', unit: '', variations: [] });
  const [newVariation, setNewVariation] = useState({ name: '', price: '', weight: '', unit: '' });
  const [editingItem, setEditingItem] = useState(null);
  const [notification, setNotification] = useState(null);
  const [showVariations, setShowVariations] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [bestTimeToken, setBestTimeToken] = useState(null);
  const apiBaseUrl = import.meta.env.VITE_BACKEND_API;
  const formRef = useRef(null);

  // Fetch token and items when the component mounts or categoryId changes
  useEffect(() => {
    const fetchTokenAndItems = async () => {
      const token = localStorage.getItem('bestTimeToken');
      console.log(`Fetched bestTimeToken: ${token}`); // Debug log

      if (token) {
        setBestTimeToken(token);
        await fetchItems(token);
      } else {
        console.warn('Failed to retrieve bestTimeToken from local storage.');
        showNotification('Failed to retrieve token.');
      }
    };

    fetchTokenAndItems();
  }, [categoryId]);

  // Fetch items based on the token and category ID
  const fetchItems = async (token) => {
    console.log('Fetching items with token:', token); // Debugging token
    try {
      const response = await fetch(`${apiBaseUrl}/items/${categoryId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Failed to fetch items:', errorData);
        throw new Error(errorData.error || 'Failed to fetch items');
      }

      const data = await response.json();
      console.log('Fetched items:', data); // Debugging fetched items
      setItems(data);
    } catch (error) {
      console.error('Error fetching items:', error);
      showNotification(error.message);
    }
  };

  // Handle input changes for item form fields
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewItem({ ...newItem, [name]: value });
  };

  // Handle input changes for variation fields
  const handleVariationChange = (e) => {
    const { name, value } = e.target;
    setNewVariation({ ...newVariation, [name]: value });
  };

  // Add a new variation to the item
  const handleAddVariation = () => {
    if (newVariation.name && newVariation.price && newVariation.weight && newVariation.unit) {
      setNewItem(prevState => ({
        ...prevState,
        variations: [...prevState.variations, newVariation]
      }));
      setNewVariation({ name: '', price: '', weight: '', unit: '' });
    }
  };

  // Handle file selection and convert it to base64
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

  // Add a new item
  const handleAddItem = async () => {
    console.log('Attempting to add item:', newItem); // Debugging new item data
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
            'Authorization': `Bearer ${bestTimeToken}`,
          },
          body: JSON.stringify({ ...newItem, categoryId }),
        });

        console.log('Add item response:', response); // Debugging response

        if (!response.ok) {
          const errorData = await response.json();
          console.error('Failed to save item:', errorData);
          throw new Error(errorData.error || 'Failed to save item');
        }

        const addedItem = await response.json();
        console.log('Item added successfully:', addedItem); // Debugging added item
        setItems([...items, addedItem]);
        setNewItem({ name: '', price: '', description: '', image: '', weight: '', unit: '', variations: [] });
        setShowVariations(false);
        await fetchItems(bestTimeToken);
        showNotification("Item added successfully");
      } catch (error) {
        console.error('Error adding item:', error);
        showNotification(error.message);
      }
    } else {
      showNotification("Name is required and variations must be added if enabled.");
    }
  };

  // Edit an existing item
  const handleEditItem = (item) => {
    console.log('Editing item:', item); // Debugging item to edit
    setEditingItem(item);
    setNewItem({
      name: item.name,
      price: item.price,
      description: item.description,
      image: item.image,
      weight: item.weight,
      unit: item.unit,
      variations: item.variations || []
    });
    setShowVariations(item.variations && item.variations.length > 0);
    formRef.current.scrollIntoView({ behavior: 'smooth' });
  };

  // Update an existing item
  const handleUpdateItem = async () => {
    console.log('Updating item:', newItem); // Debugging updated item data
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
            'Authorization': `Bearer ${bestTimeToken}`,
          },
          body: JSON.stringify({ ...newItem, categoryId }),
        });

        console.log('Update item response:', response); // Debugging response

        if (!response.ok) {
          const errorData = await response.json();
          console.error('Failed to update item:', errorData);
          throw new Error(errorData.error || 'Failed to update item');
        }

        const updatedItems = items.map(item => (item._id === editingItem._id ? { ...newItem, _id: editingItem._id } : item));
        console.log('Updated items list:', updatedItems); // Debugging updated items list
        setItems(updatedItems);
        setNewItem({ name: '', price: '', description: '', image: '', weight: '', unit: '', variations: [] });
        setEditingItem(null);
        setShowVariations(false);
        await fetchItems(bestTimeToken);
        showNotification("Item updated successfully");
      } catch (error) {
        console.error('Error updating item:', error);
        showNotification(error.message);
      }
    } else {
      showNotification("Name is required and variations must be added if enabled.");
    }
  };

  // Delete an existing item
  const handleDeleteItem = async () => {
    console.log('Deleting item:', itemToDelete); // Debugging item to delete
    if (!bestTimeToken) {
      showNotification('No token available, unable to delete item.');
      return;
    }

    if (itemToDelete) {
      try {
        const response = await fetch(`${apiBaseUrl}/items/${itemToDelete._id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${bestTimeToken}`,
          },
        });

        console.log('Delete item response:', response); // Debugging response

        if (!response.ok) {
          const errorData = await response.json();
          console.error('Failed to delete item:', errorData);
          throw new Error(errorData.error || 'Failed to delete item');
        }

        setItems(items.filter(item => item._id !== itemToDelete._id));
        setShowDeleteConfirmation(false);
        setItemToDelete(null);
        showNotification("Item deleted successfully");
      } catch (error) {
        console.error('Error deleting item:', error);
        showNotification(error.message);
      }
    }
  };

  // Confirm deletion of an item
  const confirmDeleteItem = (item) => {
    setItemToDelete(item);
    setShowDeleteConfirmation(true);
  };

  // Cancel the deletion process
  const cancelDeleteItem = () => {
    setItemToDelete(null);
    setShowDeleteConfirmation(false);
  };

  // Toggle the description view for an item
  const toggleDescription = (id) => {
    setExpandedDescriptions(prevState => ({
      ...prevState,
      [id]: !prevState[id]
    }));
  };

  // Handle navigation back to categories
  const handleBack = () => {
    navigate(-1);
  };

  // Show notifications
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
              <p>
                Description: 
                {expandedDescriptions[item._id] ? (
                  <>
                    {item.description} <span onClick={() => toggleDescription(item._id)} className="toggle-description">Show less</span>
                  </>
                ) : (
                  <>
                    {item.description.length > 100 ? `${item.description.slice(0, 100)}...` : item.description} 
                    {item.description.length > 100 && <span onClick={() => toggleDescription(item._id)} className="toggle-description">Read more</span>}
                  </>
                )}
              </p>
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
