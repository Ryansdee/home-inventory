import { useEffect, useState } from 'react';
import { addDoc, collection, deleteDoc, doc, getDocs, onSnapshot, query, Timestamp } from 'firebase/firestore';
import { db } from './firebase';
import { List, Button, Toast, SwipeAction, PullToRefresh, Input, Popup, Stepper } from 'antd-mobile';
import { AddCircleOutline, SearchOutline } from 'antd-mobile-icons';
import './ShoppingListPage.css';

type ShoppingItem = {
  id: string;
  name: string;
  quantity: number;
  category: string;
};

export default function ShoppingListPage() {
  const [shoppingList, setShoppingList] = useState<ShoppingItem[]>([]); // Liste des courses
  const [isOnline] = useState(navigator.onLine); // Vérifier si l'utilisateur est en ligne
  const [searchQuery, setSearchQuery] = useState('');
  const [popupVisible, setPopupVisible] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemQuantity, setNewItemQuantity] = useState(1);
  const [newItemCategory, setNewItemCategory] = useState('');

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

  // Ajouter un article à la shopping-list
  const handleAddItem = async () => {
    if (!newItemName || !newItemCategory || newItemQuantity <= 0) {
      Toast.show({ icon: 'fail', content: 'Veuillez remplir tous les champs correctement.' });
      return;
    }

    if (isOnline) {
      await addDoc(collection(db, 'shopping-list'), {
        name: newItemName,
        quantity: newItemQuantity,
        category: newItemCategory,
        createdAt: Timestamp.now(),
      });
    } else {
      const newItem = { id: Date.now().toString(), name: newItemName, quantity: newItemQuantity, category: newItemCategory };
      setShoppingList(prevList => [...prevList, newItem]);
      localStorage.setItem('cachedShoppingList', JSON.stringify([...shoppingList, newItem]));
    }

    setPopupVisible(false);
    setNewItemName('');
    setNewItemQuantity(1);
    setNewItemCategory('');
    Toast.show({ icon: 'success', content: 'Article ajouté avec succès!' });
  };

  // Supprimer un article de la shopping-list
  const handleDelete = async (nameToDelete: string) => {
    if (isOnline) {
      const q = query(collection(db, 'shopping-list'));
      const snapshot = await getDocs(q);

      const matchingDocs = snapshot.docs.filter(
        doc => (doc.data() as ShoppingItem).name.toLowerCase() === nameToDelete.toLowerCase()
      );

      await Promise.all(
        matchingDocs.map(docItem => deleteDoc(doc(db, 'shopping-list', docItem.id)))
      );
    }

    // Mettre à jour la liste en ligne ou hors ligne
    const updatedList = shoppingList.filter(item => item.name !== nameToDelete);
    setShoppingList(updatedList);
    localStorage.setItem('cachedShoppingList', JSON.stringify(updatedList));
  };

  // Recherche des articles
  const filteredShoppingList = shoppingList.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div style={{ padding: '16px' }}>
      <h1 style={{ textAlign: 'center', marginBottom: '16px' }}>🛒 Liste de Courses</h1>

      <div style={{ marginBottom: '16px' }}>
        <div style={{ position: 'relative' }}>
          <SearchOutline style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', zIndex: 1 }} />
          <Input
            value={searchQuery}
            onChange={(val) => setSearchQuery(val)}
            placeholder="🔍 Rechercher un article"
            clearable
            style={{ fontSize: '16px', paddingLeft: '36px' }}
          />
        </div>
      </div>

      <div style={{ marginBottom: '16px' }}>
        <Button block color="primary" fill="solid" size="large" onClick={() => setPopupVisible(true)}>
          <AddCircleOutline /> Ajouter un Article
        </Button>
      </div>

      <PullToRefresh onRefresh={async () => {
        const snapshot = await getDocs(query(collection(db, 'shopping-list')));
        const data: ShoppingItem[] = snapshot.docs.map(doc => ({
          id: doc.id,
          ...(doc.data() as Omit<ShoppingItem, 'id'>),
        }));
        setShoppingList(data);
        localStorage.setItem('cachedShoppingList', JSON.stringify(data));
      }}>
        <List>
          {filteredShoppingList.length === 0 ? (
            <p>Aucun article dans la liste de courses.</p>
          ) : (
            filteredShoppingList.map(item => (
              <SwipeAction
                key={item.id}
                rightActions={[
                  {
                    key: 'delete',
                    text: 'Supprimer',
                    color: 'danger',
                    onClick: () => handleDelete(item.name),
                  }
                ]}
              >
                <List.Item
                  description={<div>{item.category}</div>}
                  extra={<div style={{ color: item.quantity === 0 ? 'red' : 'green' }}>{item.quantity}</div>}
                >
                  {item.name}
                </List.Item>
              </SwipeAction>
            ))
          )}
        </List>
      </PullToRefresh>

      <Popup
        visible={popupVisible}
        onMaskClick={() => setPopupVisible(false)}
        bodyStyle={{ borderTopLeftRadius: 8, borderTopRightRadius: 8, padding: 24 }}
      >
        <h2 style={{ textAlign: 'center' }}>Ajouter un Article</h2>
        <div style={{ marginBottom: '16px' }}>
          <Input
            value={newItemName}
            onChange={(val) => setNewItemName(val)}
            placeholder="Nom de l'article"
          />
        </div>
        <div style={{ marginBottom: '16px' }}>
          <Input
            value={newItemCategory}
            onChange={(val) => setNewItemCategory(val)}
            placeholder="Catégorie"
          />
        </div>
        <div style={{ marginBottom: '16px' }}>
          <Stepper value={newItemQuantity} onChange={setNewItemQuantity} />
        </div>
        <Button block color="primary" onClick={handleAddItem}>
          Ajouter
        </Button>
      </Popup>
    </div>
  );
}
