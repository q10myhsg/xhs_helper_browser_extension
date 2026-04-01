// 初始化权限数据和使用计数
console.log('content.js 开始加载...');
(async function() {
  try {
    console.log('content.js 初始化函数...');
    // 初始化权限数据
    if (typeof initPermissions === 'function') {
      console.log('调用 initPermissions...');
      await initPermissions();
    } else {
      console.log('initPermissions函数未定义，跳过初始化');
    }
    
    // 初始化使用计数
    if (typeof initUsageCounter === 'function') {
      console.log('调用 initUsageCounter...');
      await initUsageCounter();
    } else {
      console.log('initUsageCounter函数未定义，跳过初始化');
    }
    
    // 获取最新的权限信息（不强制更新，优先使用本地存储）
    if (typeof getDeviceInfo === 'function') {
      console.log('调用 getDeviceInfo...');
      await getDeviceInfo(false);
    } else {
      console.log('getDeviceInfo函数未定义，跳过权限获取');
    }
    console.log('content.js 初始化完成');
  } catch (error) {
    console.error('初始化时出错:', error);
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
              chrome.storage.sync.get('downloadSettings', async (data) => {
                settings = data.downloadSettings || {
                  enableSearchAutomation: true,
                  enableImageText: true,
                  sortBy: 'most-liked',
                  publishTime: 'week'
                };
                console.log('加载到的设置:', settings);
                await executeSearchAutomation(settings);
                sendResponse({ success: true });
              });
            } else {
              // 使用消息中的设置
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
          console.log('加载到的设置:', settings);
          await executeSearchAutomation(settings);
          sendResponse({ success: true });
        });
      } else {
        // 使用消息中的设置
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
  console.debug('提示词助手已加载');
  
  // 检查是否是小红书网站
  if (window.location.hostname === 'www.xiaohongshu.com') {
    // 检查下载设置
    chrome.storage.sync.get('downloadSettings', (data) => {
      const settings = data.downloadSettings || {};
      const enableDownload = settings.enableDownload !== false; // 默认开启
      
      if (enableDownload) {
        console.log('小红书页面已识别，开始添加笔记鼠标事件');
        
        // 立即为所有笔记添加事件监听器
        addNoteMouseEvents();
        
        // 为笔记详情页面添加下载按钮
        addNoteDetailDownloadButtons();
        
        // 使用 MutationObserver 监听新笔记和页面变化
        const observer = new MutationObserver((mutations) => {
          mutations.forEach((mutation) => {
            if (mutation.addedNodes.length > 0) {
              // 有新节点添加，检查是否有新笔记
              const newNotes = document.querySelectorAll('section.note-item:not([data-xhs-download-added])');
              if (newNotes.length > 0) {
                console.log(`发现 ${newNotes.length} 个新笔记，添加事件监听器`);
                addNoteMouseEvents();
              }
              
              // 检查是否有新的笔记详情页面内容
              addNoteDetailDownloadButtons();
            }
          });
        });
        
        // 开始观察文档变化
        observer.observe(document.body, {
          childList: true,
          subtree: true
        });
        
        console.log('MutationObserver 已启动，监听新笔记和页面变化');
      } else {
        console.log('小红书图片下载功能已关闭，不添加笔记鼠标事件');
      }
    });
  }
}

