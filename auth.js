// 认证相关功能

// API基础URL
const API_BASE_URL = 'https://1259223433-0gnwuwcg9e.ap-beijing.tencentscf.com';
// API Key（实际使用时需要替换为真实的API Key）
const API_KEY = 'test';



// 生成机器码
async function generateMachineCode() {
  try {
    // 1. 尝试从Chrome存储中获取已有的机器码
    const result = await chrome.storage.sync.get('machineCode');
    if (result.machineCode) {
      console.log('从Chrome存储获取已有机器码:', result.machineCode);
      return result.machineCode;
    }
    
    // 2. 尝试从浏览器的localStorage中获取已有的机器码
    let machineCode = localStorage.getItem('xhs_plugin_machine_code');
    if (machineCode) {
      console.log('从localStorage获取已有机器码:', machineCode);
      // 同时更新到Chrome存储中
      await chrome.storage.sync.set({ machineCode });
      return machineCode;
    }
    
    // 3. 生成新的机器码，基于浏览器信息和时间戳
    // 这样可以确保同一浏览器内的机器码保持一致
    const browserInfo = navigator.userAgent + navigator.platform + navigator.language;
    const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(browserInfo));
    const hashArray = Array.from(new Uint8Array(hash));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    machineCode = hashHex.substring(0, 24);
    console.log('生成新机器码:', machineCode);
    
    // 4. 同时存储到localStorage和Chrome存储中
    localStorage.setItem('xhs_plugin_machine_code', machineCode);
    await chrome.storage.sync.set({ machineCode });
    return machineCode;
  } catch (error) {
    console.error('生成机器码时出错:', error);
    // 出错时返回临时机器码
    return 'temp_' + generateUniqueId();
  }
}

// 生成唯一ID
function generateUniqueId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

