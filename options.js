// 全局变量
let prompts = [];
let editingIndex = -1;

// 从auth.js导入认证函数
// 注意：在Chrome插件中，我们需要确保auth.js在options.js之前加载
// 实际使用时，需要在options.html中先引入auth.js

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', init);

async function init() {
  // 初始化权限数据
  await initPermissions();
  
  // 获取最新的权限信息
  if (typeof getDeviceInfo === 'function') {
    await getDeviceInfo();
  } else {
    console.log('getDeviceInfo函数未定义，跳过权限获取');
  }
  
  // 初始化标签页切换功能
  initTabs();
  
  // 加载数据
  loadPrompts();
  loadAuth();
  loadDownloadSettings();
  loadUsageInfo();
  
  // 添加事件监听器
  addEventListeners();
}

// 初始化标签页切换功能
function initTabs() {
  const tabs = document.querySelectorAll('.tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', function() {
      // 移除所有标签页的活动状态
      tabs.forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      
      // 添加当前标签页的活动状态
      this.classList.add('active');
      const tabId = this.getAttribute('data-tab');
      const tabContent = document.getElementById(`${tabId}-tab`);
      if (tabContent) {
        tabContent.classList.add('active');
        
        // 如果切换到提示词管理标签页，重新加载提示词
        if (tabId === 'prompts') {
          loadPrompts();
        } else if (tabId === 'auth') {
          // 如果切换到认证标签页，重新加载使用情况
          loadUsageInfo();
        }
      }
    });
  });
}

// 添加事件监听器
function addEventListeners() {
  // 为添加提示词按钮添加事件监听器
  const addPromptBtn = document.getElementById('add-prompt');
  if (addPromptBtn) {
    addPromptBtn.addEventListener('click', addPrompt);
  }
  
  // 为更新提示词按钮添加事件监听器
  const updatePromptBtn = document.getElementById('update-prompt');
  if (updatePromptBtn) {
    updatePromptBtn.addEventListener('click', updatePrompt);
  }
  
  // 为搜索提示词输入框添加事件监听器
  const searchPromptInput = document.getElementById('search-prompt');
  if (searchPromptInput) {
    searchPromptInput.addEventListener('input', searchPrompts);
  }
  
  // 为保存认证按钮添加事件监听器
  const saveAuthBtn = document.getElementById('save-auth');
  if (saveAuthBtn) {
    saveAuthBtn.addEventListener('click', saveAuth);
  }
  
  // 生成认证按钮已移除，不再添加事件监听器
  
  // 为保存下载设置按钮添加事件监听器
  const saveDownloadBtn = document.getElementById('save-download');
  if (saveDownloadBtn) {
    saveDownloadBtn.addEventListener('click', saveDownloadSettings);
  }
  
  // 为下载功能开关添加 change 事件监听器，自动保存设置
  const enableDownloadSwitch = document.getElementById('enable-download');
  if (enableDownloadSwitch) {
    enableDownloadSwitch.addEventListener('change', saveDownloadSettings);
  }
  
  // 为下载路径输入框添加 blur 事件监听器，自动保存设置
  const downloadPathInput = document.getElementById('download-path');
  if (downloadPathInput) {
    downloadPathInput.addEventListener('blur', saveDownloadSettings);
  }
  
  // 为保存搜索设置按钮添加事件监听器
  const saveSearchBtn = document.getElementById('save-search');
  if (saveSearchBtn) {
    saveSearchBtn.addEventListener('click', saveSearchSettings);
  }
  
  
  

  
  const sortBySelect = document.getElementById('sort-by');
  if (sortBySelect) {
    sortBySelect.addEventListener('change', saveSearchSettings);
  }
  
  const publishTimeSelect = document.getElementById('publish-time');
  if (publishTimeSelect) {
    publishTimeSelect.addEventListener('change', saveSearchSettings);
  }
  
  // 为启用点赞数过滤开关添加事件监听器，自动保存设置
  const enableLikeFilterSwitch = document.getElementById('enable-like-filter');
  if (enableLikeFilterSwitch) {
    enableLikeFilterSwitch.addEventListener('change', saveSearchSettings);
  }
  
  // 为点赞数阈值输入框添加事件监听器，自动保存设置
  const likeThresholdInput = document.getElementById('like-threshold');
  if (likeThresholdInput) {
    likeThresholdInput.addEventListener('blur', saveSearchSettings);
  }
  
  // 为选择文件夹按钮添加事件监听器
  const selectFolderBtn = document.getElementById('select-folder');
  if (selectFolderBtn) {
    selectFolderBtn.addEventListener('click', selectFolder);
  }
  
  // 为导出提示词按钮添加事件监听器
  const exportPromptsBtn = document.getElementById('export-prompts');
  if (exportPromptsBtn) {
    exportPromptsBtn.addEventListener('click', exportPrompts);
  }
  
  // 为导入提示词按钮添加事件监听器
  const importPromptsBtn = document.getElementById('import-prompts');
  if (importPromptsBtn) {
    importPromptsBtn.addEventListener('click', () => {
      document.getElementById('import-file').click();
    });
  }
  
  // 为文件输入框添加事件监听器
  const importFileInput = document.getElementById('import-file');
  if (importFileInput) {
    importFileInput.addEventListener('change', importPrompts);
  }
}

