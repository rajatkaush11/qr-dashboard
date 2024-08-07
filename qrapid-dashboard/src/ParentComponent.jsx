// ParentComponent.js
import React, { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db, auth } from './firebase-config';
import TableDetails from './TableDetails';

const ParentComponent = ({ tableNumber }) => {
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    const fetchCategories = async () => {
      const userId = auth.currentUser ? auth.currentUser.uid : null;
      const categoriesRef = collection(db, 'restaurants', userId, 'categories');
      const querySnapshot = await getDocs(categoriesRef);
      const categoriesData = querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
      setCategories(categoriesData);
    };

    fetchCategories();
  }, []);

  return (
    <TableDetails 
      tableNumber={tableNumber} 
      onBackClick={() => console.log('Back clicked')}
      updateTableColor={(tableNumber, color) => console.log(`Update table ${tableNumber} color to ${color}`)}
      categories={categories}
    />
  );
};

export default ParentComponent;
