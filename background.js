// 默认权限值
const DEFAULT_PERMISSIONS = {
  auth_status: 'unauthenticated',
  permissions: {
    prompt_word: {
      daily_limit: 30,
      enable_like_filter: true
    },
    download: {
      daily_limit: 30
    },
    search: {
      high_value_notes: {
        daily_limit: 30
      },
      keyword_expansion: {
        daily_limit: 5
      }
    }
  }
};

// 功能类型定义
const FEATURE_TYPES = {
  PROMPT_WORD: 'prompt_word',
  HIGH_VALUE_NOTES: 'high_value_notes',
  KEYWORD_EXPANSION: 'keyword_expansion',
  DOWNLOAD: 'download'
};

// 存储键名
const USAGE_STORAGE_KEY = 'feature_usage';

// 初始化使用计数
async function initUsageCounter() {
  try {
    const result = await chrome.storage.sync.get(USAGE_STORAGE_KEY);
    const usageData = result[USAGE_STORAGE_KEY];
    
    // 检查是否需要重置使用计数（新的一天）
    if (!usageData || !usageData.lastResetDate || isNewDay(usageData.lastResetDate)) {
      await resetUsageCounter();
    }
  } catch (error) {
    console.error('初始化使用计数时出错:', error);
  }
}

// 检查是否是新的一天
function isNewDay(lastResetDate) {
  const today = new Date().toDateString();
  const lastDate = new Date(lastResetDate).toDateString();
  return today !== lastDate;
}

// 重置使用计数
async function resetUsageCounter() {
  try {
    const resetData = {
      lastResetDate: new Date().toISOString(),
      usage: {
        [FEATURE_TYPES.PROMPT_WORD]: 0,
        [FEATURE_TYPES.HIGH_VALUE_NOTES]: 0,
        [FEATURE_TYPES.KEYWORD_EXPANSION]: 0,
        [FEATURE_TYPES.DOWNLOAD]: 0
      }
    };
    
    await chrome.storage.sync.set({ [USAGE_STORAGE_KEY]: resetData });
    console.log('使用计数已重置');
  } catch (error) {
    console.error('重置使用计数时出错:', error);
  }
}

// 获取使用计数
async function getUsageCounter() {
  try {
    await initUsageCounter();
    
    const result = await chrome.storage.sync.get(USAGE_STORAGE_KEY);
    return result[USAGE_STORAGE_KEY] || {
      lastResetDate: new Date().toISOString(),
      usage: {
        [FEATURE_TYPES.PROMPT_WORD]: 0,
        [FEATURE_TYPES.HIGH_VALUE_NOTES]: 0,
        [FEATURE_TYPES.KEYWORD_EXPANSION]: 0,
        [FEATURE_TYPES.DOWNLOAD]: 0
      }
    };
  } catch (error) {
    console.error('获取使用计数时出错:', error);
    return {
      lastResetDate: new Date().toISOString(),
      usage: {
        [FEATURE_TYPES.PROMPT_WORD]: 0,
        [FEATURE_TYPES.HIGH_VALUE_NOTES]: 0,
        [FEATURE_TYPES.KEYWORD_EXPANSION]: 0,
        [FEATURE_TYPES.DOWNLOAD]: 0
      }
    };
  }
}