// 验证激活码
async function verifyAuthCode(authCode) {
  try {
    // 生成机器码
    const machineCode = await generateMachineCode();
    
    // 获取插件版本
    const pluginVersion = chrome.runtime.getManifest().version;
    
    // 获取当前过期时间（如果有）
    const result = await chrome.storage.sync.get('auth');
    const currentExpiryDate = result.auth?.expiryDate || null;
    
    // 构建请求参数
    const requestData = {
      auth_code: authCode,
      machine_code: machineCode,
      client_type: 'browser-extension',
      plugin_version: pluginVersion
    };
    
    // 添加当前过期时间（如果有）
    if (currentExpiryDate) {
      requestData.current_expiry_date = currentExpiryDate;
    }
    
    // 发送验证请求
    const response = await fetch(`${API_BASE_URL}/auth/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY
      },
      body: JSON.stringify(requestData)
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('验证激活码响应:', data);
    
    // 处理验证结果
    if (data.status === 'valid') {
      // 验证成功，存储认证信息
      const expiryDate = data.data.expiry_date;
      const expiryTime = expiryDate ? Math.floor(new Date(expiryDate).getTime() / 1000) : -1;
      
      const authInfo = {
        token: authCode,
        authId: data.data.auth_id,
        expiryDate: expiryDate,
        expiryTime: expiryTime,
        activatedDate: data.data.activated_date,
        machineCode: data.data.machine_code,
        isValid: true,
        isExpired: false
      };
      
      await chrome.storage.sync.set({ auth: authInfo });
      
      // 认证成功后获取设备信息并更新本地存储
      await getDeviceInfo(true);
      
      return { success: true, data: authInfo };
    } else {
      // 验证失败
      return { success: false, message: data.message, status: data.status };
    }
  } catch (error) {
    console.error('验证激活码时出错:', error);
    return { success: false, message: error.message };
  }
}



// 检查认证状态
async function checkAuthStatus() {
  try {
    const result = await chrome.storage.sync.get('auth');
    const auth = result.auth;
    
    if (!auth) {
      return { isValid: false, isExpired: true, message: '未配置认证' };
    }
    
    // 检查是否过期
    let isExpired = false;
    if (auth.expiryTime !== -1) {
      const now = Math.floor(Date.now() / 1000);
      isExpired = auth.expiryTime < now;
    }
    
    if (isExpired) {
      return { isValid: false, isExpired: true, message: '认证已过期' };
    }
    
    return { isValid: true, isExpired: false, data: auth };
  } catch (error) {
    console.error('检查认证状态时出错:', error);
    return { isValid: false, isExpired: true, message: '检查认证状态失败' };
  }
}

// 获取设备信息
async function getDeviceInfo(forceUpdate = false) {
  try {
    // 检查是否需要强制更新或每天第一次启动
    if (!forceUpdate) {
      // 获取当前日期
      const currentDate = new Date().toISOString().split('T')[0];
      
      // 获取上次更新权限的日期
      const lastUpdateResult = await chrome.storage.sync.get('lastPermissionUpdateDate');
      const lastUpdateDate = lastUpdateResult.lastPermissionUpdateDate || '';
      
      // 如果今天已经更新过权限，并且不是强制更新，直接返回本地存储的权限信息
      if (lastUpdateDate === currentDate) {
        const deviceInfoResult = await chrome.storage.sync.get('deviceInfo');
        if (deviceInfoResult.deviceInfo) {
          console.log('使用本地存储的设备信息');
          return deviceInfoResult.deviceInfo;
        }
      }
    }
    
    // 生成机器码
    const machineCode = await generateMachineCode();
    
    // 获取插件版本
    const pluginVersion = chrome.runtime.getManifest().version;
    
    // 获取当前认证信息（如果有）
    const result = await chrome.storage.sync.get('auth');
    const authCode = result.auth?.token || null;
    
    // 构建请求参数
    const requestData = {
      machine_code: machineCode,
      client_type: 'browser-extension',
      plugin_version: pluginVersion
    };
    
    // 发送设备信息请求
    const response = await fetch(`${API_BASE_URL}/device/info`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY
      },
      body: JSON.stringify(requestData)
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('获取设备信息响应:', data);
    
    if (data.status === 'success') {
      // 存储设备信息
      await chrome.storage.sync.set({ deviceInfo: data });
      
      // 更新上次更新权限的日期
      const currentDate = new Date().toISOString().split('T')[0];
      await chrome.storage.sync.set({ lastPermissionUpdateDate: currentDate });
      
      // 如果认证状态为已认证，更新认证信息
      if (data.data.is_active) {
        // 获取当前认证信息
        const authResult = await chrome.storage.sync.get('auth');
        const auth = authResult.auth || {};
        
        // 更新认证状态和有效期
        auth.status = 'authenticated';
        auth.token = data.data.auth_code;
        if (data.data.expiry_date) {
          auth.expiryTime = new Date(data.data.expiry_date).getTime() / 1000;
          auth.expiryDate = data.data.expiry_date;
        } else if (data.data.days_remaining === -1) {
          // 如果剩余天数为-1，说明是永久有效
          auth.expiryTime = -1;
        }
        
        // 存储更新后的认证信息
        await chrome.storage.sync.set({ auth: auth });
        console.log('认证信息已更新:', auth);
      }
      return data;
    } else {
      return data;
    }
  } catch (error) {
    console.error('获取设备信息时出错:', error);
    return { status: 'error', message: error.message };
  }
}

// 初始化权限数据
async function initPermissions() {
  try {
    // 检查是否已有权限数据
    const result = await chrome.storage.sync.get('permissions');
    if (!result.permissions) {
      // 设置默认权限值
      const defaultPermissions = {
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
      await chrome.storage.sync.set({ permissions: defaultPermissions });
      console.log('初始化默认权限值');
    }
  } catch (error) {
    console.error('初始化权限数据时出错:', error);
  }
}

// 导出函数
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    generateMachineCode,
    verifyAuthCode,
    checkAuthStatus,
    getDeviceInfo,
    initPermissions
  };
}
