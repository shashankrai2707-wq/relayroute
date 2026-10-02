const fs = require('fs');
let found = false;
['server.js', 'db.js', 'index.js'].forEach(file => {
    if(fs.existsSync(file)) {
        let code = fs.readFileSync(file, 'utf8');
        if (code.includes('ssl:')) {
            // Remove SSL objects or true booleans and set to false
            code = code.replace(/ssl:\s*\{[\s\S]*?\}/g, 'ssl: false');
            code = code.replace(/ssl:\s*true/g, 'ssl: false');
            fs.writeFileSync(file, code);
            found = true;
        }
    }
});
if(found) console.log("✅ Local SSL Fixed!");
else console.log("⚠️ SSL config not found.");
