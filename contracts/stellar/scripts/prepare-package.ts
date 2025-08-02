import * as fs from 'fs';
import * as path from 'path';

// Path to the package.json files
const rootPackageJsonPath = path.resolve('package.json');
const packageJsonPath = path.resolve('../../packages/htlc-contract/package.json');

// Read the root package.json to get the version
const rootPackageJson = JSON.parse(fs.readFileSync(rootPackageJsonPath, 'utf8'));
const targetVersion = rootPackageJson.packageVersions['@QualiPe/htlc-contract'];

// Read the package.json file
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

// Update the name and version
packageJson.name = '@QualiPe/htlc-contract';
packageJson.version = targetVersion;

// Update the dependencies
packageJson.dependencies['@stellar/stellar-sdk'] = '^14.0.0-rc.3';

// Add repository and publishConfig
packageJson.repository = 'https://github.com/QualiPe/evm-stellar-bridge';
packageJson.publishConfig = {
  'registry': 'https://npm.pkg.github.com'
};

// Write the updated package.json back to the file
fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');

console.log(`Updated package.json: name changed to ${packageJson.name} and version set to ${packageJson.version}`); 