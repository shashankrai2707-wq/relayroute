import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, SafeAreaView, Alert, Linking } from 'react-native';

export default function App() {
  const [activeTab, setActiveTab] = useState('send'); // 'send', 'explore', 'verify', 'wallet'
  
  // सेंडर स्टेट्स
  const [category, setCategory] = useState('दस्तावेज़ (Documents)');
  const [weight, setWeight] = useState('2.0');
  const [fee, setFee] = useState('250');
  const [pickup, setPickup] = useState('सेक्टर 62, नोएडा');
  const [drop, setDrop] = useState('एमजी रोड, आगरा');
  const [bookingData, setBookingData] = useState(null);

  // राइडर डिस्कवरी स्टेट्स
  const [availableParcels, setAvailableParcels] = useState([]);

  // वेरिफिकेशन स्टेट्स
  const [parcelId, setParcelId] = useState('');
  const [otp, setOtp] = useState('');
  const [verifyType, setVerifyType] = useState('pickup');
  const [verifyMsg, setVerifyMsg] = useState('');

  // वॉलेट स्टेट्स
  const [walletData, setWalletData] = useState({ totalEarnings: 0, completedCount: 0, history: [] });

  const API_URL = 'https://personality-customise-amber-seed.trycloudflare.com';

  const reqHeaders = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'bypass-tunnel-reminder': '1'
  };

  // गूगल मैप्स खोलने का फ़ंक्शन
  const openInMaps = (address) => {
    const encoded = encodeURIComponent(address);
    const url = `https://www.google.com/maps/search/?api=1&query=${encoded}`;
    Linking.openURL(url).catch(() => Alert.alert('एरर', 'गूगल मैप्स नहीं खोला जा सका'));
  };

  // पूरा रूट (पिकअप से ड्रॉप) नेविगेट करने का फ़ंक्शन
  const openRouteInMaps = (origin, destination) => {
    const encodedOrigin = encodeURIComponent(origin);
    const encodedDest = encodeURIComponent(destination);
    const url = `https://www.google.com/maps/dir/?api=1&origin=${encodedOrigin}&destination=${encodedDest}&travelmode=driving`;
    Linking.openURL(url).catch(() => Alert.alert('एरर', 'गूगल मैप्स नहीं खोला जा सका'));
  };

  const fetchAvailableParcels = async () => {
    try {
      const response = await fetch(`${API_URL}/api/parcels/available`, { headers: reqHeaders });
      const data = await response.json();
      if (data.success) {
        setAvailableParcels(data.parcels);
      }
    } catch (err) {
      Alert.alert('त्रुटि', 'पार्सल लोड नहीं हो सके');
    }
  };

  const fetchWalletData = async () => {
    try {
      const response = await fetch(`${API_URL}/api/rider/wallet`, { headers: reqHeaders });
      const data = await response.json();
      if (data.success) {
        setWalletData(data);
      }
    } catch (err) {
      Alert.alert('त्रुटि', 'वॉलेट डेटा लोड नहीं हो सका');
    }
  };

  useEffect(() => {
    if (activeTab === 'explore') fetchAvailableParcels();
    if (activeTab === 'wallet') fetchWalletData();
  }, [activeTab]);

  const handleBooking = async () => {
    try {
      const userRes = await fetch(`${API_URL}/api/user/default`, { headers: reqHeaders });
      const user = await userRes.json();

      const response = await fetch(`${API_URL}/api/parcels/create`, {
        method: 'POST',
        headers: reqHeaders,
        body: JSON.stringify({
          sender_id: user.id,
          category,
          weight_kg: parseFloat(weight),
          pickup_address: pickup,
          drop_address: drop,
          receiver_name: 'सुरेश कुमार',
          receiver_phone: '9876543210',
          delivery_fee: parseFloat(fee)
        })
      });

      const data = await response.json();
      if (data.success) {
        setBookingData(data.parcel);
        setParcelId(data.parcel.id);
        Alert.alert('सफल!', 'पार्सल सफलतापूर्वक बुक हो गया है।');
      } else {
        Alert.alert('त्रुटि', data.error || 'बुकिंग नहीं हो सकी');
      }
    } catch (err) {
      Alert.alert('कनेक्शन एरर', err.message);
    }
  };

  const handleAcceptParcel = async (id) => {
    try {
      const response = await fetch(`${API_URL}/api/parcels/accept`, {
        method: 'POST',
        headers: reqHeaders,
        body: JSON.stringify({ parcel_id: id })
      });
      const data = await response.json();
      if (data.success) {
        Alert.alert('स्वीकार किया', data.message);
        setParcelId(id);
        fetchAvailableParcels();
      }
    } catch (err) {
      Alert.alert('त्रुटि', 'पार्सल स्वीकार नहीं हो सका');
    }
  };

  const handleVerify = async () => {
    if (!parcelId || !otp) {
      Alert.alert('ध्यान दें', 'Parcel ID और OTP दोनों भरें');
      return;
    }

    const endpoint = verifyType === 'pickup' ? '/api/parcels/verify-pickup' : '/api/parcels/verify-delivery';

    try {
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: reqHeaders,
        body: JSON.stringify({ parcel_id: parcelId.trim(), otp: otp.trim() })
      });

      const data = await response.json();
      if (data.success) {
        setVerifyMsg(data.message);
        if (verifyType === 'delivery') {
          fetchWalletData();
        }
      } else {
        setVerifyMsg('त्रुटि: ' + data.error);
      }
    } catch (err) {
      setVerifyMsg('कनेक्शन एरर');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>RelayRoute</Text>
        <Text style={styles.headerSub}>पीयर-टू-पीयर पार्सल नेटवर्क</Text>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'send' && styles.activeTab]} 
          onPress={() => setActiveTab('send')}
        >
          <Text style={[styles.tabText, activeTab === 'send' && styles.activeTabText]}>भेजें</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'explore' && styles.activeTab]} 
          onPress={() => setActiveTab('explore')}
        >
          <Text style={[styles.tabText, activeTab === 'explore' && styles.activeTabText]}>खोजें</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'verify' && styles.activeTab]} 
          onPress={() => setActiveTab('verify')}
        >
          <Text style={[styles.tabText, activeTab === 'verify' && styles.activeTabText]}>OTP</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'wallet' && styles.activeTab]} 
          onPress={() => setActiveTab('wallet')}
        >
          <Text style={[styles.tabText, activeTab === 'wallet' && styles.activeTabText]}>वॉलेट</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {activeTab === 'send' && (
          <View style={styles.card}>
            <Text style={styles.label}>पिकअप लोकेशन</Text>
            <TextInput style={styles.input} value={pickup} onChangeText={setPickup} />

            <Text style={styles.label}>ड्रॉप लोकेशन</Text>
            <TextInput style={styles.input} value={drop} onChangeText={setDrop} />

            <View style={styles.row}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={styles.label}>वजन (किग्रा)</Text>
                <TextInput style={styles.input} value={weight} onChangeText={setWeight} keyboardType="numeric" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>किराया (₹)</Text>
                <TextInput style={styles.input} value={fee} onChangeText={setFee} keyboardType="numeric" />
              </View>
            </View>

            <TouchableOpacity style={styles.btnPrimary} onPress={handleBooking}>
              <Text style={styles.btnText}>पार्सल बुक करें</Text>
            </TouchableOpacity>

            {bookingData && (
              <View style={styles.successBox}>
                <Text style={styles.successTitle}>✓ पार्सल बुक हुआ!</Text>
                <Text style={styles.metaText}>ID: {bookingData.id}</Text>
                <Text style={styles.otpText}>पिकअप OTP: {bookingData.pickup_otp}</Text>
                <Text style={styles.otpText}>डिलीवरी OTP: {bookingData.delivery_otp}</Text>
              </View>
            )}
          </View>
        )}

        {activeTab === 'explore' && (
          <View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#1F2937' }}>रास्ते के उपलब्ध पार्सल</Text>
              <TouchableOpacity onPress={fetchAvailableParcels}>
                <Text style={{ color: '#4F46E5', fontWeight: 'bold' }}>रीफ़्रेश</Text>
              </TouchableOpacity>
            </View>

            {availableParcels.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={{ color: '#6B7280' }}>फिलहाल कोई नया पार्सल उपलब्ध नहीं है।</Text>
              </View>
            ) : (
              availableParcels.map((item) => (
                <View key={item.id} style={styles.parcelCard}>
                  <View style={styles.parcelHeader}>
                    <Text style={styles.categoryBadge}>{item.category}</Text>
                    <Text style={styles.feeBadge}>₹{item.delivery_fee}</Text>
                  </View>

                  <TouchableOpacity onPress={() => openInMaps(item.pickup_address)}>
                    <Text style={styles.routeText}>🟢 {item.pickup_address} <Text style={styles.mapLink}>(मैप देखें 📍)</Text></Text>
                  </TouchableOpacity>

                  <TouchableOpacity onPress={() => openInMaps(item.drop_address)}>
                    <Text style={styles.routeText}>🔴 {item.drop_address} <Text style={styles.mapLink}>(मैप देखें 📍)</Text></Text>
                  </TouchableOpacity>

                  <Text style={styles.weightText}>वजन: {item.weight_kg} किग्रा</Text>

                  {/* मैप्स रूट बटन */}
                  <TouchableOpacity 
                    style={styles.mapRouteBtn} 
                    onPress={() => openRouteInMaps(item.pickup_address, item.drop_address)}
                  >
                    <Text style={styles.mapRouteBtnText}>🗺️ गूगल मैप्स में पूरा रूट नेविगेट करें</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={styles.acceptBtn} 
                    onPress={() => handleAcceptParcel(item.id)}
                  >
                    <Text style={styles.acceptBtnText}>डिलीवरी स्वीकार करें</Text>
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>
        )}

        {activeTab === 'verify' && (
          <View style={styles.card}>
            <View style={styles.verifyTypeRow}>
              <TouchableOpacity 
                style={[styles.typeBtn, verifyType === 'pickup' && styles.typeBtnActive]}
                onPress={() => setVerifyType('pickup')}
              >
                <Text style={[styles.typeBtnText, verifyType === 'pickup' && styles.typeBtnTextActive]}>1. पिकअप OTP</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.typeBtn, verifyType === 'delivery' && styles.typeBtnActive]}
                onPress={() => setVerifyType('delivery')}
              >
                <Text style={[styles.typeBtnText, verifyType === 'delivery' && styles.typeBtnTextActive]}>2. डिलीवरी OTP</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>पार्सल ID</Text>
            <TextInput style={styles.input} value={parcelId} onChangeText={setParcelId} placeholder="UUID पेस्ट करें" />

            <Text style={styles.label}>
              {verifyType === 'pickup' ? 'पिकअप OTP (भेजने वाले से लें)' : 'डिलीवरी OTP (पाने वाले से लें)'}
            </Text>
            <TextInput 
              style={[styles.input, styles.otpInput]} 
              value={otp} 
              onChangeText={setOtp} 
              maxLength={4} 
              keyboardType="number-pad" 
            />

            <TouchableOpacity 
              style={verifyType === 'pickup' ? styles.btnSecondary : styles.btnSuccess} 
              onPress={handleVerify}
            >
              <Text style={styles.btnText}>
                {verifyType === 'pickup' ? 'पिकअप वेरिफाई करें' : 'डिलीवरी पूरी करें और पेआउट लें'}
              </Text>
            </TouchableOpacity>

            {verifyMsg ? (
              <View style={styles.msgBox}>
                <Text style={styles.msgText}>{verifyMsg}</Text>
              </View>
            ) : null}
          </View>
        )}

        {activeTab === 'wallet' && (
          <View>
            <View style={styles.walletCard}>
              <Text style={styles.walletTitle}>कुल कमाई (Total Earnings)</Text>
              <Text style={styles.walletBalance}>₹{walletData.totalEarnings}</Text>
              <Text style={styles.walletSub}>सफल डिलीवरी: {walletData.completedCount}</Text>
            </View>

            <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#1F2937', marginBottom: 12 }}>
              डिलीवरी हिस्ट्री
            </Text>

            {walletData.history.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={{ color: '#6B7280' }}>अभी तक कोई डिलीवरी पूरी नहीं हुई है।</Text>
              </View>
            ) : (
              walletData.history.map((item) => (
                <View key={item.id} style={styles.historyCard}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: 'bold', color: '#111827', fontSize: 14 }}>
                      {item.pickup_address} → {item.drop_address}
                    </Text>
                    <Text style={{ color: '#6B7280', fontSize: 11, marginTop: 4 }}>
                      पार्सल ID: {item.id.slice(0, 8)}...
                    </Text>
                  </View>
                  <Text style={styles.historyFee}>+₹{item.delivery_fee}</Text>
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  header: { backgroundColor: '#4F46E5', padding: 20, alignItems: 'center' },
  headerTitle: { color: '#FFF', fontSize: 22, fontWeight: 'bold' },
  headerSub: { color: '#C7D2FE', fontSize: 12, marginTop: 4 },
  tabContainer: { flexDirection: 'row', backgroundColor: '#FFF', borderBottomWidth: 1, borderColor: '#E5E7EB' },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  activeTab: { borderBottomWidth: 2, borderColor: '#4F46E5' },
  tabText: { color: '#6B7280', fontWeight: '600', fontSize: 13 },
  activeTabText: { color: '#4F46E5' },
  content: { padding: 16 },
  card: { backgroundColor: '#FFF', padding: 16, borderRadius: 12, elevation: 2 },
  verifyTypeRow: { flexDirection: 'row', marginBottom: 12, gap: 8 },
  typeBtn: { flex: 1, paddingVertical: 8, borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 6, alignItems: 'center', backgroundColor: '#F9FAFB' },
  typeBtnActive: { borderColor: '#4F46E5', backgroundColor: '#EEF2FF' },
  typeBtnText: { fontSize: 12, fontWeight: '600', color: '#6B7280' },
  typeBtnTextActive: { color: '#4F46E5' },
  label: { fontSize: 12, fontWeight: '600', color: '#4B5563', marginBottom: 4, marginTop: 8 },
  input: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, padding: 10, fontSize: 14, backgroundColor: '#F9FAFB' },
  row: { flexDirection: 'row' },
  btnPrimary: { backgroundColor: '#4F46E5', padding: 14, borderRadius: 8, alignItems: 'center', marginTop: 16 },
  btnSecondary: { backgroundColor: '#059669', padding: 14, borderRadius: 8, alignItems: 'center', marginTop: 16 },
  btnSuccess: { backgroundColor: '#10B981', padding: 14, borderRadius: 8, alignItems: 'center', marginTop: 16 },
  btnText: { color: '#FFF', fontWeight: 'bold', fontSize: 15 },
  successBox: { backgroundColor: '#ECFDF5', borderWidth: 1, borderColor: '#A7F3D0', padding: 12, borderRadius: 8, marginTop: 16 },
  successTitle: { color: '#065F46', fontWeight: 'bold', marginBottom: 4 },
  metaText: { fontSize: 10, color: '#374151' },
  otpText: { fontSize: 14, fontWeight: 'bold', color: '#047857', marginTop: 4 },
  otpInput: { textAlign: 'center', fontSize: 20, letterSpacing: 8, fontWeight: 'bold' },
  msgBox: { marginTop: 16, padding: 12, backgroundColor: '#F3F4F6', borderRadius: 8 },
  msgText: { textAlign: 'center', fontWeight: '600', color: '#1F2937' },
  emptyBox: { padding: 40, alignItems: 'center', backgroundColor: '#FFF', borderRadius: 12 },
  parcelCard: { backgroundColor: '#FFF', padding: 16, borderRadius: 12, marginBottom: 12, elevation: 2 },
  parcelHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  categoryBadge: { backgroundColor: '#EEF2FF', color: '#4F46E5', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, fontSize: 12, fontWeight: 'bold' },
  feeBadge: { fontSize: 18, fontWeight: 'bold', color: '#059669' },
  routeText: { fontSize: 14, color: '#374151', marginVertical: 3 },
  mapLink: { color: '#2563EB', fontSize: 12, fontWeight: 'bold' },
  weightText: { fontSize: 12, color: '#6B7280', marginTop: 4 },
  mapRouteBtn: { marginTop: 10, backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#BFDBFE', padding: 10, borderRadius: 8, alignItems: 'center' },
  mapRouteBtnText: { color: '#1D4ED8', fontWeight: 'bold', fontSize: 12 },
  acceptBtn: { marginTop: 8, backgroundColor: '#4F46E5', padding: 10, borderRadius: 8, alignItems: 'center' },
  acceptBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 13 },
  walletCard: { backgroundColor: '#1E1B4B', padding: 20, borderRadius: 16, marginBottom: 20, elevation: 4 },
  walletTitle: { color: '#C7D2FE', fontSize: 13, fontWeight: '600' },
  walletBalance: { color: '#FFF', fontSize: 32, fontWeight: 'bold', marginVertical: 6 },
  walletSub: { color: '#A5B4FC', fontSize: 12 },
  historyCard: { backgroundColor: '#FFF', padding: 14, borderRadius: 10, marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', elevation: 1 },
  historyFee: { color: '#059669', fontWeight: 'bold', fontSize: 16 }
});