// 增加使用计数
async function incrementUsage(featureType) {
  try {
    // 初始化使用计数
    await initUsageCounter();
    
    // 获取当前使用计数
    const usageData = await getUsageCounter();
    
    // 获取权限信息
    const permissionsResult = await chrome.storage.sync.get('permissions');
    const permissions = permissionsResult.permissions || DEFAULT_PERMISSIONS;
    
    // 获取对应功能的使用限制
    let dailyLimit = 0;
    switch (featureType) {
      case FEATURE_TYPES.PROMPT_WORD:
        dailyLimit = permissions.permissions.prompt_word.daily_limit;
        break;
      case FEATURE_TYPES.HIGH_VALUE_NOTES:
        dailyLimit = permissions.permissions.search.high_value_notes.daily_limit;
        break;
      case FEATURE_TYPES.KEYWORD_EXPANSION:
        dailyLimit = permissions.permissions.search.keyword_expansion.daily_limit;
        break;
      case FEATURE_TYPES.DOWNLOAD:
        dailyLimit = permissions.permissions.download.daily_limit;
        break;
      default:
        return { success: false, message: '未知功能类型' };
    }
    
    // 检查是否无限限制
    if (dailyLimit === -1) {
      // 无限限制，只增加计数但不检查
      usageData.usage[featureType]++;
      await chrome.storage.sync.set({ [USAGE_STORAGE_KEY]: usageData });
      return {
        success: true,
        message: '使用成功',
        usage: usageData.usage[featureType],
        limit: dailyLimit
      };
    }
    
    // 检查是否超过限制
    if (usageData.usage[featureType] >= dailyLimit) {
      return {
        success: false,
        message: `今天使用次数已达${dailyLimit}次，超过额度限制，您可以进行购买激活`,
        usage: usageData.usage[featureType],
        limit: dailyLimit
      };
    }
    
    // 增加使用计数
    usageData.usage[featureType]++;
    await chrome.storage.sync.set({ [USAGE_STORAGE_KEY]: usageData });
    
    return {
      success: true,
      message: '使用成功',
      usage: usageData.usage[featureType],
      limit: dailyLimit
    };
  } catch (error) {
    console.error('增加使用计数时出错:', error);
    return { success: false, message: '操作失败' };
  }
}

// 检查功能是否可用
async function checkFeatureAvailability(featureType) {
  try {
    // 初始化使用计数
    await initUsageCounter();
    
    // 获取当前使用计数
    const usageData = await getUsageCounter();
    
    // 获取权限信息
    const permissionsResult = await chrome.storage.sync.get('permissions');
    const permissions = permissionsResult.permissions || DEFAULT_PERMISSIONS;
    
    // 获取对应功能的使用限制
    let dailyLimit = 0;
    switch (featureType) {
      case FEATURE_TYPES.PROMPT_WORD:
        dailyLimit = permissions.permissions.prompt_word.daily_limit;
        break;
      case FEATURE_TYPES.HIGH_VALUE_NOTES:
        dailyLimit = permissions.permissions.search.high_value_notes.daily_limit;
        break;
      case FEATURE_TYPES.KEYWORD_EXPANSION:
        dailyLimit = permissions.permissions.search.keyword_expansion.daily_limit;
        break;
      case FEATURE_TYPES.DOWNLOAD:
        dailyLimit = permissions.permissions.download.daily_limit;
        break;
      default:
        return { available: false, message: '未知功能类型' };
    }
    
    // 检查是否无限限制
    if (dailyLimit === -1) {
      return {
        available: true,
        message: '功能可用',
        usage: usageData.usage[featureType],
        limit: dailyLimit
      };
    }
    
    // 检查是否超过限制
    if (usageData.usage[featureType] >= dailyLimit) {
      return {
        available: false,
        message: `今天使用次数已达${dailyLimit}次，超过额度限制，您可以进行购买激活`,
        usage: usageData.usage[featureType],
        limit: dailyLimit
      };
    }
    
    return {
      available: true,
      message: '功能可用',
      usage: usageData.usage[featureType],
      limit: dailyLimit
    };
  } catch (error) {
    console.error('检查功能可用性时出错:', error);
    return { available: false, message: '检查失败' };
  }
}

