import React, { useState } from 'react';
import { View, TextInput, Button, StyleSheet, Alert } from 'react-native';
import axios from 'axios';
import { API_URL } from '../config';

export default function JoinGroupScreen({ navigation }) {
  const [groupCode, setGroupCode] = useState('');
  const [playerName, setPlayerName] = useState('');

  const joinGroup = async () => {
    if (!groupCode || !playerName) {
      Alert.alert('Erreur', 'Remplis tous les champs');
      return;
    }

    try {
      const response = await axios.get(`${API_URL}/api/groups/${groupCode}`);
      navigation.navigate('Game', { 
        groupCode, 
        playerName, 
        groupId: response.data.id 
      });
    } catch (error) {
      Alert.alert('Erreur', 'Code de groupe invalide');
    }
  };

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        placeholder="Code du groupe"
        value={groupCode}
        onChangeText={setGroupCode}
        autoCapitalize="characters"
      />
      <TextInput
        style={styles.input}
        placeholder="Ton pseudo"
        value={playerName}
        onChangeText={setPlayerName}
      />
      <Button title="Rejoindre" onPress={joinGroup} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 15,
    marginBottom: 15,
    borderRadius: 8,
    fontSize: 16,
  },
});