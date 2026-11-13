// Opens the most recent Execution_Reports/MyReport_* HTML report
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const dir = path.join(__dirname, '..', 'Execution_Reports');
const latest = fs.existsSync(dir) && fs.readdirSync(dir).filter((d) => d.startsWith('MyReport_')).sort().pop();
if (!latest) { console.log('No reports found in Execution_Reports'); process.exit(0); }
execSync(`npx playwright show-report "${path.join(dir, latest)}"`, { stdio: 'inherit' });
