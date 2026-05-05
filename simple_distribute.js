const fs = require('fs-extra');
const path = require('path');
const AdmZip = require('adm-zip');

const SRC_DIR = __dirname;
const RELEASE_DIR = path.join(__dirname, 'dist');

const JS_FILES = [
  'content.js',
  'background.js',
  'popup.js',
  'options.js',
  'auth.js',
  'usageCounter.js',
  'keyword_expansion_script.js'
];

const STATIC_FILES = [
  'manifest.json',
  'popup.html',
  'options.html',
  'images'
];

function minifyCode(code) {
  let result = code;
  
  // 移除单行注释
  result = result.replace(/\/\/.*$/gm, '');
  
  // 移除多行注释
  result = result.replace(/\/\*[\s\S]*?\*\//g, '');
  
  // 移除多余空白和换行
  result = result.replace(/\s+/g, ' ').trim();
  
  return result;
}

async function buildSimpleDistribution() {
  console.log('=== 开始简单分发构建 ===');
  
  await fs.ensureDir(RELEASE_DIR);
  
  // 创建临时目录
  const TEMP_DIR = path.join(__dirname, '.simple_dist_temp');
  await fs.remove(TEMP_DIR);
  await fs.ensureDir(TEMP_DIR);
  
  // 复制静态资源
  console.log('复制资源...');
  for (const file of STATIC_FILES) {
    const srcPath = path.join(SRC_DIR, file);
    const destPath = path.join(TEMP_DIR, file);
    await fs.copy(srcPath, destPath);
  }
  
  // 复制并压缩 JS 文件
  console.log('压缩代码...');
  for (const file of JS_FILES) {
    const srcPath = path.join(SRC_DIR, file);
    const destPath = path.join(TEMP_DIR, file);
    if (fs.existsSync(srcPath)) {
      console.log(`处理: ${file}`);
      const code = fs.readFileSync(srcPath, 'utf-8');
      const minified = minifyCode(code);
      fs.writeFileSync(destPath, minified);
    }
  }
  
  const manifest = JSON.parse(fs.readFileSync(path.join(TEMP_DIR, 'manifest.json'), 'utf-8'));
  const version = manifest.version;
  
  console.log('创建 ZIP 包...');
  const zip = new AdmZip();
  zip.addLocalFolder(TEMP_DIR);
  const zipFileName = `xhs-helper-dist-v${version}.zip`;
  const zipFilePath = path.join(RELEASE_DIR, zipFileName);
  zip.writeZip(zipFilePath);
  
  await fs.remove(TEMP_DIR);
  
  console.log(`=== 构建成功 ===`);
  console.log(`输出: ${zipFilePath}`);
  console.log(`大小: ${(fs.statSync(zipFilePath).size / 1024).toFixed(2)} KB`);
  console.log('');
  console.log('源码未修改，可直接解压 ZIP 用于浏览器安装使用！');
}

buildSimpleDistribution().catch(err => {
  console.error('分发构建失败:', err);
  process.exit(1);
});