// 简单的加密函数（使用wenyang作为密钥）
function encrypt(data, key) {
  let result = '';
  for (let i = 0; i < data.length; i++) {
    const charCode = data.charCodeAt(i) ^ key.charCodeAt(i % key.length);
    result += String.fromCharCode(charCode);
  }
  // 转换为Base64以便存储
  return btoa(unescape(encodeURIComponent(result)));
}

// 简单的解密函数（使用wenyang作为密钥）
function decrypt(encryptedData, key) {
  try {
    // 移除前面的有效期前缀
    const parts = encryptedData.split('_');
    const actualEncryptedData = parts.length > 1 ? parts.slice(1).join('_') : encryptedData;
    console.log('移除前缀后的数据:', actualEncryptedData);
    
    // 从Base64转换回来
    let data;
    try {
      // 尝试使用现代方法解码
      data = atob(actualEncryptedData);
    } catch (e) {
      //  fallback到旧方法
      data = decodeURIComponent(escape(atob(actualEncryptedData)));
    }
    console.log('Base64解码后的数据:', data);
    
    let result = '';
    for (let i = 0; i < data.length; i++) {
      const charCode = data.charCodeAt(i) ^ key.charCodeAt(i % key.length);
      result += String.fromCharCode(charCode);
    }
    console.log('解密后的数据:', result);
    return result;
  } catch (error) {
    console.error('解密失败:', error);
    return null;
  }
}

// 生成认证字符串
function generateAuth() {
  const duration = parseInt(document.getElementById('auth-duration').value);
  
  // 使用更短的token
  const token = Math.random().toString(36).substring(2, 10);
  // 使用更紧凑的字段名
  const authData = {
    t: token, // token
    d: duration, // 天数
    g: Math.floor(Date.now() / 1000) // 生成时间
  };
  
  // 加密认证数据
  const encryptedData = encrypt(JSON.stringify(authData), 'wenyang');
  // 在认证字符串前面添加有效期的数字，方便人来验证
  const finalAuthString = `${duration}_${encryptedData}`;
  
  // 显示生成的认证字符串
  document.getElementById('auth-string').value = finalAuthString;
  showSuccessMessage('认证字符串生成成功！', true);
}

