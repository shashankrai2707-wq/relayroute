require('dotenv').config();
const mongoose = require('mongoose');
console.log("⏳ Data check ho raha hai, kripya wait karein...");
mongoose.connect(process.env.MONGO_URI)
  .then(() => { console.log("✅ Badhai ho! MongoDB Successfully Connected!"); process.exit(0); })
  .catch(err => { console.error("❌ Connection Error:", err.message); process.exit(1); });