// 为笔记详情页面添加下载按钮
function addNoteDetailDownloadButtons() {
  console.log('开始为笔记详情页面添加下载按钮');
  
  // 检查是否是 explore 详情页
  const isExplorePage = window.location.pathname.includes('/explore/');
  
  // 1. 只有在 explore 详情页才在 noteContainer 上添加下载按钮
  if (isExplorePage) {
    const noteContainer = document.getElementById('noteContainer');
    if (noteContainer && !noteContainer.hasAttribute('data-xhs-detail-download-added')) {
      console.log('找到 noteContainer，在左上角添加下载按钮');
      
      // 为 noteContainer 添加相对定位
      if (getComputedStyle(noteContainer).position === 'static') {
        noteContainer.style.position = 'relative';
      }
      
      // 创建下载按钮（使用与项目中其他下载按钮一致的样式）
      const downloadButton = document.createElement('div');
      downloadButton.className = 'xhs-download-btn';
      downloadButton.style.cssText = `
        position: absolute;
        top: 10px;
        left: 10px;
        background: rgba(0, 0, 0, 0.6);
        color: white;
        border: none;
        border-radius: 4px;
        padding: 4px 8px;
        font-size: 12px;
        cursor: pointer;
        z-index: 1000;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background 0.3s;
      `;
      
      downloadButton.innerHTML = '↓ 下载';
      
      // 添加点击事件处理
      downloadButton.addEventListener('click', (e) => {
        e.stopPropagation();
        console.log('点击了笔记详情页下载按钮', window.location.href);
        downloadNoteImages(window.location.href);
      });
      
      // 将按钮添加到 noteContainer 中
      noteContainer.appendChild(downloadButton);
      
      // 标记为已添加
      noteContainer.setAttribute('data-xhs-detail-download-added', 'true');
      console.log('已在 noteContainer 左上角添加下载按钮');
    }
  }
  
  // 2. 在笔记详情页面的图片上添加下载按钮（使用原来的简单方式）
  // 查找笔记详情页面的图片容器
  const imgContainers = document.querySelectorAll('.img-container');
  
  imgContainers.forEach((container) => {
    // 检查是否已经添加过下载按钮
    if (container.hasAttribute('data-xhs-detail-download-added')) {
      return;
    }
    
    // 查找容器中的图片
    const images = container.querySelectorAll('img');
    console.log(`在 img-container 中找到 ${images.length} 张图片`);
    
    images.forEach((img) => {
      // 检查是否已经添加了下载按钮
      if (!img.parentNode || !img.parentNode.querySelector('.xhs-download-btn')) {
        // 只处理有src属性、不是空白图片、尺寸较大的图片
        if (img.src && 
            img.src.trim() !== '' && 
            !img.src.includes('placeholder') &&
            !img.src.includes('avatar') &&
            !img.src.includes('Avatar')) {
          console.log(`为笔记详情页图片添加下载按钮: ${img.src}`);
          
          // 创建下载按钮
          const buttonContainer = document.createElement('div');
          buttonContainer.className = 'xhs-download-btn';
          buttonContainer.style.cssText = `
            position: absolute;
            top: 10px;
            right: 10px;
            background: rgba(0, 0, 0, 0.6);
            color: white;
            border: none;
            border-radius: 4px;
            padding: 4px 8px;
            font-size: 12px;
            cursor: pointer;
            z-index: 1000;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: background 0.3s;
          `;
          
          // 添加下载图标
          buttonContainer.innerHTML = '↓ 下载';
          
          // 为图片的父容器添加相对定位
          const parent = img.parentNode;
          if (parent && getComputedStyle(parent).position === 'static') {
            parent.style.position = 'relative';
          }
          
          // 添加点击事件处理
          buttonContainer.addEventListener('click', (e) => {
            e.stopPropagation();
            console.log('点击了笔记详情页下载按钮', window.location.href);
            downloadNoteImages(window.location.href);
          });
          
          // 将按钮添加到图片的父容器中
          if (parent) {
            parent.appendChild(buttonContainer);
          }
        }
      }
    });
    
    // 标记为已添加
    container.setAttribute('data-xhs-detail-download-added', 'true');
  });
  
  console.log('笔记详情页面下载按钮添加完成');
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
  
  // 2. 点击图文按钮（必须执行）
  console.log('尝试点击图文按钮');
  clickImageTextButton();
  // 等待图文按钮点击后页面响应
  await new Promise(resolve => {
    setTimeout(() => {
      resolve();
    }, 500);
  });
  
  // 3. 鼠标进入筛选按钮
  console.log('尝试鼠标进入筛选按钮');
  await mouseenterFilterButton();
  
  // 4. 选择排序依据
  console.log('尝试选择排序依据:', settings.sortBy);
  selectSortBy(settings.sortBy || 'most-liked');
  
  // 5. 等待排序选择后页面响应
  await new Promise(resolve => {
    setTimeout(() => {
      resolve();
    }, 500);
  });
  
  // 6. 选择发布时间
  console.log('尝试选择发布时间:', settings.publishTime);
  selectPublishTime(settings.publishTime || 'week');
  
  // 7. 等待发布时间选择后页面响应
  await new Promise(resolve => {
    setTimeout(() => {
      resolve();
    }, 500);
  });
  
  // 8. 鼠标移到页面左下角，移除筛选区
  console.log('鼠标移到页面左下角，移除筛选区');
  moveMouseToBottomLeft();
  
  // 9. 等待筛选区移除
  await new Promise(resolve => {
    setTimeout(() => {
      resolve();
    }, 500);
  });
  
  // 10. 筛选点赞量大于设置阈值的笔记
  const enableLikeFilter = settings.enableLikeFilter === true; // 默认不开启
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
  console.log(`开始执行filterByLikeCount函数，阈值: ${threshold}`);
  
  // 查找所有笔记项
  const noteItems = document.querySelectorAll('section.note-item');
  console.log(`找到 ${noteItems.length} 个笔记项`);
  
  // 如果没有找到笔记项，尝试其他选择器
  if (noteItems.length === 0) {
    console.log('未找到section.note-item，尝试其他选择器');
    const alternativeNoteSelectors = [
      '.note-item',
      '[class*="note-item"]',
      'div[class*="note"]'
    ];
    
    for (const selector of alternativeNoteSelectors) {
      const altNoteItems = document.querySelectorAll(selector);
      if (altNoteItems.length > 0) {
        console.log(`使用替代选择器找到笔记项: ${selector}，数量: ${altNoteItems.length}`);
        processNoteItems(altNoteItems, threshold);
        return;
      }
    }
    
    console.log('确实未找到任何笔记项');
    return;
  }
  
  processNoteItems(noteItems, threshold);
}

