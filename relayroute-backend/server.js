const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const connectDB = require('./db');

connectDB();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const userSchema = new mongoose.Schema({
  name: { type: String, default: 'उपयोगकर्ता' },
  phone: { type: String, default: '' },
  role: { type: String, default: 'sender' }
}, { timestamps: true });
const User = mongoose.model('User', userSchema);

const orderSchema = new mongoose.Schema({
  sender_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  category: String,
  weight_kg: Number,
  pickup_address: String,
  drop_address: String,
  receiver_name: String,
  receiver_phone: String,
  delivery_fee: Number,
  pickup_otp: String,
  delivery_otp: String,
  status: { type: String, default: 'requested' },
  rating: { type: Number, default: null },
  feedback: { type: String, default: '' }
}, { timestamps: true });
const Order = mongoose.model('Order', orderSchema);

const walletSchema = new mongoose.Schema({
  user_id: { type: String, unique: true },
  balance: { type: Number, default: 0.00 }
}, { timestamps: true });
const Wallet = mongoose.model('Wallet', walletSchema);

const riderLocationSchema = new mongoose.Schema({
  rider_id: { type: String, unique: true },
  parcel_id: String,
  latitude: Number,
  longitude: Number
}, { timestamps: true });
const RiderLocation = mongoose.model('RiderLocation', riderLocationSchema);

const paymentSchema = new mongoose.Schema({
  user_id: String,
  parcel_id: String,
  amount: Number,
  upi_id: String,
  transaction_id: String,
  status: { type: String, default: 'SUCCESS' }
}, { timestamps: true });
const Payment = mongoose.model('Payment', paymentSchema);

