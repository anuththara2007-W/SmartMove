const fs = require('fs');
fs.appendFileSync('public/global.css', `\n.nav-dropdown-content::before {\n    content: '';\n    position: absolute;\n    top: -20px;\n    left: 0;\n    width: 100%;\n    height: 20px;\n    background: transparent;\n}\n`);
