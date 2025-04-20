import { useEffect, useState } from 'react';
import { collection, deleteDoc, doc, getDocs, onSnapshot, query, Timestamp, addDoc, where } from 'firebase/firestore';
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
  const [isOnline, setIsOnline] = useState(true);

  // Charger les éléments du shopping-list (en ligne ou hors ligne)
  useEffect(() => {
    if (!navigator.onLine) {
      const cachedShoppingList = localStorage.getItem('cachedShoppingList');
      if (cachedShoppingList) {
        setShoppingList(JSON.parse(cachedShoppingList));
        console.log("🔌 Mode hors-ligne activé pour shopping list");
      }
      return;
    }

    const q = query(collection(db, 'shopping-list'));

    const unsubscribe = onSnapshot(q, snapshot => {
      const data: ShoppingItem[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...(doc.data() as Omit<ShoppingItem, 'id'>),
      }));

      // Supprimer les doublons basés sur le nom de l'article
      const uniqueByName = data.filter(
        (item, index, self) =>
          index === self.findIndex(i => i.name.toLowerCase() === item.name.toLowerCase())
      );

      setShoppingList(uniqueByName);
      localStorage.setItem('cachedShoppingList', JSON.stringify(uniqueByName)); // Mise à jour du cache local
    });

    return () => unsubscribe();
  }, []);

  // Gestion de la reconnexion pour la synchronisation
  useEffect(() => {
    const handleReconnect = async () => {
      if (navigator.onLine) {
        console.log('🌐 Reconnexion détectée...');
        const snapshot = await getDocs(query(collection(db, 'shopping-list')));
        const serverData: ShoppingItem[] = snapshot.docs.map(doc => ({
          id: doc.id,
          ...(doc.data() as Omit<ShoppingItem, 'id'>),
        }));

        const localData: ShoppingItem[] = JSON.parse(localStorage.getItem('cachedShoppingList') || '[]');
        await syncDifferences(localData, serverData);
        setShoppingList(serverData);
        localStorage.setItem('cachedShoppingList', JSON.stringify(serverData));
        setIsOnline(true);
      }
    };

    window.addEventListener('online', handleReconnect);
    return () => window.removeEventListener('online', handleReconnect);
  }, []);

  // Synchronisation des différences entre local et serveur
  const syncDifferences = async (localItems: ShoppingItem[], serverItems: ShoppingItem[]) => {
    for (const localItem of localItems) {
      const serverItem = serverItems.find(s => s.id === localItem.id);
      if (serverItem && localItem.quantity !== serverItem.quantity) {
        const ref = doc(db, 'shopping-list', localItem.id);
        console.log(`🔄 MAJ ${localItem.name}: ${serverItem.quantity} → ${localItem.quantity}`);
        await addDoc(ref, { quantity: localItem.quantity, createdAt: Timestamp.now() });
      }
    }
  };

  // Ajouter un article à la shopping-list
  const addToShoppingList = async (item: ShoppingItem) => {
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

  // Supprimer un article de la shopping-list
  const handleDelete = async (nameToDelete: string) => {
    const q = query(collection(db, 'shopping-list'));
    const snapshot = await getDocs(q);

    const matchingDocs = snapshot.docs.filter(
      doc => (doc.data() as ShoppingItem).name.toLowerCase() === nameToDelete.toLowerCase()
    );

    await Promise.all(
      matchingDocs.map(docItem => deleteDoc(doc(db, 'shopping-list', docItem.id)))
    );

    // Si on est en ligne, on peut mettre à jour Firestore
    if (isOnline) {
      const updatedList = shoppingList.filter(item => item.name !== nameToDelete);
      setShoppingList(updatedList);
      localStorage.setItem('cachedShoppingList', JSON.stringify(updatedList));
    } else {
      // Si on est hors ligne, mettre à jour localement pour éviter d'afficher l'élément supprimé
      const updatedList = shoppingList.filter(item => item.name !== nameToDelete);
      setShoppingList(updatedList);
      localStorage.setItem('cachedShoppingList', JSON.stringify(updatedList));
    }
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
                  <button onClick={() => handleDelete(item.name)} className="delete">
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
