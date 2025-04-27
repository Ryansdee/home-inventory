import { useState, useEffect } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { Button, Toast } from 'antd-mobile';
import { db } from './firebase'; // Assurez-vous que Firebase est bien configuré
import { addDoc, collection, Timestamp } from 'firebase/firestore';

const BarcodeScanPage = () => {
  const [scannedData, setScannedData] = useState('');

  // Fonction pour ajouter un article à la liste après scan
  const handleScan = (data: string) => {
    if (data) {
      setScannedData(data);
      const item = {
        name: `Produit ${data}`, // Remplacez ceci par un appel API pour récupérer le nom réel du produit
        category: 'Inconnu', // Vous pouvez mettre à jour cela en fonction des données
        quantity: 1,
      };
      // Ajouter à Firestore ou localement selon la connexion
      handleAddItem(item);
      Toast.show({ icon: 'success', content: 'Produit ajouté avec succès!' });
    }
  };

  const handleAddItem = async (item: { name: string, category: string, quantity: number }) => {
    if (navigator.onLine) {
      // Ajouter à Firestore si en ligne
      try {
        await addDoc(collection(db, 'shopping-list'), {
          name: item.name,
          quantity: item.quantity,
          category: item.category,
          createdAt: Timestamp.now(),
        });
        Toast.show({ icon: 'success', content: 'Produit ajouté à Firestore avec succès!' });
      } catch (error) {
        Toast.show({ icon: 'fail', content: 'Erreur lors de l\'ajout à Firestore' });
      }
    } else {
      // Ajouter à localStorage si hors ligne
      Toast.show({ icon: 'success', content: 'Produit ajouté localement (hors ligne)' });
      const cachedItems = JSON.parse(localStorage.getItem('cachedShoppingList') || '[]');
      cachedItems.push(item);
      localStorage.setItem('cachedShoppingList', JSON.stringify(cachedItems));
    }
  };

  // Effet pour initialiser le scanner de codes-barres à l'ouverture de la page
  useEffect(() => {
    const codeReader = new BrowserMultiFormatReader();
    
    // Lancer le scanner et écouter les résultats
    codeReader.decodeFromVideoDevice(undefined, 'video', (result, err) => {
      if (result) {
        handleScan(result.getText()); // Utilisation du texte scanné
      }
      if (err) {
        console.error('Erreur lors du scan : ', err);
      }
    });
  }, []);

  return (
    <div style={{ padding: '16px' }}>
      <h1>Scanner un Code-Barres</h1>
      <video id="video" style={{ width: '100%', maxWidth: '600px' }} />
      <Button block color="primary" style={{ marginTop: '20px' }} onClick={() => { Toast.show({ content: `Dernier Scan: ${scannedData}` }); }}>
        Voir Dernier Code Scanné
      </Button>
    </div>
  );
};

export default BarcodeScanPage;
