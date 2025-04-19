import { useEffect, useState } from 'react';
import {
  getDocs, query, where, collection, Timestamp, onSnapshot,
  orderBy, addDoc, deleteDoc, doc, updateDoc
} from "firebase/firestore";
import { db } from './firebase';
import alimentsData from './aliments.json';
import './App.css';

type Item = {
  id: string;
  name: string;
  quantity: number;
  category: string;
  createdAt: Timestamp;
};

export default function App() {
  const [items, setItems] = useState<Item[]>([]);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [selectedId, setSelectedId] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null); // 🆕

  useEffect(() => {
    const q = query(collection(db, 'items'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, snapshot => {
      const data: Item[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...(doc.data() as Omit<Item, 'id'>)
      }));
      setItems(data);

      if (data.length > 0) {
        const latest = data.reduce((a, b) =>
          a.createdAt.toMillis() > b.createdAt.toMillis() ? a : b
        );
        setLastUpdated(latest.createdAt.toDate());
      }
    });

    // Ajout auto à la liste de courses
    items.forEach(item => {
      if (item.quantity <= 1) {
        addToShoppingList(item);
      }
    });

    return () => unsubscribe();
  }, [items]);

  const addToShoppingList = async (item: Item) => {
    const shoppingListQuery = query(collection(db, 'shopping-list'), where('name', '==', item.name));
    const shoppingListSnapshot = await getDocs(shoppingListQuery);

    if (shoppingListSnapshot.empty) {
      await addDoc(collection(db, 'shopping-list'), {
        name: item.name,
        quantity: item.quantity,
        category: item.category,
        createdAt: Timestamp.now()
      });
    }
  };

  const handleItemSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    setSelectedId(id);
    const selectedItem = alimentsData.find(item => item.id === id);
    if (selectedItem) {
      setName(selectedItem.name);
      setCategory(selectedItem.category);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !category) return;

    const existingItemQuery = query(
      collection(db, 'items'),
      where('name', '==', name)
    );
    const existingItemSnapshot = await getDocs(existingItemQuery);

    if (existingItemSnapshot.empty) {
      await addDoc(collection(db, 'items'), {
        name,
        quantity,
        category,
        createdAt: Timestamp.now()
      });
    } else {
      existingItemSnapshot.forEach(async (doc) => {
        await updateDoc(doc.ref, {
          quantity: doc.data().quantity + quantity
        });
      });
    }

    setSelectedId('');
    setName('');
    setCategory('');
    setQuantity(0);
  };

  const handleDelete = async (id: string) => {
    await deleteDoc(doc(db, 'items', id));
  };

  const handleQuantityChange = async (id: string, newQuantity: number) => {
    const itemRef = doc(db, 'items', id);
    await updateDoc(itemRef, { quantity: newQuantity });
  };

  const filteredItems = items.filter(item =>
    selectedCategory ? item.category === selectedCategory : true
  );

  const sortedItems = filteredItems.sort((a, b) => {
    return Number(a.id) - Number(b.id);
  });

  const isBoldName = (name: string) => {
    const regex = /^-\s*\[.*\]\s*-$/;
    return regex.test(name);
  };

  return (
    <main className="max-w-7xl mx-auto p-8 font-sans">
      <h1>🍽️ Inventaire des Aliments</h1>

      <form onSubmit={handleAdd}>
        <div className="input-container">
          <select value={selectedId} onChange={handleItemSelect} required>
            <option value="" disabled>Sélectionnez un élément</option>
            {alimentsData
              .filter(item => item.category !== "")
              .map(item => (
                <option
                  key={item.id}
                  value={item.id}
                  style={isBoldName(item.name) ? { fontWeight: 'bold' } : {}}
                >
                  {item.name}
                </option>
              ))}
          </select>
        </div>
        <div className="input-container">
          <input
            type="number"
            min={1}
            value={quantity}
            onChange={e => setQuantity(Number(e.target.value))}
          />
        </div>
        <button type="submit">Ajouter</button>
      </form>

      <div className="category-filter">
        <select onChange={e => setSelectedCategory(e.target.value)} value={selectedCategory}>
          <option value="">Toutes les catégories</option>
          {Array.from(new Set(alimentsData.map(item => item.category))).map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      {/* 🆕 Dernière mise à jour */}
      {lastUpdated && (
        <p style={{ marginTop: '1rem', textAlign: 'right', fontStyle: 'italic' }}>
          Dernière mise à jour : {lastUpdated.toLocaleString()}
        </p>
      )}

      <table>
        <thead>
          <tr>
            <th>Nom</th>
            <th>Quantité</th>
            <th>Catégorie</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {sortedItems.map(item => (
            <tr key={item.id}>
              <td>{item.name}</td>
              <td>
                <input
                  type="number"
                  value={item.quantity}
                  min={0}
                  onChange={e =>
                    handleQuantityChange(item.id, Number(e.target.value))
                  }
                  style={{ width: '60px' }}
                />
              </td>
              <td>{item.category}</td>
              <td>
                <button onClick={() => handleDelete(item.id)} className="delete">
                  🗑️
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
