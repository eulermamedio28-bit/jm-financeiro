const fs=require('node:fs'),assert=require('node:assert/strict');
const html=fs.readFileSync('www/index.html','utf8');
assert.equal((html.match(/src="cloud-app.js"/g)||[]).length,1);
assert.doesNotMatch(html,/id="premiumSummary"|id="jm-sync-panel"|id="v-receitas"|android-summary-ui.js/);
assert.match(html,/data:image\/png;base64/,'Original embedded logo must remain');
assert.match(html,/id="cloud-app"/);
console.log('Single cloud dashboard; original logo preserved; legacy local handlers excluded.');