app.get('/api/user/default', async (req, res) => {
  try {
    let user = await User.findOne();
    if (!user) {
      user = await User.create({ name: 'उपयोगकर्ता', phone: '', role: 'sender' });
    }
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/user/update', async (req, res) => {
  try {
    const { name, phone } = req.body;
    let user = await User.findOne();
    if (!user) {
      user = await User.create({ name, phone, role: 'sender' });
    } else {
      user.name = name;
      user.phone = phone;
      await user.save();
    }
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/parcels/create', async (req, res) => {
  try {
    const { sender_id, category, weight_kg, pickup_address, drop_address, receiver_name, receiver_phone, delivery_fee } = req.body;
    const pickup_otp = Math.floor(1000 + Math.random() * 9000).toString();
    const delivery_otp = Math.floor(1000 + Math.random() * 9000).toString();

    const parcel = await Order.create({
      sender_id, category, weight_kg, pickup_address, drop_address,
      receiver_name, receiver_phone, delivery_fee, pickup_otp, delivery_otp, status: 'requested'
    });
    res.json({ success: true, parcel });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/sender/orders', async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.json({ success: true, orders });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/parcels/cancel', async (req, res) => {
  try {
    const parcel_id = req.body.parcel_id ? req.body.parcel_id.trim() : "";
    const parcel = await Order.findById(parcel_id);
    if (!parcel) return res.status(404).json({ success: false, error: 'पार्सल नहीं मिला' });
    if (parcel.status !== 'requested') {
      return res.status(400).json({ success: false, error: 'राइडर द्वारा स्वीकार या पिक किए गए पार्सल को कैंसिल नहीं किया जा सकता।' });
    }
    parcel.status = 'cancelled';
    await parcel.save();
    res.json({ success: true, message: 'पार्सल सफलतापूर्वक कैंसिल कर दिया गया।' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/parcels/track/:id', async (req, res) => {
  try {
    const parcelId = req.params.id.trim();
    const parcel = await Order.findById(parcelId);
    if (!parcel) return res.status(404).json({ success: false, error: 'Parcel नहीं मिला' });
    res.json({ success: true, parcel });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/parcels/available', async (req, res) => {
  try {
    const parcels = await Order.find({ status: 'requested' }).sort({ createdAt: -1 });
    res.json({ success: true, parcels });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/rider/active-tasks', async (req, res) => {
  try {
    const tasks = await Order.find({ status: { $in: ['accepted', 'in_transit'] } }).sort({ createdAt: -1 });
    res.json({ success: true, tasks });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/parcels/accept', async (req, res) => {
  try {
    const parcel_id = req.body.parcel_id ? req.body.parcel_id.trim() : "";
    await Order.findByIdAndUpdate(parcel_id, { status: 'accepted' });
    res.json({ success: true, message: 'पार्सल स्वीकार कर लिया गया! अब पिकअप के लिए रवाना हों।' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/parcels/verify-pickup', async (req, res) => {
  try {
    const parcel_id = req.body.parcel_id ? req.body.parcel_id.trim() : "";
    const otp = req.body.otp ? req.body.otp.trim() : "";
    const parcel = await Order.findById(parcel_id);
    if (!parcel) return res.status(404).json({ success: false, error: 'पार्सल नहीं मिला' });
    if (parcel.pickup_otp !== otp) return res.status(400).json({ success: false, error: 'अमान्य पिकअप OTP' });
    parcel.status = 'in_transit';
    await parcel.save();
    res.json({ success: true, message: '✓ पिकअप वेरिफाई हुआ! पार्सल अब ट्रांज़िट में है।' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/parcels/verify-delivery', async (req, res) => {
  try {
    const parcel_id = req.body.parcel_id ? req.body.parcel_id.trim() : "";
    const otp = req.body.otp ? req.body.otp.trim() : "";
    const parcel = await Order.findById(parcel_id);
    if (!parcel) return res.status(404).json({ success: false, error: 'पार्सल नहीं मिला' });
    if (parcel.status !== 'in_transit') return res.status(400).json({ success: false, error: 'पार्सल अभी ट्रांज़िट में नहीं है' });
    if (parcel.delivery_otp !== otp) return res.status(400).json({ success: false, error: 'अमान्य डिलीवरी OTP' });
    parcel.status = 'delivered';
    await parcel.save();
    res.json({ success: true, message: `🎉 डिलीवरी सफल! ₹${parcel.delivery_fee} का भुगतान प्रोसेस हुआ।` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/parcels/rate', async (req, res) => {
  try {
    const { parcel_id, rating, feedback } = req.body;
    await Order.findByIdAndUpdate(parcel_id, { rating, feedback });
    res.json({ success: true, message: 'रेटिंग दर्ज हो गई!' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/rider/wallet', async (req, res) => {
  try {
    const parcels = await Order.find({ status: 'delivered' }).sort({ createdAt: -1 });
    const totalEarnings = parcels.reduce((sum, item) => sum + Number(item.delivery_fee || 0), 0);
    res.json({ success: true, totalEarnings, completedCount: parcels.length, history: parcels });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/wallet/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    let wallet = await Wallet.findOne({ user_id: userId });
    if (!wallet) {
      wallet = await Wallet.create({ user_id: userId, balance: 0.00 });
    }
    res.json({ success: true, balance: wallet.balance });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Database error' });
  }
});

app.post('/api/wallet/update', async (req, res) => {
  try {
    const { userId, amount, type } = req.body;
    let wallet = await Wallet.findOne({ user_id: userId });
    let currentBalance = wallet ? wallet.balance : 0.00;
    let newBalance = currentBalance;
    if (type === 'credit') {
      newBalance += parseFloat(amount);
    } else if (type === 'debit') {
      if (currentBalance < amount) {
        return res.status(400).json({ success: false, message: 'Insufficient balance' });
      }
      newBalance -= parseFloat(amount);
    }
    wallet = await Wallet.findOneAndUpdate(
      { user_id: userId },
      { balance: newBalance },
      { upsert: true, new: true }
    );
    res.json({ success: true, balance: wallet.balance });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Database error' });
  }
});

app.post('/api/rider/location', async (req, res) => {
  try {
    const { rider_id, parcel_id, latitude, longitude } = req.body;
    await RiderLocation.findOneAndUpdate(
      { rider_id },
      { parcel_id, latitude, longitude },
      { upsert: true, new: true }
    );
    res.json({ success: true, message: 'Location updated successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/parcels/location/:id', async (req, res) => {
  try {
    const parcelId = req.params.id;
    const location = await RiderLocation.findOne({ parcel_id: parcelId }).sort({ updatedAt: -1 });
    if (!location) return res.status(404).json({ success: false, message: 'Location not found' });
    res.json({ success: true, location });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/payment/upi', async (req, res) => {
  try {
    const { user_id, amount, upi_id, parcel_id } = req.body;
    const transactionId = 'UPI_' + Date.now();
    await Payment.create({ user_id, parcel_id, amount, upi_id, transaction_id: transactionId, status: 'SUCCESS' });
    res.json({ success: true, message: 'UPI Payment successful', transaction_id: transactionId });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Payment processing error' });
  }
});

app.get('/admin', async (req, res) => {
  try {
    const parcels = await Order.find().sort({ createdAt: -1 });
    const total = parcels.length;
    const active = parcels.filter(p => ['requested', 'accepted', 'in_transit'].includes(p.status)).length;
    const delivered = parcels.filter(p => p.status === 'delivered').length;
    const cancelled = parcels.filter(p => p.status === 'cancelled').length;
    const earnings = parcels.filter(p => p.status === 'delivered').reduce((s, p) => s + Number(p.delivery_fee || 0), 0);

    let rowsHtml = parcels.map(p => {
      let badgeBg = '#EEF2FF', badgeColor = '#4F46E5';
      if (p.status === 'delivered') { badgeBg = '#ECFDF5'; badgeColor = '#059669'; }
      if (p.status === 'cancelled') { badgeBg = '#FEE2E2'; badgeColor = '#DC2626'; }
      if (p.status === 'accepted') { badgeBg = '#FEF3C7'; badgeColor = '#D97706'; }

      return `
        <tr style="border-bottom: 1px solid #E5E7EB; text-align: left;">
          <td style="padding: 10px; font-family: monospace; font-size: 11px;">${p._id.toString().slice(-8)}...</td>
          <td style="padding: 10px;">${p.category}</td>
          <td style="padding: 10px;"><b>${p.pickup_address}</b> &rarr; ${p.drop_address}</td>
          <td style="padding: 10px;">${p.receiver_name} (${p.receiver_phone})</td>
          <td style="padding: 10px; font-weight: bold; color: #059669;">₹${p.delivery_fee}</td>
          <td style="padding: 10px;"><span style="background: ${badgeBg}; color: ${badgeColor}; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: bold;">${p.status.toUpperCase()}</span></td>
          <td style="padding: 10px; font-size: 12px;">P: <b>${p.pickup_otp}</b> | D: <b>${p.delivery_otp}</b></td>
        </tr>
      `;
    }).join('');

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>RelayRoute एडमिन डैशबोर्ड</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #F3F4F6; margin: 0; padding: 20px; color: #1F2937; }
          .container { max-width: 1000px; margin: auto; }
          .header { background: #4F46E5; color: white; padding: 20px; border-radius: 12px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; }
          .btn-group { display: flex; gap: 8px; }
          .btn { color: white; border: none; padding: 8px 12px; border-radius: 6px; font-weight: bold; cursor: pointer; text-decoration: none; font-size: 12px; }
          .btn-clean { background: #EF4444; }
          .btn-add { background: #10B981; }
          .stats { display: flex; gap: 12px; margin-bottom: 20px; flex-wrap: wrap; }
          .stat-card { background: white; padding: 16px; border-radius: 10px; flex: 1; min-width: 140px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
          .stat-val { font-size: 24px; font-weight: bold; margin-top: 4px; color: #111827; }
          .table-box { background: white; border-radius: 12px; overflow-x: auto; box-shadow: 0 1px 3px rgba(0,0,0,0.1); padding: 16px; }
          table { width: 100%; border-collapse: collapse; font-size: 13px; }
          th { background: #F9FAFB; padding: 10px; border-bottom: 2px solid #E5E7EB; text-align: left; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div>
              <h2 style="margin: 0;">RelayRoute लाइव एडमिन कंट्रोल</h2>
              <p style="margin: 4px 0 0 0; opacity: 0.8; font-size: 13px;">MongoDB Cloud Database मॉनिटरिंग</p>
            </div>
            <div class="btn-group">
              <a href="/admin/add-sample" class="btn btn-add">+ नया टेस्ट पार्सल</a>
              <a href="/admin/cleanup" onclick="return confirm('क्या आप पुराने डिलीवर और कैंसिल्ड पार्सल्स हटाना चाहते हैं?');" class="btn btn-clean">🧹 पुराने साफ़ करें</a>
            </div>
          </div>
          <div class="stats">
            <div class="stat-card"><div>कुल पार्सल्स</div><div class="stat-val">${total}</div></div>
            <div class="stat-card"><div>सक्रिय ऑर्डर्स</div><div class="stat-val" style="color: #2563EB;">${active}</div></div>
            <div class="stat-card"><div>डिलीवर हुए</div><div class="stat-val" style="color: #059669;">${delivered}</div></div>
            <div class="stat-card"><div>कैंसिल हुए</div><div class="stat-val" style="color: #DC2626;">${cancelled}</div></div>
            <div class="stat-card"><div>कुल वॉल्यूम</div><div class="stat-val" style="color: #4F46E5;">₹${earnings}</div></div>
          </div>
          <div class="table-box">
            <h3 style="margin-top: 0;">सभी पार्सल रिकॉर्ड्स</h3>
            <table>
              <thead>
                <tr><th>ID</th><th>प्रकार</th><th>रूट</th><th>रिसीवर</th><th>किराया</th><th>स्थिति</th><th>OTPs</th></tr>
              </thead>
              <tbody>
                ${rowsHtml || '<tr><td colspan="7" style="text-align: center; padding: 20px;">कोई पार्सल नहीं मिला</td></tr>'}
              </tbody>
            </table>
          </div>
        </div>
      </body>
      </html>
    `;
    res.send(html);
  } catch (err) {
    res.status(500).send("Error: " + err.message);
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
