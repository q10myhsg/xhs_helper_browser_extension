// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', init);

function init() {
  // 初始化标签页关闭监听
  initTabCloseListener();
  // 初始化时清理已关闭的标签页
  cleanupClosedTabs();
  // 检测当前页面是否为小红书搜索页面
  checkIfXiaohongshuSearchPage();
  
  // 添加筛选高价值笔记按钮的点击事件
  const filterBtn = document.getElementById('filter-high-value');
  if (filterBtn) {
    filterBtn.addEventListener('click', filterHighValueNotes);
  }
  
  // 添加关键词拓展按钮的点击事件
  const expandBtn = document.getElementById('expand-keywords');
  if (expandBtn) {
    expandBtn.addEventListener('click', expandKeywords);
  }
}



// 初始化标签页关闭监听
function initTabCloseListener() {
  // 监听标签页移除事件
  chrome.tabs.onRemoved.addListener(function(tabId) {
    cleanupTab(tabId.toString());
  });
}

// 清理指定标签页的使用记录
function cleanupTab(tabId) {
  chrome.storage.sync.get('usedPages', (data) => {
    const usedPages = data.usedPages || [];
    // 移除已关闭的标签页ID
    const updatedPages = usedPages.filter(id => id !== tabId);
    if (updatedPages.length !== usedPages.length) {
      chrome.storage.sync.set({ usedPages: updatedPages }, () => {
        console.log('已清理关闭标签页的使用记录:', tabId);
      });
    }
  });
}

// 清理所有已关闭的标签页
function cleanupClosedTabs() {
  chrome.storage.sync.get('usedPages', (data) => {
    const usedPages = data.usedPages || [];
    if (usedPages.length > 0) {
      // 获取所有当前打开的标签页
      chrome.tabs.query({}, (tabs) => {
        const openTabIds = tabs.map(tab => tab.id.toString());
        // 过滤出仍然打开的标签页ID
        const updatedPages = usedPages.filter(id => openTabIds.includes(id));
        if (updatedPages.length !== usedPages.length) {
          chrome.storage.sync.set({ usedPages: updatedPages }, () => {
            console.log('已清理所有关闭标签页的使用记录');
          });
        }
      });
    }
  });
}

// 加载提示词列表
function loadPrompts() {
  chrome.storage.local.get('prompts', (data) => {
    const prompts = data.prompts || [];
    displayPrompts(prompts);
  });
}

// 显示提示词列表
function displayPrompts(prompts) {
  const promptList = document.getElementById('prompt-list');
  promptList.innerHTML = '';
  
  // 按照提示词名称字典序排序
  const sortedPrompts = [...prompts].sort((a, b) => {
    const nameA = (a.name || '').toLowerCase();
    const nameB = (b.name || '').toLowerCase();
    return nameA.localeCompare(nameB);
  });
  
  if (sortedPrompts.length === 0) {
    const noPromptsMsg = document.createElement('div');
    noPromptsMsg.className = 'no-prompts';
    noPromptsMsg.textContent = '暂无提示词，请点击"管理提示词"添加';
    promptList.appendChild(noPromptsMsg);
  } else {
    sortedPrompts.forEach((prompt, index) => {
      const promptItem = document.createElement('div');
      promptItem.className = 'prompt-item';
      promptItem.textContent = prompt.name || `提示词 ${index + 1}`;
      promptItem.addEventListener('click', () => {
        checkAuthAndInsert(prompt.content);
      });
      promptList.appendChild(promptItem);
    });
  }
}

// 检查认证并插入提示词
function checkAuthAndInsert(prompt) {
  chrome.storage.sync.get(['auth', 'usedPages'], (data) => {
    const auth = data.auth || {};
    const usedPages = data.usedPages || [];
    
    // 获取当前标签页ID
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs[0];
      if (activeTab) {
        const tabId = activeTab.id.toString();
        
        // 验证认证状态
        const isAuthValid = validateAuth(auth);
        
        if (isAuthValid) {
          // 认证有效，允许在多个页面使用
          insertPrompt(prompt);
        } else {
          // 认证无效，检查是否已经在其他页面使用
          if (usedPages.length < 5) {
            // 未达到使用限制，记录当前页面
            if (!usedPages.includes(tabId)) {
              usedPages.push(tabId);
              chrome.storage.sync.set({ usedPages }, () => {
                insertPrompt(prompt);
              });
            } else {
              // 已经在当前页面使用过，允许继续使用
              insertPrompt(prompt);
            }
          } else if (usedPages.includes(tabId)) {
            // 已经在当前页面使用过，允许继续使用
            insertPrompt(prompt);
          } else {
            // 在新页面使用，但已经达到使用限制
            showPermissionError();
          }
        }
      }
    });
  });
}

