import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { collection, addDoc, getDocs, doc, deleteDoc, setDoc } from 'firebase/firestore';
import { db, auth } from './firebase-config';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import './ItemList.css';

const ItemList = () => {
  const { categoryId } = useParams();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [newItem, setNewItem] = useState({ name: '', price: '', description: '', image: '', weight: '', unit: '', variations: [] });
  const [newVariation, setNewVariation] = useState({ name: '', price: '', weight: '', unit: '' });
  const [editingItem, setEditingItem] = useState(null);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [expandedDescriptions, setExpandedDescriptions] = useState({});
  const [notification, setNotification] = useState(null);
  const [showVariations, setShowVariations] = useState(false);
  const apiBaseUrl = import.meta.env.VITE_BACKEND_API;
  const formRef = useRef(null);

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

  const handleVariationChange = (e) => {
    const { name, value } = e.target;
    setNewVariation({ ...newVariation, [name]: value });
  };

  const handleAddVariation = () => {
    if (newVariation.name && newVariation.price && newVariation.weight && newVariation.unit) {
      setNewItem(prevState => ({
        ...prevState,
        variations: [...prevState.variations, newVariation]
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
    if (newItem.name && (!showVariations || newItem.variations.length > 0)) {
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
          setNewItem({ name: '', price: '', description: '', image: '', weight: '', unit: '', variations: [] });
          setShowVariations(false);
          fetchItems(); // Re-fetch items to update UI
          showNotification("Item added successfully");
        } else {
          console.error('User not authenticated');
        }
      } catch (error) {
        console.error('Error adding item:', error);
        showNotification(error.message);
      }
    } else {
      showNotification("Name is required and variations must be added if enabled.");
    }
  };

  const handleEditItem = (item) => {
    setEditingItem(item);
    setNewItem({ name: item.name, price: item.price, description: item.description, image: item.image, weight: item.weight, unit: item.unit, variations: item.variations || [] });
    setShowVariations(item.variations && item.variations.length > 0);
    formRef.current.scrollIntoView({ behavior: 'smooth' });
  };

  const handleUpdateItem = async () => {
    if (newItem.name && editingItem && (!showVariations || newItem.variations.length > 0)) {
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
          setNewItem({ name: '', price: '', description: '', image: '', weight: '', unit: '', variations: [] });
          setEditingItem(null);
          setShowVariations(false);
          fetchItems(); // Re-fetch items to update UI
          showNotification("Item updated successfully");
        } else {
          console.error('User not authenticated');
        }
      } catch (error) {
        console.error('Error updating item:', error);
        showNotification(error.message);
      }
    } else {
      showNotification("Name is required and variations must be added if enabled.");
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
          showNotification("Item deleted successfully");
        } else {
          console.error('User not authenticated');
        }
      } catch (error) {
        console.error('Error deleting item:', error);
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

  const toggleDescription = (id) => {
    setExpandedDescriptions(prevState => ({
      ...prevState,
      [id]: !prevState[id]
    }));
  };

  const handleBack = () => {
    navigate(-1);
  };

  const onDragEnd = (result) => {
    if (!result.destination) return;
    const reorderedItems = Array.from(items);
    const [movedItem] = reorderedItems.splice(result.source.index, 1);
    reorderedItems.splice(result.destination.index, 0, movedItem);
    setItems(reorderedItems);
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
      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="itemList">
          {(provided) => (
            <div className="item-list" {...provided.droppableProps} ref={provided.innerRef}>
              {items.map((item, index) => (
                <Draggable key={item.id} draggableId={item.id} index={index}>
                  {(provided) => (
                    <div
                      className="item"
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                    >
                      <img src={item.image} alt={item.name} />
                      <div className="item-details">
                        <h2>{item.name}</h2>
                        <p>Price: {item.price}</p>
                        <p>
                          Description: 
                          {expandedDescriptions[item.id] ? (
                            <>
                              {item.description} <span onClick={() => toggleDescription(item.id)} className="toggle-description">Show less</span>
                            </>
                          ) : (
                            <>
                              {item.description.length > 100 ? `${item.description.slice(0, 100)}...` : item.description} 
                              {item.description.length > 100 && <span onClick={() => toggleDescription(item.id)} className="toggle-description">Read more</span>}
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
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
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