// 监听来自popup和content的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('background收到消息:', message);
  
  if (message.action === 'forwardToContent') {
    // 转发消息到指定的content script
    console.log('转发消息到content script, tabId:', message.tabId);
    chrome.tabs.sendMessage(message.tabId, message.message, (response) => {
      if (chrome.runtime.lastError) {
        console.error('转发消息失败:', chrome.runtime.lastError);
        sendResponse({ success: false, error: chrome.runtime.lastError.message });
      } else {
        console.log('转发消息成功，收到响应:', response);
        sendResponse(response);
      }
    });
    return true; // 保持消息通道开放
  }
  
  if (message.action === 'downloadNoteImages') {
    console.log('收到下载请求=======:', message);
    
    // 检查下载功能使用权限
    checkFeatureAvailability(FEATURE_TYPES.DOWNLOAD).then((result) => {
      if (result.available) {
        // 增加使用计数
        incrementUsage(FEATURE_TYPES.DOWNLOAD).then(() => {
          // 先检查下载设置
          chrome.storage.sync.get('downloadSettings', (data) => {
            const settings = data.downloadSettings || {};
            const enableDownload = settings.enableDownload !== false; // 默认开启
            
            if (enableDownload) {
              downloadNoteImages(message.noteUrl, sendResponse, message.imageUrls, message.title);
            } else {
              sendResponse({ success: false, error: '笔记图片下载功能已关闭' });
            }
          });
        });
      } else {
        sendResponse({ success: false, error: result.message });
        // 向content script发送消息，显示提示
        if (sender.tab) {
          chrome.tabs.sendMessage(sender.tab.id, {
            action: 'showAlert',
            message: result.message
          });
        }
      }
    });
    
    return true; // 保持消息通道开放，以便异步响应
  } else if (message.action === 'extend_keywords') {
    console.log('收到关键词拓展文件保存请求:', message);
    
    try {
      // 直接使用收到的字符串数据
      const content = message.content;
      const fileName = message.fileName;
      
      // 创建数据URL
      const dataUrl = `data:application/json;charset=utf-8,${encodeURIComponent(content)}`;
      
      // 下载文件到xhs_helper目录
      chrome.downloads.download({
        url: dataUrl,
        filename: `creator_helper/${fileName}`,
        saveAs: false,
        conflictAction: 'overwrite'
      }, (downloadId) => {
        if (chrome.runtime.lastError) {
          console.error('文件保存失败:', chrome.runtime.lastError);
          sendResponse({ success: false, error: chrome.runtime.lastError.message });
        } else {
          console.log('文件保存成功:', `creator_helper/${fileName}`);
          sendResponse({ success: true });
        }
      });
    } catch (error) {
      console.error('处理文件保存时出错:', error);
      sendResponse({ success: false, error: error.message });
    }
    
    return true; // 保持消息通道开放，以便异步响应
  }
});

// 清理URL，去除反引号、空格等多余字符
function cleanUrl(url) {
  if (!url) return url;
  let cleaned = url.trim();
  // 去除首尾的反引号
  cleaned = cleaned.replace(/^`+|`+$/g, '');
  // 去除首尾空格
  cleaned = cleaned.trim();
  return cleaned;
}

