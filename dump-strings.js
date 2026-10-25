import fs from 'fs';
import path from 'path';

const INPUT_PATH = path.resolve('dist');
const OUTPUT_PATH = path.resolve('src/i18n/strings.json');

if (!fs.existsSync(path.join(INPUT_PATH, 'index.js'))) {
    console.info(`${path.join(INPUT_PATH, 'index.js')} does not exist, did you forget the build the plugin?`);
    process.exit();
}

// The bundle is split into chunks, read all of them
const content = fs.readdirSync(INPUT_PATH)
    .filter((file) => file.endsWith('.js'))
    .sort()
    .map((file) => fs.readFileSync(path.join(INPUT_PATH, file), 'utf8'))
    .join('\n');

const matches = content.matchAll(/(?<![A-z\d])trans_string\('(.+?)', ?'(.+?)'\)/g);
const steamMatchesArr = Array.from(content.matchAll(/(?<![A-z\d])trans_string\('([^']+)', ?'([^']+)', ?(?:true|1)\)/g));
const steamMatchesFlat = steamMatchesArr.map((x) => x[1]);

const strings = {};
for (const [, key, str] of matches) {
    if (!steamMatchesFlat.includes(key)) {
        strings[key] = str.replace(/(?:\\(.))/, '$1');
    }
}
fs.writeFileSync(OUTPUT_PATH, JSON.stringify(strings, null, 2));
console.info(`Saved ${Object.keys(strings).length} strings to ${OUTPUT_PATH}`);
