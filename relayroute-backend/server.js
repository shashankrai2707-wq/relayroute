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

// यूज़र प्रोफ़ाइल फ़ेच या डिफ़ॉल्ट बनाना
app.get('/api/user/default', async (req, res) => {
  try {
    let result = await pool.query("SELECT * FROM users LIMIT 1;");
    if (result.rows.length === 0) {
      result = await pool.query(
        "INSERT INTO users (name, phone, role) VALUES ($1, $2, $3) RETURNING *;",
        ['उपयोगकर्ता', '', 'sender']
      );
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// यूज़र प्रोफ़ाइल अपडेट करना
app.post('/api/user/update', async (req, res) => {
  try {
    const { name, phone } = req.body;
    let result = await pool.query("SELECT id FROM users LIMIT 1;");
    if (result.rows.length === 0) {
      result = await pool.query(
        "INSERT INTO users (name, phone, role) VALUES ($1, $2, 'sender') RETURNING *;",
        [name, phone]
      );
    } else {
      result = await pool.query(
        "UPDATE users SET name = $1, phone = $2 WHERE id = $3 RETURNING *;",
        [name, phone, result.rows[0].id]
      );
    }
    res.json({ success: true, user: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
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

app.get('/api/sender/orders', async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM parcels ORDER BY created_at DESC;");
    res.json({ success: true, orders: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/parcels/cancel', async (req, res) => {
  try {
    const parcel_id = req.body.parcel_id ? req.body.parcel_id.trim() : "";
    const check = await pool.query("SELECT status FROM parcels WHERE id = $1;", [parcel_id]);
    if (check.rows.length === 0) return res.status(404).json({ success: false, error: 'पार्सल नहीं मिला' });
    
    if (check.rows[0].status !== 'requested') {
      return res.status(400).json({ success: false, error: 'राइडर द्वारा स्वीकार या पिक किए गए पार्सल को कैंसिल नहीं किया जा सकता।' });
    }

    await pool.query("UPDATE parcels SET status = 'cancelled' WHERE id = $1;", [parcel_id]);
    res.json({ success: true, message: 'पार्सल सफलतापूर्वक कैंसिल कर दिया गया।' });
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

app.get('/api/rider/active-tasks', async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM parcels WHERE status IN ('accepted', 'in_transit') ORDER BY created_at DESC;");
    res.json({ success: true, tasks: result.rows });
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
    res.json({ success: true, message: 'रेटिंग दर्ज हो गई!' });
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

// डिजिटल इनवॉइस / रसीद जनरेटर (HTML to Print/PDF)
app.get('/api/invoice/:id', async (req, res) => {
  try {
    const parcelId = req.params.id.trim();
    const result = await pool.query("SELECT * FROM parcels WHERE id = $1;", [parcelId]);
    if (result.rows.length === 0) return res.status(404).send('<h1>इनवॉइस नहीं मिली</h1>');

    const p = result.rows[0];
    const orderDate = p.created_at ? new Date(p.created_at).toLocaleDateString('hi-IN', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'N/A';

    const invoiceHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>RelayRoute इनवॉइस #${p.id.slice(0, 8)}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 24px; color: #1F2937; background: #FFF; }
          .invoice-box { max-width: 600px; margin: auto; border: 1px solid #E5E7EB; border-radius: 12px; padding: 24px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
          .header { display: flex; justify-content: space-between; border-bottom: 2px solid #4F46E5; padding-bottom: 16px; margin-bottom: 20px; }
          .brand { font-size: 24px; font-weight: bold; color: #4F46E5; }
          .tagline { font-size: 11px; color: #6B7280; }
          .status { background: #ECFDF5; color: #059669; padding: 6px 12px; border-radius: 20px; font-weight: bold; font-size: 13px; align-self: flex-start; }
          .section { margin-bottom: 16px; }
          .section-title { font-size: 12px; font-weight: bold; color: #6B7280; text-transform: uppercase; margin-bottom: 6px; }
          .detail-row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px; }
          .total-box { background: #F9FAFB; border-radius: 8px; padding: 14px; margin-top: 20px; border: 1px dashed #D1D5DB; }
          .print-btn { display: block; width: 100%; text-align: center; background: #4F46E5; color: white; padding: 12px; border-radius: 8px; font-weight: bold; text-decoration: none; margin-top: 20px; border: none; cursor: pointer; }
          @media print { .print-btn { display: none; } }
        </style>
      </head>
      <body>
        <div class="invoice-box">
          <div class="header">
            <div>
              <div class="brand">RelayRoute</div>
              <div class="tagline">पीयर-टू-पीयर सुरक्षित पार्सल नेटवर्क</div>
            </div>
            <div class="status">✓ ${p.status.toUpperCase()}</div>
          </div>

          <div class="section">
            <div class="detail-row"><span><b>रसीद संख्या:</b></span><span>#${p.id.slice(0, 13)}</span></div>
            <div class="detail-row"><span><b>तारीख व समय:</b></span><span>${orderDate}</span></div>
          </div>

          <hr style="border: 0; border-top: 1px solid #E5E7EB; margin: 16px 0;">

          <div class="section">
            <div class="section-title">डिलीवरी रूट विवरण</div>
            <div class="detail-row"><span><b>पिकअप पता:</b></span><span>${p.pickup_address}</span></div>
            <div class="detail-row"><span><b>ड्रॉप पता:</b></span><span>${p.drop_address}</span></div>
            <div class="detail-row"><span><b>प्राप्तकर्ता:</b></span><span>${p.receiver_name} (${p.receiver_phone})</span></div>
            <div class="detail-row"><span><b>पार्सल प्रकार / वजन:</b></span><span>${p.category} (${p.weight_kg} kg)</span></div>
          </div>

          <div class="total-box">
            <div class="detail-row"><span>बेस डिलीवरी शुल्क:</span><span>₹50.00</span></div>
            <div class="detail-row"><span>वजन आधारित किराया:</span><span>₹${(Number(p.delivery_fee) - 50).toFixed(2)}</span></div>
            <div class="detail-row" style="font-size: 16px; font-weight: bold; color: #111827; border-top: 1px solid #E5E7EB; padding-top: 8px; margin-top: 8px;">
              <span>कुल भुगतान (UPI):</span>
              <span style="color: #059669;">₹${Number(p.delivery_fee).toFixed(2)}</span>
            </div>
          </div>

          <button class="print-btn" onclick="window.print()">🖨️ रसीद प्रिंट / PDF सेव करें</button>
        </div>
      </body>
      </html>
    `;
    res.send(invoiceHtml);
  } catch (err) {
    res.status(500).send("Invoice error: " + err.message);
  }
});

// एडमिन ऑपरेशन्स
app.get('/admin/cleanup', async (req, res) => {
  try {
    await pool.query("DELETE FROM parcels WHERE status IN ('delivered', 'cancelled');");
    res.redirect('/admin');
  } catch (err) {
    res.status(500).send("Cleanup error: " + err.message);
  }
});

app.get('/admin/add-sample', async (req, res) => {
  try {
    const userRes = await pool.query("SELECT id FROM users LIMIT 1;");
    const uid = userRes.rows[0] ? userRes.rows[0].id : null;
    const pOtp = Math.floor(1000 + Math.random() * 9000).toString();
    const dOtp = Math.floor(1000 + Math.random() * 9000).toString();
    await pool.query(
      `INSERT INTO parcels (sender_id, category, weight_kg, pickup_address, drop_address, receiver_name, receiver_phone, delivery_fee, pickup_otp, delivery_otp, status)
       VALUES ($1, 'इलेक्ट्रॉनिक्स (Electronics)', 1.5, 'कनॉट प्लेस, नई दिल्ली', 'सेक्टर 18, नोएडा', 'रोहित वर्मा', '9811122233', 110, $2, $3, 'requested');`,
      [uid, pOtp, dOtp]
    );
    res.redirect('/admin');
  } catch (err) {
    res.status(500).send("Sample error: " + err.message);
  }
});

app.get('/admin', async (req, res) => {
  try {
    const all = await pool.query("SELECT * FROM parcels ORDER BY created_at DESC;");
    const parcels = all.rows;
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
          <td style="padding: 10px; font-family: monospace; font-size: 11px;">${p.id.slice(0, 8)}...</td>
          <td style="padding: 10px;">${p.category}</td>
          <td style="padding: 10px;"><b>${p.pickup_address}</b> &rarr; ${p.drop_address}</td>
          <td style="padding: 10px;">${p.receiver_name} (${p.receiver_phone})</td>
          <td style="padding: 10px; font-weight: bold; color: #059669;">₹${p.delivery_fee}</td>
          <td style="padding: 10px;"><span style="background: ${badgeBg}; color: ${badgeColor}; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: bold;">${p.status.toUpperCase()}</span></td>
          <td style="padding: 10px; font-size: 12px;">P: <b>${p.pickup_otp}</b> \vert{} D: <b>${p.delivery_otp}</b></td>
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
              <p style="margin: 4px 0 0 0; opacity: 0.8; font-size: 13px;">बैकएंड डेटाबेस लाइव मॉनिटरिंग</p>
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

const PORT = 5000;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
const PDFDocument = require('pdfkit');

// PDF Invoice Route
app.get('/api/invoice/:orderId', async (req, res) => {
    try {
        const orderId = req.params.orderId;
        // आप चाहें तो यहाँ Neon database से आर्डर की पूरी डिटेल्स फेच कर सकते हैं

        const doc = new PDFDocument();
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=invoice-${orderId}.pdf`);

        doc.pipe(res);

        // PDF Design & Content
        doc.fontSize(22).text('RelayRoute Invoice', { align: 'center' });
        doc.moveDown();
        doc.fontSize(14).text(`Order ID: ${orderId}`);
        doc.text(`Date: ${new Date().toLocaleDateString()}`);
        doc.text('Status: Paid / Success');
        doc.moveDown();
        doc.text('Thank you for using RelayRoute!');

        doc.end();
    } catch (err) {
        console.error(err);
        res.status(500).send('Error generating PDF invoice');
    }
});
// Live GPS Location Endpoint
app.post('/api/update-location', (req, res) => {
    const { latitude, longitude } = req.body;
    console.log(`Live Location Received -> Lat: ${latitude}, Lng: ${longitude}`);
    res.json({ success: true, message: 'Location updated successfully' });
});
// 1. Notification Endpoint
app.post('/api/send-notification', (req, res) => {
    const { userId, message, title } = req.body;
    console.log(`Notification sent to User ${userId}: [${title}] ${message}`);
    // Yahan aap Firebase Cloud Messaging (FCM) ya Web Push integrate kar sakte hain
    res.json({ success: true, message: 'Notification sent successfully' });
});

// 2. Wallet & Payment Balance Endpoint
let userWallets = {}; // Temporary memory storage (Neon DB se bhi connect kar sakte hain)

app.post('/api/wallet/update', (req, res) => {
    const { userId, amount, type } = req.body; // type: 'credit' ya 'debit'
    if (!userWallets[userId]) userWallets[userId] = 0.00;

    if (type === 'credit') {
        userWallets[userId] += parseFloat(amount);
    } else if (type === 'debit') {
        if (userWallets[userId] < amount) {
            return res.status(400).json({ success: false, message: 'Insufficient balance' });
        }
        userWallets[userId] -= parseFloat(amount);
    }

    console.log(`Wallet Updated for User ${userId}. Current Balance: ${userWallets[userId]}`);
    res.json({ success: true, balance: userWallets[userId] });
});

app.get('/api/wallet/:userId', (req, res) => {
    const userId = req.params.userId;
    const balance = userWallets[userId] || 0.00;
    res.json({ success: true, balance: balance });
});
