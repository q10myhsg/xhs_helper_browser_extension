// 功能使用计数管理

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

/**
 * 初始化使用计数
 */
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

/**
 * 检查是否是新的一天
 * @param {string} lastResetDate - 上次重置日期
 * @returns {boolean} 是否是新的一天
 */
function isNewDay(lastResetDate) {
  const today = new Date().toDateString();
  const lastDate = new Date(lastResetDate).toDateString();
  return today !== lastDate;
}

/**
 * 重置使用计数
 */
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

/**
 * 获取使用计数
 * @returns {Promise<Object>} 使用计数数据
 */
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

/**
 * 增加使用计数
 * @param {string} featureType - 功能类型
 * @returns {Promise<{success: boolean, message: string, usage: number, limit: number}>} 操作结果
 */
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

/**
 * 检查功能是否可用
 * @param {string} featureType - 功能类型
 * @returns {Promise<{available: boolean, message: string, usage: number, limit: number}>} 检查结果
 */
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

// 导出函数
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    FEATURE_TYPES,
    initUsageCounter,
    resetUsageCounter,
    getUsageCounter,
    incrementUsage,
    checkFeatureAvailability
  };
} else {
  // 在浏览器环境中，将函数和常量暴露到全局对象
  window.FEATURE_TYPES = FEATURE_TYPES;
  window.initUsageCounter = initUsageCounter;
  window.resetUsageCounter = resetUsageCounter;
  window.getUsageCounter = getUsageCounter;
  window.incrementUsage = incrementUsage;
  window.checkFeatureAvailability = checkFeatureAvailability;
  
  // 同时保持window.usageCounter对象的兼容性
  window.usageCounter = {
    FEATURE_TYPES,
    initUsageCounter,
    resetUsageCounter,
    getUsageCounter,
    incrementUsage,
    checkFeatureAvailability
  };
}
