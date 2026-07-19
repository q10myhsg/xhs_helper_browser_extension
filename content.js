// 检查扩展上下文是否有效
function isExtensionContextValid() {
  try {
    return chrome.runtime && chrome.runtime.id !== undefined;
  } catch (e) {
    return false;
  }
}

// 监听存储变化，更新缓存
safeChromeCall(() => {
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'sync' && changes.downloadSettings) {
      window.cachedSettings = changes.downloadSettings.newValue || {};
      console.log('设置已更新，缓存已刷新:', window.cachedSettings);
    }
  });
});

// 安全的 Chrome API 调用包装器
function safeChromeCall(callback) {
  if (!isExtensionContextValid()) {
    return;
  }
  
  try {
    callback();
  } catch (e) {
  }
}

// 初始化权限数据和使用计数
(async function() {
  try {
    // 初始化权限数据
    if (typeof initPermissions === 'function') {
      await initPermissions();
    }
    
    // 初始化使用计数
    if (typeof initUsageCounter === 'function') {
      await initUsageCounter();
    }
    
    // 获取最新的权限信息（不强制更新，优先使用本地存储）
    if (typeof getDeviceInfo === 'function') {
      await getDeviceInfo(false);
    }
  } catch (error) {
  }
})();

// 监听来自popup和background的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'insertPrompt') {
    console.log('收到插入提示词请求:', message); 

    // 检查提示词功能使用权限
    if (typeof checkFeatureAvailability === 'function' && typeof FEATURE_TYPES !== 'undefined') {
      checkFeatureAvailability(FEATURE_TYPES.PROMPT_WORD).then((result) => {
        if (result.available) {
          // 增加使用计数
          incrementUsage(FEATURE_TYPES.PROMPT_WORD).then(() => {
            insertPromptToChat(message.prompt);
            sendResponse({ success: true });
          });
        } else {
          sendResponse({ success: false, error: result.message });
          alert(result.message);
        }
      });
    } else {
      // 如果usageCounter未定义，直接执行功能
      insertPromptToChat(message.prompt);
      sendResponse({ success: true });
    }
    return true;
  } else if (message.action === 'filterHighValueNotes') {
    // 检查高价值笔记功能使用权限
    if (typeof checkFeatureAvailability === 'function' && typeof FEATURE_TYPES !== 'undefined') {
      checkFeatureAvailability(FEATURE_TYPES.HIGH_VALUE_NOTES).then((result) => {
        if (result.available) {
          // 增加使用计数
          incrementUsage(FEATURE_TYPES.HIGH_VALUE_NOTES).then(() => {
            console.log('收到筛选高价值笔记请求');
            // 使用消息中的设置或从存储中加载
            let settings = message.settings || {};
            
            if (Object.keys(settings).length === 0) {
              // 如果消息中没有设置，从存储中加载
              safeChromeCall(() => {
                chrome.storage.sync.get('downloadSettings', async (data) => {
                  if (chrome.runtime.lastError) {
                    console.error('获取下载设置失败:', chrome.runtime.lastError);
                    sendResponse({ success: false, error: '获取设置失败' });
                    return;
                  }
                  
                  settings = data.downloadSettings || {
                    enableSearchAutomation: true,
                    enableImageText: true,
                    sortBy: 'most-liked',
                    publishTime: 'week'
                  };
                  window.cachedSettings = settings; // 更新缓存
                  console.log('加载到的设置:', settings);
                  await executeSearchAutomation(settings);
                  sendResponse({ success: true });
                });
              });
            } else {
              // 使用消息中的设置
              window.cachedSettings = settings; // 更新缓存
              console.log('使用消息中的设置:', settings);
              executeSearchAutomation(settings).then(() => {
                sendResponse({ success: true });
              });
            }
          });
        } else {
          sendResponse({ success: false, error: result.message });
          alert(result.message);
        }
      });
    } else {
      // 如果usageCounter未定义，直接执行功能
      console.log('收到筛选高价值笔记请求');
      // 使用消息中的设置或从存储中加载
      let settings = message.settings || {};
      
      if (Object.keys(settings).length === 0) {
        // 如果消息中没有设置，从存储中加载
        chrome.storage.sync.get('downloadSettings', async (data) => {
          settings = data.downloadSettings || {
            enableSearchAutomation: true,
            enableImageText: true,
            sortBy: 'most-liked',
            publishTime: 'week'
          };
          window.cachedSettings = settings; // 更新缓存
          console.log('加载到的设置:', settings);
          await executeSearchAutomation(settings);
          sendResponse({ success: true });
        });
      } else {
        // 使用消息中的设置
        window.cachedSettings = settings; // 更新缓存
        console.log('使用消息中的设置:', settings);
        executeSearchAutomation(settings).then(() => {
          sendResponse({ success: true });
        });
      }
    }
    // 由于是异步操作，需要返回true以保持消息通道开放
    return true;
  } else if (message.action === 'expandKeywords') {
    console.log('收到 expandKeywords 消息');
    // 检查关键词拓展功能使用权限
    if (typeof checkFeatureAvailability === 'function' && typeof FEATURE_TYPES !== 'undefined') {
      console.log('开始检查权限...');
      checkFeatureAvailability(FEATURE_TYPES.KEYWORD_EXPANSION).then((result) => {
        console.log('权限检查结果:', result);
        if (result.available) {
          // 增加使用计数
          incrementUsage(FEATURE_TYPES.KEYWORD_EXPANSION).then(() => {
            console.log('收到关键词拓展请求，开始执行...');
            expandKeywords().then((result) => {
              console.log('关键词拓展执行完成:', result);
              sendResponse(result);
            }).catch((error) => {
              console.error('关键词拓展执行出错:', error);
              console.error('错误堆栈:', error.stack);
              sendResponse({ success: false, error: error.message });
            });
          }).catch((error) => {
            console.error('增加使用计数出错:', error);
            sendResponse({ success: false, error: error.message });
          });
        } else {
          console.log('权限不可用:', result.message);
          sendResponse({ success: false, error: result.message });
          alert(result.message);
        }
      }).catch((error) => {
        console.error('权限检查出错:', error);
        sendResponse({ success: false, error: error.message });
      });
    } else {
      // 如果usageCounter未定义，直接执行功能
      console.log('usageCounter未定义，直接执行功能');
      console.log('收到关键词拓展请求');
      expandKeywords().then((result) => {
        console.log('关键词拓展执行完成:', result);
        sendResponse(result);
      }).catch((error) => {
        console.error('关键词拓展执行出错:', error);
        console.error('错误堆栈:', error.stack);
        sendResponse({ success: false, error: error.message });
      });
    }
    // 由于是异步操作，需要返回true以保持消息通道开放
    return true;
  } else if (message.action === 'showAlert') {
    // 显示来自background的提示消息
    alert(message.message);
    sendResponse({ success: true });
  }
});

