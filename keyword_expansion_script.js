// 独立的关键词拓展脚本
console.log('keyword_expansion_script.js 加载');

(function() {
  console.log('开始执行关键词拓展...');
  
  async function doExpand() {
    try {
      console.log('==================== 开始执行关键词拓展 ====================');
      
      // 1. 找到搜索输入框
      const searchInput = findSearchInput();
      if (!searchInput) {
        throw new Error('未找到搜索输入框');
      }
      console.log('搜索输入框:', searchInput);
      
      // 2. 获取用户输入的关键词
      const originalKeyword = searchInput.value.trim();
      if (!originalKeyword) {
        throw new Error('请先在搜索框中输入关键词');
      }
      console.log('原始关键词:', originalKeyword);
      
      // 3. 触发搜索输入框的点击事件
      searchInput.click();
      console.log('已触发搜索输入框的点击事件');
      // 等待点击事件生效
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // 3. 收集拓展的关键词
      const expandedKeywords = new Set();
      
      // 4. 首先获取原始关键词的下拉提示
      console.log('------------------- 获取原始关键词的下拉提示 -------------------');
      searchInput.value = originalKeyword;
      
      // 触发多种输入事件
      triggerInputEvents(searchInput);
      
      // 等待API响应
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // 获取提示
      const originalSuggestions = await getSearchSuggestions(originalKeyword);
      console.log('原始关键词提示:', originalSuggestions);
      originalSuggestions.forEach(suggestion => expandedKeywords.add(suggestion));
      
      // 5. 遍历字母a-z，在关键词后添加字母并获取提示
      console.log('------------------- 开始遍历字母a-z进行关键词拓展 -------------------');
      for (let i = 97; i <= 122; i++) {
        const letter = String.fromCharCode(i);
        console.log(`========== 处理字母: ${letter} ==========`);
        
        // 6. 在输入框中输入关键词+字母
        const testKeyword = originalKeyword + letter;
        console.log(`测试关键词: ${testKeyword}`);
        searchInput.value = testKeyword;
        
        // 7. 触发多种输入事件
        triggerInputEvents(searchInput);
        
        // 8. 获取提示（getSearchSuggestions函数中已包含随机停顿）
        const suggestions = await getSearchSuggestions(testKeyword);
        console.log(`字母 ${letter} 的提示:`, suggestions);
        suggestions.forEach(suggestion => expandedKeywords.add(suggestion));
      }
      
      // 9. 恢复原始关键词
      console.log('------------------- 恢复原始关键词 -------------------');
      searchInput.value = originalKeyword;
      triggerInputEvents(searchInput);
      
      // 10. 转换为数组
      const result = Array.from(expandedKeywords);
      console.log('==================== 关键词拓展完成，共拓展:', result.length, '个关键词 ====================');
      console.log('拓展结果:', result);
      
      alert(`关键词拓展完成！共拓展 ${result.length} 个关键词`);
      
      // 保存到localStorage供下载
      localStorage.setItem('xhs_expanded_keywords', JSON.stringify({
        original: originalKeyword,
        expanded: result,
        timestamp: Date.now()
      }));
      
    } catch (error) {
      console.error('==================== 关键词拓展出错 ====================');
      console.error('错误信息:', error);
      console.error('错误堆栈:', error.stack);
      alert('关键词拓展出错: ' + error.message);
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
    
    console.log('已触发多种输入事件');
  }
  
  // 查找搜索输入框
  function findSearchInput() {
    console.log('查找搜索输入框');
    
    // 尝试多种可能的搜索输入框选择器
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
        console.log('找到搜索输入框:', input);
        return input;
      }
    }
    console.log('未找到搜索输入框');
    return null;
  }
  
  // 获取搜索下拉提示
  async function getSearchSuggestions(keyword) {
    console.log(`获取搜索提示: ${keyword}`);
    
    try {
      // 尝试不同的选择器来定位下拉提示框
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
              console.log(`使用选择器 '${selector}' 找到下拉提示框`);
              break;
            }
          }
        } catch (error) {
          console.error(`使用选择器 ${selector} 查找提示框时出错:`, error);
          continue;
        }
      }
      
      if (!found) {
        // 尝试直接查找所有可能的提示词元素
        suggestionItems = document.querySelectorAll(
          "div[class*='search-suggestion'] div, " +
          "div[class*='suggestion'] div, " +
          ".suggestion-item, " +
          ".search-suggest-item, " +
          "div.sug-container-wrapper.sug-pad div"
        );
        console.log(`直接查找提示词元素，找到 ${suggestionItems.length} 个`);
      }
      
      // 提取提示词文本
      const suggestions = [];
      for (const item of suggestionItems) {
        const text = item.textContent.trim();
        if (text && text !== keyword) {
          suggestions.push(text);
        }
      }
      
      // 随机停顿1.5-2秒
      const randomDelay = Math.random() * 500 + 1500;
      console.log(`随机停顿 ${randomDelay.toFixed(0)} 毫秒`);
      await new Promise(resolve => setTimeout(resolve, randomDelay));
      
      // 去重
      const uniqueSuggestions = [...new Set(suggestions)];
      console.log(`成功提取 ${uniqueSuggestions.length} 个下拉提示词`);
      
      return uniqueSuggestions;
    } catch (error) {
      console.error(`提取下拉提示词失败: ${error.message}`);
      console.error('可能是小红书页面结构发生变化，请检查选择器');
      return [];
    }
  }
  
  doExpand();
})();