// 处理笔记项
function processNoteItems(noteItems, threshold) {
  let hiddenCount = 0;
  let visibleCount = 0;
  
  console.log(`开始处理 ${noteItems.length} 个笔记项`);
  
  noteItems.forEach((item, index) => {
    console.log(`处理第 ${index + 1} 个笔记项`);
    // 查找点赞数
    const likeCountElement = item.querySelector('.like-wrapper .count');
    if (likeCountElement) {
      // console.log('找到点赞数元素:', likeCountElement);
      const likeCountText = likeCountElement.textContent.trim();
      console.log('点赞数文本:', likeCountText);
      
      // 处理点赞数显示为"赞"的情况，视为0赞
      let likeCount = 0;
      if (likeCountText === '赞') {
        console.log('点赞数显示为"赞"，视为0赞');
        likeCount = 0;
      } else {
        // 移除可能的非数字字符
        likeCount = parseInt(likeCountText.replace(/[^0-9]/g, ''));
        // 如果解析失败，视为0赞
        if (isNaN(likeCount)) {
          console.log('无法解析点赞数，视为0赞');
          likeCount = 0;
        }
      }
      
      console.log(`笔记点赞数: ${likeCount}`);
      
      if (likeCount < threshold) {
        // 隐藏点赞数小于阈值的笔记
        // console.log(`准备隐藏笔记，点赞数: ${likeCount} < ${threshold}`);
        // 使用display: none确保元素不占据空间
        item.style.display = 'none';
        hiddenCount++;
        console.log(`隐藏笔记，点赞数: ${likeCount}`);
      } else {
        // 确保点赞数大于等于阈值的笔记可见
        // item.style.display = 'block';
        // item.style.visibility = '';
        // item.style.height = '';
        // item.style.margin = '';
        // item.style.padding = '';
        visibleCount++;
        console.log(`显示笔记，点赞数: ${likeCount}`);
      }
    } 
  });
  
  console.log(`筛选完成：显示 ${visibleCount} 个笔记，隐藏 ${hiddenCount} 个笔记`);
  console.log('=====================');
}



