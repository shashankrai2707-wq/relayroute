const fs = require('fs');
let appCode = fs.readFileSync('App.js', 'utf8');

const targetCode = "            {trackedParcel && (\n              <View style={[styles.card, { marginTop: 16 }]}>";

const newMapUI = `
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
`;

if(appCode.includes(targetCode)) {
    appCode = appCode.replace(targetCode, newMapUI + "\n" + targetCode);
    fs.writeFileSync('App.js', appCode);
    console.log("✅ Live Map Tracking UI Successfully Added!");
} else {
    console.log("❌ Target code not found. File might be modified.");
}
