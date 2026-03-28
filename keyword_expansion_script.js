// 独立的关键词拓展脚本
console.log('keyword_expansion_script.js 加载');

(function() {
  async function doExpand() {
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
      
      // 保存到localStorage供下载
      localStorage.setItem('xhs_expanded_keywords', JSON.stringify({
        original: originalKeyword,
        expanded: result,
        timestamp: Date.now()
      }));
      
    } catch (error) {
      console.error('关键词拓展出错:', error);
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
  
  doExpand();
})();