// 加载认证信息
function loadAuth() {
  // 加载认证信息
  chrome.storage.sync.get(['auth', 'machineCode', 'permissions', 'deviceInfo'], (data) => {
    const auth = data.auth || {};
    const machineCode = data.machineCode || '加载中...';
    const permissions = data.permissions || {};
    const deviceInfo = data.deviceInfo || {};
    
    if (auth.token) {
      document.getElementById('auth-string').value = auth.token;
    }
    
    // 显示设备码
    document.getElementById('machine-code').textContent = machineCode;
    
    // 如果权限信息中有认证状态，更新认证信息
    if (permissions.auth_status === 'authenticated') {
      auth.status = 'authenticated';
    }
    
    // 如果设备信息显示已认证，更新认证信息
    if (deviceInfo.status === 'success' && deviceInfo.data.is_active) {
      auth.status = 'authenticated';
      auth.token = deviceInfo.data.auth_code || auth.token;
      if (deviceInfo.data.expiry_date) {
        auth.expiryTime = new Date(deviceInfo.data.expiry_date).getTime() / 1000;
        auth.expiryDate = deviceInfo.data.expiry_date;
      } else if (deviceInfo.data.days_remaining === -1) {
        auth.expiryTime = -1;
      }
    }
    
    // 更新认证状态
    updateAuthStatus(auth);
  });
  
  // 如果没有设备码，生成一个
  if (typeof generateMachineCode === 'function') {
    generateMachineCode().then((code) => {
      document.getElementById('machine-code').textContent = code;
    });
  }
  
  // 强制更新设备信息，确保获取最新的认证状态
  if (typeof getDeviceInfo === 'function') {
    getDeviceInfo(true).then((deviceInfo) => {
      console.log('设备信息已更新:', deviceInfo);
      // 重新加载认证信息，确保显示最新的认证状态
      chrome.storage.sync.get('auth', (data) => {
        updateAuthStatus(data.auth || {});
      });
    });
  }
}

// 保存认证信息
async function saveAuth() {
  const authString = document.getElementById('auth-string').value.trim();
  if (!authString) {
    alert('认证字符串不能为空');
    return;
  }
  
  console.log('开始认证过程，认证字符串:', authString);
  
  try {
    // 验证激活码
    const result = await verifyAuthCode(authString);
    
    if (result.success) {
      // 验证成功
      alert('认证保存成功！');
      console.log('认证保存成功:', result.data);
      updateAuthStatus(result.data);
      // 认证成功后获取最新的权限信息
      if (typeof getDeviceInfo === 'function') {
        await getDeviceInfo(true);
      }
      // 重新加载使用情况信息，确保显示更新后的权限限制
      loadUsageInfo();
    } else {
      // 验证失败
      alert(`认证失败: ${result.message}`);
      console.log('认证失败:', result.message);
    }
  } catch (error) {
    console.error('保存认证时出错:', error);
    alert('认证过程中出错，请重试');
  }
}

// 验证认证字符串函数已移至auth.js

