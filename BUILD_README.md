# 插件分发构建指南

## 前置条件

确保已安装依赖：
```bash
npm install
```

## 快速开始

### 🎯 100% 安全：推荐使用 final_secure.js

在任意分支下运行（推荐 dabao_test）：
```bash
node final_secure.js
```

特点：
- ✅ 功能 **100% 完全保留**
- ✅ 只复制原始文件到 ZIP 包，完全不做任何修改
- ✅ Service Worker、Content Script、DOM 等完美兼容
- ✅ **强烈推荐用于生产分发！**

输出：`dist/xhs-helper-final-vX.X.X.zip`

---

### 简单分发（备用方案）

```bash
node simple_distribute.js
```

---

### 自动打包：GitHub Actions 方式

如果在 `dabao_test` 分支，每次 push 都会自动触发 GitHub Actions 打包！

1. 在 GitHub 上，进入 Actions 标签页
2. 找到最新的构建记录，点击进入
3. 在 Artifacts 部分下载 `xhs_helper_distribution.zip` 即可！

这样就完全不需要本地打包了！

---

## 使用分发包

生成的 ZIP 包位于 `dist/` 目录：
```
dist/xhs-helper-final-vX.X.X.zip
```

可以直接解压：
```bash
cd dist
unzip xhs-helper-final-vX.X.X.zip -d unpacked
```

然后直接在浏览器中加载解压后的文件夹即可。

---

## 分支说明

- **main 分支**：稳定分支，同步到远程
- **dabao_test 分支**：测试和分发分支，支持 GitHub Actions 自动打包！

---

## 文件说明

- `final_secure.js`：**强烈推荐**，100% 安全，只复制不修改
- `simple_distribute.js`：备用，简单压缩
- `secure_distribute.js`：实验性的混淆（不推荐）
- `distribute_build.js`：旧版构建（已过时）
- `.github/workflows/publish.yml`：GitHub Actions 自动打包配置
- `dist/`：构建输出目录（.gitignore 中已忽略）
- `.gitignore`：已配置好，dist 和临时文件不会提交

---

## 本地工作流程

1. 在 dabao_test 分支修改代码并 commit
2. push 到 GitHub，Actions 自动构建打包
3. 从 Actions 下载 Artifacts 即可！
