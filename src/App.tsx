import { useEffect, useState } from 'react';
import {
  getDocs, query, where, collection, Timestamp, onSnapshot,
  orderBy, addDoc, deleteDoc, doc, updateDoc
} from "firebase/firestore";
import { db } from './firebase';
import alimentsData from './aliments.json';
import {
  Button, Input, Selector, List, SwipeAction, Toast, PullToRefresh,
  Popup, Stepper
} from 'antd-mobile';
import { AddCircleOutline, SearchOutline } from 'antd-mobile-icons';
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
  const [, setShoppingList] = useState<Item[]>([]); // Liste des courses
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [popupVisible, setPopupVisible] = useState(false);
  const [searchPopupVisible, setSearchPopupVisible] = useState(false); // Popup de recherche

  const [step, setStep] = useState(1);
  const [selectedItemId, setSelectedItemId] = useState('');
  const [selectedQuantity, setSelectedQuantity] = useState<number>(1);

  useEffect(() => {
    const q = query(collection(db, 'items'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, snapshot => {
      const data: Item[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...(doc.data() as Omit<Item, 'id'>)
      }));
      const availableItems = data.filter(item => item.quantity >= 0);
      const shoppingListItems = data.filter(item => item.quantity === 0);
      setItems(availableItems);  // Ces éléments sont pour l'inventaire
      setShoppingList(shoppingListItems);  // Ceux avec quantité = 0 vont dans la liste de courses
    });
    return () => unsubscribe();
  }, []);

  const categoryOptions = Array.from(new Set(alimentsData.map(item => item.category)))
    .filter(Boolean)
    .map(cat => ({ label: cat, value: cat }));

  const filteredAlimentsOptions = alimentsData
    .filter(item => item.category === selectedCategory)
    .map(item => ({
      label: item.name,
      value: item.id
    }));

  const handleAddItem = async () => {
    const selectedItem = alimentsData.find(a => a.id === selectedItemId);
    if (!selectedItem) {
      Toast.show({ icon: 'fail', content: 'Veuillez choisir un aliment' });
      return;
    }

    const existingQuery = query(collection(db, 'items'), where('name', '==', selectedItem.name));
    const snapshot = await getDocs(existingQuery);

    if (snapshot.empty) {
      await addDoc(collection(db, 'items'), {
        name: selectedItem.name,
        category: selectedItem.category,
        quantity: selectedQuantity,
        createdAt: Timestamp.now(),
      });
      Toast.show({ icon: 'success', content: 'Ajouté ✅' });
    } else {
      snapshot.forEach(async (docu) => {
        await updateDoc(docu.ref, { quantity: docu.data().quantity + selectedQuantity });
      });
      Toast.show({ icon: 'success', content: 'Quantité mise à jour ✅' });
    }

    setTimeout(() => {
      setPopupVisible(false);
      resetForm();
    }, 1000);
  };

  const resetForm = () => {
    setSelectedCategory('');
    setSelectedItemId('');
    setSelectedQuantity(1);
    setStep(1);
  };

  const handleDelete = async (id: string) => {
    await deleteDoc(doc(db, 'items', id));
    Toast.show({ icon: 'success', content: 'Supprimé' });
  };

  const handleQuantityChange = async (id: string, delta: number) => {
    const item = items.find(i => i.id === id);
    if (!item) return;
    const newQuantity = item.quantity + delta;
    if (newQuantity <= 0) {
      // Ajouter à la liste des courses si la quantité est 0
      await updateDoc(doc(db, 'items', id), { quantity: 0 });
      const itemData = { id, name: item.name, quantity: 0, category: item.category };
      await addDoc(collection(db, 'shopping-list'), itemData);
    } else {
      await updateDoc(doc(db, 'items', id), { quantity: newQuantity });
    }
  };

  const filteredItems = items.filter(item =>
    (!selectedCategory || item.category === selectedCategory) &&
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', fontSize: '18px' }}>
      <div style={{ padding: '16px', background: '#fff' }}>
        <h1 style={{ textAlign: 'center', marginBottom: '16px', fontSize: '24px' }}>🍴 Mon Inventaire</h1>

        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          <Button block color="primary" fill="solid" size="large" onClick={() => setPopupVisible(true)}>
            <AddCircleOutline /> Ajouter
          </Button>
          <Button block color="primary" fill="solid" size="large" onClick={() => setSearchPopupVisible(true)}>
            <SearchOutline /> Recherche
          </Button>
        </div>

        <div style={{ position: 'relative', marginBottom: '16px' }}>
          <SearchOutline style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
          <Input
            style={{
              fontSize: '18px',
              color: 'black',
              paddingLeft: '36px',
              borderRadius: '25px',
              height: '40px',
            }}
            value={searchQuery}
            onChange={val => setSearchQuery(val)}
            placeholder="🔍 Rechercher"
            clearable
          />
        </div>

        <Selector
          options={[{ label: "Toutes catégories", value: "" }, ...categoryOptions]}
          value={[selectedCategory]}
          onChange={(v) => setSelectedCategory(v[0])}
          style={{ marginBottom: '16px' }}
        />
      </div>

      <div style={{ flex: 1, overflow: 'auto', background: '#f7f7f7' }}>
        <PullToRefresh onRefresh={async () => {
          const snapshot = await getDocs(query(collection(db, 'items')));
          const data: Item[] = snapshot.docs.map(doc => ({
            id: doc.id,
            ...(doc.data() as Omit<Item, 'id'>)
          }));
          setItems(data.filter(item => item.quantity > 0)); // Aliments en inventaire
          setShoppingList(data.filter(item => item.quantity === 0)); // Liste des courses
        }}>
          <List header={<div style={{ fontSize: '20px', fontWeight: 'bold', color: "black" }}>📋 Aliments en Inventaire</div>}>
            {filteredItems.map(item => (
              <SwipeAction
                key={item.id}
                rightActions={[{
                  key: 'delete',
                  text: 'Supprimer',
                  color: 'danger',
                  onClick: () => handleDelete(item.id),
                }]}>
                <List.Item
                  description={<div style={{ fontSize: '16px', color: '#000' }}>{item.category}</div>}
                  extra={
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Button style={{ color: 'red', fontSize: "25px" }} size="large" onClick={() => handleQuantityChange(item.id, -1)}>-</Button>
                      <div style={{ fontSize: '20px', color: '#000' }}>{item.quantity}</div>
                      <Button style={{ color: 'green', fontSize: "25px" }} size="large" onClick={() => handleQuantityChange(item.id, 1)}>+</Button>
                    </div>
                  }
                  style={{ fontSize: '18px', padding: '20px 16px' }}
                >
                  {item.name}
                </List.Item>
              </SwipeAction>
            ))}
          </List>
        </PullToRefresh>
      </div>

      {/* Popup de Recherche */}
      <Popup
        visible={searchPopupVisible}
        onMaskClick={() => setSearchPopupVisible(false)}
        bodyStyle={{ padding: '20px', borderRadius: '10px' }}
      >
        <Input
          style={{
            fontSize: '18px',
            paddingLeft: '10px',
            marginBottom: '16px',
            borderRadius: '10px',
            height: '40px',
          }}
          value={searchQuery}
          onChange={val => setSearchQuery(val)}
          placeholder="🔍 Rechercher"
        />
        <Button block color="primary" fill="solid" onClick={() => setSearchPopupVisible(false)}>
          Fermer
        </Button>
      </Popup>

      {/* Popup pour l'ajout d'élément */}
      <Popup
        visible={popupVisible}
        onMaskClick={() => {
          setPopupVisible(false);
          resetForm();
        }}
        bodyStyle={{ borderTopLeftRadius: 8, borderTopRightRadius: 8, padding: 24 }}
      >
        <div style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '16px' }}>
          Étape {step} / 3
        </div>

        {step === 1 && (
          <>
            <div style={{ fontSize: '20px', marginBottom: '16px' }}>Choisir une catégorie</div>
            <Selector
              options={categoryOptions}
              value={[selectedCategory]}
              onChange={(v) => {
                setSelectedCategory(v[0]);
                setSelectedItemId('');
                setStep(2);
              }}
              style={{ marginTop: 16 }}
            />
          </>
        )}

        {step === 2 && (
          <>
            <div style={{ fontSize: '20px', marginBottom: '16px' }}>Choisir un aliment</div>
            <Selector
              options={filteredAlimentsOptions}
              value={selectedItemId ? [selectedItemId] : []}
              onChange={(v) => setSelectedItemId(v[0])}
              style={{ marginTop: 16 }}
            />
            <div style={{ marginTop: 24, display: 'flex', justifyContent: 'space-between' }}>
              <Button block color="default" onClick={() => setStep(1)}>Précédent</Button>
              <Button block color="primary" onClick={() => setStep(3)}>Suivant</Button>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <div style={{ fontSize: '20px', marginBottom: '16px' }}>Quantité</div>
            <Stepper
              value={selectedQuantity}
              onChange={setSelectedQuantity}
              style={{ marginBottom: '16px' }}
            />
            <div style={{ marginTop: 24, display: 'flex', justifyContent: 'space-between' }}>
              <Button block color="default" onClick={() => setStep(2)}>Précédent</Button>
              <Button block color="primary" onClick={handleAddItem}>Ajouter</Button>
            </div>
          </>
        )}
      </Popup>
    </div>
  );
}
