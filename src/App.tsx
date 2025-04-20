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
  const [shoppingList, setShoppingList] = useState<Item[]>([]);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [selectedId, setSelectedId] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isOnline, setIsOnline] = useState(true);

  // ⏳ "Connexion" de 1 minute puis on passe hors-ligne
  useEffect(() => {
    if (!navigator.onLine) {
      const cached = localStorage.getItem('cachedItems');
      if (cached) {
        const parsed = JSON.parse(cached);
        setItems(parsed);
        console.log("🔌 Mode hors-ligne activé (données chargées localement)");
      }
      return;
    }

    const q = query(collection(db, 'items'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, snapshot => {
      const data: Item[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...(doc.data() as Omit<Item, 'id'>)
      }));
      setItems(data);
      localStorage.setItem('cachedItems', JSON.stringify(data));

      data.forEach(item => {
        if (item.quantity === 0) {
          addToShoppingList(item);
        } else {
          removeFromShoppingList(item.name);
        }
      });

      if (data.length > 0) {
        const latest = data.reduce((a, b) =>
          a.createdAt.toMillis() > b.createdAt.toMillis() ? a : b
        );
        setLastUpdated(latest.createdAt.toDate());
      }
    });

    const timeout = setTimeout(() => {
      setIsOnline(false);
      unsubscribe();
      console.log("🕐 Connexion désactivée après 1 minute");
    }, 60000);

    return () => {
      clearTimeout(timeout);
      unsubscribe();
    };
  }, []);

  // 🔄 Reconnexion → comparer données locales et Firestore
  useEffect(() => {
    const handleReconnect = async () => {
      if (navigator.onLine) {
        console.log('🌐 Reconnexion détectée...');
        const snapshot = await getDocs(query(collection(db, 'items')));
        const serverData: Item[] = snapshot.docs.map(doc => ({
          id: doc.id,
          ...(doc.data() as Omit<Item, 'id'>),
        }));

        const localData: Item[] = JSON.parse(localStorage.getItem('cachedItems') || '[]');
        await syncDifferences(localData, serverData);
        setItems(serverData);
        localStorage.setItem('cachedItems', JSON.stringify(serverData));
        setIsOnline(true);
      }
    };

    window.addEventListener('online', handleReconnect);
    return () => window.removeEventListener('online', handleReconnect);
  }, []);

  const syncDifferences = async (localItems: Item[], serverItems: Item[]) => {
    for (const localItem of localItems) {
      const serverItem = serverItems.find(s => s.id === localItem.id);
      if (serverItem && localItem.quantity !== serverItem.quantity) {
        const ref = doc(db, 'items', localItem.id);
        console.log(`🔄 MAJ ${localItem.name}: ${serverItem.quantity} → ${localItem.quantity}`);
        await updateDoc(ref, { quantity: localItem.quantity });
      }
    }
  };

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

  const removeFromShoppingList = async (name: string) => {
    const q = query(collection(db, 'shopping-list'), where('name', '==', name));
    const snapshot = await getDocs(q);
    snapshot.forEach(async (doc) => {
      await deleteDoc(doc.ref);
    });
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

    const existingItemQuery = query(collection(db, 'items'), where('name', '==', name));
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
    setQuantity(1);
  };

  const handleDelete = async (id: string) => {
    await deleteDoc(doc(db, 'items', id));
  };

  const handleQuantityChange = async (id: string, newQuantity: number) => {
    if (newQuantity < 0) return;
    const updatedItems = items.map(item =>
      item.id === id ? { ...item, quantity: newQuantity } : item
    );
    setItems(updatedItems);
    localStorage.setItem('cachedItems', JSON.stringify(updatedItems));

    if (isOnline) {
      const itemRef = doc(db, 'items', id);
      await updateDoc(itemRef, { quantity: newQuantity });
    }
  };

  const handleRemoveFromShoppingList = async (id: string) => {
    await deleteDoc(doc(db, 'shopping-list', id));
  };

  const filteredItems = items.filter(item =>
    selectedCategory ? item.category === selectedCategory : true
  );

  const sortedItems = filteredItems.sort((a, b) => Number(a.id) - Number(b.id));

  return (
    <main className="max-w-7xl mx-auto p-8 font-sans">
      <h1>🍽️ Inventaire des Aliments ({isOnline ? "en ligne" : "hors-ligne"})</h1>

      <form onSubmit={handleAdd}>
        <div className="input-container">
          <select value={selectedId} onChange={handleItemSelect} required>
            <option value="" disabled>Sélectionnez un aliment</option>
            {alimentsData
              .filter(item => item.category !== "")
              .map(item => (
                <option key={item.id} value={item.id}>
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

      {lastUpdated && (
        <p style={{ marginTop: '1rem', textAlign: 'right', fontStyle: 'italic' }}>
          Dernière mise à jour : {lastUpdated.toLocaleString()}
        </p>
      )}

      <table style={{ marginBottom: "30px" }}>
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
            <tr key={item.id} className={item.quantity === 0 ? 'highlight-zero' : ''}>
              <td>{item.name} {item.quantity === 0 && <span title="Dans la liste de courses">🛒</span>}</td>
              <td>
                <button onClick={() => handleQuantityChange(item.id, item.quantity - 1)} className="quantity-btn-moins">-</button>
                <span style={{ margin: '0 8px' }}>{item.quantity}</span>
                <button onClick={() => handleQuantityChange(item.id, item.quantity + 1)} className="quantity-btn-plus">+</button>
              </td>
              <td>{item.category}</td>
              <td>
                <button onClick={() => handleDelete(item.id)} className="delete">🗑️</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