// 更新认证状态显示
function updateAuthStatus(auth) {
  const authStatus = document.getElementById('auth-status');
  const authExpiry = document.getElementById('auth-expiry');
  
  // 先检查设备信息中的认证状态
  chrome.storage.sync.get('deviceInfo', (deviceInfoData) => {
    const deviceInfo = deviceInfoData.deviceInfo || {};
    
    // 如果设备信息显示已认证，但auth对象中没有token，说明是通过权限接口认证的
    if (deviceInfo.status === 'success' && deviceInfo.data.is_active && (!auth || !auth.token)) {
      // 创建一个临时的auth对象
      auth = {
        token: deviceInfo.data.auth_code || 'authenticated',
        status: 'authenticated',
        expiryTime: -1 // 默认永久有效，实际应该从设备信息中获取
      };
      
      // 从设备信息中获取有效期
      if (deviceInfo.data.expiry_date) {
        auth.expiryTime = new Date(deviceInfo.data.expiry_date).getTime() / 1000;
        auth.expiryDate = deviceInfo.data.expiry_date;
      } else if (deviceInfo.data.days_remaining === -1) {
        // 如果剩余天数为-1，说明是永久有效
        auth.expiryTime = -1;
      }
    }
    
    if (!auth || !auth.token) {
      authStatus.textContent = '未配置认证';
      authStatus.style.color = '#f44336';
      authExpiry.textContent = '未配置认证';
      authExpiry.style.color = '#f44336';
      return;
    }
    
    // 检查是否过期
    let isExpired = false;
    if (auth.expiryTime !== -1) {
      const now = Math.floor(Date.now() / 1000);
      isExpired = auth.expiryTime < now;
    }
    
    if (isExpired) {
      authStatus.textContent = '认证已过期';
      authStatus.style.color = '#f44336';
      if (auth.expiryDate) {
        const expiryDate = new Date(auth.expiryDate);
        authExpiry.textContent = expiryDate.toLocaleString();
      } else if (auth.expiryTime !== -1) {
        const expiryDate = new Date(auth.expiryTime * 1000);
        authExpiry.textContent = expiryDate.toLocaleString();
      } else {
        authExpiry.textContent = '未知';
      }
      authExpiry.style.color = '#f44336';
    } else {
      authStatus.textContent = '已认证';
      authStatus.style.color = '#4CAF50';
      
      // 显示有效期
      if (auth.expiryDate) {
        const expiryDate = new Date(auth.expiryDate);
        authExpiry.textContent = expiryDate.toLocaleString();
      } else if (auth.expiryTime !== -1) {
        const expiryDate = new Date(auth.expiryTime * 1000);
        authExpiry.textContent = expiryDate.toLocaleString();
      } else {
        authExpiry.textContent = '永久有效';
      }
      authExpiry.style.color = '#4CAF50';
    }
  });
}

// 加载提示词列表
function loadPrompts() {
  chrome.storage.local.get('prompts', (data) => {
    prompts = data.prompts || [];
    displayPrompts(prompts);
  });
}

// 搜索提示词
function searchPrompts() {
  const searchTerm = document.getElementById('search-prompt').value.toLowerCase();
  const filteredPrompts = prompts.filter(prompt => {
    return prompt.name.toLowerCase().includes(searchTerm) || 
           prompt.content.toLowerCase().includes(searchTerm);
  });
  displayPrompts(filteredPrompts);
}

// 显示提示词列表
function displayPrompts(promptsToDisplay) {
  const promptList = document.getElementById('prompt-list');
  promptList.innerHTML = '';
  
  // 按照提示词名称字典序排序
  const sortedPrompts = [...promptsToDisplay].sort((a, b) => {
    const nameA = (a.name || '').toLowerCase();
    const nameB = (b.name || '').toLowerCase();
    return nameA.localeCompare(nameB);
  });
  
  if (sortedPrompts.length === 0) {
    promptList.innerHTML = '<p>暂无保存的提示词</p>';
  } else {
    sortedPrompts.forEach((prompt, index) => {
      // 找到原始索引
      const originalIndex = prompts.findIndex(p => p.name === prompt.name && p.content === prompt.content);
      const promptItem = document.createElement('div');
      promptItem.className = 'prompt-item';
      
      promptItem.innerHTML = `
        <h4>${prompt.name || `提示词 ${index + 1}`}</h4>
        <p>${prompt.content.substring(0, 100)}${prompt.content.length > 100 ? '...' : ''}</p>
        <div class="prompt-actions">
          <button class="btn btn-primary" style="margin-right: 10px;">编辑</button>
          <button class="btn btn-danger">删除</button>
        </div>
      `;
      
      // 添加事件监听器
      const editBtn = promptItem.querySelector('.btn-primary');
      editBtn.addEventListener('click', () => {
        editPrompt(originalIndex);
      });
      
      const deleteBtn = promptItem.querySelector('.btn-danger');
      deleteBtn.addEventListener('click', () => {
        deletePrompt(originalIndex);
      });
      
      promptList.appendChild(promptItem);
    });
  }
}

