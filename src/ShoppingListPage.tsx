import { useEffect, useState } from 'react';
import { collection, deleteDoc, doc, onSnapshot, query } from 'firebase/firestore';
import { db } from './firebase';
import './ShoppingListPage.css';

type ShoppingItem = {
  id: string;
  name: string;
  quantity: number;
  category: string;
};

export default function ShoppingListPage() {
  const [shoppingList, setShoppingList] = useState<ShoppingItem[]>([]);

  useEffect(() => {
    const q = query(collection(db, 'shopping-list'));

    const unsubscribe = onSnapshot(q, snapshot => {
      const data: ShoppingItem[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...(doc.data() as Omit<ShoppingItem, 'id'>),
      }));
      setShoppingList(data);
    });

    return () => unsubscribe();
  }, []);

  const handleDelete = async (id: string) => {
    await deleteDoc(doc(db, 'shopping-list', id));
  };

  return (
    <main className="shopping-list-page max-w-7xl mx-auto p-8 font-sans">
      <h1>🛒 Liste de Courses</h1>

      {shoppingList.length === 0 ? (
        <p>Aucun article dans la liste de courses.</p>
      ) : (
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
            {shoppingList.map(item => (
              <tr key={item.id}>
                <td>{item.name}</td>
                <td>{item.quantity}</td>
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
      )}
    </main>
  );
}
