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

// 监听来自content.js的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
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
              downloadNoteImages(message.noteUrl, sendResponse);
            } else {
              sendResponse({ success: false, error: '小红书图片下载功能已关闭' });
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
        filename: `xhs_helper/${fileName}`,
        saveAs: false,
        conflictAction: 'overwrite'
      }, (downloadId) => {
        if (chrome.runtime.lastError) {
          console.error('文件保存失败:', chrome.runtime.lastError);
          sendResponse({ success: false, error: chrome.runtime.lastError.message });
        } else {
          console.log('文件保存成功:', `xhs_helper/${fileName}`);
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

// 下载笔记中的所有图片
async function downloadNoteImages(noteUrl, sendResponse) {
  console.log('后台开始处理笔记图片下载:', noteUrl);
  
  try {
    // 提取笔记ID
    const noteId = extractNoteId(noteUrl);
    if (!noteId) {
      sendResponse({ success: false, error: '无法提取笔记ID' });
      return;
    }
    
    console.log('提取到笔记ID:', noteId);
    
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
    
    // 解析HTML，提取笔记信息
    const noteInfo = parseNote(htmlContent, noteUrl, noteId);
    
    if (!noteInfo || !noteInfo.image_urls || noteInfo.image_urls.length === 0) {
      sendResponse({ success: false, error: '未找到图片' });
      return;
    }
    
    console.log(`提取到 ${noteInfo.image_urls.length} 张图片`);
    // console.debug('=============noteInfo:===============', noteInfo);
    
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

// 解析笔记内容
function parseNote(htmlContent, noteUrl, noteId) {
  try {
    // 1. 提取标题
    let title = '';
    const titleMatch = htmlContent.match(/<meta name="og:title" content="([^"]+)"/i);
    if (titleMatch && titleMatch[1]) {
      title = titleMatch[1];
      // 移除末尾的 " - 小红书"
      if (title.endsWith(' - 小红书')) {
        title = title.substring(0, title.length - 6);
      }
    }
    
    // 2. 提取图片链接
    const imageUrls = [];
    const imageMetaMatches = htmlContent.matchAll(/<meta name="og:image" content="([^"]+)"/gi);
    for (const match of imageMetaMatches) {
      if (match[1]) {
        const fullUrl = normalizeImageUrl(match[1]);
        if (fullUrl && !imageUrls.includes(fullUrl)) {
          imageUrls.push(fullUrl);
        }
      }
    }
    
    // 3. 提取标签
    let tags = [];
    const keywordsMatch = htmlContent.match(/<meta name="keywords" content="([^"]+)"/i);
    if (keywordsMatch && keywordsMatch[1]) {
      const keywords = keywordsMatch[1];
      // 处理不同的分隔符
      tags = keywords.split(/[,，]/).map(tag => tag.trim()).filter(tag => tag);
    }
    
    // 4. 提取正文内容
    let content = '';
    const descriptionMatch = htmlContent.match(/<meta name="description" content="([^"]+)"/i);
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

// 标准化图片URL
function normalizeImageUrl(url) {
  if (!url) return null;
  
  // 处理相对URL
  if (url.startsWith('//')) {
    return 'https:' + url;
  }
  
  // 处理绝对URL
  if (url.startsWith('http')) {
    return url;
  }
  
  // 处理其他情况
  return null;
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
  
  if (!noteId) {
    console.error('noteInfo 中缺少 note_id');
    return downloadedCount;
  }
  
  // 创建保存目录（使用相对路径，Chrome 会将其解析为相对于默认下载目录的路径）
  const saveDir = `xhs_helper/xhs_images/${noteId}`;
  
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
      conflictAction: 'overwrite' // 遇到文件冲突时覆盖原文件，避免确认对话框
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
    
    try {
      // 生成文件名
      const fileExt = imgUrl.split('.').pop().split('?')[0];
      const fileName = `image_${i + 1}.${fileExt.length > 5 ? 'jpg' : fileExt}`;
      
      // 直接使用 Chrome 的下载 API 下载图片
      chrome.downloads.download({
        url: imgUrl,
        filename: `${saveDir}/${fileName}`,
        saveAs: false,
        conflictAction: 'overwrite' // 遇到文件冲突时覆盖原文件，避免确认对话框
      }, (downloadId) => {
        if (chrome.runtime.lastError) {
          console.error('下载图片失败:', chrome.runtime.lastError);
        } else {
          downloadedCount++;
          console.log(`图片 ${fileName} 下载成功`);
        }
      });
      
      // 等待一段时间，避免请求过于频繁
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      console.error(`下载图片 ${imgUrl} 时出错:`, error);
    }
  }
  
  return downloadedCount;
}