// 下载笔记中的所有图片
async function downloadNoteImages(noteUrl, sendResponse, imageUrls, title) {
  console.log('后台开始处理笔记图片下载:', noteUrl);
  console.log('传入的 imageUrls:', imageUrls ? imageUrls.length : '无');
  console.log('传入的 title:', title || '无');
  
  try {
    // 清理URL
    noteUrl = cleanUrl(noteUrl);
    console.log('清理后的URL:', noteUrl);
    
    // 提取笔记ID
    const noteId = extractNoteId(noteUrl);
    if (!noteId) {
      sendResponse({ success: false, error: '无法提取笔记ID' });
      return;
    }
    
    console.log('提取到笔记ID:', noteId);
    
    let noteInfo = null;
    
    // 如果已经传入了图片URL，直接使用，不用再 fetch HTML
    if (imageUrls && imageUrls.length > 0) {
      console.log('使用传入的图片URL，共', imageUrls.length, '张');
      
      // 过滤和规范化图片URL
      const validUrls = [];
      for (const url of imageUrls) {
        const cleanUrl_ = cleanUrl(url);
        const normalized = normalizeImageUrl(cleanUrl_);
        if (normalized && !isBlockedImageUrl(normalized) && 
            (normalized.includes('xiaohongshu') || normalized.includes('xhscdn.com')) &&
            !normalized.includes('avatar') && !normalized.includes('Avatar')) {
          if (!validUrls.includes(normalized)) {
            validUrls.push(normalized);
          }
        }
      }
      
      if (validUrls.length === 0) {
        sendResponse({ success: false, error: '未找到有效图片' });
        return;
      }
      
      noteInfo = {
        url: noteUrl,
        note_id: noteId,
        title: title || '',
        content: '',
        tags: [],
        image_urls: validUrls
      };
    } else {
      // 发送请求获取页面内容
      const response = await fetch(noteUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
          'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const htmlContent = await response.text();
      
      console.log(`======= 下载调试信息 =======`);
      console.log(`HTML 内容长度: ${htmlContent.length}`);
      console.log(`HTML 前2000字符: ${htmlContent.substring(0, 2000)}`);
      console.log(`是否包含 og:image: ${htmlContent.includes('og:image')}`);
      console.log(`是否包含 __INITIAL_STATE__: ${htmlContent.includes('__INITIAL_STATE__')}`);
      console.log(`是否包含 imageList: ${htmlContent.includes('imageList')}`);
      console.log(`============================`);
      
      // 解析HTML，提取笔记信息
      noteInfo = parseNote(htmlContent, noteUrl, noteId);
      
      if (!noteInfo || !noteInfo.image_urls || noteInfo.image_urls.length === 0) {
        sendResponse({ success: false, error: '未找到图片' });
        return;
      }
    }
    
    console.log(`提取到 ${noteInfo.image_urls.length} 张图片`);
    console.log('图片列表:', noteInfo.image_urls);
    
    // 下载内容（包括图片和笔记信息）
    const downloadedCount = await downloadContent(noteInfo);
    
    // 发送成功响应
    sendResponse({
      success: true,
      noteId: noteId,
      downloadedCount: downloadedCount,
      title: noteInfo.title
    });
    
  } catch (error) {
    console.error('下载笔记图片时出错:', error);
    sendResponse({ success: false, error: error.message });
  }
}

// 提取笔记ID
function extractNoteId(noteUrl) {
  try {
    // 从小红书笔记链接中提取笔记ID
    // 格式1：https://www.xiaohongshu.com/discovery/item/{note_id}?source=...
    const match = noteUrl.match(/\/item\/(\w+)\?/);
    if (match && match[1]) {
      return match[1];
    }
    
    // 格式2：https://www.xiaohongshu.com/discovery/item/{note_id}
    const match2 = noteUrl.match(/\/item\/(\w+)$/);
    if (match2 && match2[1]) {
      return match2[1];
    }
    
    // 格式3：https://www.xiaohongshu.com/explore/{note_id}?xsec_token=...
    const match3 = noteUrl.match(/\/explore\/(\w+)\?/);
    if (match3 && match3[1]) {
      return match3[1];
    }
    
    // 格式4：https://www.xiaohongshu.com/explore/{note_id}
    const match4 = noteUrl.match(/\/explore\/(\w+)$/);
    if (match4 && match4[1]) {
      return match4[1];
    }
    
    // 格式5：https://www.xiaohongshu.com/search_result/{note_id}?xsec_token=...
    const match5 = noteUrl.match(/\/search_result\/(\w+)\?/);
    if (match5 && match5[1]) {
      return match5[1];
    }
    
    // 格式6：https://www.xiaohongshu.com/search_result/{note_id}
    const match6 = noteUrl.match(/\/search_result\/(\w+)$/);
    if (match6 && match6[1]) {
      return match6[1];
    }
    
    // 格式7：https://www.xiaohongshu.com/user/profile/{author_id}/{note_id}?xsec_token=...
    const match7 = noteUrl.match(/\/user\/profile\/\w+\/(\w+)\?/);
    if (match7 && match7[1]) {
      return match7[1];
    }
    
    // 格式8：https://www.xiaohongshu.com/user/profile/{author_id}/{note_id}
    const match8 = noteUrl.match(/\/user\/profile\/\w+\/(\w+)$/);
    if (match8 && match8[1]) {
      return match8[1];
    }
    
    return null;
  } catch (error) {
    console.error('提取笔记ID时出错:', error);
    return null;
  }
}

// 从HTML中提取从startPos开始的嵌套JSON对象字符串，使用括号计数法
function extractNestedJson(str, startPos, openChar, closeChar) {
  let depth = 0;
  let inString = false;
  let escape = false;
  let i = startPos;
  
  for (; i < str.length; i++) {
    const char = str[i];
    
    if (escape) {
      escape = false;
      continue;
    }
    
    if (char === '\\') {
      escape = true;
      continue;
    }
    
    if (char === '"') {
      inString = !inString;
      continue;
    }
    
    if (inString) continue;
    
    if (char === openChar) {
      depth++;
    } else if (char === closeChar) {
      depth--;
      if (depth === 0) {
        return str.substring(startPos, i + 1);
      }
    }
  }
  
  return null;
}

// 解析笔记内容
function parseNote(htmlContent, noteUrl, noteId) {
  try {
    console.log(`======= parseNote 调试 =======`);
    
    // 1. 提取标题（同时支持 name="og:title" 和 property="og:title"）
    let title = '';
    const titleMatch = htmlContent.match(/<meta\s+(?:name|property)="og:title"\s+content="([^"]+)"/i);
    if (titleMatch && titleMatch[1]) {
      title = titleMatch[1];
      if (title.endsWith(' - 小红书')) {
        title = title.substring(0, title.length - 6);
      }
    }
    console.log(`提取到标题: "${title}"`);

    // 2. 提取图片链接
    const imageUrls = [];
    
    // 方式1：从 og:image meta 标签提取
    const ogImageRegex = /<meta\s+(?:name|property)="og:image"\s+content="([^"]+)"|<meta\s+content="([^"]+)"\s+(?:name|property)="og:image"/gi;
    let ogImageMatch;
    let ogCount = 0;
    while ((ogImageMatch = ogImageRegex.exec(htmlContent)) !== null) {
      const imgUrl = ogImageMatch[1] || ogImageMatch[2];
      if (imgUrl) {
        console.log(`og:image 匹配到原始URL: ${imgUrl.substring(0, 100)}`);
        const fullUrl = normalizeImageUrl(imgUrl);
        if (fullUrl && !imageUrls.includes(fullUrl)) {
          imageUrls.push(fullUrl);
          ogCount++;
        }
      }
    }
    
    console.log(`从 og:image 提取到 ${ogCount} 张图片`);
    console.log(`当前 imageUrls: ${imageUrls.length}`);
    
    // 如果 og:image 没提取到图片，从 imageList 兜底提取
    if (imageUrls.length === 0) {
      console.log('og:image 未提取到图片，尝试从 imageList 提取');
      try {
        const listKeyword = '"imageList"';
        const listIndex = htmlContent.indexOf(listKeyword);
        
        if (listIndex !== -1) {
          const bracketIndex = htmlContent.indexOf('[', listIndex);
          if (bracketIndex !== -1) {
            const imageListStr = extractNestedJson(htmlContent, bracketIndex, '[', ']');
            if (imageListStr) {
              console.log(`imageList 提取成功，长度: ${imageListStr.length}`);
              
              // 从 imageList 中提取 WB_DFT（默认/高清版）的图片
              // 每个图片对象有 fileId 和 infoList 数组，infoList 里每个对象有 imageScene 和 url
              // 我们只需要 WB_DFT 版本的 URL
              const decoded = decodeUnicodeEscape(imageListStr);
              
              // 用正则匹配每个图片对象中的 fileId 和对应的 WB_DFT url
              // 先找所有 fileId
              const fileIdRegex = /"fileId":"([^"]+)"/gi;
              const fileIds = [];
              let match;
              while ((match = fileIdRegex.exec(decoded)) !== null) {
                fileIds.push(match[1]);
              }
              
              console.log(`imageList 中有 ${fileIds.length} 张图片`);
              
              // 提取每个 fileId 对应的 WB_DFT URL
              for (const fileId of fileIds) {
                // 找到这个 fileId 对应的图片对象范围
                const fileIdIndex = decoded.indexOf(`"fileId":"${fileId}"`);
                if (fileIdIndex === -1) continue;
                
                // 往后找 infoList 里的 WB_DFT
                const infoListStart = decoded.indexOf('"infoList"', fileIdIndex);
                if (infoListStart === -1) continue;
                
                const bracketStart = decoded.indexOf('[', infoListStart);
                if (bracketStart === -1) continue;
                
                // 找 infoList 数组的结束位置
                let depth = 0;
                let bracketEnd = bracketStart;
                for (let i = bracketStart; i < Math.min(bracketStart + 2000, decoded.length); i++) {
                  if (decoded[i] === '[') depth++;
                  else if (decoded[i] === ']') {
                    depth--;
                    if (depth === 0) {
                      bracketEnd = i;
                      break;
                    }
                  }
                }
                
                const infoListStr = decoded.substring(bracketStart, bracketEnd + 1);
                
                // 在 infoList 中找 imageScene 为 WB_DFT 的 url
                // 注意：imageScene 和 url 的顺序可能不一样，需要两种情况都考虑
                let dftMatch = infoListStr.match(/"imageScene":"WB_DFT"[^}]*"url":"([^"]+)"/i);
                if (!dftMatch) {
                  dftMatch = infoListStr.match(/"url":"([^"]+)"[^}]*"imageScene":"WB_DFT"/i);
                }
                
                let imgUrl = null;
                if (dftMatch) {
                  imgUrl = dftMatch[1];
                } else {
                  // 如果没有 WB_DFT，找第一个 url
                  const firstUrlMatch = infoListStr.match(/"url":"([^"]+)"/i);
                  if (firstUrlMatch) {
                    imgUrl = firstUrlMatch[1];
                  }
                }
                
                if (imgUrl) {
                  const fullUrl = normalizeImageUrl(imgUrl);
                  if (fullUrl && !imageUrls.includes(fullUrl)) {
                    imageUrls.push(fullUrl);
                  }
                }
              }
              
              console.log(`从 imageList 提取到 ${imageUrls.length} 张图片（WB_DFT 版本）`);
            }
          }
        }
      } catch (e) {
        console.log('从 imageList 提取图片失败:', e.message);
      }
    }
    
    // 从 __INITIAL_STATE__ 中提取标题（如果 og:title 没提取到）
    try {
      const initKeyword = 'window.__INITIAL_STATE__';
      const initIndex = htmlContent.indexOf(initKeyword);
      
      if (initIndex !== -1 && !title) {
        const equalIndex = htmlContent.indexOf('=', initIndex);
        if (equalIndex !== -1) {
          const braceIndex = htmlContent.indexOf('{', equalIndex);
          if (braceIndex !== -1) {
            const initialStateStr = extractNestedJson(htmlContent, braceIndex, '{', '}');
            if (initialStateStr) {
              const titleMatch = initialStateStr.match(/"title":"([^"]+)"/i);
              if (titleMatch) {
                const decodedTitle = decodeUnicodeEscape(titleMatch[1]);
                if (decodedTitle && decodedTitle.length > 0 && decodedTitle !== '小红书') {
                  title = decodedTitle;
                  console.log(`从 __INITIAL_STATE__ 提取到标题: ${title}`);
                }
              }
            }
          }
        }
      }
    } catch (e) {
      console.log('从 __INITIAL_STATE__ 提取标题失败:', e.message);
    }
    
    console.log(`======= parseNote 结束 =======`);
    console.log(`总计提取到 ${imageUrls.length} 张图片`);
    console.log(`图片列表:`, imageUrls);

    // 3. 提取标签（同时支持 name="keywords" 和 property="keywords"）
    let tags = [];
    const keywordsMatch = htmlContent.match(/<meta\s+(?:name|property)="keywords"\s+content="([^"]+)"/i);
    if (keywordsMatch && keywordsMatch[1]) {
      const keywords = keywordsMatch[1];
      // 处理不同的分隔符
      tags = keywords.split(/[,，]/).map(tag => tag.trim()).filter(tag => tag);
    }

    // 4. 提取正文内容（同时支持 name="description" 和 property="description"）
    let content = '';
    const descriptionMatch = htmlContent.match(/<meta\s+(?:name|property)="description"\s+content="([^"]+)"/i);
    if (descriptionMatch && descriptionMatch[1]) {
      content = descriptionMatch[1];
    }

    return {
      url: noteUrl,
      note_id: noteId,
      title: title,
      content: content,
      tags: tags,
      image_urls: imageUrls
    };
    
  } catch (error) {
    console.error('解析笔记时出错:', error);
    return null;
  }
}

