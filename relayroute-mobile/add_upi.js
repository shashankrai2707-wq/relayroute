const fs = require('fs');
let appCode = fs.readFileSync('App.js', 'utf8');

const targetCode = `            </View>
            <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#1F2937', marginBottom: 12 }}>डिलीवरी हिस्ट्री</Text>`;

const newUpiUI = `            </View>

            {/* UPI PAYMENT UI INTEGRATION */}
            <View style={{ marginTop: 16, backgroundColor: '#F0FDF4', borderColor: '#10B981', borderWidth: 1, padding: 16, borderRadius: 8, marginBottom: 16 }}>
              <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#065F46', marginBottom: 12 }}>💳 UPI से पैसे डालें / पेमेंट करें</Text>
              
              <TextInput 
                style={{borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, padding: 10, marginBottom: 10, backgroundColor: '#FFF'}} 
                placeholder="अमाउंट (₹)" 
                keyboardType="numeric" 
              />
              <TextInput 
                style={{borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, padding: 10, marginBottom: 10, backgroundColor: '#FFF'}} 
                placeholder="UPI ID (उदा. user@paytm)" 
              />
              
              <TouchableOpacity 
                style={{backgroundColor: '#10B981', paddingVertical: 12, borderRadius: 8, alignItems: 'center'}} 
                onPress={() => Alert.alert('UPI Payment', 'पेमेंट प्रोसेस हो रहा है... (Backend API: /api/payment/upi)')}
              >
                <Text style={{color: '#FFF', fontSize: 15, fontWeight: 'bold'}}>Pay via UPI</Text>
              </TouchableOpacity>
            </View>

            <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#1F2937', marginBottom: 12 }}>डिलीवरी हिस्ट्री</Text>`;

if(appCode.includes(targetCode)) {
    appCode = appCode.replace(targetCode, newUpiUI);
    fs.writeFileSync('App.js', appCode);
    console.log("✅ UPI Payment UI Successfully Added to Wallet Tab!");
} else {
    console.log("❌ Target code not found. File might be modified.");
}