// 编辑提示词
function editPrompt(index) {
  editingIndex = index;
  const prompt = prompts[index];
  
  // 填充表单
  document.getElementById('prompt-name').value = prompt.name;
  document.getElementById('prompt-content').value = prompt.content;
  
  // 切换按钮显示
  document.getElementById('add-prompt').style.display = 'none';
  document.getElementById('update-prompt').style.display = 'inline-block';
  
  showSuccessMessage('请编辑提示词内容', false);
}

// 更新提示词
function updatePrompt() {
  if (editingIndex === -1) return;
  
  const name = document.getElementById('prompt-name').value.trim();
  const content = document.getElementById('prompt-content').value.trim();
  
  if (!name || !content) {
    showSuccessMessage('提示词名称和内容不能为空', false);
    return;
  }
  
  // 更新提示词
  prompts[editingIndex] = { name, content };
  
  chrome.storage.local.set({ prompts }, () => {
    showSuccessMessage('提示词更新成功！');
    clearForm();
    loadPrompts();
    
    // 切换按钮显示
    document.getElementById('add-prompt').style.display = 'inline-block';
    document.getElementById('update-prompt').style.display = 'none';
    editingIndex = -1;
  });
}

// 添加提示词
function addPrompt() {
  const name = document.getElementById('prompt-name').value.trim();
  const content = document.getElementById('prompt-content').value.trim();
  
  if (!name || !content) {
    showSuccessMessage('提示词名称和内容不能为空', false);
    return;
  }
  
  chrome.storage.local.get('prompts', (data) => {
    const prompts = data.prompts || [];
    prompts.push({ name, content });
    
    chrome.storage.local.set({ prompts }, () => {
      showSuccessMessage('提示词添加成功！');
      clearForm();
      loadPrompts();
    });
  });
}

// 删除提示词
function deletePrompt(index) {
  console.log('删除提示词，索引：', index);
  
  // 从全局数组中删除
  prompts.splice(index, 1);
  console.log('删除后的提示词：', prompts);
  
  // 保存到存储
  chrome.storage.local.set({ prompts }, () => {
    console.log('提示词已保存到存储');
    showSuccessMessage('提示词删除成功！');
    loadPrompts();
  });
}

// 清空表单
function clearForm() {
  document.getElementById('prompt-name').value = '';
  document.getElementById('prompt-content').value = '';
  document.getElementById('search-prompt').value = '';
  
  // 重置编辑状态
  editingIndex = -1;
  document.getElementById('add-prompt').style.display = 'inline-block';
  document.getElementById('update-prompt').style.display = 'none';
}

// 显示成功消息
function showSuccessMessage(message, isSuccess = true) {
  const successMsg = document.getElementById('success-msg');
  successMsg.textContent = message;
  successMsg.style.display = 'block';
  successMsg.style.color = isSuccess ? '#2196F3' : '#f44336';
  
  // 3秒后隐藏消息
  setTimeout(() => {
    successMsg.style.display = 'none';
  }, 3000);
}

// 显示下载设置成功消息
function showDownloadSuccessMessage(message, isSuccess = true) {
  const successMsg = document.getElementById('download-success-msg');
  successMsg.textContent = message;
  successMsg.style.display = 'block';
  successMsg.style.color = isSuccess ? '#2196F3' : '#f44336';
  
  // 3秒后隐藏消息
  setTimeout(() => {
    successMsg.style.display = 'none';
  }, 3000);
}

// 显示搜索设置成功消息
function showSearchSuccessMessage(message, isSuccess = true) {
  const successMsg = document.getElementById('search-success-msg');
  successMsg.textContent = message;
  successMsg.style.display = 'block';
  successMsg.style.color = isSuccess ? '#2196F3' : '#f44336';
  
  // 3秒后隐藏消息
  setTimeout(() => {
    successMsg.style.display = 'none';
  }, 3000);
}

