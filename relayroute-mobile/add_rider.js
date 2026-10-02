const fs = require('fs');
let appCode = fs.readFileSync('App.js', 'utf8');

const searchString = "₹{ord.delivery_fee}</Text>";
let targetIndex = appCode.indexOf(searchString);

if (targetIndex !== -1) {
    let viewEndIndex = appCode.indexOf("</View>", targetIndex) + 7;
    let beforeCode = appCode.substring(0, viewEndIndex);
    let afterCode = appCode.substring(viewEndIndex);
    
    const newRiderUI = `
                    {/* RIDER MATCHING UI INTEGRATION */}
                    {ord.status === 'pending' && (
                      <View style={{ marginTop: 12, padding: 12, backgroundColor: '#FFFBEB', borderRadius: 8, borderWidth: 1, borderColor: '#FDE68A' }}>
                        <Text style={{ fontSize: 13, fontWeight: 'bold', color: '#92400E', marginBottom: 6 }}>🤝 संभावित राइडर मिला!</Text>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                          <View>
                            <Text style={{ fontSize: 14, color: '#1F2937', fontWeight: 'bold' }}>Ramesh Kumar <Text style={{color: '#D97706'}}>★ 4.8</Text></Text>
                            <Text style={{ fontSize: 12, color: '#6B7280' }}>सूरत से गाज़ीपुर (Oct 10-11, 2026)</Text>
                          </View>
                          <TouchableOpacity 
                            style={{ backgroundColor: '#D97706', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6 }}
                            onPress={() => Alert.alert('Rider Accepted', 'आपने इस राइडर को अप्रूव कर दिया है।')}
                          >
                            <Text style={{ color: '#FFF', fontSize: 12, fontWeight: 'bold' }}>Accept</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}
                    {ord.status === 'accepted' && (
                      <View style={{ marginTop: 12, padding: 10, backgroundColor: '#ECFDF5', borderRadius: 8, borderWidth: 1, borderColor: '#A7F3D0', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Text style={{ fontSize: 13, color: '#065F46', fontWeight: 'bold' }}>✓ राइडर असाइन हो गया</Text>
                        <TouchableOpacity onPress={() => Alert.alert('Chat', 'राइडर से चैट शुरू की जा रही है...')}>
                          <Text style={{ color: '#059669', fontSize: 13, fontWeight: 'bold' }}>💬 चैट करें</Text>
                        </TouchableOpacity>
                      </View>
                    )}`;

    fs.writeFileSync('App.js', beforeCode + newRiderUI + afterCode);
    console.log("✅ Rider Matching UI Successfully Added to Orders Tab!");
} else {
    console.log("❌ Target code not found.");
}
