import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Linking, Platform, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Clipboard from 'expo-clipboard';
import Header from './components/Header';
import { useRouter, useFocusEffect } from 'expo-router';

export default function AuthorizedUsersPage() {
  const router = useRouter();
  const [unitNumber, setUnitNumber] = useState('');
  const [password, setPassword] = useState('1234');
  const [serialNumber, setSerialNumber] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');

  const loadData = async () => {
    try {
      const savedUnitNumber = await AsyncStorage.getItem('unitNumber');
      const savedPassword = await AsyncStorage.getItem('password');

      if (savedUnitNumber) setUnitNumber(savedUnitNumber);
      if (savedPassword) setPassword(savedPassword);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      loadData();
    }, [])
  );

  const sendSMS = async (command) => {
    if (!unitNumber) {
      Alert.alert('Error', 'Please set the relay phone number in settings');
      return;
    }

    const smsUrl = Platform.select({
      ios: `sms:${unitNumber}`,
      android: `sms:${unitNumber}?body=${encodeURIComponent(command)}`,
      default: `sms:${unitNumber}?body=${encodeURIComponent(command)}`,
    });

    if (Platform.OS === 'ios') {
      await Clipboard.setStringAsync(command);
      Alert.alert('Info', 'Command copied to clipboard. Please paste it in the SMS app.');
    }

    Linking.canOpenURL(smsUrl)
      .then(supported => {
        if (!supported) {
          Alert.alert('Error', 'SMS is not available on this device');
          return;
        }
        return Linking.openURL(smsUrl);
      })
      .catch(err => console.error('An error occurred', err));
  };

  const addAuthorizedUser = async () => {  // Mark function as async
    if (!phoneNumber) {
      Alert.alert('Error', 'Please enter a phone number');
      return;
    }
    if (!serialNumber || !/^\d+$/.test(serialNumber)) {
      Alert.alert('Error', 'User ID must be numeric');
      return;
    }
    const numValue = parseInt(serialNumber, 10);
    if (numValue < 1 || numValue > 200) {
      Alert.alert('Error', 'User ID must be between 1 and 200');
      return;
    }
    // Send SMS with or without time restrictions
    if (startTime && endTime) {
      await sendSMS(`${password}A${serialNumber}#${phoneNumber}#${startTime}#${endTime}#`);
    } else {
      await sendSMS(`${password}A${serialNumber}#${phoneNumber}#`);
    }
    // Update AsyncStorage with new user
    try {
      const savedUsers = await AsyncStorage.getItem('authorizedUsers');
      const users = savedUsers ? JSON.parse(savedUsers) : [];
      users.push({ serial: serialNumber, phone: phoneNumber, startTime, endTime });
      await AsyncStorage.setItem('authorizedUsers', JSON.stringify(users));
      Alert.alert('Success', 'Authorized user added and list updated.');
    } catch (error) {
      console.error('Error updating authorized users:', error);
    }
  };

  const deleteAuthorizedUser = async () => {  // Mark as async
    if (!serialNumber || !/^\d+$/.test(serialNumber)) {
      Alert.alert('Error', 'User ID must be numeric');
      return;
    }
    const numValue = parseInt(serialNumber, 10);
    if (numValue < 1 || numValue > 200) {
      Alert.alert('Error', 'User ID must be between 1 and 200');
      return;
    }
    await sendSMS(`${password}A${serialNumber}##`);
    try {
      const savedUsers = await AsyncStorage.getItem('authorizedUsers');
      let users = savedUsers ? JSON.parse(savedUsers) : [];
      // Remove user matching the current serialNumber
      users = users.filter(u => u.serial !== serialNumber);
      await AsyncStorage.setItem('authorizedUsers', JSON.stringify(users));
      Alert.alert('Success', 'Authorized user deleted and list updated.');
    } catch (error) {
      console.error('Error updating authorized users:', error);
    }
  };

  const deleteAllUsers = () => {
    Alert.alert(
      'Confirm Delete All',
      'Are you sure you want to delete all authorized users? This cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete All',
          onPress: () => sendSMS(`${password}AR#`),
          style: 'destructive',
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <Header title="Authorized Users" showBack backTo="/setup" />
      <ScrollView style={styles.content}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Add Authorized User</Text>
          <Text style={styles.cardSubtitle}>
            Add a phone number that will be authorized to control the relay unit.
          </Text>

          <Text style={styles.inputLabel}>User ID (1-200)</Text>
          <TextInput
            style={styles.input}
            value={serialNumber}
            onChangeText={(text) => {
              const filtered = text.replace(/[^0-9]/g, '').slice(0, 3);
              setSerialNumber(filtered);
            }}
            placeholder="Enter user ID"
            keyboardType="number-pad"
            maxLength={3}
          />
          <Text style={styles.inputHint}>Enter the user id (numeric, 1-200)</Text>

          <Text style={styles.inputLabel}>Phone Number</Text>
          <TextInput
            style={styles.input}
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            placeholder="Example: 0469843459"
            keyboardType="phone-pad"
          />
          <Text style={styles.inputHint}>Enter without country code or special characters</Text>
          
          <Text style={styles.inputLabel}>Start Time (optional)</Text>
          <TextInput
            style={styles.input}
            value={startTime}
            onChangeText={setStartTime}
            placeholder="e.g., 2408050800"
            keyboardType="number-pad"
            maxLength={10}
          />
          <Text style={styles.inputHint}>Format: YYMMDDHHMM (ex: 2408050800)</Text>

          <Text style={styles.inputLabel}>End Time (optional)</Text>
          <TextInput
            style={styles.input}
            value={endTime}
            onChangeText={setEndTime}
            placeholder="e.g., 2409051000"
            keyboardType="number-pad"
            maxLength={10}
          />
          <Text style={styles.inputHint}>Format: YYMMDDHHMM (ex: 2409051000)</Text>

          <TouchableOpacity 
            style={styles.primaryButton}
            onPress={addAuthorizedUser}
          >
            <Text style={styles.primaryButtonText}>Add User</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.secondaryButton, styles.marginTop]}
            onPress={deleteAuthorizedUser}
          >
            <Text style={styles.secondaryButtonText}>Delete User at Position {serialNumber}</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.dangerButton, styles.marginTop]}
            onPress={deleteAllUsers}
          >
            <Text style={styles.dangerButtonText}>Delete All Users</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity 
          style={styles.primaryButton}
          onPress={() => router.push("/authorized-users-list")}
        >
          <Text style={styles.primaryButtonText}>View Authorized Users List</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 16,
    paddingBottom: 80,
  },
  card: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    backgroundColor: 'white',
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  cardSubtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 16,
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 8,
  },
  inputHint: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  marginTop: {
    marginTop: 12,
  },
  primaryButton: {
    backgroundColor: '#00bfff',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '500',
  },
  secondaryButton: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#00bfff',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#00bfff',
    fontSize: 16,
    fontWeight: '500',
  },
  dangerButton: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#ff3b30',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  dangerButtonText: {
    color: '#ff3b30',
    fontSize: 16,
    fontWeight: '500',
  },
  commandExample: {
    fontSize: 16,
    marginBottom: 8,
  },
  codeText: {
    fontFamily: 'monospace',
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 4,
  },
});