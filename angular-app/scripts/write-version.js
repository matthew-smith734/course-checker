const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const pkgPath = path.join(projectRoot, 'package.json');
const pkg = require(pkgPath);
const versionFromEnv = process.env.COURSE_CHECKER_VERSION;
const version = versionFromEnv || process.env.npm_package_version || pkg.version || '0.0.0';
const assetsDir = path.join(projectRoot, 'src', 'assets');
const outputPath = path.join(assetsDir, 'version.json');

fs.mkdirSync(assetsDir, { recursive: true });

const versionPayload = {
  version,
  generatedAt: new Date().toISOString()
};

fs.writeFileSync(outputPath, JSON.stringify(versionPayload, null, 2) + '\n', 'utf8');

console.log(`Generated version metadata at ${outputPath}`);