// 加载下载设置
function loadDownloadSettings() {
  chrome.storage.sync.get('downloadSettings', (data) => {
    const settings = data.downloadSettings || {};
    
    // 设置小红书图片下载功能开关
    const enableDownload = document.getElementById('enable-download');
    if (enableDownload) {
      enableDownload.checked = settings.enableDownload !== false; // 默认开启
    }
    
    // 设置默认下载路径
    const downloadPath = document.getElementById('download-path');
    if (downloadPath) {
      downloadPath.value = settings.downloadPath || '';
    }
    
    
    

    
    // 设置排序依据
    const sortBy = document.getElementById('sort-by');
    if (sortBy) {
      sortBy.value = settings.sortBy || 'most-liked'; // 默认最多点赞
    }
    
    // 设置发布时间
    const publishTime = document.getElementById('publish-time');
    if (publishTime) {
      publishTime.value = settings.publishTime || 'week'; // 默认一天内
    }
    
    // 设置启用点赞数过滤开关
    const enableLikeFilter = document.getElementById('enable-like-filter');
    if (enableLikeFilter) {
      enableLikeFilter.checked = settings.enableLikeFilter !== false; // 默认开启
    }
    
    // 设置点赞数阈值
    const likeThreshold = document.getElementById('like-threshold');
    if (likeThreshold) {
      likeThreshold.value = settings.likeThreshold || 30; // 默认30
    }
  });
}

// 保存下载设置
function saveDownloadSettings() {
  // 获取设置值
  const enableDownload = document.getElementById('enable-download').checked;
  const downloadPath = document.getElementById('download-path').value.trim();
  
  // 加载现有的设置
  chrome.storage.sync.get('downloadSettings', (data) => {
    const existingSettings = data.downloadSettings || {};
    
    // 构建设置对象
    const settings = {
      ...existingSettings,
      enableDownload: enableDownload,
      downloadPath: downloadPath
    };
    
    // 保存到存储
    chrome.storage.sync.set({ downloadSettings: settings }, () => {
      showDownloadSuccessMessage('下载设置保存成功！');
    });
  });
}

// 保存搜索设置
function saveSearchSettings() {
  // 获取设置值
  const enableLikeFilter = document.getElementById('enable-like-filter').checked;
  const sortBy = document.getElementById('sort-by').value;
  const publishTime = document.getElementById('publish-time').value;
  const likeThreshold = parseInt(document.getElementById('like-threshold').value) || 30;
  
  // 加载现有的设置
  chrome.storage.sync.get('downloadSettings', (data) => {
    const existingSettings = data.downloadSettings || {};
    
    // 构建设置对象
    const settings = {
      ...existingSettings,
      enableLikeFilter: enableLikeFilter,
      sortBy: sortBy,
      publishTime: publishTime,
      likeThreshold: likeThreshold
    };
    
    // 保存到存储
    chrome.storage.sync.set({ downloadSettings: settings }, () => {
      showSearchSuccessMessage('搜索设置保存成功！');
    });
  });
}

// 选择文件夹
function selectFolder() {
  // 提示用户文件夹选择功能需要额外的权限配置
  alert('文件夹选择功能需要额外的权限配置，目前暂时使用手动输入路径的方式。');
}

