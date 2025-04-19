import { useEffect, useState } from 'react';
import { getDocs, query, where, collection, Timestamp, onSnapshot, orderBy, addDoc, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { db } from './firebase';
import alimentsData from './aliments.json';
import './App.css'; // Importer le fichier CSS personnalisé

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
  const [selectedId, setSelectedId] = useState(''); // ✅ déplacement ici

  useEffect(() => {
    const q = query(collection(db, 'items'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, snapshot => {
      const data: Item[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...(doc.data() as Omit<Item, 'id'>)
      }));
      setItems(data);
    });
    return () => unsubscribe();
  }, []);

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
    setQuantity(1);
  };

  const handleDelete = async (id: string) => {
    await deleteDoc(doc(db, 'items', id));
  };

  return (
    <main className="max-w-7xl mx-auto p-8 font-sans">
      <h1>🍽️ Inventaire des Aliments</h1>

      <form onSubmit={handleAdd}>
        <div className="input-container">
          <select
            value={selectedId}
            onChange={handleItemSelect}
            required
          >
            <option value="" disabled>Sélectionnez un aliment</option>
            {alimentsData
              .filter(item => item.category !== "")
              .map(item => (
                <option key={item.id} value={item.id}>
                  {item.name} - {item.category}
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

      <table>
        <thead>
          <tr>
            <th>Nom</th>
            <th>Quantité</th>
            <th>Catégorie</th>
            <th>Date</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {items.map(item => (
            <tr key={item.id}>
              <td>{item.name}</td>
              <td>{item.quantity}</td>
              <td>{item.category}</td>
              <td>{item.createdAt.toDate().toLocaleString()}</td>
              <td>
                <button
                  onClick={() => handleDelete(item.id)}
                  className="delete"
                >
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
