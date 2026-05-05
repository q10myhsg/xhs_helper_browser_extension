# 插件分发构建指南

## 前置条件

确保已安装依赖：
```bash
npm install
```

## 快速开始

### 推荐：简单分发（功能完全保留）

在 main 分支下直接运行：
```bash
node simple_distribute.js
```

特点：
- ✅ 功能 **完全正常**
- ✅ 只做简单压缩，去掉注释和多余空格
- ✅ `insertToDoubao`、`chrome.runtime` 等关键 API 完美保留
- ✅ 推荐用于生产分发！

输出：`dist/xhs-helper-dist-vX.X.X.zip`

---

### 高级：带混淆分发（可选）

如果需要更强的代码保护：
```bash
node distribute_build.js
```

特点：
- 📦 功能完整（保留了所有关键函数名）
- 🔒 使用 javascript-obfuscator
- ⚠️ 注意：混淆后代码可读性降低，但功能完全正常

---

## 使用分发包

生成的 ZIP 包位于 `dist/` 目录：
```
dist/xhs-helper-dist-vX.X.X.zip
```

可以直接解压：
```bash
cd dist
unzip xhs-helper-dist-vX.X.X.zip -d unpacked
```

然后直接在浏览器中加载解压后的文件夹即可。

---

## 分支说明

**main 分支**：稳定分支，分发构建在这里运行即可！

其他分支（dabao_test 等）已完成历史使命，不影响使用。

---

## 文件说明

- `simple_distribute.js`：推荐使用，简单压缩
- `distribute_build.js`：高级混淆版本（可选）
- `dist/`：构建输出目录（.gitignore 中已忽略）
- `.gitignore`：已配置好，dist 和临时文件不会提交

---

## 工作流程

1. 确保在 main 分支
2. 运行构建脚本
3. 从 dist/ 取出 ZIP 包进行分发
4. 完成！
