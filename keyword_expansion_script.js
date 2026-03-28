// 独立的关键词拓展脚本
console.log('keyword_expansion_script.js 加载');

(function() {
  console.log('开始执行关键词拓展...');
  
  async function doExpand() {
    try {
      console.log('开始执行关键词拓展...');
      
      // 1. 找到搜索输入框
      function findSearchInput() {
        const selectors = [
          'input[placeholder*="搜索"]',
          'input[placeholder*="Search"]',
          'input[type="search"]',
          'input[class*="search"]',
          'input[id*="search"]',
          'input[name*="search"]',
          '.search-input input',
          '.search-box input',
          '.search-bar input'
        ];
        
        for (const selector of selectors) {
          const element = document.querySelector(selector);
          if (element) {
            return element;
          }
        }
        
        return null;
      }
      
      // 2. 获取搜索建议
      function getSearchSuggestions(keyword) {
        return new Promise((resolve) => {
          setTimeout(() => {
            const suggestions = [];
            
            console.log('========== 开始查找搜索建议元素 ==========');
            
            // 打印整个body的HTML，方便调试
            console.log('页面部分HTML:', document.body.innerHTML.substring(0, 3000));
            
            // 尝试多种方式查找
            const allElements = document.querySelectorAll('*');
            console.log('页面总元素数:', allElements.length);
            
            // 查找包含文本的元素
            const suggestionSelectors = [
              '.suggest-item',
              '.search-suggest-item',
              '[class*="suggest"]',
              '[class*="hint"]',
              '[class*="autocomplete"]',
              '[class*="dropdown"]',
              '[role="listbox"] *',
              '[role="option"]',
              'li',
              'div[style*="position"]'
            ];
            
            for (const selector of suggestionSelectors) {
              const elements = document.querySelectorAll(selector);
              if (elements.length > 0) {
                console.log(`选择器 "${selector}" 找到 ${elements.length} 个元素`);
                elements.forEach((el, idx) => {
                  const text = el.textContent?.trim();
                  if (text && text.length > 0 && text.length < 50) {
                    console.log(`  [${idx}] ${text}`);
                    if (!suggestions.includes(text)) {
                      suggestions.push(text);
                    }
                  }
                });
              }
            }
            
            // 查找搜索框附近的元素
            if (suggestions.length === 0) {
              const searchInput = findSearchInput();
              if (searchInput) {
                console.log('搜索框附近的元素:');
                let parent = searchInput.parentNode;
                for (let i = 0; i < 5 && parent; i++) {
                  console.log(`  父层级 ${i}:`, parent.tagName, parent.className);
                  const children = parent.querySelectorAll('*');
                  children.forEach(child => {
                    const text = child.textContent?.trim();
                    if (text && text.length > 0 && text.length < 50) {
                      console.log(`    - ${text}`);
                      if (!suggestions.includes(text)) {
                        suggestions.push(text);
                      }
                    }
                  });
                  parent = parent.parentNode;
                }
              }
            }
            
            console.log('========== 找到的建议:', suggestions, '==========');
            resolve(suggestions);
          }, 800);
        });
      }
      
      // 3. 触发输入事件
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
      
      // 找到搜索输入框
      const searchInput = findSearchInput();
      if (!searchInput) {
        alert('未找到搜索输入框');
        return;
      }
      console.log('搜索输入框:', searchInput);
      
      // 获取用户输入的关键词
      const originalKeyword = searchInput.value.trim();
      if (!originalKeyword) {
        alert('请先在搜索框中输入关键词');
        return;
      }
      console.log('原始关键词:', originalKeyword);
      
      // 触发搜索输入框的点击事件
      searchInput.click();
      console.log('已触发搜索输入框的点击事件');
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // 收集拓展的关键词
      const expandedKeywords = new Set();
      
      // 获取原始关键词的下拉提示
      console.log('获取原始关键词的下拉提示');
      searchInput.value = originalKeyword;
      triggerInputEvents(searchInput);
      await new Promise(resolve => setTimeout(resolve, 2000));
      const originalSuggestions = await getSearchSuggestions(originalKeyword);
      console.log('原始关键词提示:', originalSuggestions);
      originalSuggestions.forEach(suggestion => expandedKeywords.add(suggestion));
      
      // 遍历字母a-z
      console.log('开始遍历字母a-z进行关键词拓展');
      for (let i = 97; i <= 122; i++) {
        const letter = String.fromCharCode(i);
        console.log(`处理字母: ${letter}`);
        
        const testKeyword = originalKeyword + letter;
        console.log(`测试关键词: ${testKeyword}`);
        searchInput.value = testKeyword;
        triggerInputEvents(searchInput);
        
        // 增加等待时间
        await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 500));
        
        const suggestions = await getSearchSuggestions(testKeyword);
        console.log(`字母 ${letter} 的提示:`, suggestions);
        suggestions.forEach(suggestion => expandedKeywords.add(suggestion));
      }
      
      // 恢复原始关键词
      console.log('恢复原始关键词');
      searchInput.value = originalKeyword;
      triggerInputEvents(searchInput);
      
      const result = Array.from(expandedKeywords);
      console.log('关键词拓展完成，共拓展:', result.length, '个关键词');
      console.log('拓展结果:', result);
      
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
  
  doExpand();
})();