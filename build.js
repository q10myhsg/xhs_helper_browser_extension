const fs = require('fs-extra');
const path = require('path');
const JavaScriptObfuscator = require('javascript-obfuscator');
const AdmZip = require('adm-zip');

const SRC_DIR = __dirname;
const TEMP_DIR = path.join(__dirname, '.temp_build');
const RELEASE_DIR = path.join(__dirname, 'release');

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

const OBFUSCATOR_OPTIONS = {
  compact: true,
  controlFlowFlattening: true,
  controlFlowFlatteningThreshold: 0.75,
  deadCodeInjection: true,
  deadCodeInjectionThreshold: 0.4,
  debugProtection: false,
  debugProtectionInterval: 0,
  disableConsoleOutput: false,
  identifierNamesGenerator: 'hexadecimal',
  log: false,
  numbersToExpressions: true,
  renameGlobals: false,
  selfDefending: true,
  simplify: true,
  splitStrings: true,
  splitStringsChunkLength: 10,
  stringArray: true,
  stringArrayCallsTransform: true,
  stringArrayCallsTransformThreshold: 0.75,
  stringArrayEncoding: ['base64'],
  stringArrayIndexShift: true,
  stringArrayRotate: true,
  stringArrayShuffle: true,
  stringArrayWrappersCount: 2,
  stringArrayWrappersChainedCalls: true,
  stringArrayWrappersParametersMaxCount: 4,
  stringArrayWrappersType: 'function',
  stringArrayThreshold: 0.75,
  transformObjectKeys: true,
  unicodeEscapeSequence: false
};

async function obfuscateFile(srcPath, destPath) {
  console.log(`Obfuscating: ${path.basename(srcPath)}`);
  const code = fs.readFileSync(srcPath, 'utf-8');
  const obfuscationResult = JavaScriptObfuscator.obfuscate(code, OBFUSCATOR_OPTIONS);
  fs.writeFileSync(destPath, obfuscationResult.getObfuscatedCode());
}

async function build() {
  console.log('=== 开始构建 ===');
  
  // 清理并创建临时目录
  console.log('清理临时目录...');
  await fs.remove(TEMP_DIR);
  await fs.ensureDir(TEMP_DIR);
  await fs.ensureDir(RELEASE_DIR);
  
  // 复制静态文件
  console.log('复制静态文件...');
  for (const file of STATIC_FILES) {
    const srcPath = path.join(SRC_DIR, file);
    const destPath = path.join(TEMP_DIR, file);
    await fs.copy(srcPath, destPath);
  }
  
  // 混淆 JS 文件
  console.log('混淆 JavaScript 文件...');
  for (const file of JS_FILES) {
    const srcPath = path.join(SRC_DIR, file);
    const destPath = path.join(TEMP_DIR, file);
    if (fs.existsSync(srcPath)) {
      await obfuscateFile(srcPath, destPath);
    }
  }
  
  // 读取 manifest 获取版本号
  const manifest = JSON.parse(fs.readFileSync(path.join(TEMP_DIR, 'manifest.json'), 'utf-8'));
  const version = manifest.version;
  
  // 创建 ZIP 包
  console.log('创建 ZIP 包...');
  const zip = new AdmZip();
  zip.addLocalFolder(TEMP_DIR);
  
  const zipFileName = `xhs-helper-v${version}.zip`;
  const zipFilePath = path.join(RELEASE_DIR, zipFileName);
  zip.writeZip(zipFilePath);
  
  // 清理临时目录
  console.log('清理临时目录...');
  await fs.remove(TEMP_DIR);
  
  console.log(`=== 构建完成 ===`);
  console.log(`输出文件: ${zipFilePath}`);
}

build().catch(err => {
  console.error('构建失败:', err);
  process.exit(1);
});
