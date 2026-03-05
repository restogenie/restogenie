const fs = require('fs');
const { execSync } = require('child_process');

const envFile = fs.readFileSync('.env', 'utf8');
const lines = envFile.split('\n');

for (const line of lines) {
    if (line.trim() && !line.startsWith('#')) {
        const [key, ...values] = line.split('=');
        const value = values.join('=').replace(/^"/, '').replace(/"$/, '');

        console.log(`Adding ${key}...`);
        try {
            execSync(`npx vercel env rm ${key} production --yes`, { stdio: 'ignore' });
        } catch (e) {
            // Ignore error if it doesn't exist
        }
        try {
            execSync(`npx vercel env add ${key} production --yes`, {
                input: value,
                stdio: ['pipe', 'inherit', 'inherit']
            });
            console.log(`Success: ${key}`);
        } catch (e) {
            console.error(`Failed to add ${key}`);
        }
    }
}
