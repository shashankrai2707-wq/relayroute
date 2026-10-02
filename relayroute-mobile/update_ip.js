const fs = require('fs');
const os = require('os');
const nets = os.networkInterfaces();
let ip = '127.0.0.1';
for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
        if (net.family === 'IPv4' && !net.internal) {
            ip = net.address;
        }
    }
}
let code = fs.readFileSync('App.js', 'utf8');
code = code.replace(/const API_URL = .*/g, `const API_URL = 'http://${ip}:5000';`);
fs.writeFileSync('App.js', code);
console.log('✅ API_URL updated to: http://' + ip + ':5000');