// 需要过滤的图片域名列表
const BLOCKED_IMAGE_DOMAINS = [
  'picasso-static.xiaohongshu.com',
  'fe-platform.xhscdn.com',
  'fe-static.xhscdn.com'
];

// 解码 Unicode 转义字符（如 \u002F -> /）
function decodeUnicodeEscape(str) {
  if (!str) return str;
  return str.replace(/\\u([0-9a-fA-F]{4})/g, (match, hex) => {
    return String.fromCharCode(parseInt(hex, 16));
  });
}

// 从图片 URL 中提取唯一标识（用于去重，同一张图的不同尺寸版本有相同的标识）
function getImageUniqueId(url) {
  if (!url) return url;
  // 取 ! 之前的部分作为图片ID（小红书 CDN URL 格式）
  const bangIndex = url.indexOf('!');
  if (bangIndex !== -1) {
    return url.substring(0, bangIndex);
  }
  // 如果没有 !，取 ? 之前的部分
  const queryIndex = url.indexOf('?');
  if (queryIndex !== -1) {
    return url.substring(0, queryIndex);
  }
  return url;
}

// 从文本中提取图片 URL，支持 Unicode 转义、多种 URL 格式
function extractImageUrlsFromText(text, imageUrls, sourceName) {
  let count = 0;
  
  // 匹配 "url":"..." 和 "urlDefault":"..." 格式
  const urlRegex = /"(?:url|urlDefault)":"([^"]+)"/gi;
  let match;
  
  while ((match = urlRegex.exec(text)) !== null) {
    let rawUrl = match[1];
    if (!rawUrl) continue;
    
    // 解码 Unicode 转义
    const decodedUrl = decodeUnicodeEscape(rawUrl);
    
    const fullUrl = normalizeImageUrl(decodedUrl);
    if (fullUrl && !imageUrls.includes(fullUrl) && 
        (fullUrl.includes('xiaohongshu') || fullUrl.includes('xhscdn.com')) &&
        !fullUrl.includes('avatar') && !fullUrl.includes('Avatar')) {
      imageUrls.push(fullUrl);
      count++;
    }
  }
  
  return count;
}

