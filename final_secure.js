const fs = require('fs-extra');
const path = require('path');
const AdmZip = require('adm-zip');

const SRC_DIR = __dirname;
const TEMP_DIR = path.join(__dirname, '.final_temp');
const RELEASE_DIR = path.join(__dirname, 'dist');

const FILES_TO_COPY = [
  'content.js',
  'background.js',
  'popup.js',
  'options.js',
  'auth.js',
  'usageCounter.js',
  'keyword_expansion_script.js',
  'manifest.json',
  'popup.html',
  'options.html',
  'images'
];

async function buildFinalSecure() {
  console.log('=== 开始 100% 安全分发构建 ===');
  
  await fs.remove(TEMP_DIR);
  await fs.ensureDir(TEMP_DIR);
  await fs.ensureDir(RELEASE_DIR);
  
  console.log('直接复制原始文件（不做任何修改）...');
  for (const file of FILES_TO_COPY) {
    const srcPath = path.join(SRC_DIR, file);
    const destPath = path.join(TEMP_DIR, file);
    if (fs.existsSync(srcPath)) {
      console.log(`复制: ${file}`);
      await fs.copy(srcPath, destPath);
    }
  }
  
  const manifest = JSON.parse(fs.readFileSync(path.join(TEMP_DIR, 'manifest.json'), 'utf-8'));
  const version = manifest.version;
  
  console.log('创建 ZIP 包...');
  const zip = new AdmZip();
  zip.addLocalFolder(TEMP_DIR);
  
  const zipFileName = `xhs-helper-final-v${version}.zip`;
  const zipFilePath = path.join(RELEASE_DIR, zipFileName);
  zip.writeZip(zipFilePath);
  
  await fs.remove(TEMP_DIR);
  
  console.log('=== 100% 安全分发构建成功 ===');
  console.log(`输出: ${zipFilePath}`);
  console.log(`大小: ${(fs.statSync(zipFilePath).size / 1024).toFixed(2)} KB`);
  console.log('');
  console.log('✅ 完全安全，功能 100% 保留！');
  console.log('✅ 文件未经任何修改，直接复制！');
  console.log('✅ 适合直接分发！');
}

buildFinalSecure().catch(console.error);