// 简单的解密函数（使用wenyang作为密钥）
function decrypt(encryptedData, key) {
  try {
    // 移除前面的有效期前缀
    const parts = encryptedData.split('_');
    const actualEncryptedData = parts.length > 1 ? parts.slice(1).join('_') : encryptedData;
    
    // 从Base64转换回来
    let data;
    try {
      // 尝试使用现代方法解码
      data = atob(actualEncryptedData);
    } catch (e) {
      //  fallback到旧方法
      data = decodeURIComponent(escape(atob(actualEncryptedData)));
    }
    
    let result = '';
    for (let i = 0; i < data.length; i++) {
      const charCode = data.charCodeAt(i) ^ key.charCodeAt(i % key.length);
      result += String.fromCharCode(charCode);
    }
    return result;
  } catch (error) {
    console.error('解密失败:', error);
    return null;
  }
}

// 验证认证状态
function validateAuth(auth) {
  if (!auth || !auth.token) {
    return false;
  }
  
  // 如果auth对象包含expiryTime字段，直接使用它
  if (auth.expiryTime !== undefined) {
    if (auth.expiryTime === -1) {
      // 永久有效期
      return true;
    } else {
      const now = Math.floor(Date.now() / 1000);
      return auth.expiryTime > now;
    }
  }
  
  // 后备方案：如果auth对象不包含expiryTime字段，解析认证字符串
  try {
    // 解析认证字符串，提取有效期天数
    const parts = auth.token.split('_');
    const duration = parseInt(parts[0]);
    
    // 假设当前时间为激活时间
    const now = Math.floor(Date.now() / 1000);
    
    if (duration === -1) {
      // 永久有效期
      return true;
    } else {
      // 根据当前时间和持续天数计算过期时间
      const expiryTime = now + (duration * 24 * 60 * 60);
      // 检查是否过期
      return expiryTime > now;
    }
  } catch (error) {
    console.error('验证认证失败:', error);
  }
  
  return false;
}

// 插入提示词到当前标签页
function insertPrompt(prompt) {
  // 复制提示词到剪贴板
  copyToClipboard(prompt);
  
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const activeTab = tabs[0];
    if (activeTab) {
      chrome.tabs.sendMessage(activeTab.id, { 
        action: 'insertPrompt', 
        prompt: prompt 
      }, (response) => {
        if (chrome.runtime.lastError) {
          console.log('无法发送消息到content script:', chrome.runtime.lastError.message);
          return;
        }
        if (response && response.success) {
          console.log('提示词插入成功');
        }
      });
    }
  });
}

// 显示权限不足错误
function showPermissionError() {
  const promptList = document.getElementById('prompt-list');
  promptList.innerHTML = '';
  
  const errorMsg = document.createElement('div');
  errorMsg.className = 'error-msg';
  errorMsg.textContent = '权限不足：未配置认证或认证已过期';
  errorMsg.style.color = 'red';
  errorMsg.style.padding = '10px';
  errorMsg.style.textAlign = 'center';
  promptList.appendChild(errorMsg);
  
  const upgradeMsg = document.createElement('div');
  upgradeMsg.className = 'upgrade-msg';
  upgradeMsg.textContent = '请在设置页面配置有效的认证以解除限制';
  upgradeMsg.style.padding = '10px';
  upgradeMsg.style.textAlign = 'center';
  upgradeMsg.style.marginTop = '10px';
  promptList.appendChild(upgradeMsg);
}

// 复制文本到剪贴板
function copyToClipboard(text) {
  navigator.clipboard.writeText(text)
    .then(() => {
      console.log('提示词已复制到剪贴板');
    })
    .catch(err => {
      console.error('复制到剪贴板失败:', err);
    });
}

