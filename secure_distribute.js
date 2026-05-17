const fs = require('fs-extra');
const path = require('path');
const JavaScriptObfuscator = require('javascript-obfuscator');
const AdmZip = require('adm-zip');

const SRC_DIR = __dirname;
const TEMP_DIR = path.join(__dirname, '.secure_temp');
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

const RESERVED_NAMES = [
  // 核心功能函数名 - 必须保留
  'isExtensionContextValid',
  'safeChromeCall',
  'init',
  'insertPromptToChat',
  'insertToDoubao',
  'insertToWenxin',
  'insertToDeepseek',
  'downloadNoteImages',
  'addDownloadButton',
  'addNoteMouseEvents',
  'addNoteDetailMouseEvents',
  'addPopupImageMouseEvents',
  'addAllDownloadEvents',
  'cleanupExtraDownloadButtons',
  'setupMutationObserver',
  'executeSearchAutomation',
  'clickImageTextButton',
  'mouseenterFilterButton',
  'selectSortBy',
  'selectPublishTime',
  'filterByLikeCount',
  'processNoteItems',
  'moveMouseToBottomLeft',
  'ensureFilterPanelOpen',
  'expandKeywords',
  'findSearchInput',
  'checkFeatureAvailability',
  'initPermissions',
  'initUsageCounter',
  'getDeviceInfo',
  'incrementUsage',
  
  // 常量名
  'FEATURE_TYPES',
  'PROMPT_WORD',
  'HIGH_VALUE_NOTES',
  'KEYWORD_EXPANSION',
  
  // 全局变量
  'cachedSettings',
  'mutationTimeout',
  'scrollTimeout',
  
  // Chrome 扩展 API
  'chrome',
  'runtime',
  'storage',
  'onChanged',
  'lastError',
  'onMessage',
  'sendMessage',
  'namespace',
  'sync',
  
  // DOM API
  'document',
  'window',
  'console',
  'querySelector',
  'querySelectorAll',
  'value',
  'innerHTML',
  'textContent',
  'addEventListener',
  'dispatchEvent',
  'style',
  'display',
  'location',
  'hostname',
  'href',
  'setTimeout',
  'setInterval',
  'clearTimeout',
  'Event',
  'MouseEvent',
  'MutationObserver',
  'isContentEditable',
  'appendChild',
  'createTextNode',
  'parentNode',
  'hasAttribute',
  'setAttribute',
  'classList',
  'contains',
  'remove',
  'add',
  'keys',
  'length',
  'then',
  'catch',
  'get',
  'getContext',
  'drawImage',
  'toDataURL',
  'width',
  'height',
  'src',
  'dataset',
  
  // 数据属性名
  'action',
  'prompt',
  'success',
  'error',
  'message',
  'settings',
  'sendResponse',
  'sender',
  'available',
  'newValue',
  'downloadSettings',
  'enableSearchAutomation',
  'enableImageText',
  'sortBy',
  'publishTime',
  'most-liked',
  'week',
  'enableDownload',
  
  // CSS 选择器和类名
  'img-container',
  'img',
  'hp-download-btn',
  'query-note-wrapper',
  'query-note-item',
  'item-wrapper',
  'item-cover',
  'data-hp-detail-download-added',
  'data-hp-download-added',
  'media-container',
  'hp-slider-container',
  'data-hp-popup-download-added',
  'text',
  'aria-hidden',
  'button-hp-installed',
  'data-hp-kind',
  'hp-',
  
  // 字符串字面量
  'doubao',
  'wenxin',
  'deepseek',
  'xhs',
  'xiaohongshu'
];

const STRONG_OBFUSCATOR_OPTIONS = {
  compact: true,
  controlFlowFlattening: false,
  deadCodeInjection: false,
  debugProtection: false,
  disableConsoleOutput: false,
  identifierNamesGenerator: 'mangled',
  log: false,
  numbersToExpressions: false,
  renameGlobals: false,
  renameProperties: false,
  selfDefending: false,
  simplify: true,
  splitStrings: false,
  stringArray: false,
  target: 'browser',
  transformObjectKeys: false,
  unicodeEscapeSequence: false,
  reservedNames: RESERVED_NAMES
};

async function obfuscateFile(srcPath, destPath) {
  console.log(`混淆: ${path.basename(srcPath)}`);
  const code = fs.readFileSync(srcPath, 'utf-8');
  const obfuscationResult = JavaScriptObfuscator.obfuscate(code, STRONG_OBFUSCATOR_OPTIONS);
  fs.writeFileSync(destPath, obfuscationResult.getObfuscatedCode());
}

async function buildSecureDistribution() {
  console.log('=== 开始强保护分发构建 ===');
  
  await fs.remove(TEMP_DIR);
  await fs.ensureDir(TEMP_DIR);
  await fs.ensureDir(RELEASE_DIR);
  
  console.log('复制静态资源...');
  for (const file of STATIC_FILES) {
    const srcPath = path.join(SRC_DIR, file);
    const destPath = path.join(TEMP_DIR, file);
    await fs.copy(srcPath, destPath);
  }
  
  console.log('强保护混淆 JavaScript 代码...');
  for (const file of JS_FILES) {
    const srcPath = path.join(SRC_DIR, file);
    const destPath = path.join(TEMP_DIR, file);
    if (fs.existsSync(srcPath)) {
      await obfuscateFile(srcPath, destPath);
    }
  }
  
  const manifest = JSON.parse(fs.readFileSync(path.join(TEMP_DIR, 'manifest.json'), 'utf-8'));
  const version = manifest.version;
  
  console.log('创建 ZIP 包...');
  const zip = new AdmZip();
  zip.addLocalFolder(TEMP_DIR);
  
  const zipFileName = `creator-helper-secure-v${version}.zip`;
  const zipFilePath = path.join(RELEASE_DIR, zipFileName);
  zip.writeZip(zipFilePath);
  
  await fs.remove(TEMP_DIR);
  
  console.log('=== 强保护分发构建成功 ===');
  console.log(`输出: ${zipFilePath}`);
  console.log(`大小: ${(fs.statSync(zipFilePath).size / 1024).toFixed(2)} KB`);
  console.log('');
  console.log('注意: 关键函数和 API 完全保留，只混淆局部变量！');
  console.log('请测试后再分发！');
}

buildSecureDistribution().catch(err => {
  console.error('分发构建失败:', err);
  process.exit(1);
});