// 对图片列表去重（同一张图的不同尺寸版本只保留一个默认版本）
function deduplicateImageUrls(imageUrls) {
  const seen = new Map();
  const result = [];
  
  for (const url of imageUrls) {
    const uniqueId = getImageUniqueId(url);
    if (!seen.has(uniqueId)) {
      seen.set(uniqueId, url);
      result.push(url);
    } else {
      // 优先保留 nd_dft（默认版），如果已有则跳过
      const existing = seen.get(uniqueId);
      if (url.includes('nd_dft') && !existing.includes('nd_dft')) {
        // 替换为默认版
        const idx = result.indexOf(existing);
        if (idx !== -1) {
          result[idx] = url;
        }
        seen.set(uniqueId, url);
      }
    }
  }
  
  return result;
}

// 检查URL是否在过滤域名列表中
function isBlockedImageUrl(url) {
  if (!url) return false;
  return BLOCKED_IMAGE_DOMAINS.some(domain => url.includes(domain));
}

// 标准化图片URL
function normalizeImageUrl(url) {
  if (!url) return null;
  
  let fullUrl = url.trim();
  
  // 解码 Unicode 转义
  fullUrl = decodeUnicodeEscape(fullUrl);
  
  // 处理相对URL
  if (fullUrl.startsWith('//')) {
    fullUrl = 'https:' + fullUrl;
  }
  
  // 处理 http URL，转成 https
  if (fullUrl.startsWith('http://')) {
    fullUrl = 'https://' + fullUrl.substring(7);
  }
  
  // 处理 https URL
  if (fullUrl.startsWith('https://')) {
    // 已经是 https
  } else if (!fullUrl.startsWith('http')) {
    return null;
  }
  
  // 检查是否在过滤域名列表中
  if (isBlockedImageUrl(fullUrl)) {
    console.log(`过滤掉禁用域名的图片: ${fullUrl}`);
    return null;
  }
  
  return fullUrl;
}