// 点击图文按钮
function clickImageTextButton() {
  console.log('开始查找图文按钮');
  // 尝试多种可能的图文按钮选择器，优先使用用户提供的精确选择器
  const selectors = [
    '#image.channel',
    '#image',
    '.channel',
    '.filter-item',
    '.tab-item',
    '.filter-btn',
    '.tab',
    '.category-item',
    '[class*="filter"]',
    '[class*="tab"]',
    '[class*="category"]'
  ];
  
  for (const selector of selectors) {
    const elements = document.querySelectorAll(selector);
    console.log(`查找 ${selector}，找到 ${elements.length} 个元素`);
    for (const element of elements) {
      if (element.textContent && element.textContent.includes('图文')) {
        console.log('找到图文按钮:', element);
        element.click();
        return;
      }
    }
  }
  
  // 尝试通过文本内容查找
  const allElements = document.querySelectorAll('button, a, div, span');
  console.log(`通过文本内容查找，检查 ${allElements.length} 个元素`);
  for (const element of allElements) {
    if (element.textContent && element.textContent.includes('图文')) {
      console.log('找到图文按钮:', element);
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
        // 触发鼠标进入事件
        const mouseenterEvent = new MouseEvent('mouseenter', {
          bubbles: false,
          cancelable: true,
          view: window
        });
        element.dispatchEvent(mouseenterEvent);
        console.log('已触发鼠标进入事件');
        // 添加停留时间 0.3 秒
        return new Promise(resolve => {
          setTimeout(() => {
            console.log('鼠标悬停停留完成');
            resolve();
          }, 300);
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
      // 触发鼠标进入事件
        const mouseenterEvent = new MouseEvent('mouseenter', {
          bubbles: false,
          cancelable: true,
          view: window
        });
        element.dispatchEvent(mouseenterEvent);
        console.log('已触发鼠标进入事件');
      // 添加停留时间 0.3 秒
      return new Promise(resolve => {
        setTimeout(() => {
          console.log('鼠标悬停停留完成');
          resolve();
        }, 300);
      });
    }
  }
  
  console.log('未找到筛选按钮');
  return Promise.resolve();
}

// 选择排序依据
function selectSortBy(sortBy) {
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
    for (const element of elements) {
      for (const keyword of keywords) {
        if (element.textContent && element.textContent.includes(keyword)) {
          console.log('找到排序选项:', element);
          element.click();
          return;
        }
      }
    }
  }
  
  // 尝试通过文本内容查找
  const allElements = document.querySelectorAll('button, a, div, span');
  console.log(`通过文本内容查找，检查 ${allElements.length} 个元素`);
  for (const element of allElements) {
    for (const keyword of keywords) {
      if (element.textContent && element.textContent.includes(keyword)) {
        console.log('找到排序选项:', element);
        element.click();
        return;
      }
    }
  }
  
  console.log('未找到排序选项:', sortBy);
}

// 选择发布时间
function selectPublishTime(publishTime) {
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
            for (const option of timeOptions) {
              for (const keyword of keywords) {
                if (option.textContent && option.textContent.includes(keyword)) {
                  console.log('找到发布时间选项:', option);
                  option.click();
                  // 停止2秒后再点击一次
                  setTimeout(() => {
                    console.log('再次点击发布时间选项:', option);
                    option.click();
                  }, 2000);
                  return;
                }
              }
            }
          }
        } else {
          // 直接检查元素是否是时间选项
          for (const keyword of keywords) {
                if (elementText.includes(keyword)) {
                  console.log('找到发布时间选项:', element);
                  element.click();
                  // 停止2秒后再点击一次
                  setTimeout(() => {
                    console.log('再次点击发布时间选项:', element);
                    element.click();
                  }, 2000);
                  return;
                }
              }
        }
      }
    }
  }
  
  // 尝试通过文本内容查找
  const allElements = document.querySelectorAll('button, a, div, span');
  console.log(`通过文本内容查找，检查 ${allElements.length} 个元素`);
  for (const element of allElements) {
    for (const keyword of keywords) {
      if (element.textContent && element.textContent.includes(keyword)) {
        console.log('找到发布时间选项:', element);
        element.click();
        // 停止2秒后再点击一次
        setTimeout(() => {
          console.log('再次点击发布时间选项:', element);
          element.click();
        }, 2000);
        return;
      }
    }
  }
  
  console.log('未找到发布时间选项:', publishTime);
}

