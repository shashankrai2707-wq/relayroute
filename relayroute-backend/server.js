const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const pool = new Pool({
  user: 'u0_a78',
  host: 'localhost',
  database: 'postgres',
  port: 5432,
});

app.get('/api/user/default', async (req, res) => {
  try {
    let result = await pool.query("SELECT * FROM users LIMIT 1;");
    if (result.rows.length === 0) {
      result = await pool.query(
        "INSERT INTO users (name, phone, role) VALUES ($1, $2, $3) RETURNING *;",
        ['शशांक कुमार', '9876543210', 'sender']
      );
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/parcels/create', async (req, res) => {
  try {
    const { sender_id, category, weight_kg, pickup_address, drop_address, receiver_name, receiver_phone, delivery_fee } = req.body;
    const pickup_otp = Math.floor(1000 + Math.random() * 9000).toString();
    const delivery_otp = Math.floor(1000 + Math.random() * 9000).toString();

    const query = `
      INSERT INTO parcels (sender_id, category, weight_kg, pickup_address, drop_address, receiver_name, receiver_phone, delivery_fee, pickup_otp, delivery_otp, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'requested')
      RETURNING *;
    `;
    const values = [sender_id, category, weight_kg, pickup_address, drop_address, receiver_name, receiver_phone, delivery_fee, pickup_otp, delivery_otp];
    const result = await pool.query(query, values);
    res.json({ success: true, parcel: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// सेंडर के सभी ऑर्डर्स फेच करने का API (नया)
app.get('/api/sender/orders', async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM parcels ORDER BY created_at DESC;");
    res.json({ success: true, orders: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/parcels/track/:id', async (req, res) => {
  try {
    const parcelId = req.params.id.trim();
    const result = await pool.query("SELECT * FROM parcels WHERE id = $1;", [parcelId]);
    if (result.rows.length === 0) return res.status(404).json({ success: false, error: 'Parcel नहीं मिला' });
    res.json({ success: true, parcel: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/parcels/available', async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM parcels WHERE status = 'requested' ORDER BY created_at DESC;");
    res.json({ success: true, parcels: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/parcels/accept', async (req, res) => {
  try {
    const parcel_id = req.body.parcel_id ? req.body.parcel_id.trim() : "";
    await pool.query("UPDATE parcels SET status = 'accepted' WHERE id = $1;", [parcel_id]);
    res.json({ success: true, message: 'पार्सल स्वीकार कर लिया गया! अब पिकअप के लिए रवाना हों।' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/parcels/verify-pickup', async (req, res) => {
  try {
    const parcel_id = req.body.parcel_id ? req.body.parcel_id.trim() : "";
    const otp = req.body.otp ? req.body.otp.trim() : "";
    const result = await pool.query("SELECT * FROM parcels WHERE id = $1;", [parcel_id]);
    if (result.rows.length === 0) return res.status(404).json({ success: false, error: 'पार्सल नहीं मिला' });

    const parcel = result.rows[0];
    if (parcel.pickup_otp !== otp) return res.status(400).json({ success: false, error: 'अमान्य पिकअप OTP' });

    await pool.query("UPDATE parcels SET status = 'in_transit' WHERE id = $1;", [parcel_id]);
    res.json({ success: true, message: '✓ पिकअप वेरिफाई हुआ! पार्सल अब ट्रांज़िट में है।' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/parcels/verify-delivery', async (req, res) => {
  try {
    const parcel_id = req.body.parcel_id ? req.body.parcel_id.trim() : "";
    const otp = req.body.otp ? req.body.otp.trim() : "";
    const result = await pool.query("SELECT * FROM parcels WHERE id = $1;", [parcel_id]);
    if (result.rows.length === 0) return res.status(404).json({ success: false, error: 'पार्सल नहीं मिला' });

    const parcel = result.rows[0];
    if (parcel.status !== 'in_transit') return res.status(400).json({ success: false, error: 'पार्सल अभी ट्रांज़िट में नहीं है' });
    if (parcel.delivery_otp !== otp) return res.status(400).json({ success: false, error: 'अमान्य डिलीवरी OTP' });

    await pool.query("UPDATE parcels SET status = 'delivered' WHERE id = $1;", [parcel_id]);
    res.json({ success: true, message: `🎉 डिलीवरी सफल! ₹${parcel.delivery_fee} का भुगतान प्रोसेस हुआ।` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/parcels/rate', async (req, res) => {
  try {
    const { parcel_id, rating, feedback } = req.body;
    await pool.query("UPDATE parcels SET rating = $1, feedback = $2 WHERE id = $3;", [rating, feedback, parcel_id]);
    res.json({ success: true, message: 'रेटिंग सफलतापूर्वक दर्ज की गई!' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/rider/wallet', async (req, res) => {
  try {
    const deliveredResult = await pool.query("SELECT * FROM parcels WHERE status = 'delivered' ORDER BY created_at DESC;");
    const parcels = deliveredResult.rows;
    const totalEarnings = parcels.reduce((sum, item) => sum + Number(item.delivery_fee || 0), 0);
    res.json({ success: true, totalEarnings, completedCount: parcels.length, history: parcels });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

const PORT = 5000;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