// 文心一言插入提示词 
function insertToWenxin(prompt) {
  const inputElement = document.querySelector('#chat-input-element');
  console.log('文心一言输入框:', inputElement);
  
  if (inputElement) {
    // 清空内容
    inputElement.innerHTML = '';
    // 插入新内容
    const textNode = document.createTextNode(prompt);
    inputElement.appendChild(textNode);
    // 触发输入事件
    const inputEvent = new Event('input', { bubbles: true });
    inputElement.dispatchEvent(inputEvent);
    // 滚动到输入框位置
    inputElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

// deepseek插入提示词
function insertToDeepseek(prompt) {
  const inputElement = document.querySelector('textarea._27c9245');
  console.log('deepseek输入框:', inputElement);
  
  if (inputElement) {
    // 设置输入框值
    inputElement.value = prompt;
    // 触发输入事件
    const inputEvent = new Event('input', { bubbles: true });
    inputElement.dispatchEvent(inputEvent);
    // 触发改变事件
    const changeEvent = new Event('change', { bubbles: true });
    inputElement.dispatchEvent(changeEvent);
    // 滚动到输入框位置
    inputElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}



// 豆包插入提示词
function insertToDoubao(prompt) {
  let inputElement = document.querySelector('textarea');
  console.log('豆包textarea输入框:', inputElement);
  
  if (!inputElement) {
    inputElement = document.querySelector('input[type="text"]');
    console.log('豆包input输入框:', inputElement);
  }
  
  if (!inputElement) {
    inputElement = document.querySelector('[contenteditable="true"]');
    console.log('豆包contenteditable输入框:', inputElement);
  }
  
  if (inputElement) {
    if (inputElement.isContentEditable) {
      // 清空内容
      inputElement.innerHTML = '';
      // 插入新内容
      const textNode = document.createTextNode(prompt);
      inputElement.appendChild(textNode);
    } else {
      // 设置输入框值
      inputElement.value = prompt;
    }
    
    // 触发输入事件
    const inputEvent = new Event('input', { bubbles: true });
    inputElement.dispatchEvent(inputEvent);
    // 触发改变事件
    const changeEvent = new Event('change', { bubbles: true });
    inputElement.dispatchEvent(changeEvent);
    // 滚动到输入框位置
    inputElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

// 将提示词插入到聊天输入框
function insertPromptToChat(prompt) {
  const hostname = window.location.hostname;
  console.log('当前 hostname:', hostname);
  
  // 根据不同网站调用不同的插入函数
  switch (hostname) {
    case 'wenxin.baidu.com':
      insertToWenxin(prompt);
      break;
    case 'chat.deepseek.com':
      insertToDeepseek(prompt);
      break;
    case 'www.doubao.com':
      insertToDoubao(prompt);
      break;
  }
}

// 初始化时检查是否需要显示提示
function init() {
  // 清理"大家都在搜"区域的多余下载按钮
  // cleanupExtraDownloadButtons();
  
  // 检查是否是小红书网站
  if (window.location.hostname === 'www.xiaohongshu.com') {
    // 检查下载设置
    safeChromeCall(() => {
      chrome.storage.sync.get('downloadSettings', (data) => {
        if (chrome.runtime.lastError) {
          return;
        }
        
        const settings = data.downloadSettings || {};
        window.cachedSettings = settings; // 缓存设置
        const enableDownload = settings.enableDownload !== false; // 默认开启
        
        if (enableDownload) {
          // 立即添加一次
          addAllDownloadEvents();
          
          // 延迟再次添加（确保内容加载完成）
          setTimeout(() => {
            addAllDownloadEvents();
            cleanupExtraDownloadButtons(); // 再次清理
          }, 1000);
          
          setTimeout(() => {
            addAllDownloadEvents();
            cleanupExtraDownloadButtons(); // 再次清理
          }, 2500);
          
          // 添加 MutationObserver 监听 DOM 变化（监听弹窗打开）
          setupMutationObserver();
        }
        
        // 如果是搜索页面，自动触发点赞数过滤
        const isSearchPage = 
          (window.location.pathname.startsWith('/search_result') && 
           window.location.search.includes('keyword=')) ||
          window.location.pathname.match(/^\/search_result\/[a-f0-9]+/i);
        
        if (isSearchPage) {
          const enableLikeFilter = settings.enableLikeFilter !== false; // 默认开启
          if (enableLikeFilter) {
            const likeThreshold = settings.likeThreshold || 30;
            console.log(`页面加载完成，自动触发点赞数过滤，阈值: ${likeThreshold}`);
            
            // 延迟执行，确保内容加载完成
            setTimeout(() => {
              filterByLikeCount(likeThreshold);
            }, 1500);
            
            setTimeout(() => {
              filterByLikeCount(likeThreshold);
            }, 3000);
          }
        }
      });
    });
  }
}

// 清理"大家都在搜"区域的多余下载按钮
function cleanupExtraDownloadButtons() {
  // 查找所有下载按钮
  const allDownloadButtons = document.querySelectorAll('.hp-download-btn');
  
  allDownloadButtons.forEach(button => {
    let parent = button;
    for (let i = 0; i < 10 && parent; i++) {
      if (parent.classList && (
          parent.classList.contains('query-note-wrapper') ||
          parent.classList.contains('query-note-item') ||
          parent.classList.contains('item-wrapper') ||
          parent.classList.contains('item-cover') ||
          (parent.getAttribute && parent.getAttribute('class') && 
           (parent.getAttribute('class').includes('query-note') ||
            parent.getAttribute('class').includes('item-wrapper')))
      )) {
        // 如果在"大家都在搜"区域，移除按钮
        button.remove();
        break;
      }
      parent = parent.parentNode;
    }
  });
}

// 添加所有下载相关的事件
function addAllDownloadEvents() {
  addNoteMouseEvents();
  addNoteDetailMouseEvents();
  addPopupImageMouseEvents();
}

// 设置 MutationObserver 监听 DOM 变化
function setupMutationObserver() {
  const observer = new MutationObserver((mutations) => {
    let shouldUpdate = false;
    
    mutations.forEach((mutation) => {
      // 检查是否有新节点添加
      if (mutation.addedNodes && mutation.addedNodes.length > 0) {
        shouldUpdate = true;
      }
      
      // 检查是否有 class 变化（可能是弹窗打开）
      if (mutation.attributeName === 'class') {
        shouldUpdate = true;
      }
    });
    
    if (shouldUpdate) {
      // 防抖：延迟执行，避免频繁触发
      if (window.mutationTimeout) {
        clearTimeout(window.mutationTimeout);
      }
      window.mutationTimeout = setTimeout(() => {
        addAllDownloadEvents();
        cleanupExtraDownloadButtons(); // 清理多余的按钮
      }, 300);
    }
  });
  
  // 开始监听
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class']
  });
}

// 为笔记详情页面添加下载按钮
function addNoteDetailMouseEvents() {
  // 查找笔记详情页面的图片容器
  const imgContainers = document.querySelectorAll('.img-container');
  
  imgContainers.forEach((container, index) => {
    // 检查是否已经添加过
    if (container.hasAttribute('data-hp-detail-download-added')) {
      return;
    }
    
    // 先给所有图片添加下载按钮（隐藏状态）
    const images = container.querySelectorAll('img');
    
    images.forEach((img, imgIndex) => {
      // 检查是否已经添加了下载按钮
      if (!img.parentNode.querySelector('.hp-download-btn')) {
        // 只处理有src属性、不是空白图片、尺寸较大的图片
        if (img.src && 
            img.src.trim() !== '' && 
            !img.src.includes('placeholder') &&
            !img.src.includes('avatar') &&
            !img.src.includes('Avatar')) {
          addDownloadButton(img);
        }
      }
    });
    
    // 添加鼠标进入事件
    container.addEventListener('mouseenter', () => {
      const buttons = container.querySelectorAll('.hp-download-btn');
      buttons.forEach(button => {
        button.style.display = 'flex';
      });
    });
    
    // 添加鼠标离开事件
    container.addEventListener('mouseleave', () => {
      const buttons = container.querySelectorAll('.hp-download-btn');
      buttons.forEach(button => {
        button.style.display = 'none';
      });
    });
    
    // 标记为已添加
    container.setAttribute('data-hp-detail-download-added', 'true');
  });
}

// 执行搜索页面自动化操作
async function executeSearchAutomation(settings) {
  console.log('执行搜索页面自动化操作:', settings);
  
  // 1. 等待页面完全加载
  await new Promise(resolve => {
    setTimeout(() => {
      console.log('等待页面加载完成');
      resolve();
    }, 1000);
  });
  
  // 2. 鼠标进入筛选按钮（先打开筛选面板）
  console.log('尝试鼠标进入筛选按钮');
  await mouseenterFilterButton();
  
  // 3. 点击图文按钮（必须执行，在筛选面板中点击）
  console.log('尝试点击图文按钮');
  clickImageTextButton();
  // 等待图文按钮点击后页面响应
  await new Promise(resolve => {
    setTimeout(() => {
      resolve();
    }, 1000);
  });
  
  // 4. 选择排序依据
  console.log('尝试选择排序依据:', settings.sortBy);
  await selectSortBy(settings.sortBy || 'most-liked');
  
  // 5. 等待排序选择后页面响应
  await new Promise(resolve => {
    setTimeout(() => {
      resolve();
    }, 1000);
  });
  
  // 6. 选择发布时间
  console.log('尝试选择发布时间:', settings.publishTime);
  await selectPublishTime(settings.publishTime || 'week');
  
  // 7. 等待发布时间选择后页面响应
  await new Promise(resolve => {
    setTimeout(() => {
      resolve();
    }, 1000);
  });
  
  // 8. 鼠标移到页面左下角，移除筛选区
  console.log('鼠标移到页面左下角，移除筛选区');
  moveMouseToBottomLeft();
  
  // // 9. 等待筛选区移除
  // await new Promise(resolve => {
  //   setTimeout(() => {
  //     resolve();
  //   }, 1000);
  // });
  
  // 10. 筛选点赞量大于设置阈值的笔记
  const enableLikeFilter = settings.enableLikeFilter !== false; // 默认开启
  if (enableLikeFilter) {
    const likeThreshold = settings.likeThreshold || 30;
    console.log(`开始筛选点赞量大于${likeThreshold}的笔记`);
    
    // 直接执行筛选功能，不需要延迟
    filterByLikeCount(likeThreshold);
  } else {
    console.log('未启用点赞数过滤功能，跳过筛选');
  }
}

// 鼠标移到页面左下角
function moveMouseToBottomLeft() {
  console.log('移动鼠标到页面左下角');
  
  // 创建鼠标移动事件
  const mouseMoveEvent = new MouseEvent('mousemove', {
    bubbles: true,
    cancelable: true,
    view: window,
    clientX: 10, // 页面左下角的x坐标
    clientY: window.innerHeight - 10, // 页面左下角的y坐标
    screenX: 10,
    screenY: window.screen.height - 10,
    movementX: 0,
    movementY: 0,
    buttons: 0,
    ctrlKey: false,
    altKey: false,
    shiftKey: false,
    metaKey: false
  });
  
  // 触发鼠标移动事件
  document.dispatchEvent(mouseMoveEvent);
  console.log('已触发鼠标移动到页面左下角的事件');
  
  // 也可以直接触发筛选区的mouseleave事件，如果能找到筛选区元素
  const filterPanel = document.querySelector('.filter-panel');
  if (filterPanel) {
    const mouseLeaveEvent = new MouseEvent('mouseleave', {
      bubbles: true,
      cancelable: true,
      view: window
    });
    filterPanel.dispatchEvent(mouseLeaveEvent);
    console.log('已触发筛选区的mouseleave事件');
  }
}

// 筛选点赞量大于指定值的笔记
function filterByLikeCount(threshold) {
  console.log(`========== 开始执行filterByLikeCount函数，阈值: ${threshold} ==========`);
  
  // 搜索页面的笔记项选择器（按优先级排序）
  const noteSelectors = [
    'section.note-item',
    '.note-item',
    '[class*="note-item"]',
    '.search-result-list .note-item',
    '.search-notes .note-item',
    '.results .note-item',
    '.feeds-container .note-item',
    '.feed-item',
    '[class*="feed-item"]',
    '.search-card',
    '[class*="search-card"]',
    '.note-card',
    '[class*="note-card"]'
  ];
  
  let noteItems = null;
  let usedSelector = '';
  
  for (const selector of noteSelectors) {
    const items = document.querySelectorAll(selector);
    if (items.length > 0) {
      console.log(`使用选择器 "${selector}" 找到 ${items.length} 个笔记项`);
      
      // 验证一下这些元素是否真的是笔记（检查是否有点赞数或封面图）
      let validCount = 0;
      for (const item of items) {
        if (item.querySelector('[class*="like"], [class*="count"], img')) {
          validCount++;
        }
      }
      
      if (validCount > items.length * 0.3) {
        noteItems = items;
        usedSelector = selector;
        break;
      } else {
        console.log(`选择器 "${selector}" 找到的元素中只有 ${validCount}/${items.length} 个有效，继续尝试`);
      }
    }
  }
  
  // 如果还是没找到，打印页面结构供调试
  if (!noteItems || noteItems.length === 0) {
    console.log('未找到笔记项，打印页面主要结构供调试:');
    
    // 查找可能的列表容器
    const possibleContainers = document.querySelectorAll(
      'section, .feeds, .feed-list, .note-list, .search-list, .results, [class*="note-list"], [class*="feed-list"], [class*="search-list"]'
    );
    console.log(`找到 ${possibleContainers.length} 个可能的列表容器:`);
    possibleContainers.forEach((container, i) => {
      console.log(`容器 ${i + 1}:`, container.tagName, container.className);
      console.log(`  子元素数量: ${container.children.length}`);
      if (container.children.length > 0) {
        console.log(`  第一个子元素:`, container.children[0].tagName, container.children[0].className);
      }
    });
    
    console.log('========== 过滤函数结束，未找到笔记项 ==========');
    return;
  }
  
  console.log(`最终使用选择器: "${usedSelector}"，共 ${noteItems.length} 个笔记项`);
  processNoteItems(noteItems, threshold);
}

// 处理笔记项
function processNoteItems(noteItems, threshold) {
  let hiddenCount = 0;
  let visibleCount = 0;
  let noLikeCount = 0;
  
  console.log(`开始处理 ${noteItems.length} 个笔记项`);
  
  // 点赞数元素的多种选择器（按优先级排序）
  const likeCountSelectors = [
    '.like-wrapper .count',
    '.like-wrapper .like-count',
    '.like-count',
    '[class*="like-wrapper"] [class*="count"]',
    '[class*="like"] [class*="count"]',
    '.note-footer .count',
    '.note-interaction .count',
    '[class*="footer"] [class*="count"]',
    '[class*="interaction"] [class*="count"]',
    '.count',
    'span[class*="count"]',
    'span[class*="like"]',
    '[class*="like-wrapper"]',
    '[class*="like-btn"]',
    '.like-btn .count',
    '.like-btn'
  ];
  
  // 对第一个笔记项打印详细的HTML结构，帮助调试
  if (noteItems.length > 0) {
    console.log('第一个笔记项的HTML结构（前2000字符）:');
    console.log(noteItems[0].outerHTML.substring(0, 2000));
  }
  
  noteItems.forEach((item, index) => {
    // 查找点赞数元素，尝试多种选择器
    let likeCountElement = null;
    let usedLikeSelector = '';
    
    for (const selector of likeCountSelectors) {
      try {
        const element = item.querySelector(selector);
        if (element && element.textContent && element.textContent.trim() !== '') {
          const text = element.textContent.trim();
          // 验证文本内容是否合理（包含数字或"赞"字，且长度小于20）
          if ((text === '赞' || /\d/.test(text)) && text.length < 20) {
            likeCountElement = element;
            usedLikeSelector = selector;
            break;
          }
        }
      } catch (e) {
        // 忽略选择器错误
      }
    }
    
    if (likeCountElement) {
      const likeCountText = likeCountElement.textContent.trim();
      
      // 处理点赞数显示为"赞"的情况，视为0赞
      let likeCount = 0;
      if (likeCountText === '赞') {
        likeCount = 0;
      } else {
        // 处理万级单位，如 "1.2万"
        if (likeCountText.includes('万')) {
          const num = parseFloat(likeCountText.replace(/[^0-9.]/g, ''));
          likeCount = Math.floor(num * 10000);
        } else {
          // 移除可能的非数字字符
          likeCount = parseInt(likeCountText.replace(/[^0-9]/g, ''));
          // 如果解析失败，视为0赞
          if (isNaN(likeCount)) {
            likeCount = 0;
          }
        }
      }
      
      if (likeCount < threshold) {
        // 隐藏点赞数小于阈值的笔记
        item.style.display = 'none';
        hiddenCount++;
      } else {
        // 确保点赞数大于等于阈值的笔记可见
        item.style.display = '';
        visibleCount++;
      }
    } else {
      noLikeCount++;
      // 找不到点赞数的笔记也隐藏（避免低质量内容）
      // item.style.display = 'none';
    }
  });
  
  console.log(`筛选完成：显示 ${visibleCount} 个，隐藏 ${hiddenCount} 个，未找到点赞数 ${noLikeCount} 个`);
  console.log('==================================================');
}



// 点击图文按钮
function clickImageTextButton() {
  console.log('开始查找图文按钮');
  
  const selectors = [
    '#image.channel',
    '#image',
    '.channel',
    '.filter-item',
    '.tab-item',
    '.filter-btn',
    '.tab',
    '.category-item',
    '.tags',
    '[class*="filter"]',
    '[class*="tab"]',
    '[class*="category"]',
    '[data-v-*] .filter-item',
    '[data-v-*] .tab-item',
    '[data-v-*] .tags',
    '.ai-dropdown-panel .filter-item',
    '.ai-dropdown-panel .tab-item',
    '.ai-dropdown-panel .tags',
    '.media-type-tabs .tab-item',
    '.channel-tabs .tab-item',
    '.content-type-tabs .tab-item'
  ];
  
  for (const selector of selectors) {
    try {
      const elements = document.querySelectorAll(selector);
      console.log(`查找 ${selector}，找到 ${elements.length} 个元素`);
      
      const matchedElements = [];
      for (const element of elements) {
        const text = element.textContent || '';
        if (text.includes('图文')) {
          matchedElements.push(element);
        }
      }
      
      const filteredElements = [];
      for (const element of matchedElements) {
        const style = window.getComputedStyle(element);
        const hasExtensionProps = 
          element.getAttribute('aria-hidden') === 'true' ||
          style.zIndex === '-1' ||
          style.opacity === '0' ||
          (style.opacity && parseFloat(style.opacity) < 0.1) ||
          element.getAttribute('button-hp-installed') ||
          element.getAttribute('data-hp-kind') ||
          (element.className && element.className.includes('hp-')) ||
          (element.id && element.id.includes('hp-'));
        
        if (!hasExtensionProps) {
          filteredElements.push(element);
        }
      }
      
      console.log(`匹配到 ${matchedElements.length} 个元素，过滤后剩余 ${filteredElements.length} 个`);
      
      const targetElement = filteredElements.length > 0 ? filteredElements[0] : (matchedElements.length > 0 ? matchedElements[0] : null);
      
      if (targetElement) {
        console.log('找到图文按钮:', targetElement);
        targetElement.click();
        return;
      }
    } catch (error) {
      console.log(`选择器 ${selector} 出错:`, error);
      continue;
    }
  }
  
  const allElements = document.querySelectorAll('button, a, div, span');
  console.log(`通过文本内容查找，检查 ${allElements.length} 个元素`);
  
  const matchedElements = [];
  for (const element of allElements) {
    const text = element.textContent || '';
    if (text.includes('图文')) {
      matchedElements.push(element);
    }
  }
  
  const filteredElements = [];
  for (const element of matchedElements) {
    const style = window.getComputedStyle(element);
    const hasExtensionProps = 
      element.getAttribute('aria-hidden') === 'true' ||
      style.zIndex === '-1' ||
      style.opacity === '0' ||
      (style.opacity && parseFloat(style.opacity) < 0.1) ||
      element.getAttribute('button-hp-installed') ||
      element.getAttribute('data-hp-kind') ||
      (element.className && element.className.includes('hp-')) ||
      (element.id && element.id.includes('hp-'));
    
    if (!hasExtensionProps) {
      filteredElements.push(element);
    }
  }
  
  console.log(`匹配到 ${matchedElements.length} 个元素，过滤后剩余 ${filteredElements.length} 个`);
  
  const targetElement = filteredElements.length > 0 ? filteredElements[0] : (matchedElements.length > 0 ? matchedElements[0] : null);
  
  if (targetElement) {
    console.log('找到图文按钮:', targetElement);
    targetElement.click();
    return;
  }
  
  console.log('未找到图文按钮，尝试通过 data 属性查找');
  
  const dataElements = document.querySelectorAll('[data-type], [data-value], [data-key]');
  for (const element of dataElements) {
    const dataType = element.getAttribute('data-type') || '';
    const dataValue = element.getAttribute('data-value') || '';
    if (dataType.includes('image') || dataValue.includes('image') || 
        dataType.includes('图文') || dataValue.includes('图文')) {
      console.log('通过 data 属性找到图文按钮:', element);
      element.click();
      return;
    }
  }
  
  console.log('未找到图文按钮');
}

// 鼠标进入筛选按钮
function mouseenterFilterButton() {
  console.log('开始查找筛选按钮');
  // 尝试多种可能的筛选按钮选择器，优先使用用户提供的精确选择器
  const selectors = [
    '.filter',
    '.filter.filter-icon',
    '[class*="filter"]',
    '.filter-btn',
    '.sort-btn',
    '.filter-icon',
    '.sort-icon',
    '.sort',
    '[class*="sort"]',
    '[class*="filter"] button',
    '[class*="sort"] button',
    '.toolbar',
    '.header'
  ];
  
  for (const selector of selectors) {
    const elements = document.querySelectorAll(selector);
    console.log(`查找 ${selector}，找到 ${elements.length} 个元素`);
    for (const element of elements) {
      if (element.textContent && (element.textContent.includes('筛选') || element.textContent.includes('排序'))) {
        console.log('找到筛选按钮:', element);
        
        // 先尝试点击打开筛选面板
        element.click();
        console.log('已点击筛选按钮');
        
        return new Promise(resolve => {
          setTimeout(() => {
            console.log('等待筛选面板显示');
            
            // 打印 filter-panel 的 HTML
            console.log('======= filter-panel HTML =======');
            const filterPanels = document.querySelectorAll('.filter-panel, [class*="filter-panel"], [class*="filter-dropdown"]');
            filterPanels.forEach((panel, index) => {
              console.log(`--- filter-panel ${index + 1} ---`);
              console.log(panel.outerHTML);
            });
            
            // 如果没有找到 filter-panel，打印所有可能的筛选面板
            if (filterPanels.length === 0) {
              console.log('未找到 filter-panel，尝试查找其他面板...');
              const allPanels = document.querySelectorAll('.panel, .dropdown, .menu');
              allPanels.forEach((panel, index) => {
                if (panel.textContent && panel.textContent.includes('图文')) {
                  console.log(`--- 包含"图文"的面板 ${index + 1} ---`);
                  console.log(panel.outerHTML);
                }
              });
            }
            
            resolve();
          }, 500);
        });
      }
    }
  }
  
  // 尝试通过文本内容查找
  const allElements = document.querySelectorAll('button, a, div, span');
  console.log(`通过文本内容查找，检查 ${allElements.length} 个元素`);
  for (const element of allElements) {
    if (element.textContent && (element.textContent.includes('筛选') || element.textContent.includes('排序'))) {
      console.log('找到筛选按钮:', element);
      
      // 点击打开筛选面板
      element.click();
      console.log('已点击筛选按钮');
      
      return new Promise(resolve => {
        setTimeout(() => {
          console.log('等待筛选面板显示');
          resolve();
        }, 500);
      });
    }
  }
  
  console.log('未找到筛选按钮');
  return Promise.resolve();
}

// 确保筛选面板是打开的
async function ensureFilterPanelOpen() {
  // 检查筛选面板是否已经打开
  const filterPanel = document.querySelector('.filter-panel, [class*="filter-panel"], [class*="filter-dropdown"]');
  
  if (filterPanel) {
    console.log('筛选面板已经打开');
    return;
  }
  
  console.log('筛选面板未打开，尝试打开...');
  await mouseenterFilterButton();
  
  // 等待一下，让面板显示出来
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // 再次检查
  const filterPanel2 = document.querySelector('.filter-panel, [class*="filter-panel"], [class*="filter-dropdown"]');
  if (filterPanel2) {
    console.log('筛选面板已打开');
  } else {
    console.log('筛选面板仍然未打开，继续...');
  }
}

// 选择排序依据
async function selectSortBy(sortBy) {
  console.log('开始查找排序依据选项:', sortBy);
  // 尝试多种可能的排序选项选择器
  const sortMap = {
    'most-liked': ['最多点赞', '点赞最多', 'like'],
    'most-collected': ['最多收藏', '收藏最多', 'collect'],
    'most-commented': ['最多评论', '评论最多', 'comment'],
    'latest': ['最新发布', '最新', 'latest']
  };
  
  const keywords = sortMap[sortBy] || sortMap['most-liked'];
  console.log('使用关键词:', keywords);
  
  // 确保筛选面板是打开的
  await ensureFilterPanelOpen();
  
  // 等待一下，让面板内容加载
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // 尝试多种可能的选择器，优先使用小红书特定的选择器
  const selectors = [
    // 小红书筛选面板特定选择器
    '.filter-panel .filter-container .filters-wrapper .filters .tag-container .tags',
    '.filter-panel .tags',
    '.tag-container .tags',
    // 通用选择器
    '.sort-options',
    '.filter-options',
    '.sort-menu',
    '.filter-menu',
    '.dropdown-menu',
    '.menu',
    '.option',
    '.item'
  ];
  
  for (const selector of selectors) {
    const elements = document.querySelectorAll(selector);
    console.log(`查找 ${selector}，找到 ${elements.length} 个元素`);
    
    // 收集所有匹配的元素
    const matchedElements = [];
    for (const element of elements) {
      for (const keyword of keywords) {
        if (element.textContent && element.textContent.includes(keyword)) {
          matchedElements.push(element);
          break;
        }
      }
    }
    
    // 先过滤掉有扩展属性的元素
    const filteredElements = [];
    for (const element of matchedElements) {
      const hasExtensionProps = 
        element.getAttribute('aria-hidden') === 'true' ||
        (element.style && element.style.zIndex === '-1') ||
        element.getAttribute('button-hp-installed') ||
        element.getAttribute('data-hp-kind') ||
        (element.className && element.className.includes('hp-')) ||
        (element.id && element.id.includes('hp-'));
      
      if (!hasExtensionProps) {
        filteredElements.push(element);
      }
    }
    
    console.log(`匹配到 ${matchedElements.length} 个元素，过滤后剩余 ${filteredElements.length} 个`);
    
    // 优先使用过滤后的元素，如果没有则使用第一个匹配的
    const targetElement = filteredElements.length > 0 ? filteredElements[0] : (matchedElements.length > 0 ? matchedElements[0] : null);
    
    if (targetElement) {
      console.log('找到排序选项:', targetElement);
      targetElement.click();
      return;
    }
  }
  
  // 尝试通过文本内容查找
  const allElements = document.querySelectorAll('button, a, div, span');
  console.log(`通过文本内容查找，检查 ${allElements.length} 个元素`);
  
  // 收集所有匹配的元素
  const matchedElements = [];
  for (const element of allElements) {
    for (const keyword of keywords) {
      if (element.textContent && element.textContent.includes(keyword)) {
        matchedElements.push(element);
        break;
      }
    }
  }
  
  // 先过滤掉有扩展属性的元素
  const filteredElements = [];
  for (const element of matchedElements) {
    const hasExtensionProps = 
      element.getAttribute('aria-hidden') === 'true' ||
      (element.style && element.style.zIndex === '-1') ||
      element.getAttribute('button-hp-installed') ||
      element.getAttribute('data-hp-kind') ||
      (element.className && element.className.includes('hp-')) ||
      (element.id && element.id.includes('hp-'));
    
    if (!hasExtensionProps) {
      filteredElements.push(element);
    }
  }
  
  console.log(`匹配到 ${matchedElements.length} 个元素，过滤后剩余 ${filteredElements.length} 个`);
  
  // 优先使用过滤后的元素，如果没有则使用第一个匹配的
  const targetElement = filteredElements.length > 0 ? filteredElements[0] : (matchedElements.length > 0 ? matchedElements[0] : null);
  
  if (targetElement) {
    console.log('找到排序选项:', targetElement);
    targetElement.click();
    return;
  }
  
  console.log('未找到排序选项:', sortBy);
}

// 选择发布时间
async function selectPublishTime(publishTime) {
  console.log('开始查找发布时间选项:', publishTime);
  // 尝试多种可能的发布时间选项选择器
  const timeMap = {
    'day': ['一天内', '1天', '24小时'],
    'week': ['一周内', '7天', '1周'],
    'month': ['一个月内', '30天', '1个月'],
    'year': ['一年内', '365天', '1年'],
    'half-year': ['半年内', '6个月'],
    'all': ['全部时间', '全部', 'all', '不限']
  };
  
  const keywords = timeMap[publishTime] || timeMap['week'];
  console.log('使用关键词:', keywords);
  
  // 确保筛选面板是打开的
  await ensureFilterPanelOpen();
  
  // 等待一下，让面板内容加载
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // 尝试多种可能的选择器，优先使用小红书特定的选择器
  const selectors = [
    // 小红书筛选面板特定选择器 - 发布时间部分
    '.filter-panel .filter-container .filters-wrapper .filters',
    '.filter-panel .tag-container .tags',
    '.filter-panel .tags',
    // 通用选择器
    '.time-options',
    '.filter-options',
    '.time-menu',
    '.filter-menu',
    '.dropdown-menu',
    '.menu',
    '.option',
    '.item'
  ];
  
  for (const selector of selectors) {
    const elements = document.querySelectorAll(selector);
    console.log(`查找 ${selector}，找到 ${elements.length} 个元素`);
    for (const element of elements) {
      // 检查元素是否包含发布时间相关的文本
      const elementText = element.textContent || '';
      if (elementText.includes('发布时间') || keywords.some(keyword => elementText.includes(keyword))) {
        // 如果元素包含发布时间标题，查找其下的选项
        if (elementText.includes('发布时间')) {
          const tagContainer = element.querySelector('.tag-container');
          if (tagContainer) {
            const timeOptions = tagContainer.querySelectorAll('.tags');
            console.log(`找到发布时间标签容器，包含 ${timeOptions.length} 个选项`);
            
            // 收集所有匹配的元素
            const matchedElements = [];
            for (const option of timeOptions) {
              for (const keyword of keywords) {
                if (option.textContent && option.textContent.includes(keyword)) {
                  matchedElements.push(option);
                  break;
                }
              }
            }
            
            // 先过滤掉有扩展属性的元素
            const filteredElements = [];
            for (const element of matchedElements) {
              const hasExtensionProps = 
                element.getAttribute('aria-hidden') === 'true' ||
                (element.style && element.style.zIndex === '-1') ||
                element.getAttribute('button-hp-installed') ||
                element.getAttribute('data-hp-kind') ||
                (element.className && element.className.includes('hp-')) ||
                (element.id && element.id.includes('hp-'));
              
              if (!hasExtensionProps) {
                filteredElements.push(element);
              }
            }
            
            console.log(`匹配到 ${matchedElements.length} 个元素，过滤后剩余 ${filteredElements.length} 个`);
            
            // 优先使用过滤后的元素，如果没有则使用第一个匹配的
            const targetElement = filteredElements.length > 0 ? filteredElements[0] : (matchedElements.length > 0 ? matchedElements[0] : null);
            
            if (targetElement) {
              console.log('找到发布时间选项:', targetElement);
              targetElement.click();
              // 停止2秒后再点击一次
              setTimeout(() => {
                console.log('再次点击发布时间选项:', targetElement);
                targetElement.click();
              }, 2000);
              return;
            }
          }
        } else {
          // 直接检查元素是否是时间选项
          // 收集所有匹配的元素
          const matchedElements = [];
          for (const keyword of keywords) {
            if (elementText.includes(keyword)) {
              matchedElements.push(element);
              break;
            }
          }
          
          // 先过滤掉有扩展属性的元素
          const filteredElements = [];
          for (const element of matchedElements) {
            const hasExtensionProps = 
              element.getAttribute('aria-hidden') === 'true' ||
              (element.style && element.style.zIndex === '-1') ||
              element.getAttribute('button-hp-installed') ||
              element.getAttribute('data-hp-kind') ||
              (element.className && element.className.includes('hp-')) ||
              (element.id && element.id.includes('hp-'));
            
            if (!hasExtensionProps) {
              filteredElements.push(element);
            }
          }
          
          console.log(`匹配到 ${matchedElements.length} 个元素，过滤后剩余 ${filteredElements.length} 个`);
          
          // 优先使用过滤后的元素，如果没有则使用第一个匹配的
          const targetElement = filteredElements.length > 0 ? filteredElements[0] : (matchedElements.length > 0 ? matchedElements[0] : null);
          
          if (targetElement) {
            console.log('找到发布时间选项:', targetElement);
            targetElement.click();
            // 停止2秒后再点击一次
            setTimeout(() => {
              console.log('再次点击发布时间选项:', targetElement);
              targetElement.click();
            }, 2000);
            return;
          }
        }
      }
    }
  }
  
  // 尝试通过文本内容查找
  const allElements = document.querySelectorAll('button, a, div, span');
  console.log(`通过文本内容查找，检查 ${allElements.length} 个元素`);
  
  // 收集所有匹配的元素
  const matchedElements = [];
  for (const element of allElements) {
    for (const keyword of keywords) {
      if (element.textContent && element.textContent.includes(keyword)) {
        matchedElements.push(element);
        break;
      }
    }
  }
  
  // 先过滤掉有扩展属性的元素
  const filteredElements = [];
  for (const element of matchedElements) {
    const hasExtensionProps = 
      element.getAttribute('aria-hidden') === 'true' ||
      (element.style && element.style.zIndex === '-1') ||
      element.getAttribute('button-hp-installed') ||
      element.getAttribute('data-hp-kind') ||
      (element.className && element.className.includes('hp-')) ||
      (element.id && element.id.includes('hp-'));
    
    if (!hasExtensionProps) {
      filteredElements.push(element);
    }
  }
  
  console.log(`匹配到 ${matchedElements.length} 个元素，过滤后剩余 ${filteredElements.length} 个`);
  
  // 优先使用过滤后的元素，如果没有则使用第一个匹配的
  const targetElement = filteredElements.length > 0 ? filteredElements[0] : (matchedElements.length > 0 ? matchedElements[0] : null);
  
  if (targetElement) {
    console.log('找到发布时间选项:', targetElement);
    targetElement.click();
    // 停止2秒后再点击一次
    setTimeout(() => {
      console.log('再次点击发布时间选项:', targetElement);
      targetElement.click();
    }, 2000);
    return;
  }
  
  console.log('未找到发布时间选项:', publishTime);
}

// 为笔记添加鼠标进入事件，显示下载按钮
function addNoteMouseEvents() {
  const noteItems = document.querySelectorAll('section.note-item');

  noteItems.forEach((noteItem, index) => {
    // 检查是否已经添加过
    if (noteItem.hasAttribute('data-hp-download-added')) {
      return;
    }
    // 先给所有图片添加下载按钮（隐藏状态）
    const images = noteItem.querySelectorAll('img');
    
    images.forEach((img, imgIndex) => {
      // 检查是否已经添加了下载按钮
      if (!img.parentNode.querySelector('.hp-download-btn')) {
        // 只处理有src属性、不是空白图片、不是头像的图片
        if (img.src && 
            img.src.trim() !== '' && 
            !img.src.includes('placeholder') &&
            !img.src.includes('avatar') &&
            !img.src.includes('Avatar')) {
          addDownloadButton(img);
        }
      }
    });
    
    // 添加鼠标进入事件
    noteItem.addEventListener('mouseenter', () => {
      const buttons = noteItem.querySelectorAll('.hp-download-btn');
      buttons.forEach(button => {
        button.style.display = 'flex';
      });
    });
    
    // 添加鼠标离开事件
    noteItem.addEventListener('mouseleave', () => {
      const buttons = noteItem.querySelectorAll('.hp-download-btn');
      buttons.forEach(button => {
        button.style.display = 'none';
      });
    });
    
    // 标记为已添加
    noteItem.setAttribute('data-hp-download-added', 'true');
  });
}

// 在小红书页面注入图片下载按钮
function injectDownloadButtons() {
  console.log('开始注入小红书图片下载按钮');
  
  // 为笔记添加鼠标事件
  addNoteMouseEvents();
  
  // 处理笔记详情页的图片（基于note-container容器）
  const noteContainer = document.querySelector('#noteContainer.note-container');
  if (noteContainer) {
    console.log('找到笔记详情页容器 note-container');
    const containerImages = noteContainer.querySelectorAll('img');
    console.log(`在 note-container 中找到 ${containerImages.length} 张图片`);
    
    containerImages.forEach(img => {
      // 检查是否已经添加了下载按钮
      if (!img.parentNode.querySelector('.hp-download-btn')) {
        // 只处理有src属性且不是空白图片的图片，并且宽度和高度都大于100
        if (img.src && img.src.trim() !== '' && !img.src.includes('placeholder') && img.width > 100 && img.height > 100) {
          console.log(`为详情页图片添加下载按钮: ${img.src} (${img.width}x${img.height})`);
          addDownloadButton(img);
        } else if (img.src && img.src.trim() !== '' && !img.src.includes('placeholder')) {
          console.log(`详情页图片尺寸过小，跳过添加下载按钮: ${img.src} (${img.width}x${img.height})`);
        }
      }
    });
  } else {
    console.log('未找到笔记详情页容器 note-container');
  }
  
  console.log('小红书图片处理完成');
}

// ============================================================
// 根据图片所在位置，获取正确的笔记 URL
// - 详情页：返回当前页面 URL
// - 列表页：向上找 <a> 标签的 href（包含 xsec_token 等完整参数）
// ============================================================
function getNoteUrl(img) {
  // 情况1：当前是笔记详情页，直接返回页面URL
  const noteContainer = document.querySelector('#noteContainer.note-container');
  if (noteContainer) {
    return window.location.href;
  }

  // 情况2：当前是列表页，向上在图片的祖先节点中找 <a> 标签
  let node = img;
  for (let i = 0; i < 15 && node; i++) {
    if (node.tagName === 'A' && node.href) {
      const h = node.href;
      if (h.includes('xiaohongshu.com') &&
          (h.includes('/explore/') ||
           h.includes('/discovery/item/') ||
           h.includes('/search_result/') ||
           h.includes('/user/profile/'))) {
        return h;
      }
    }
    node = node.parentNode;
  }

  // 情况3：在 noteItem 容器中找第一个 <a> 标签
  let noteItem = img;
  for (let i = 0; i < 10 && noteItem; i++) {
    if (noteItem.tagName === 'SECTION' ||
        (noteItem.classList && (
          noteItem.classList.contains('note-item') ||
          noteItem.classList.contains('note-card') ||
          noteItem.classList.contains('feeds-container') ||
          noteItem.classList.contains('note-container')
        ))) {
      const link = noteItem.querySelector('a[href*="xiaohongshu.com"]');
      if (link && link.href) {
        return link.href;
      }
      break;
    }
    noteItem = noteItem.parentNode;
  }

  // 兜底：返回当前页面 URL
  console.warn('[下载] 未找到笔记链接，返回当前页面URL');
  return window.location.href;
}

// 为图片添加下载按钮
function addDownloadButton(img) {
  // 检查是否在"大家都在搜"区域，跳过这些区域
  let parent = img;
  for (let i = 0; i < 10 && parent; i++) {
    if (parent.classList && (
        parent.classList.contains('query-note-wrapper') ||
        parent.classList.contains('query-note-item') ||
        parent.classList.contains('item-wrapper') ||
        parent.classList.contains('item-cover') ||
        (parent.getAttribute && parent.getAttribute('class') && 
         (parent.getAttribute('class').includes('query-note') ||
          parent.getAttribute('class').includes('item-wrapper')))
    )) {
      return; // 跳过"大家都在搜"区域
    }
    parent = parent.parentNode;
  }
  
  // 创建下载按钮容器
  const buttonContainer = document.createElement('div');
  buttonContainer.className = 'hp-download-btn';
  buttonContainer.style.cssText = `
    position: absolute;
    top: 10px;
    left: 10px;
    background: rgba(0, 0, 0, 0.8);
    color: white;
    border: none;
    border-radius: 4px;
    padding: 6px 12px;
    font-size: 14px;
    cursor: pointer;
    z-index: 99999;
    display: none;
    align-items: center;
    justify-content: center;
    transition: background 0.3s;
    pointer-events: auto;
  `;
  
  // 添加下载图标
  buttonContainer.innerHTML = '下载';
  
  // 为图片的父容器添加相对定位，确保按钮位置正确
  const imgParent = img.parentNode;
  
  if (getComputedStyle(imgParent).position === 'static') {
    imgParent.style.position = 'relative';
  }
  // 获取笔记链接（从页面DOM中找真正的笔记链接，确保带 xsec_token 等参数）
  const noteUrl = getNoteUrl(img);
  // console.log('[下载] 获取到笔记链接:', noteUrl);
  
  // 添加点击事件处理
  buttonContainer.addEventListener('click', (e) => {
    e.stopPropagation();
    e.preventDefault();
    downloadNoteImages(noteUrl);
  });
  
  // 将按钮添加到图片的父容器中
  imgParent.appendChild(buttonContainer);
}

// 处理弹出笔记中的图片，为其添加下载按钮
function injectPopupNoteDownloadButtons() {
  // 查找可能的弹出笔记容器
  const popupSelectors = [
    '.modal',
    '.popup',
    '.dialog',
    '.note-detail',
    '.content',
    '[class*="modal"]',
    '[class*="popup"]',
    '[class*="dialog"]',
    '[class*="note-detail"]',
    '[class*="content"]'
  ];
  
  popupSelectors.forEach(selector => {
    const popupElements = document.querySelectorAll(selector);
    
    popupElements.forEach(popup => {
      // 查找弹出笔记中的图片
      const images = popup.querySelectorAll('img');
      images.forEach(img => {
        // 检查是否已经添加了下载按钮
        if (!img.parentNode.querySelector('.hp-download-btn')) {
          // 只处理有src属性且不是空白图片的图片，并且宽度和高度都大于100
          if (img.src && img.src.trim() !== '' && !img.src.includes('placeholder') && img.width > 100 && img.height > 100) {
            addDownloadButton(img);
          }
        }
      });
    });
  });
}

// 下载笔记中的所有图片
async function downloadNoteImages(noteUrl) {
  console.log('[下载] 开始下载笔记图片:', noteUrl);
  try {
    // 判断是否是弹窗/详情页
    const isPopupOrDetail = document.querySelector('.media-container') || 
                            document.querySelector('.xhs-slider-container') ||
                            document.querySelector('.swiper.note-slider') ||
                            document.querySelector('#noteContainer.note-container') ||
                            document.querySelector('.note-detail');
    
    let imageUrls = [];
    let noteTitle = '';
    
    if (isPopupOrDetail) {
      // 弹窗/详情页：直接从 DOM 提取图片和标题，更准确
      console.log('[下载] 弹窗/详情页，直接从 DOM 提取');
      
      // 提取图片
      // 注意：swiper 轮播会复制前后几张图实现无缝循环，需要过滤掉带 swiper-slide-duplicate 类的复制 slide
      const imgSelectors = [
        '.swiper.note-slider .swiper-slide:not(.swiper-slide-duplicate) img',
        '.media-container img',
        '.xhs-slider-container img',
        '#noteContainer.note-container img',
        '.note-detail .note-content img'
      ];
      
      const seen = new Set();
      for (const sel of imgSelectors) {
        const imgs = document.querySelectorAll(sel);
        imgs.forEach(img => {
          const src = img.src || img.dataset?.src || '';
          if (src && !seen.has(src) && 
              (src.includes('xiaohongshu') || src.includes('xhscdn.com')) &&
              !src.includes('avatar') && !src.includes('Avatar')) {
            seen.add(src);
            imageUrls.push(src);
          }
        });
        if (imageUrls.length > 0) break;
      }
      
      // 提取标题
      const titleSelectors = [
        '.note-detail .title',
        '.note-title',
        '#detail-title',
        'h1.title',
        '.title-container .title'
      ];
      
      for (const sel of titleSelectors) {
        const el = document.querySelector(sel);
        if (el && el.textContent.trim()) {
          noteTitle = el.textContent.trim();
          break;
        }
      }
      
      // 如果没找到标题，用 meta
      if (!noteTitle) {
        const metaTitle = document.querySelector('meta[property="og:title"]')?.content || 
                         document.querySelector('meta[name="og:title"]')?.content;
        if (metaTitle) noteTitle = metaTitle;
      }
      
      console.log(`[下载] 从 DOM 提取到 ${imageUrls.length} 张图片，标题: ${noteTitle}`);
    }
    
    // 发送消息给后台脚本
    safeChromeCall(() => {
      console.log('[下载] 发送消息给 background');
      chrome.runtime.sendMessage(
        { 
          action: 'downloadNoteImages', 
          noteUrl: noteUrl,
          imageUrls: imageUrls.length > 0 ? imageUrls : null,
          title: noteTitle || null
        },
        (response) => {
          console.log('[下载] 收到 background 响应:', response);
          if (chrome.runtime.lastError) {
            console.error('[下载] runtime.lastError:', chrome.runtime.lastError);
            alert('图片下载失败，请重试！');
            return;
          }
          
          if (response && response.success) {
            console.log('[下载] 成功，下载了', response.downloadedCount, '张图片');
          } else {
            console.error('[下载] 失败，错误:', response ? response.error : '未知错误');
            alert('图片下载失败，请重试！');
          }
        }
      );
    });
  } catch (error) {
    console.error('[下载] 异常:', error);
    alert('下载过程中出错，请重试！');
  }
}

// 页面加载完成后初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// 监听页面滚动事件，触发点赞数筛选和下载按钮更新
window.addEventListener('scroll', () => {
  // 防抖处理，避免滚动时频繁触发
  if (window.scrollTimeout) {
    clearTimeout(window.scrollTimeout);
  }
  window.scrollTimeout = setTimeout(() => {
    if (window.location.hostname === 'www.xiaohongshu.com') {
      // 1. 处理点赞数筛选（搜索页面）
      const isSearchPage = 
        (window.location.pathname.startsWith('/search_result') && 
         window.location.search.includes('keyword=')) ||
        window.location.pathname.match(/^\/search_result\/[a-f0-9]+/i);
      
      if (isSearchPage) {
        // 每次滚动时都从 storage 读取可能性能较差，我们可以缓存设置
        if (!window.cachedSettings) {
          window.cachedSettings = {};
          safeChromeCall(() => {
            chrome.storage.sync.get('downloadSettings', (data) => {
              if (!chrome.runtime.lastError) {
                window.cachedSettings = data.downloadSettings || {};
                applyLikeFilter();
              }
            });
          });
        } else {
          applyLikeFilter();
        }
        
        function applyLikeFilter() {
          const settings = window.cachedSettings || {};
          const enableLikeFilter = settings.enableLikeFilter !== false; // 默认开启
          if (enableLikeFilter) {
            const likeThreshold = settings.likeThreshold || 30;
            filterByLikeCount(likeThreshold);
          }
        }
      }
      
      // 2. 处理下载按钮（为新出现的笔记添加事件）
      addAllDownloadEvents();
      cleanupExtraDownloadButtons(); // 清理多余的按钮
    }
  }, 300); // 300毫秒防抖延迟
});

// 为弹窗中的图片添加下载按钮
function addPopupImageMouseEvents() {
  // 查找弹窗中的图片容器
  const popupContainers = document.querySelectorAll('.media-container, .hp-slider-container');
  
  popupContainers.forEach((container, index) => {
    // 检查是否已经添加过
    if (container.hasAttribute('data-hp-popup-download-added')) {
      return;
    }
    
    // 先给所有图片添加下载按钮（隐藏状态）
    const images = container.querySelectorAll('img');
    
    images.forEach((img, imgIndex) => {
      // 检查是否已经添加了下载按钮
      if (!img.parentNode.querySelector('.hp-download-btn')) {
        // 只处理有src属性、不是空白图片、不是头像的图片
        if (img.src && 
            img.src.trim() !== '' && 
            !img.src.includes('placeholder') &&
            !img.src.includes('avatar') &&
            !img.src.includes('Avatar')) {
          addDownloadButton(img);
        }
      }
    });
    
    // 添加鼠标进入事件
    container.addEventListener('mouseenter', () => {
      const buttons = container.querySelectorAll('.hp-download-btn');
      buttons.forEach(button => {
        button.style.display = 'flex';
      });
    });
    
    // 添加鼠标离开事件
    container.addEventListener('mouseleave', () => {
      const buttons = container.querySelectorAll('.hp-download-btn');
      buttons.forEach(button => {
        button.style.display = 'none';
      });
    });
    
    // 标记为已添加
    container.setAttribute('data-hp-popup-download-added', 'true');
  });
}

// 关键词拓展功能
async function expandKeywords() {
  try {
    // 1. 找到搜索输入框（必须找到，后面需要操作它）
    const searchInput = findSearchInput();
    if (!searchInput) {
      throw new Error('未找到搜索输入框');
    }
    
    // 2. 直接从搜索框中获取关键词
    let originalKeyword = searchInput.value.trim();
    
    // 如果没有，尝试获取 innerText
    if (!originalKeyword && searchInput.innerText) {
      originalKeyword = searchInput.innerText.trim();
    }
    
    // 3. 如果还是没有，让用户输入
    if (!originalKeyword) {
      originalKeyword = prompt('请输入要拓展的关键词：');
      if (!originalKeyword || originalKeyword.trim() === '') {
        throw new Error('请输入关键词');
      }
      originalKeyword = originalKeyword.trim();
    }
    
    // 4. 确保有关键词
    if (!originalKeyword) {
      throw new Error('请先在搜索框中输入关键词');
    }
    
    // 6. 触发搜索输入框的点击事件
    searchInput.click();
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // 7. 收集拓展的关键词
    const expandedKeywords = new Set();
    
    // 8. 首先获取原始关键词的下拉提示
    searchInput.value = originalKeyword;
    triggerInputEvents(searchInput);
    await new Promise(resolve => setTimeout(resolve, 2000));
    const originalSuggestions = await getSearchSuggestions(originalKeyword);
    originalSuggestions.forEach(suggestion => expandedKeywords.add(suggestion));
    
    // 9. 遍历字母a-z，在关键词后添加字母并获取提示
    for (let i = 97; i <= 122; i++) {
      const letter = String.fromCharCode(i);
      const testKeyword = originalKeyword + letter;
      searchInput.value = testKeyword;
      triggerInputEvents(searchInput);
      const suggestions = await getSearchSuggestions(testKeyword);
      suggestions.forEach(suggestion => expandedKeywords.add(suggestion));
    }
    
    // 10. 恢复原始关键词
    searchInput.value = originalKeyword;
    triggerInputEvents(searchInput);
    
    // 11. 转换为数组
    const result = Array.from(expandedKeywords);
    
    alert(`关键词拓展完成！共拓展 ${result.length} 个关键词`);
    
    // 12. 保存关键词到本地存储并下载
    await saveKeywordsToStorage(originalKeyword, result);
    
    return { success: true, expandedKeywords: result };
  } catch (error) {
    console.error('关键词拓展出错:', error);
    alert('关键词拓展出错: ' + error.message);
    throw error;
  }
}

// 触发多种输入事件，确保现代前端框架能检测到变化
function triggerInputEvents(element) {
  const events = [
    new Event('input', { bubbles: true }),
    new Event('change', { bubbles: true }),
    new KeyboardEvent('keydown', { bubbles: true, key: 'a' }),
    new KeyboardEvent('keyup', { bubbles: true, key: 'a' })
  ];
  
  events.forEach(event => {
    element.dispatchEvent(event);
  });
}

// 查找搜索输入框
function findSearchInput() {
  // 首先尝试小红书特定的搜索框选择器（根据你提供的HTML）
  const xhsSelectors = [
    '#search-input',
    'input.search-input',
    'input[placeholder*="搜索小红书"]',
    'input[placeholder*="搜索"]',
    'div.input-box input',
    'div[class*="search"] input',
    'input[type="search"]',
    'div.search-wrapper input',
    'div.search-bar input',
    '.el-input__inner',
    'input[class*="search"]'
  ];
  for (const selector of xhsSelectors) {
    const input = document.querySelector(selector);
    if (input) {
      return input;
    }
  }
  return null;
}

// 获取搜索下拉提示
async function getSearchSuggestions(keyword) {
  try {
    const suggestionSelectors = [
      "div.ai-sug-container",
      "div.sug-container-wrapper.sug-pad",
      "div.sug-container-wrapper.sug-pad[search-input-wrapper-el]",
      "div.ai-dropdown-panel"
    ];
    
    let found = false;
    let suggestionItems = [];
    
    for (const selector of suggestionSelectors) {
      try {
        const suggestionBox = document.querySelector(selector);
        if (suggestionBox) {
          const items = suggestionBox.querySelectorAll("div.sug-item");
          if (items.length > 0) {
            suggestionItems = items;
            found = true;
            break;
          }
          const itemsAlt = suggestionBox.querySelectorAll("div[class*='item']");
          if (itemsAlt.length > 0) {
            suggestionItems = itemsAlt;
            found = true;
            break;
          }
        }
      } catch (error) {
        continue;
      }
    }
    
    if (!found) {
      suggestionItems = document.querySelectorAll(
        "div[class*='search-suggestion'] div, " +
        "div[class*='suggestion'] div, " +
        ".suggestion-item, " +
        ".search-suggest-item, " +
        "div.sug-container-wrapper.sug-pad div"
      );
    }
    
    const suggestions = [];
    for (const item of suggestionItems) {
      const text = item.textContent.trim();
      if (text && text !== keyword) {
        suggestions.push(text);
      }
    }
    
    console.log(`[关键词拓展] 获取到 ${suggestions.length} 个建议词`);
    
    const randomDelay = Math.random() * 500 + 1500;
    await new Promise(resolve => setTimeout(resolve, randomDelay));
    
    return [...new Set(suggestions)];
  } catch (error) {
    console.error('[关键词拓展] 获取建议词出错:', error);
    return [];
  }
}

// 保存关键词到本地存储
async function saveKeywordsToStorage(originalKeyword, keywords) {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const safeKeyword = originalKeyword.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_');
    const fileName = `${safeKeyword}_${timestamp}.json`;
    
    const keywordData = {
      originalKeyword: originalKeyword,
      expandedKeywords: keywords,
      timestamp: new Date().toISOString(),
      count: keywords.length
    };
    
    const content = JSON.stringify(keywordData, null, 2);
    
    safeChromeCall(() => {
      chrome.runtime.sendMessage(
        { 
          action: 'extend_keywords', 
          fileName: fileName, 
          content: content
        },
        (response) => {
          if (chrome.runtime.lastError) {
            console.error('发送消息失败:', chrome.runtime.lastError);
            return;
          }
          
          if (response && response.success) {
            console.log('关键词已保存为文件:', fileName);
          } else {
            console.error('文件保存失败:', response && response.error);
          }
        }
      );
    });
  } catch (error) {
    console.error('保存关键词时出错:', error);
  }
}