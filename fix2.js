const fs = require("fs");
let lines = fs.readFileSync("app.js", "utf8").split("\n");
const idx = lines.findIndex(l => l.includes("// --- INITIALIZE SYSTEM BOOTSTRAP ---"));
lines.splice(idx, 0, "  }");
fs.writeFileSync("app.js", lines.join("\n"));