// 清理文件名/文件夹名中的非法字符
function sanitizeFileName(name) {
  if (!name) return '';
  // 移除 Windows 和 macOS 中文件名不允许的字符
  return name.replace(/[\\/:*?"<>|]/g, '_').replace(/\s+/g, ' ').trim().substring(0, 100);
}

// 下载内容（包括图片和笔记信息）
async function downloadContent(noteInfo) {
  let downloadedCount = 0;
  
  if (!noteInfo) {
    console.error('noteInfo 不能为空');
    return downloadedCount;
  }
  
  // 从 noteInfo 中获取必要信息
  const imageUrls = noteInfo.image_urls || [];
  const noteId = noteInfo.note_id;
  const title = noteInfo.title || '';
  
  console.log(`准备下载 ${imageUrls.length} 张图片，noteId: ${noteId}`);
  
  if (!noteId) {
    console.error('noteInfo 中缺少 note_id');
    return downloadedCount;
  }
  
  // 清理标题中的特殊字符
  const cleanTitle = sanitizeFileName(title);
  
  // 创建保存目录（使用相对路径，Chrome 会将其解析为相对于默认下载目录的路径）
  // 目录命名格式：笔记id_笔记标题
  const dirName = cleanTitle ? `${noteId}_${cleanTitle}` : noteId;
  const saveDir = `creator_helper/note_images/${dirName}`;
  
  // 保存笔记信息为 content.json 文件
  try {
    // 将 noteInfo 转换为 JSON 字符串
    const jsonString = JSON.stringify(noteInfo, null, 2);
    // 创建数据 URL
    const dataUrl = `data:application/json;charset=utf-8,${encodeURIComponent(jsonString)}`;
    
    // 下载 content.json 文件
    chrome.downloads.download({
      url: dataUrl,
      filename: `${saveDir}/content.json`,
      saveAs: false,
      conflictAction: 'overwrite'
    }, (downloadId) => {
      if (chrome.runtime.lastError) {
        console.error('保存 content.json 失败:', chrome.runtime.lastError);
      } else {
        console.log('content.json 保存成功');
      }
    });
  } catch (error) {
    console.error('保存笔记信息时出错:', error);
  }
  
  // 遍历下载图片
  for (let i = 0; i < imageUrls.length; i++) {
    const imgUrl = imageUrls[i];
    
    // 二次检查：过滤禁用域名的图片
    if (isBlockedImageUrl(imgUrl)) {
      console.log(`跳过禁用域名的图片: ${imgUrl}`);
      continue;
    }
    try {
      // 生成文件名
      const fileExt = imgUrl.split('.').pop().split('?')[0];
      const fileName = `image_${i + 1}.${fileExt.length > 5 ? 'jpg' : fileExt}`;
      
      console.log(`开始下载第 ${i + 1} 张图片: ${fileName}`);
      
      // 使用 Promise 封装下载，等待下载开始后再继续
      await new Promise((resolve) => {
        chrome.downloads.download({
          url: imgUrl,
          filename: `${saveDir}/${fileName}`,
          saveAs: false,
          conflictAction: 'overwrite'
        }, (downloadId) => {
          if (chrome.runtime.lastError) {
            console.error(`下载图片 ${fileName} 失败:`, chrome.runtime.lastError);
          } else {
            downloadedCount++;
            console.log(`图片 ${fileName} 下载开始，downloadId: ${downloadId}`);
          }
          resolve();
        });
      });
      
      // 等待一段时间，避免请求过于频繁
      await new Promise(resolve => setTimeout(resolve, 500));
      
    } catch (error) {
      console.error(`下载图片 ${imgUrl} 时出错:`, error);
    }
  }
  
  console.log(`下载完成，共 ${downloadedCount}/${imageUrls.length} 张图片开始下载`);
  return downloadedCount;
}