// 加载功能使用情况
async function loadUsageInfo() {
  try {
    // 获取使用计数
    const usageResult = await chrome.storage.sync.get('feature_usage');
    const usageData = usageResult.feature_usage || {
      lastResetDate: new Date().toISOString(),
      usage: {
        prompt_word: 0,
        high_value_notes: 0,
        keyword_expansion: 0,
        download: 0
      }
    };
    
    // 获取设备信息，优先使用其中的权限数据
    const deviceInfoResult = await chrome.storage.sync.get('deviceInfo');
    const deviceInfo = deviceInfoResult.deviceInfo;
    
    // 初始化权限限制值
    let promptWordLimit = 30;
    let highValueLimit = 30;
    let keywordLimit = 5;
    let downloadLimit = 30;
    
    // 如果设备信息中有权限数据，使用它
    if (deviceInfo && deviceInfo.status === 'success' && deviceInfo.data.permissions) {
      const permissions = deviceInfo.data.permissions;
      promptWordLimit = permissions.prompt_word?.daily_limit || 30;
      highValueLimit = permissions.search?.high_value_notes?.daily_limit || 30;
      keywordLimit = permissions.search?.keyword_expansion?.daily_limit || 5;
      downloadLimit = permissions.download?.daily_limit || 30;
    } else {
      // 否则使用本地存储的权限数据
      const permissionsResult = await chrome.storage.sync.get('permissions');
      const permissions = permissionsResult.permissions;
      
      if (permissions && permissions.permissions) {
        promptWordLimit = permissions.permissions.prompt_word?.daily_limit || 30;
        highValueLimit = permissions.permissions.search?.high_value_notes?.daily_limit || 30;
        keywordLimit = permissions.permissions.search?.keyword_expansion?.daily_limit || 5;
        downloadLimit = permissions.permissions.download?.daily_limit || 30;
      }
    }
    
    // 更新使用情况显示
    document.getElementById('prompt-usage').textContent = 
      `已使用 ${usageData.usage.prompt_word} 次 / 每天限制 ${promptWordLimit} 次`;
    
    document.getElementById('high-value-usage').textContent = 
      `已使用 ${usageData.usage.high_value_notes} 次 / 每天限制 ${highValueLimit} 次`;
    
    document.getElementById('keyword-usage').textContent = 
      `已使用 ${usageData.usage.keyword_expansion} 次 / 每天限制 ${keywordLimit} 次`;
    
    document.getElementById('download-usage').textContent = 
      `已使用 ${usageData.usage.download} 次 / 每天限制 ${downloadLimit} 次`;
  } catch (error) {
    console.error('加载使用情况时出错:', error);
    // 显示错误信息
    document.getElementById('prompt-usage').textContent = '加载失败';
    document.getElementById('high-value-usage').textContent = '加载失败';
    document.getElementById('keyword-usage').textContent = '加载失败';
    document.getElementById('download-usage').textContent = '加载失败';
  }
}

// 导出提示词
function exportPrompts() {
  chrome.storage.local.get('prompts', (data) => {
    const prompts = data.prompts || [];
    
    // 创建导出数据
    const exportData = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      prompts: prompts
    };
    
    // 转换为JSON字符串
    const jsonString = JSON.stringify(exportData, null, 2);
    
    // 创建Blob对象
    const blob = new Blob([jsonString], { type: 'application/json' });
    
    // 创建下载链接
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `xhs-prompts-${new Date().toISOString().split('T')[0]}.json`;
    
    // 触发下载
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    // 释放URL对象
    URL.revokeObjectURL(url);
    
    showSuccessMessage('提示词导出成功！');
  });
}

// 导入提示词
function importPrompts(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const importData = JSON.parse(e.target.result);
      
      // 验证导入数据格式
      if (!importData.prompts || !Array.isArray(importData.prompts)) {
        showSuccessMessage('导入文件格式错误，请使用正确的导出文件', false);
        return;
      }
      
      // 获取现有提示词
      chrome.storage.local.get('prompts', (data) => {
        let existingPrompts = data.prompts || [];
        
        // 过滤掉名称相同的提示词
        const existingNames = new Set(existingPrompts.map(p => p.name));
        const newPrompts = importData.prompts.filter(p => !existingNames.has(p.name));
        
        // 合并提示词
        const updatedPrompts = [...existingPrompts, ...newPrompts];
        
        // 保存到存储
        chrome.storage.local.set({ prompts: updatedPrompts }, () => {
          showSuccessMessage(`成功导入 ${newPrompts.length} 个提示词，跳过 ${importData.prompts.length - newPrompts.length} 个重复名称的提示词`);
          loadPrompts();
          
          // 重置文件输入
          event.target.value = '';
        });
      });
    } catch (error) {
      console.error('导入提示词失败:', error);
      showSuccessMessage('导入文件解析失败，请检查文件格式', false);
      
      // 重置文件输入
      event.target.value = '';
    }
  };
  reader.readAsText(file);
}