// 为笔记添加鼠标进入事件，显示下载按钮
function addNoteMouseEvents() {
  const noteItems = document.querySelectorAll('section.note-item');
  console.log(`找到 ${noteItems.length} 个 note-item 元素`);
  
  noteItems.forEach((noteItem, index) => {
    // 检查是否已经添加过事件监听
    if (noteItem.hasAttribute('data-xhs-download-added')) {
      return;
    }
    
    // 为笔记添加鼠标进入事件
    noteItem.addEventListener('mouseenter', () => {
      console.log('鼠标进入笔记，开始添加下载按钮');
      
      // 给笔记中的所有图片添加下载按钮
      const images = noteItem.querySelectorAll('img');
      images.forEach(img => {
        // 检查是否已经添加了下载按钮
        if (!img.parentNode.querySelector('.xhs-download-btn')) {
          // 只处理有src属性、不是空白图片、不是头像、尺寸较大的图片
          if (img.src && 
              img.src.trim() !== '' && 
              !img.src.includes('placeholder') &&
              !img.src.includes('avatar') &&
              !img.src.includes('Avatar') &&
              (img.naturalWidth > 100 || img.width > 100)) {
            console.log(`为图片添加下载按钮: ${img.src}`);
            addDownloadButton(img);
          }
        }
      });
      
      // 显示该笔记中所有下载按钮
      const buttons = noteItem.querySelectorAll('.xhs-download-btn');
      buttons.forEach(button => {
        button.style.display = 'flex';
      });
    });
    
    // 为笔记添加鼠标移出事件
    noteItem.addEventListener('mouseleave', () => {
      // 隐藏所有下载按钮
      const downloadButtons = noteItem.querySelectorAll('.xhs-download-btn');
      downloadButtons.forEach(button => {
        button.style.display = 'none';
      });
    });
    
    // 标记为已添加事件
    noteItem.setAttribute('data-xhs-download-added', 'true');
  });
  
  console.log('笔记鼠标事件添加完成');
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
      if (!img.parentNode.querySelector('.xhs-download-btn')) {
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

// 为图片添加下载按钮
function addDownloadButton(img) {
  // 创建下载按钮容器
  const buttonContainer = document.createElement('div');
  buttonContainer.className = 'xhs-download-btn';
  buttonContainer.style.cssText = `
    position: absolute;
    top: 10px;
    right: 10px;
    background: rgba(0, 0, 0, 0.6);
    color: white;
    border: none;
    border-radius: 4px;
    padding: 4px 8px;
    font-size: 12px;
    cursor: pointer;
    z-index: 1000;
    display: none;
    align-items: center;
    justify-content: center;
    transition: background 0.3s;
  `;
  
  // 添加下载图标
  buttonContainer.innerHTML = '↓ 下载';
  
  // 为图片的父容器添加相对定位，确保按钮位置正确
  const parent = img.parentNode;
  if (getComputedStyle(parent).position === 'static') {
    parent.style.position = 'relative';
  }
  
  // 获取笔记链接
  let noteUrl = window.location.href;
  
  // 尝试从图片的父元素中查找a标签获取笔记链接
  if (parent && parent.href) {
    noteUrl = parent.href;
  }
  
  // 添加点击事件处理
  buttonContainer.addEventListener('click', (e) => {
    console.log('点击了下载按钮', noteUrl);
    downloadNoteImages(noteUrl);
  });
  
  // 将按钮添加到图片的父容器中
  parent.parentNode.appendChild(buttonContainer);
  
  // 确保按钮一开始就是隐藏的
  buttonContainer.style.display = 'none';
}

// 处理弹出笔记中的图片，为其添加下载按钮
function injectPopupNoteDownloadButtons() {
  console.log('开始处理弹出笔记中的图片');
  
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
  
  let totalPopupImages = 0;
  let addedPopupButtons = 0;
  
  popupSelectors.forEach(selector => {
    const popupElements = document.querySelectorAll(selector);
    
    popupElements.forEach(popup => {
      // 查找弹出笔记中的图片
      const images = popup.querySelectorAll('img');
      totalPopupImages += images.length;
      images.forEach(img => {
        // 检查是否已经添加了下载按钮
        if (!img.parentNode.querySelector('.xhs-download-btn')) {
          // 只处理有src属性且不是空白图片的图片，并且宽度和高度都大于100
          if (img.src && img.src.trim() !== '' && !img.src.includes('placeholder') && img.width > 100 && img.height > 100) {
            console.log(`为弹出笔记中的图片添加下载按钮: ${img.src} (${img.width}x${img.height})`);
            addDownloadButton(img);
            addedPopupButtons++;
          } else if (img.src && img.src.trim() !== '' && !img.src.includes('placeholder')) {
            console.log(`弹出笔记中图片尺寸过小，跳过添加下载按钮: ${img.src} (${img.width}x${img.height})`);
          }
        }
      });
    });
  });
  
  console.log(`弹出笔记图片处理完成：找到 ${totalPopupImages} 张图片，添加了 ${addedPopupButtons} 个下载按钮`);
}

// 下载笔记中的所有图片
async function downloadNoteImages(noteUrl) {
  console.log('开始下载笔记图片:', noteUrl);
  
  try {
    // 发送消息给后台脚本，让后台脚本处理HTTP请求
    chrome.runtime.sendMessage(
      { action: 'downloadNoteImages', noteUrl: noteUrl },
      (response) => {
        if (response && response.success) {
          console.log('笔记图片下载成功:', response);
          // alert(`成功下载 ${response.downloadedCount} 张图片！`);
        } else {
          console.error('笔记图片下载失败:', response);
          alert('图片下载失败，请重试！');
        }
      }
    );
  } catch (error) {
    console.error('下载笔记图片时出错:', error);
    alert('下载过程中出错，请重试！');
  }
}

// 页面加载完成后初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// 监听页面滚动事件，触发点赞数筛选
window.addEventListener('scroll', () => {
  // 防抖处理，避免滚动时频繁触发
  if (window.scrollTimeout) {
    clearTimeout(window.scrollTimeout);
  }
  window.scrollTimeout = setTimeout(() => {
    // 只有在小红书搜索页面（包含keyword参数）才触发
    if (window.location.hostname === 'www.xiaohongshu.com' && 
        window.location.pathname.replace(/\/$/, '') === '/search_result' && 
        window.location.search.includes('keyword=')) {
      // 加载设置并执行筛选
      chrome.storage.sync.get('downloadSettings', (data) => {
        const settings = data.downloadSettings || {};
        const enableLikeFilter = settings.enableLikeFilter === true; // 默认不开启
        if (enableLikeFilter) {
          const likeThreshold = settings.likeThreshold || 30;
          console.log('滚动时触发点赞数筛选，阈值:', likeThreshold);
          filterByLikeCount(likeThreshold);
        } else {
          console.log('未启用点赞数过滤功能，跳过筛选');
        }
      });
    }
  }, 300); // 300毫秒防抖延迟
});

// 关键词拓展功能
async function expandKeywords() {
  try {
    // 1. 找到搜索输入框
    const searchInput = findSearchInput();
    if (!searchInput) {
      throw new Error('未找到搜索输入框');
    }
    
    // 2. 获取用户输入的关键词
    const originalKeyword = searchInput.value.trim();
    if (!originalKeyword) {
      throw new Error('请先在搜索框中输入关键词');
    }
    
    // 3. 触发搜索输入框的点击事件
    searchInput.click();
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // 4. 收集拓展的关键词
    const expandedKeywords = new Set();
    
    // 5. 首先获取原始关键词的下拉提示
    searchInput.value = originalKeyword;
    triggerInputEvents(searchInput);
    await new Promise(resolve => setTimeout(resolve, 2000));
    const originalSuggestions = await getSearchSuggestions(originalKeyword);
    originalSuggestions.forEach(suggestion => expandedKeywords.add(suggestion));
    
    // 6. 遍历字母a-z，在关键词后添加字母并获取提示
    for (let i = 97; i <= 122; i++) {
      const letter = String.fromCharCode(i);
      const testKeyword = originalKeyword + letter;
      searchInput.value = testKeyword;
      triggerInputEvents(searchInput);
      const suggestions = await getSearchSuggestions(testKeyword);
      suggestions.forEach(suggestion => expandedKeywords.add(suggestion));
    }
    
    // 7. 恢复原始关键词
    searchInput.value = originalKeyword;
    triggerInputEvents(searchInput);
    
    // 8. 转换为数组
    const result = Array.from(expandedKeywords);
    
    alert(`关键词拓展完成！共拓展 ${result.length} 个关键词`);
    
    // 9. 保存关键词到本地存储并下载
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
  const selectors = [
    'input[type="search"]',
    'input[placeholder*="搜索"]',
    'input[class*="search"]',
    '#search-input',
    '.search-input',
    '[class*="search"] input',
    '[id*="search"] input'
  ];
  
  for (const selector of selectors) {
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
      "div.sug-container-wrapper.sug-pad",
      "div.sug-container-wrapper.sug-pad[search-input-wrapper-el]"
    ];
    
    let found = false;
    let suggestionItems = [];
    
    for (const selector of suggestionSelectors) {
      try {
        const suggestionBox = document.querySelector(selector);
        if (suggestionBox) {
          const items = suggestionBox.querySelectorAll("div[class*='item']");
          if (items.length > 0) {
            suggestionItems = items;
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
    
    const randomDelay = Math.random() * 500 + 1500;
    await new Promise(resolve => setTimeout(resolve, randomDelay));
    
    return [...new Set(suggestions)];
  } catch (error) {
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
    
    chrome.runtime.sendMessage(
      { 
        action: 'extend_keywords', 
        fileName: fileName, 
        content: content
      },
      (response) => {
        if (response && response.success) {
          console.log('关键词已保存为文件:', fileName);
        } else {
          console.error('文件保存失败:', response && response.error);
        }
      }
    );
  } catch (error) {
    console.error('保存关键词时出错:', error);
  }
}