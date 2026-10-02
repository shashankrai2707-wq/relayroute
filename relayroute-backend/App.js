import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';

export default function App() {
  const [activeTab, setActiveTab] = useState('tracking');
  const [parcelId, setParcelId] = useState('1');
  const [trackingData, setTrackingData] = useState(null);
  const [upiId, setUpiId] = useState('');
  const [amount, setAmount] = useState('100');

  const fetchTracking = async () => {
    try {
      let response = await fetch(`https://relayroute-backend.onrender.com/api/parcels/location/${parcelId}`);
      let data = await response.json();
      if (data.success) {
        setTrackingData(data.location);
      } else {
        Alert.alert('Not Found', 'Live location not available for this parcel.');
      }
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Failed to fetch tracking data');
    }
  };

  const handleUpiPayment = async () => {
    try {
      let response = await fetch('https://relayroute-backend.onrender.com/api/payment/upi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: 1, parcel_id: parseInt(parcelId), amount: parseFloat(amount), upi_id: upiId })
      });
      let data = await response.json();
      if (data.success) {
        Alert.alert('Success', `UPI Payment Successful! Txn ID: ${data.transaction_id}`);
      } else {
        Alert.alert('Payment Failed', data.message);
      }
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Payment processing failed');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>RelayRoute Delivery</Text>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'tracking' && styles.activeTab]} 
          onPress={() => setActiveTab('tracking')}
        >
          <Text style={[styles.tabText, activeTab === 'tracking' && styles.activeTabText]}>Live Tracking</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'payment' && styles.activeTab]} 
          onPress={() => setActiveTab('payment')}
        >
          <Text style={[styles.tabText, activeTab === 'payment' && styles.activeTabText]}>UPI Payment</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {activeTab === 'tracking' ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Live Map & Rider Tracking</Text>
            <Text style={styles.label}>Enter Parcel ID:</Text>
            <TextInput 
              style={styles.input} 
              value={parcelId} 
              onChangeText={setParcelId} 
              keyboardType="numeric"
            />
            <TouchableOpacity style={styles.btn} onPress={fetchTracking}>
              <Text style={styles.btnText}>Track Parcel</Text>
            </TouchableOpacity>

            {trackingData && (
              <View style={styles.resultBox}>
                <Text style={styles.resultText}>Rider ID: {trackingData.rider_id}</Text>
                <Text style={styles.resultText}>Latitude: {trackingData.latitude}</Text>
                <Text style={styles.resultText}>Longitude: {trackingData.longitude}</Text>
                <Text style={styles.resultText}>Last Updated: {new Date(trackingData.updated_at).toLocaleTimeString()}</Text>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Online UPI Payment</Text>
            <Text style={styles.label}>Parcel ID:</Text>
            <TextInput style={styles.input} value={parcelId} onChangeText={setParcelId} keyboardType="numeric" />
            
            <Text style={styles.label}>Amount (₹):</Text>
            <TextInput style={styles.input} value={amount} onChangeText={setAmount} keyboardType="numeric" />

            <Text style={styles.label}>UPI ID (e.g., user@paytm):</Text>
            <TextInput style={styles.input} value={upiId} onChangeText={setUpiId} placeholder="Enter UPI ID" />

            <TouchableOpacity style={styles.btn} onPress={handleUpiPayment}>
              <Text style={styles.btnText}>Pay via UPI</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  header: { backgroundColor: '#4F46E5', paddingVertical: 20, alignItems: 'center', paddingTop: 40 },
  headerTitle: { color: '#FFF', fontSize: 20, fontWeight: 'bold' },
  tabContainer: { flexDirection: 'row', backgroundColor: '#FFF', elevation: 2 },
  tab: { flex: 1, paddingVertical: 15, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  activeTab: { borderBottomColor: '#4F46E5' },
  tabText: { fontSize: 14, color: '#6B7280', fontWeight: 'bold' },
  activeTabText: { color: '#4F46E5' },
  content: { padding: 16 },
  card: { backgroundColor: '#FFF', borderRadius: 12, padding: 16, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#1F2937', marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: '#4B5563', marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, padding: 12, marginBottom: 14, fontSize: 14, backgroundColor: '#F9FAFB' },
  btn: { backgroundColor: '#4F46E5', paddingVertical: 14, borderRadius: 8, alignItems: 'center', marginTop: 10 },
  btnText: { color: '#FFF', fontSize: 15, fontWeight: 'bold' },
  resultBox: { marginTop: 20, padding: 12, backgroundColor: '#EEF2FF', borderRadius: 8, borderWidth: 1, borderColor: '#C7D2FE' },
  resultText: { fontSize: 14, color: '#1E3A8A', marginBottom: 4, fontWeight: '500' }
});
