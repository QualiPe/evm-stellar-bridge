import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import dotenv from 'dotenv';
dotenv.config({ path: path.join(process.cwd(), '../../.env') });

interface PackageInfo {
  name: string;
  version: string;
}

function getPackageInfo(packagePath: string): PackageInfo {
  const packageJsonPath = path.join(packagePath, 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  return {
    name: packageJson.name,
    version: packageJson.version
  };
}

export async function checkPackageExists(packageName: string, version: string): Promise<boolean> {
  try {
    // Use npm view to check if the specific version exists
    const result = execSync(`npm view ${packageName}@${version} version --registry=https://npm.pkg.github.com`, { 
      encoding: 'utf8',
      stdio: 'pipe'
    });
    return result.trim() === version;
  } catch (error) {
    // If the command fails, the package/version doesn't exist
    return false;
  }
}

async function publishPackage(packageName: string, originalCwd: string) {
  console.log(`\n📤 Processing ${packageName}...`);
  
  // Get the absolute path to the project root
  const projectRoot = path.resolve('../../');
  const packagePath = path.join(projectRoot, 'packages', packageName);
  
  try {
    // Check if package directory exists
    if (!fs.existsSync(packagePath)) {
      console.error(`❌ Package directory not found: ${packagePath}`);
      return { success: false, skipped: false };
    }
    
    // Get package info
    const packageInfo = getPackageInfo(packagePath);
    console.log(`📦 Package: ${packageInfo.name}@${packageInfo.version}`);
    
    // Check if this version already exists
    const exists = await checkPackageExists(packageInfo.name, packageInfo.version);
    
    if (exists) {
      console.log(`⏭️  ${packageName}@${packageInfo.version} already exists, skipping...`);
      return { success: true, skipped: true };
    }
    
    // Change to package directory
    process.chdir(packagePath);
    
    // Publish to GitHub Packages
    console.log(`🚀 Publishing ${packageName} to GitHub Packages...`);
    execSync('pnpm publish --no-git-checks', { stdio: 'inherit' });
    
    console.log(`✅ Successfully published ${packageName}`);
    return { success: true, skipped: false };
  } catch (error) {
    console.error(`❌ Failed to publish ${packageName}:`, error);
    return { success: false, skipped: false };
  } finally {
    // Return to original working directory
    process.chdir(originalCwd);
  }
}

interface PublishResult {
  packageName: string;
  success: boolean;
  skipped: boolean;
}

async function main() {
  console.log('📤 Starting publish process...\n');
  
  // Check if NPM_TOKEN is set
  if (!process.env.NPM_TOKEN) {
    console.error('❌ NPM_TOKEN environment variable is not set.');
    console.log('Please set the NPM_TOKEN environment variable with your GitHub Personal Access Token.');
    console.log('The token should have the "write:packages" scope.');
    process.exit(1);
  }
  
  // Store the original working directory
  const originalCwd = process.cwd();
  console.log(`📍 Original working directory: ${originalCwd}`);
  
  const publishResults: PublishResult[] = [];
  
  // Publish all packages
  for (const packageName of ['htlc-contract']) {
    const result = await publishPackage(packageName, originalCwd);
    publishResults.push({ packageName, ...result });
  }
  
  // Summary
  console.log('\n📊 Publish Summary:');
  publishResults.forEach(result => {
    if (result.skipped) {
      console.log(`⏭️  ${result.packageName} (already exists)`);
    } else {
      console.log(`${result.success ? '✅' : '❌'} ${result.packageName}`);
    }
  });
  
  const failedPublishes = publishResults.filter(result => !result.success && !result.skipped);
  const successfulPublishes = publishResults.filter(result => result.success && !result.skipped);
  const skippedPackages = publishResults.filter(result => result.skipped);
  
  console.log(`\n📈 Results:`);
  console.log(`   ✅ Published: ${successfulPublishes.length}`);
  console.log(`   ⏭️  Skipped: ${skippedPackages.length}`);
  console.log(`   ❌ Failed: ${failedPublishes.length}`);
  
  if (failedPublishes.length > 0) {
    console.log('\n⚠️  Some packages failed to publish. Check the logs above.');
    process.exit(1);
  } else if (successfulPublishes.length > 0) {
    console.log('\n🎉 All packages that needed updates were successfully published!');
  } else {
    console.log('\nℹ️  No packages needed updates - all versions already exist.');
  }
}

main().catch(console.error); 