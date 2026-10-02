import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, Alert, Linking, Switch, Share, Vibration } from 'react-native';

export default function App() {
  const [activeTab, setActiveTab] = useState('send');
  
  // Profile State
  const [profile, setProfile] = useState({ name: '', phone: '', role: 'sender' });
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');

  // Sender States
  const categories = ['दस्तावेज़ (Documents)', 'इलेक्ट्रॉनिक्स (Electronics)', 'कपड़े / सामान (Clothes)', 'दवाइयाँ (Medicines)'];
  const [category, setCategory] = useState(categories[0]);
  const [weight, setWeight] = useState('2.0');
  const [hasInsurance, setHasInsurance] = useState(false);
  const [fee, setFee] = useState('130');
  const [pickup, setPickup] = useState('सेक्टर 62, नोएडा');
  const [drop, setDrop] = useState('एमजी रोड, आगरा');
  const [receiverName, setReceiverName] = useState('सुरेश कुमार');
  const [receiverPhone, setReceiverPhone] = useState('');
  const [bookingData, setBookingData] = useState(null);
  
  // Orders & Filter State
  const [myOrders, setMyOrders] = useState([]);
  const [orderStatusFilter, setOrderStatusFilter] = useState('all');
  const [orderSearchText, setOrderSearchText] = useState('');

  // Rider Discovery, Filter & Active Tasks
  const [availableParcels, setAvailableParcels] = useState([]);
  const [riderActiveTasks, setRiderActiveTasks] = useState([]);
  const [searchFilter, setSearchFilter] = useState('');

  // Tracking States
  const [trackParcelId, setTrackParcelId] = useState('');
  const [trackedParcel, setTrackedParcel] = useState(null);
  const [selectedRating, setSelectedRating] = useState(5);
  const [feedbackText, setFeedbackText] = useState('');
  const [ratingSubmitted, setRatingSubmitted] = useState(false);

  // Verification & Wallet
  const [parcelId, setParcelId] = useState('');
  const [otp, setOtp] = useState('');
  const [verifyType, setVerifyType] = useState('pickup');
  const [verifyMsg, setVerifyMsg] = useState('');
  const [walletData, setWalletData] = useState({ totalEarnings: 0, completedCount: 0, history: [] });

  const API_URL = 'https://relayroute.onrender.com';

  const reqHeaders = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'bypass-tunnel-reminder': '1'
  };

  const triggerVibration = (pattern = [0, 80]) => {
    try { Vibration.vibrate(pattern); } catch (e) {}
  };

  const calculateFare = (wVal, insVal) => {
    const num = parseFloat(wVal);
    let base = 50;
    if (!isNaN(num) && num > 0) base += Math.round(num * 40);
    if (insVal) base += 20;
    setFee(base.toString());
  };

  const handleWeightChange = (val) => {
    setWeight(val);
    calculateFare(val, hasInsurance);
  };

  const handleInsuranceToggle = (val) => {
    setHasInsurance(val);
    calculateFare(weight, val);
  };

  const makeCall = (phone) => {
    if (!phone) return Alert.alert('त्रुटि', 'फोन नंबर उपलब्ध नहीं है');
    Linking.openURL(`tel:${phone}`).catch(() => Alert.alert('एरर', 'कॉल नहीं हो सकी'));
  };

  const sendSMS = (phone) => {
    if (!phone) return Alert.alert('त्रुटि', 'फोन नंबर उपलब्ध नहीं है');
    Linking.openURL(`sms:${phone}?body=${encodeURIComponent('नमस्ते, RelayRoute डिलीवरी के संबंध में।')}`);
  };

  const openWhatsApp = (phone, msg) => {
    if (!phone) return Alert.alert('त्रुटि', 'फोन नंबर उपलब्ध नहीं है');
    const clean = phone.replace(/[^0-9]/g, '');
    const full = clean.length === 10 ? `91${clean}` : clean;
    const text = msg || 'नमस्ते, RelayRoute पार्सल के संबंध में।';
    Linking.openURL(`whatsapp://send?phone=${full}&text=${encodeURIComponent(text)}`);
  };

  const shareBookingDetails = async (parcel) => {
    try {
      triggerVibration([0, 40]);
      const msg = `📦 RelayRoute पार्सल अपडेट:\n• ID: ${parcel.id}\n• पिकअप: ${parcel.pickup_address}\n• ड्रॉप: ${parcel.drop_address}\n• डिलीवरी OTP: ${parcel.delivery_otp}\n\nसफलतापूर्वक ट्रैक करने के लिए RelayRoute ऐप का उपयोग करें।`;
      await Share.share({ message: msg });
    } catch (err) {
      Alert.alert('एरर', 'शेयर नहीं हो सका');
    }
  };

  const openInMaps = (address) => {
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`);
  };

  const openRouteInMaps = (origin, destination) => {
    Linking.openURL(`https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&travelmode=driving`);
  };

  const fetchProfile = async () => {
    try {
      const res = await fetch(`${API_URL}/api/user/default`, { headers: reqHeaders });
      const data = await res.json();
      setProfile(data);
      setEditName(data.name || '');
      setEditPhone(data.phone || '');
    } catch (err) {}
  };

  const saveProfile = async () => {
    if (!editPhone || editPhone.length < 10) {
      return Alert.alert('त्रुटि', 'कृपया 10 अंकों का मान्य मोबाइल नंबर दर्ज करें');
    }
    try {
      const res = await fetch(`${API_URL}/api/user/update`, {
        method: 'POST',
        headers: reqHeaders,
        body: JSON.stringify({ name: editName, phone: editPhone })
      });
      const data = await res.json();
      if (data.success) {
        setProfile(data.user);
        triggerVibration([0, 80]);
        Alert.alert('सफल', 'आपकी प्रोफ़ाइल और फ़ोन नंबर सुरक्षित हो गया!');
      }
    } catch (err) {
      Alert.alert('त्रुटि', 'अपडेट नहीं हो सका');
    }
  };

  const fetchAvailableParcels = async () => {
    try {
      const res = await fetch(`${API_URL}/api/parcels/available`, { headers: reqHeaders });
      const data = await res.json();
      if (data.success) setAvailableParcels(data.parcels);
    } catch (err) {
      Alert.alert('त्रुटि', 'पार्सल लोड नहीं हो सके');
    }
  };

  const fetchRiderTasks = async () => {
    try {
      const res = await fetch(`${API_URL}/api/rider/active-tasks`, { headers: reqHeaders });
      const data = await res.json();
      if (data.success) setRiderActiveTasks(data.tasks);
    } catch (err) {}
  };

  const fetchMyOrders = async () => {
    try {
      const res = await fetch(`${API_URL}/api/sender/orders`, { headers: reqHeaders });
      const data = await res.json();
      if (data.success) setMyOrders(data.orders);
    } catch (err) {
      Alert.alert('त्रुटि', 'ऑर्डर्स लोड नहीं हो सके');
    }
  };

  const handleCancelOrder = async (id) => {
    Alert.alert(
      'ऑर्डर कैंसिल करें',
      'क्या आप वाकई इस पार्सल बुकिंग को कैंसिल करना चाहते हैं?',
      [
        { text: 'नहीं', style: 'cancel' },
        { 
          text: 'हाँ, कैंसिल करें', 
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await fetch(`${API_URL}/api/parcels/cancel`, {
                method: 'POST',
                headers: reqHeaders,
                body: JSON.stringify({ parcel_id: id })
              });
              const data = await res.json();
              if (data.success) {
                triggerVibration([0, 150]);
                Alert.alert('सफल', data.message);
                fetchMyOrders();
              } else {
                Alert.alert('त्रुटि', data.error);
              }
            } catch (err) {
              Alert.alert('एरर', 'कैंसिल नहीं हो सका');
            }
          }
        }
      ]
    );
  };

  const fetchWalletData = async () => {
    try {
      const res = await fetch(`${API_URL}/api/rider/wallet`, { headers: reqHeaders });
      const data = await res.json();
      if (data.success) setWalletData(data);
    } catch (err) {
      Alert.alert('त्रुटि', 'वॉलेट लोड नहीं हुआ');
    }
  };

  const fetchTrackStatus = async (idToTrack) => {
    const id = (idToTrack || trackParcelId).trim();
    if (!id) return Alert.alert('ध्यान दें', 'Parcel ID दर्ज करें');
    try {
      const res = await fetch(`${API_URL}/api/parcels/track/${id}`, { headers: reqHeaders });
      const data = await res.json();
      if (data.success) {
        setTrackedParcel(data.parcel);
        setRatingSubmitted(data.parcel.rating ? true : false);
      } else {
        Alert.alert('त्रुटि', data.error);
      }
    } catch (err) {
      Alert.alert('एरर', 'स्टेटस लोड नहीं हुआ');
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  useEffect(() => {
    if (activeTab === 'explore') {
      fetchAvailableParcels();
      fetchRiderTasks();
    }
    if (activeTab === 'wallet') fetchWalletData();
    if (activeTab === 'orders') fetchMyOrders();
    if (activeTab === 'track' && trackParcelId) fetchTrackStatus(trackParcelId);
    if (activeTab === 'profile') fetchProfile();
  }, [activeTab]);

  const handleBooking = async () => {
    if (!receiverPhone || receiverPhone.length < 10) {
      return Alert.alert('ध्यान दें', 'कृपया पाने वाले का 10 अंकों का मान्य मोबाइल नंबर भरें');
    }
    try {
      const res = await fetch(`${API_URL}/api/parcels/create`, {
        method: 'POST',
        headers: reqHeaders,
        body: JSON.stringify({
          sender_id: profile.id,
          category,
          weight_kg: parseFloat(weight) || 1,
          pickup_address: pickup,
          drop_address: drop,
          receiver_name: receiverName,
          receiver_phone: receiverPhone,
          delivery_fee: parseFloat(fee) || 50
        })
      });

      const data = await res.json();
      if (data.success) {
        triggerVibration([0, 100, 50, 100]);
        setBookingData(data.parcel);
        setParcelId(data.parcel.id);
        setTrackParcelId(data.parcel.id);
        Alert.alert('सफल!', 'पार्सल बुक हो गया।');
      }
    } catch (err) {
      Alert.alert('एरर', err.message);
    }
  };

  const handleAcceptParcel = async (id) => {
    try {
      const res = await fetch(`${API_URL}/api/parcels/accept`, {
        method: 'POST',
        headers: reqHeaders,
        body: JSON.stringify({ parcel_id: id })
      });
      const data = await res.json();
      if (data.success) {
        triggerVibration([0, 80]);
        Alert.alert('स्वीकार किया', data.message);
        fetchAvailableParcels();
        fetchRiderTasks();
      }
    } catch (err) {
      Alert.alert('त्रुटि', 'स्वीकार नहीं हुआ');
    }
  };

  const startVerificationFromTask = (task) => {
    setParcelId(task.id);
    setOtp('');
    setVerifyMsg('');
    if (task.status === 'accepted') {
      setVerifyType('pickup');
    } else {
      setVerifyType('delivery');
    }
    setActiveTab('verify');
  };

  const handleVerify = async () => {
    if (!parcelId || !otp) return Alert.alert('ध्यान दें', 'Parcel ID और OTP भरें');
    const endpoint = verifyType === 'pickup' ? '/api/parcels/verify-pickup' : '/api/parcels/verify-delivery';
    try {
      const res = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: reqHeaders,
        body: JSON.stringify({ parcel_id: parcelId.trim(), otp: otp.trim() })
      });
      const data = await res.json();
      if (data.success) {
        triggerVibration([0, 120, 80, 120]);
        setVerifyMsg(data.message);
        fetchRiderTasks();
        if (verifyType === 'delivery') fetchWalletData();
      } else {
        setVerifyMsg('त्रुटि: ' + data.error);
      }
    } catch (err) {
      setVerifyMsg('कनेक्शन एरर');
    }
  };

  const submitRating = async () => {
    if (!trackedParcel) return;
    try {
      const res = await fetch(`${API_URL}/api/parcels/rate`, {
        method: 'POST',
        headers: reqHeaders,
        body: JSON.stringify({
          parcel_id: trackedParcel.id,
          rating: selectedRating,
          feedback: feedbackText
        })
      });
      const data = await res.json();
      if (data.success) {
        triggerVibration([0, 60]);
        setRatingSubmitted(true);
        Alert.alert('धन्यवाद!', 'आपकी रेटिंग दर्ज हो चुकी है।');
      }
    } catch (err) {
      Alert.alert('त्रुटि', 'रेटिंग सबमिट नहीं हो सकी');
    }
  };

  const getStepActive = (stepStatus, currentStatus) => {
    const levels = { 'requested': 1, 'accepted': 2, 'in_transit': 3, 'delivered': 4 };
    return levels[currentStatus] >= levels[stepStatus];
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'requested': return { text: 'बुक हुआ', color: '#6366F1', bg: '#EEF2FF' };
      case 'accepted': return { text: 'स्वीकार', color: '#D97706', bg: '#FEF3C7' };
      case 'in_transit': return { text: 'ट्रांज़िट में', color: '#2563EB', bg: '#EFF6FF' };
      case 'delivered': return { text: 'डिलीवर हुआ', color: '#059669', bg: '#ECFDF5' };
      case 'cancelled': return { text: 'कैंसिल हुआ', color: '#DC2626', bg: '#FEE2E2' };
      default: return { text: status, color: '#4B5563', bg: '#F3F4F6' };
    }
  };

  const filteredOrders = myOrders.filter((ord) => {
    const matchesSearch = 
      ord.receiver_name.toLowerCase().includes(orderSearchText.toLowerCase()) ||
      ord.pickup_address.toLowerCase().includes(orderSearchText.toLowerCase()) ||
      ord.drop_address.toLowerCase().includes(orderSearchText.toLowerCase());

    if (!matchesSearch) return false;
    if (orderStatusFilter === 'active') return ['requested', 'accepted', 'in_transit'].includes(ord.status);
    if (orderStatusFilter === 'delivered') return ord.status === 'delivered';
    if (orderStatusFilter === 'cancelled') return ord.status === 'cancelled';
    return true;
  });

  const filteredParcels = availableParcels.filter(p => 
    p.pickup_address.toLowerCase().includes(searchFilter.toLowerCase()) ||
    p.drop_address.toLowerCase().includes(searchFilter.toLowerCase()) ||
    p.category.toLowerCase().includes(searchFilter.toLowerCase())
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>RelayRoute</Text>
        <Text style={styles.headerSub}>पीयर-टू-पीयर पार्सल नेटवर्क</Text>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity style={[styles.tab, activeTab === 'send' && styles.activeTab]} onPress={() => setActiveTab('send')}>
          <Text style={[styles.tabText, activeTab === 'send' && styles.activeTabText]}>भेजें</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, activeTab === 'orders' && styles.activeTab]} onPress={() => setActiveTab('orders')}>
          <Text style={[styles.tabText, activeTab === 'orders' && styles.activeTabText]}>ऑर्डर्स</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, activeTab === 'track' && styles.activeTab]} onPress={() => setActiveTab('track')}>
          <Text style={[styles.tabText, activeTab === 'track' && styles.activeTabText]}>ट्रैक</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, activeTab === 'explore' && styles.activeTab]} onPress={() => setActiveTab('explore')}>
          <Text style={[styles.tabText, activeTab === 'explore' && styles.activeTabText]}>खोजें</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, activeTab === 'verify' && styles.activeTab]} onPress={() => setActiveTab('verify')}>
          <Text style={[styles.tabText, activeTab === 'verify' && styles.activeTabText]}>OTP</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, activeTab === 'wallet' && styles.activeTab]} onPress={() => setActiveTab('wallet')}>
          <Text style={[styles.tabText, activeTab === 'wallet' && styles.activeTabText]}>वॉलेट</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, activeTab === 'profile' && styles.activeTab]} onPress={() => setActiveTab('profile')}>
          <Text style={[styles.tabText, activeTab === 'profile' && styles.activeTabText]}>प्रोफ़ाइल</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* TAB 1: SEND */}
        {activeTab === 'send' && (
          <View style={styles.card}>
            <Text style={styles.label}>पार्सल प्रकार (Category)</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
              {categories.map((cat) => (
                <TouchableOpacity 
                  key={cat} 
                  style={[styles.chip, category === cat && styles.chipActive]} 
                  onPress={() => setCategory(cat)}
                >
                  <Text style={[styles.chipText, category === cat && styles.chipTextActive]}>{cat}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.label}>पिकअप लोकेशन</Text>
            <TextInput style={styles.input} value={pickup} onChangeText={setPickup} />
            <Text style={styles.label}>ड्रॉप लोकेशन</Text>
            <TextInput style={styles.input} value={drop} onChangeText={setDrop} />

            <View style={styles.row}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={styles.label}>पाने वाले का नाम</Text>
                <TextInput style={styles.input} value={receiverName} onChangeText={setReceiverName} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>मोबाइल नंबर</Text>
                <TextInput 
                  style={styles.input} 
                  value={receiverPhone} 
                  onChangeText={setReceiverPhone} 
                  keyboardType="phone-pad" 
                  placeholder="10 अंकों का नंबर"
                />
              </View>
            </View>

            <View style={styles.row}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={styles.label}>वजन (किग्रा)</Text>
                <TextInput style={styles.input} value={weight} onChangeText={handleWeightChange} keyboardType="numeric" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>किराया (₹)</Text>
                <TextInput style={[styles.input, { backgroundColor: '#ECFDF5', borderColor: '#10B981', fontWeight: 'bold' }]} value={fee} onChangeText={setFee} keyboardType="numeric" />
              </View>
            </View>

            <View style={styles.insuranceRow}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, fontWeight: 'bold', color: '#1F2937' }}>🛡️ पार्सल सुरक्षा बीमा (+₹20)</Text>
                <Text style={{ fontSize: 10, color: '#6B7280' }}>नुकसान या खोने पर 100% रिफंड गारंटी</Text>
              </View>
              <Switch value={hasInsurance} onValueChange={handleInsuranceToggle} thumbColor={hasInsurance ? "#4F46E5" : "#f4f3f4"} />
            </View>

            <TouchableOpacity style={styles.btnPrimary} onPress={handleBooking}>
              <Text style={styles.btnText}>पार्सल बुक करें (₹{fee})</Text>
            </TouchableOpacity>

            {bookingData && (
              <View style={styles.successBox}>
                <Text style={styles.successTitle}>✓ पार्सल बुक हुआ!</Text>
                <Text style={styles.metaText}>ID: {bookingData.id}</Text>
                <Text style={styles.otpText}>पिकअप OTP: {bookingData.pickup_otp}</Text>
                <Text style={styles.otpText}>डिलीवरी OTP: {bookingData.delivery_otp}</Text>
                <TouchableOpacity 
                  style={[styles.btnSecondary, { backgroundColor: '#059669', marginTop: 10 }]}
                  onPress={() => shareBookingDetails(bookingData)}
                >
                  <Text style={styles.btnText}>📲 रिसीवर के साथ शेयर करें</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* TAB 2: MY ORDERS */}
        {activeTab === 'orders' && (
          <View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#1F2937' }}>मेरे बुक किए गए ऑर्डर्स</Text>
              <TouchableOpacity onPress={fetchMyOrders}>
                <Text style={{ color: '#4F46E5', fontWeight: 'bold' }}>रीफ़्रेश</Text>
              </TouchableOpacity>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
              <TouchableOpacity style={[styles.filterChip, orderStatusFilter === 'all' && styles.filterChipActive]} onPress={() => setOrderStatusFilter('all')}>
                <Text style={[styles.filterChipText, orderStatusFilter === 'all' && styles.filterChipTextActive]}>सभी ({myOrders.length})</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.filterChip, orderStatusFilter === 'active' && styles.filterChipActive]} onPress={() => setOrderStatusFilter('active')}>
                <Text style={[styles.filterChipText, orderStatusFilter === 'active' && styles.filterChipTextActive]}>सक्रिय</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.filterChip, orderStatusFilter === 'delivered' && styles.filterChipActive]} onPress={() => setOrderStatusFilter('delivered')}>
                <Text style={[styles.filterChipText, orderStatusFilter === 'delivered' && styles.filterChipTextActive]}>डिलीवर हुए</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.filterChip, orderStatusFilter === 'cancelled' && styles.filterChipActive]} onPress={() => setOrderStatusFilter('cancelled')}>
                <Text style={[styles.filterChipText, orderStatusFilter === 'cancelled' && styles.filterChipTextActive]}>कैंसिल</Text>
              </TouchableOpacity>
            </ScrollView>

            <TextInput 
              style={[styles.input, { marginBottom: 12, backgroundColor: '#FFF' }]} 
              placeholder="🔍 नाम या शहर से ऑर्डर खोजें..." 
              value={orderSearchText} 
              onChangeText={setOrderSearchText} 
            />

            {filteredOrders.length === 0 ? (
              <View style={styles.emptyBox}><Text style={{ color: '#6B7280' }}>कोई ऑर्डर मैच नहीं हुआ।</Text></View>
            ) : (
              filteredOrders.map((ord) => {
                const badge = getStatusBadge(ord.status);
                const orderDate = ord.created_at ? new Date(ord.created_at).toLocaleDateString('hi-IN', { hour: '2-digit', minute: '2-digit' }) : '';

                return (
                  <View key={ord.id} style={styles.parcelCard}>
                    <View style={styles.parcelHeader}>
                      <Text style={styles.categoryBadge}>{ord.category}</Text>
                      <View style={{ backgroundColor: badge.bg, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 }}>
                        <Text style={{ color: badge.color, fontSize: 11, fontWeight: 'bold' }}>{badge.text}</Text>
                      </View>
                    </View>
                    <Text style={styles.routeText}>🟢 {ord.pickup_address}</Text>
                    <Text style={styles.routeText}>🔴 {ord.drop_address}</Text>
                    
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
                      <Text style={{ fontSize: 12, color: '#6B7280' }}>पाने वाले: {ord.receiver_name} {orderDate ? `• ${orderDate}` : ''}</Text>
                      <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#059669' }}>₹{ord.delivery_fee}</Text>
                    </View>

                    <View style={{ flexDirection: 'row', gap: 6, marginTop: 10 }}>
                      <TouchableOpacity 
                        style={[styles.orderTrackBtn, { flex: 2 }]}
                        onPress={() => {
                          setTrackParcelId(ord.id);
                          setActiveTab('track');
                        }}
                      >
                        <Text style={styles.orderTrackBtnText}>📍 ट्रैक</Text>
                      </TouchableOpacity>

                      {ord.status === 'delivered' && (
                        <TouchableOpacity 
                          style={[styles.orderTrackBtn, { flex: 1, backgroundColor: '#FEF3C7', borderColor: '#FCD34D' }]}
                          onPress={() => Linking.openURL(`https://relayroute.onrender.com/api/invoice/${ord.id}`)}
                        >
                          <Text style={[styles.orderTrackBtnText, { color: '#B45309' }]}>📄 रसीद</Text>
                        </TouchableOpacity>
                      )}

                      <TouchableOpacity 
                        style={[styles.orderTrackBtn, { flex: 1, backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' }]}
                        onPress={() => shareBookingDetails(ord)}
                      >
                        <Text style={[styles.orderTrackBtnText, { color: '#059669' }]}>📲 शेयर</Text>
                      </TouchableOpacity>

                      {ord.status === 'requested' && (
                        <TouchableOpacity 
                          style={styles.cancelBtn}
                          onPress={() => handleCancelOrder(ord.id)}
                        >
                          <Text style={styles.cancelBtnText}>✕ कैंसिल</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                );
              })
            )}
          </View>
        )}

        {/* TAB 3: TRACK */}
        {activeTab === 'track' && (
          <View>
            <View style={styles.card}>
              <Text style={styles.label}>ट्रैक करने के लिए पार्सल ID</Text>
              <TextInput style={styles.input} value={trackParcelId} onChangeText={setTrackParcelId} placeholder="UUID पेस्ट करें" />
              <TouchableOpacity style={styles.btnPrimary} onPress={() => fetchTrackStatus(trackParcelId)}>
                <Text style={styles.btnText}>लाइव स्टेटस देखें</Text>
              </TouchableOpacity>
            </View>


            {/* LIVE MAP TRACKING UI */}
            {trackedParcel && (
              <View style={[styles.card, { marginTop: 16, backgroundColor: '#EEF2FF', borderColor: '#4F46E5', borderWidth: 1 }]}>
                <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#1E3A8A', marginBottom: 8 }}>📍 लाइव मैप ट्रैकिंग</Text>
                <View style={{height: 200, backgroundColor: '#E5E7EB', borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginBottom: 12}}>
                  {trackedParcel.rider_id ? (
                      <>
                        <Text style={{fontSize: 32}}>🗺️</Text>
                        <Text style={{color: '#4B5563', marginTop: 8}}>राइडर लोकेशन लोड हो रही है...</Text>
                        <Text style={{fontSize: 12, color: '#6B7280', marginTop: 4}}>Latitude: 25.5788, Longitude: 83.5753</Text> 
                      </>
                  ) : (
                      <Text style={{color: '#6B7280'}}>Rider Assign होने की प्रतीक्षा है</Text>
                  )}
                </View>
                <TouchableOpacity style={[styles.btnPrimary, {backgroundColor: '#10B981'}]} onPress={() => openRouteInMaps(trackedParcel.pickup_address, trackedParcel.drop_address)}>
                   <Text style={styles.btnText}>Google Maps में खोलें</Text>
                </TouchableOpacity>
              </View>
            )}

            {trackedParcel && (
              <View style={[styles.card, { marginTop: 16 }]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
                  <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#1F2937' }}>{trackedParcel.category}</Text>
                  <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#059669' }}>₹{trackedParcel.delivery_fee}</Text>
                </View>

                <View style={styles.stepperContainer}>
                  <View style={styles.stepItem}>
                    <View style={[styles.stepCircle, getStepActive('requested', trackedParcel.status) && styles.stepCircleActive]}>
                      <Text style={styles.stepNumber}>1</Text>
                    </View>
                    <Text style={[styles.stepLabel, getStepActive('requested', trackedParcel.status) && styles.stepLabelActive]}>बुक हुआ</Text>
                  </View>
                  <View style={[styles.stepLine, getStepActive('accepted', trackedParcel.status) && styles.stepLineActive]} />
                  <View style={styles.stepItem}>
                    <View style={[styles.stepCircle, getStepActive('accepted', trackedParcel.status) && styles.stepCircleActive]}>
                      <Text style={styles.stepNumber}>2</Text>
                    </View>
                    <Text style={[styles.stepLabel, getStepActive('accepted', trackedParcel.status) && styles.stepLabelActive]}>स्वीकार</Text>
                  </View>
                  <View style={[styles.stepLine, getStepActive('in_transit', trackedParcel.status) && styles.stepLineActive]} />
                  <View style={styles.stepItem}>
                    <View style={[styles.stepCircle, getStepActive('in_transit', trackedParcel.status) && styles.stepCircleActive]}>
                      <Text style={styles.stepNumber}>3</Text>
                    </View>
                    <Text style={[styles.stepLabel, getStepActive('in_transit', trackedParcel.status) && styles.stepLabelActive]}>ट्रांज़िट</Text>
                  </View>
                  <View style={[styles.stepLine, getStepActive('delivered', trackedParcel.status) && styles.stepLineActive]} />
                  <View style={styles.stepItem}>
                    <View style={[styles.stepCircle, getStepActive('delivered', trackedParcel.status) && styles.stepCircleActive]}>
                      <Text style={styles.stepNumber}>4</Text>
                    </View>
                    <Text style={[styles.stepLabel, getStepActive('delivered', trackedParcel.status) && styles.stepLabelActive]}>डिलीवर</Text>
                  </View>
                </View>

                {trackedParcel.status === 'delivered' && (
                  <View style={styles.ratingCard}>
                    <Text style={styles.ratingTitle}>⭐ डिलीवरी अनुभव कैसा रहा?</Text>
                    {ratingSubmitted ? (
                      <Text style={{ color: '#059669', fontWeight: 'bold', textAlign: 'center', marginTop: 6 }}>✓ आपकी रेटिंग सबमिट हो चुकी है!</Text>
                    ) : (
                      <>
                        <View style={styles.starRow}>
                          {[1, 2, 3, 4, 5].map((star) => (
                            <TouchableOpacity key={star} onPress={() => setSelectedRating(star)}>
                              <Text style={[styles.starIcon, selectedRating >= star ? styles.starFilled : styles.starEmpty]}>★</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                        <TextInput style={[styles.input, { marginTop: 8 }]} placeholder="राइडर के लिए फ़ीडबैक लिखें..." value={feedbackText} onChangeText={setFeedbackText} />
                        <TouchableOpacity style={styles.btnSecondary} onPress={submitRating}>
                          <Text style={styles.btnText}>रेटिंग सबमिट करें</Text>
                        </TouchableOpacity>
                      </>
                    )}
                  </View>
                )}

                <View style={styles.contactBar}>
                  <View>
                    <Text style={{ fontSize: 13, fontWeight: 'bold', color: '#1F2937' }}>प्राप्तकर्ता: {trackedParcel.receiver_name}</Text>
                    <Text style={{ fontSize: 12, color: '#6B7280' }}>📞 {trackedParcel.receiver_phone}</Text>
                  </View>
                  <TouchableOpacity style={styles.callIconBtn} onPress={() => makeCall(trackedParcel.receiver_phone)}>
                    <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 12 }}>कॉल करें</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.otpGrid}>
                  <View style={styles.otpCard}>
                    <Text style={styles.otpCardTitle}>पिकअप OTP</Text>
                    <Text style={styles.otpCardVal}>{trackedParcel.pickup_otp}</Text>
                    <Text style={styles.otpCardSub}>राइडर को दें</Text>
                  </View>
                  <View style={styles.otpCard}>
                    <Text style={styles.otpCardTitle}>डिलीवरी OTP</Text>
                    <Text style={styles.otpCardVal}>{trackedParcel.delivery_otp}</Text>
                    <Text style={styles.otpCardSub}>रिसीवर को दें</Text>
                  </View>
                </View>

                <TouchableOpacity 
                  style={[styles.btnSecondary, { marginTop: 14, backgroundColor: '#059669' }]}
                  onPress={() => shareBookingDetails(trackedParcel)}
                >
                  <Text style={styles.btnText}>📲 पूरी जानकारी व्हाट्सएप पर शेयर करें</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* TAB 4: EXPLORE */}
        {activeTab === 'explore' && (
          <View>
            {riderActiveTasks.length > 0 && (
              <View style={{ marginBottom: 16 }}>
                <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#1E1B4B', marginBottom: 8 }}>
                  🛵 आपकी सक्रिय डिलीवरीज़ ({riderActiveTasks.length})
                </Text>
                {riderActiveTasks.map((task) => (
                  <View key={task.id} style={[styles.parcelCard, { borderColor: '#4F46E5', borderWidth: 1.5 }]}>
                    <View style={styles.parcelHeader}>
                      <Text style={[styles.categoryBadge, { backgroundColor: '#EEF2FF' }]}>{task.category}</Text>
                      <Text style={{ color: task.status === 'accepted' ? '#D97706' : '#2563EB', fontWeight: 'bold', fontSize: 12 }}>
                        {task.status === 'accepted' ? 'पिकअप बाकी' : 'ट्रांज़िट में'}
                      </Text>
                    </View>
                    <Text style={styles.routeText}>🟢 {task.pickup_address}</Text>
                    <Text style={styles.routeText}>🔴 {task.drop_address}</Text>

                    <TouchableOpacity 
                      style={[styles.btnSuccess, { marginTop: 10, padding: 10 }]}
                      onPress={() => startVerificationFromTask(task)}
                    >
                      <Text style={styles.btnText}>
                        🔐 {task.status === 'accepted' ? 'पिकअप OTP दर्ज करें' : 'डिलीवरी OTP दर्ज करें'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#1F2937' }}>रास्ते के उपलब्ध पार्सल</Text>
              <TouchableOpacity onPress={() => { fetchAvailableParcels(); fetchRiderTasks(); }}>
                <Text style={{ color: '#4F46E5', fontWeight: 'bold' }}>रीफ़्रेश</Text>
              </TouchableOpacity>
            </View>

            <TextInput 
              style={[styles.input, { marginBottom: 12, backgroundColor: '#FFF' }]} 
              placeholder="🔍 शहर या लोकेशन खोजें..." 
              value={searchFilter} 
              onChangeText={setSearchFilter} 
            />

            {filteredParcels.length === 0 ? (
              <View style={styles.emptyBox}><Text style={{ color: '#6B7280' }}>कोई नया पार्सल उपलब्ध नहीं है।</Text></View>
            ) : (
              filteredParcels.map((item) => (
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

                  <View style={styles.actionBar}>
                    <TouchableOpacity style={[styles.commBtn, { backgroundColor: '#2563EB' }]} onPress={() => makeCall(item.receiver_phone)}>
                      <Text style={styles.commBtnText}>📞 कॉल</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.commBtn, { backgroundColor: '#4B5563' }]} onPress={() => sendSMS(item.receiver_phone)}>
                      <Text style={styles.commBtnText}>💬 SMS</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.commBtn, { backgroundColor: '#059669' }]} onPress={() => openWhatsApp(item.receiver_phone)}>
                      <Text style={styles.commBtnText}>🟢 WhatsApp</Text>
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity style={styles.mapRouteBtn} onPress={() => openRouteInMaps(item.pickup_address, item.drop_address)}>
                    <Text style={styles.mapRouteBtnText}>🗺️ गूगल मैप्स में पूरा रूट नेविगेट करें</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.acceptBtn} onPress={() => handleAcceptParcel(item.id)}>
                    <Text style={styles.acceptBtnText}>डिलीवरी स्वीकार करें</Text>
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>
        )}

        {/* TAB 5: VERIFY OTP */}
        {activeTab === 'verify' && (
          <View style={styles.card}>
            <View style={styles.verifyTypeRow}>
              <TouchableOpacity style={[styles.typeBtn, verifyType === 'pickup' && styles.typeBtnActive]} onPress={() => setVerifyType('pickup')}>
                <Text style={[styles.typeBtnText, verifyType === 'pickup' && styles.typeBtnTextActive]}>1. पिकअप OTP</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.typeBtn, verifyType === 'delivery' && styles.typeBtnActive]} onPress={() => setVerifyType('delivery')}>
                <Text style={[styles.typeBtnText, verifyType === 'delivery' && styles.typeBtnActive]}>2. डिलीवरी OTP</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>पार्सल ID</Text>
            <TextInput style={styles.input} value={parcelId} onChangeText={setParcelId} placeholder="UUID पेस्ट करें" />
            <Text style={styles.label}>{verifyType === 'pickup' ? 'पिकअप OTP' : 'डिलीवरी OTP'}</Text>
            <TextInput style={[styles.input, styles.otpInput]} value={otp} onChangeText={setOtp} maxLength={4} keyboardType="number-pad" />

            <TouchableOpacity style={verifyType === 'pickup' ? styles.btnSecondary : styles.btnSuccess} onPress={handleVerify}>
              <Text style={styles.btnText}>{verifyType === 'pickup' ? 'पिकअप वेरिफाई करें' : 'डिलीवरी पूरी करें और पेआउट लें'}</Text>
            </TouchableOpacity>

            {verifyMsg ? <View style={styles.msgBox}><Text style={styles.msgText}>{verifyMsg}</Text></View> : null}
          </View>
        )}

        {/* TAB 6: WALLET */}
        {activeTab === 'wallet' && (
          <View>
            <View style={styles.walletCard}>
              <Text style={styles.walletTitle}>कुल कमाई (Total Earnings)</Text>
              <Text style={styles.walletBalance}>₹{walletData.totalEarnings}</Text>
              <Text style={styles.walletSub}>सफल डिलीवरी: {walletData.completedCount}</Text>
            </View>
            <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#1F2937', marginBottom: 12 }}>डिलीवरी हिस्ट्री</Text>
            {walletData.history.length === 0 ? (
              <View style={styles.emptyBox}><Text style={{ color: '#6B7280' }}>कोई डिलीवरी पूरी नहीं हुई।</Text></View>
            ) : (
              walletData.history.map((item) => (
                <View key={item.id} style={styles.historyCard}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: 'bold', color: '#111827', fontSize: 14 }}>{item.pickup_address} → {item.drop_address}</Text>
                    {item.rating && <Text style={{ color: '#D97706', fontSize: 12, marginTop: 2 }}>{'★'.repeat(item.rating)} ({item.feedback || 'शानदार सेवा'})</Text>}
                  </View>
                  <Text style={styles.historyFee}>+₹{item.delivery_fee}</Text>
                </View>
              ))
            )}
          </View>
        )}

        {/* TAB 7: PROFILE */}
        {activeTab === 'profile' && (
          <View style={styles.card}>
            <View style={styles.profileHeader}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{profile.name ? profile.name.charAt(0).toUpperCase() : 'U'}</Text>
              </View>
              <Text style={styles.profileName}>{profile.name || 'उपयोगकर्ता'}</Text>
              <Text style={styles.profilePhone}>{profile.phone ? `+91 ${profile.phone}` : 'नंबर दर्ज नहीं है'}</Text>
            </View>

            <Text style={styles.label}>सक्रिय भूमिका (Active Role)</Text>
            <View style={styles.roleContainer}>
              <TouchableOpacity 
                style={[styles.roleBtn, profile.role === 'sender' && styles.roleBtnActive]}
                onPress={() => setProfile({ ...profile, role: 'sender' })}
              >
                <Text style={[styles.roleBtnText, profile.role === 'sender' && styles.roleBtnTextActive]}>📦 सेंडर</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.roleBtn, profile.role === 'rider' && styles.roleBtnActive]}
                onPress={() => setProfile({ ...profile, role: 'rider' })}
              >
                <Text style={[styles.roleBtnText, profile.role === 'rider' && styles.roleBtnTextActive]}>🛵 राइडर</Text>
              </TouchableOpacity>
            </View>

            <View style={{ marginTop: 20, paddingTop: 16, borderTopWidth: 1, borderColor: '#E5E7EB' }}>
              <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#1F2937', marginBottom: 10 }}>अपनी प्रोफ़ाइल विवरण बदलें</Text>
              
              <Text style={styles.label}>आपका नाम</Text>
              <TextInput style={styles.input} value={editName} onChangeText={setEditName} placeholder="अपना नाम लिखें" />

              <Text style={styles.label}>आपका सही मोबाइल नंबर</Text>
              <TextInput 
                style={styles.input} 
                value={editPhone} 
                onChangeText={setEditPhone} 
                placeholder="10 अंकों का नंबर लिखें" 
                keyboardType="phone-pad"
                maxLength={10}
              />

              <TouchableOpacity style={[styles.btnPrimary, { marginTop: 12 }]} onPress={saveProfile}>
                <Text style={styles.btnText}>प्रोफ़ाइल सुरक्षित करें</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  header: { backgroundColor: '#4F46E5', padding: 20, alignItems: 'center' },
  headerTitle: { color: '#FFF', fontSize: 22, fontWeight: 'bold' },
  headerSub: { color: '#C7D2FE', fontSize: 12, marginTop: 4 },
  tabContainer: { flexDirection: 'row', backgroundColor: '#FFF', borderBottomWidth: 1, borderColor: '#E5E7EB' },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  activeTab: { borderBottomWidth: 2, borderColor: '#4F46E5' },
  tabText: { color: '#6B7280', fontWeight: '600', fontSize: 10 },
  activeTabText: { color: '#4F46E5' },
  content: { padding: 16 },
  card: { backgroundColor: '#FFF', padding: 16, borderRadius: 12, elevation: 2 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: '#F3F4F6', marginRight: 8, borderWidth: 1, borderColor: '#E5E7EB' },
  chipActive: { backgroundColor: '#EEF2FF', borderColor: '#4F46E5' },
  chipText: { fontSize: 12, color: '#4B5563', fontWeight: '500' },
  chipTextActive: { color: '#4F46E5', fontWeight: 'bold' },
  filterChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: '#FFF', marginRight: 8, borderWidth: 1, borderColor: '#D1D5DB' },
  filterChipActive: { backgroundColor: '#4F46E5', borderColor: '#4F46E5' },
  filterChipText: { fontSize: 12, color: '#4B5563', fontWeight: '600' },
  filterChipTextActive: { color: '#FFF', fontWeight: 'bold' },
  insuranceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F9FAFB', padding: 10, borderRadius: 8, marginVertical: 10, borderWidth: 1, borderColor: '#E5E7EB' },
  verifyTypeRow: { flexDirection: 'row', marginBottom: 12, gap: 8 },
  typeBtn: { flex: 1, paddingVertical: 8, borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 6, alignItems: 'center', backgroundColor: '#F9FAFB' },
  typeBtnActive: { borderColor: '#4F46E5', backgroundColor: '#EEF2FF' },
  typeBtnText: { fontSize: 12, fontWeight: '600', color: '#6B7280' },
  typeBtnTextActive: { color: '#4F46E5' },
  label: { fontSize: 12, fontWeight: '600', color: '#4B5563', marginBottom: 4, marginTop: 8 },
  input: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, padding: 10, fontSize: 14, backgroundColor: '#F9FAFB' },
  row: { flexDirection: 'row' },
  btnPrimary: { backgroundColor: '#4F46E5', padding: 14, borderRadius: 8, alignItems: 'center', marginTop: 16 },
  btnSecondary: { backgroundColor: '#4F46E5', padding: 10, borderRadius: 8, alignItems: 'center', marginTop: 10 },
  btnSuccess: { backgroundColor: '#10B981', padding: 14, borderRadius: 8, alignItems: 'center', marginTop: 16 },
  btnText: { color: '#FFF', fontWeight: 'bold', fontSize: 14 },
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
  actionBar: { flexDirection: 'row', gap: 8, marginTop: 10 },
  commBtn: { flex: 1, paddingVertical: 8, borderRadius: 6, alignItems: 'center' },
  commBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 11 },
  mapRouteBtn: { marginTop: 10, backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#BFDBFE', padding: 10, borderRadius: 8, alignItems: 'center' },
  mapRouteBtnText: { color: '#1D4ED8', fontWeight: 'bold', fontSize: 12 },
  acceptBtn: { marginTop: 8, backgroundColor: '#4F46E5', padding: 10, borderRadius: 8, alignItems: 'center' },
  acceptBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 13 },
  orderTrackBtn: { backgroundColor: '#EEF2FF', padding: 10, borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: '#C7D2FE' },
  orderTrackBtnText: { color: '#4F46E5', fontWeight: 'bold', fontSize: 12 },
  cancelBtn: { flex: 1, backgroundColor: '#FEF2F2', padding: 10, borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: '#FCA5A5' },
  cancelBtnText: { color: '#DC2626', fontWeight: 'bold', fontSize: 12 },
  walletCard: { backgroundColor: '#1E1B4B', padding: 20, borderRadius: 16, marginBottom: 20, elevation: 4 },
  walletTitle: { color: '#C7D2FE', fontSize: 13, fontWeight: '600' },
  walletBalance: { color: '#FFF', fontSize: 32, fontWeight: 'bold', marginVertical: 6 },
  walletSub: { color: '#A5B4FC', fontSize: 12 },
  historyCard: { backgroundColor: '#FFF', padding: 14, borderRadius: 10, marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', elevation: 1 },
  historyFee: { color: '#059669', fontWeight: 'bold', fontSize: 16 },
  stepperContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginVertical: 14 },
  stepItem: { alignItems: 'center', zIndex: 1 },
  stepCircle: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center' },
  stepCircleActive: { backgroundColor: '#4F46E5' },
  stepNumber: { color: '#FFF', fontSize: 12, fontWeight: 'bold' },
  stepLabel: { fontSize: 10, color: '#9CA3AF', marginTop: 4, fontWeight: '600' },
  stepLabelActive: { color: '#4F46E5', fontWeight: 'bold' },
  stepLine: { flex: 1, height: 3, backgroundColor: '#E5E7EB', marginHorizontal: -4, marginTop: -14 },
  stepLineActive: { backgroundColor: '#4F46E5' },
  contactBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F9FAFB', padding: 10, borderRadius: 8, marginTop: 12 },
  callIconBtn: { backgroundColor: '#10B981', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  otpGrid: { flexDirection: 'row', gap: 10, marginTop: 14 },
  otpCard: { flex: 1, backgroundColor: '#EEF2FF', padding: 12, borderRadius: 8, alignItems: 'center' },
  otpCardTitle: { fontSize: 11, color: '#4F46E5', fontWeight: 'bold' },
  otpCardVal: { fontSize: 20, fontWeight: 'bold', color: '#1E1B4B', marginVertical: 2, letterSpacing: 2 },
  otpCardSub: { fontSize: 9, color: '#6B7280' },
  ratingCard: { backgroundColor: '#FFFBEB', borderWidth: 1, borderColor: '#FDE68A', borderRadius: 8, padding: 12, marginTop: 14 },
  ratingTitle: { fontSize: 13, fontWeight: 'bold', color: '#92400E', textAlign: 'center' },
  starRow: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginVertical: 6 },
  starIcon: { fontSize: 28 },
  starFilled: { color: '#F59E0B' },
  starEmpty: { color: '#D1D5DB' },
  profileHeader: { alignItems: 'center', marginBottom: 16 },
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#4F46E5', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  avatarText: { color: '#FFF', fontSize: 28, fontWeight: 'bold' },
  profileName: { fontSize: 18, fontWeight: 'bold', color: '#1F2937' },
  profilePhone: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  roleContainer: { flexDirection: 'row', gap: 10, marginTop: 8 },
  roleBtn: { flex: 1, paddingVertical: 12, borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, alignItems: 'center', backgroundColor: '#F9FAFB' },
  roleBtnActive: { borderColor: '#4F46E5', backgroundColor: '#EEF2FF' },
  roleBtnText: { fontSize: 13, fontWeight: 'bold', color: '#6B7280' },
  roleBtnTextActive: { color: '#4F46E5' }
});
