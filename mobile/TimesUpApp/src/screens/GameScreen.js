import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, FlatList, StyleSheet } from 'react-native';
import axios from 'axios';
import io from 'socket.io-client';
import { API_URL, SOCKET_URL } from '../config';

export default function GameScreen({ route }) {
  const { groupCode, playerName } = route.params;
  const [cards, setCards] = useState([]);
  const [newCardText, setNewCardText] = useState('');
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    // Load existing cards
    loadCards();

    // Connect to socket
    const newSocket = io(SOCKET_URL);
    setSocket(newSocket);

    newSocket.emit('joinGroup', groupCode);

    newSocket.on('newCard', (card) => {
      setCards(prev => [card, ...prev]);
    });

    return () => newSocket.close();
  }, []);

  const loadCards = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/cards/${groupCode}`);
      setCards(response.data);
    } catch (error) {
      console.error(error);
    }
  };

  const addCard = async () => {
    if (!newCardText.trim()) return;

    try {
      await axios.post(`${API_URL}/api/cards`, {
        groupCode,
        text: newCardText,
        createdBy: playerName
      });
      setNewCardText('');
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Groupe: {groupCode}</Text>
      
      <View style={styles.addCard}>
        <TextInput
          style={styles.input}
          placeholder="Nouvelle carte..."
          value={newCardText}
          onChangeText={setNewCardText}
        />
        <Button title="Ajouter" onPress={addCard} />
      </View>

      <FlatList
        data={cards}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.cardText}>{item.text}</Text>
            <Text style={styles.cardAuthor}>Par: {item.created_by}</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  addCard: {
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 10,
    marginBottom: 10,
    borderRadius: 8,
  },
  card: {
    backgroundColor: '#f0f0f0',
    padding: 15,
    marginBottom: 10,
    borderRadius: 8,
  },
  cardText: {
    fontSize: 16,
    marginBottom: 5,
  },
  cardAuthor: {
    fontSize: 12,
    color: '#666',
  },
});