// 检测当前页面是否为小红书搜索页面
function checkIfXiaohongshuSearchPage() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const activeTab = tabs[0];
    if (activeTab && activeTab.url) {
      const url = activeTab.url;
      // 检查元素是否存在
      const filterBtn = document.getElementById('filter-high-value');
      const expandBtn = document.getElementById('expand-keywords');
      const promptList = document.getElementById('prompt-list');
      
      if (filterBtn && expandBtn && promptList) {
        // 检查是否为小红书搜索页面（包含keyword参数）
        if (url.includes('xiaohongshu.com/search_result') && url.includes('keyword=')) {
          // 显示筛选高价值笔记按钮和关键词拓展按钮
          filterBtn.style.display = 'block';
          expandBtn.style.display = 'block';
          // 隐藏提示词列表
          promptList.style.display = 'none';
        } else {
          // 隐藏筛选高价值笔记按钮和关键词拓展按钮
          filterBtn.style.display = 'none';
          expandBtn.style.display = 'none';
          // 显示提示词列表
          promptList.style.display = 'block';
          // 加载提示词
          loadPrompts();
        }
      }
    }
  });
}

// 关键词拓展功能
function expandKeywords() {
  console.log('popup中点击了关键词拓展按钮');
  
  // 向content script发送关键词拓展请求
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const activeTab = tabs[0];
    if (activeTab) {
      console.log('找到活跃标签页:', activeTab.id, activeTab.url);
      
      // 先检查一下URL是否是小红书
      if (!activeTab.url || !activeTab.url.includes('xiaohongshu.com')) {
        console.error('当前页面不是小红书页面');
        alert('请在小红书页面使用关键词拓展功能');
        window.close();
        return;
      }
      
      // 尝试直接发送消息到content script
      console.log('尝试直接发送消息到content script...');
      chrome.tabs.sendMessage(activeTab.id, { 
        action: 'expandKeywords'
      }, (response) => {
        console.log('收到content script响应:', response);
        if (chrome.runtime.lastError) {
          console.error('直接发送消息失败:', chrome.runtime.lastError);
          console.log('尝试通过background发送消息...');
          
          // 如果直接发送失败，尝试通过background传递
          chrome.runtime.sendMessage({
            action: 'forwardToContent',
            tabId: activeTab.id,
            message: { action: 'expandKeywords' }
          }, (bgResponse) => {
            console.log('收到background响应:', bgResponse);
            if (chrome.runtime.lastError) {
              console.error('通过background发送也失败:', chrome.runtime.lastError);
              alert('无法与页面通信，请刷新页面后重试');
            }
            window.close();
          });
          return;
        }
        
        if (response && response.success) {
          console.log('关键词拓展成功');
        } else if (response && response.error) {
          console.error('关键词拓展失败:', response.error);
          alert('关键词拓展失败: ' + response.error);
        }
        
        // 关闭popup页面
        window.close();
      });
    } else {
      console.error('没有找到活跃标签页');
      alert('没有找到活跃标签页');
      // 如果没有找到活跃标签页，也关闭popup页面
      window.close();
    }
  });
}

// 筛选高价值笔记
function filterHighValueNotes(closePopup = true) {
  // 加载搜索设置
  chrome.storage.sync.get('downloadSettings', (data) => {
    const settings = data.downloadSettings || {
      enableSearchAutomation: true,
      enableImageText: true,
      sortBy: 'most-liked',
      publishTime: 'week'
    };
    
    // 向content script发送筛选高价值笔记的请求
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs[0];
      if (activeTab) {
        chrome.tabs.sendMessage(activeTab.id, { 
          action: 'filterHighValueNotes',
          settings: settings
        }, (response) => {
          if (chrome.runtime.lastError) {
            console.log('无法发送消息到content script:', chrome.runtime.lastError.message);
          } else if (response && response.success) {
            console.log('筛选高价值笔记成功');
          }
          // 关闭popup页面（如果需要）
          if (closePopup) {
            window.close();
          }
        });
      } else {
        // 如果没有找到活跃标签页，也关闭popup页面
        if (closePopup) {
          window.close();
        }
      }
    });
  });
}
