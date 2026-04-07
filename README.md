# 小红书助手浏览器扩展

帮助自媒体作者提升小红书创作效率的 Chrome/Edge 浏览器扩展。

## 📚 项目简介

这是一个专为小红书内容创作者设计的浏览器辅助工具，集成了提示词管理、搜索优化、图片下载等核心功能，同时支持豆包、文心一言、DeepSeek 等多个 AI 平台。扩展采用激活码认证系统，可限制每日使用次数，保护后端服务。

## ✨ 功能特性

### 📝 提示词管理
- 自定义提示词，支持添加、编辑、删除、搜索
- 一键插入提示词到 AI 对话输入框
- 支持多平台：**豆包**、**文心一言**、**DeepSeek**
- 提示词云端同步（Chrome Sync）
- 使用次数限制保护

### 🔍 小红书搜索优化
- **高价值笔记筛选**：自动筛选点赞数超过阈值的笔记
- **关键词拓展**：基于下拉提示词，批量拓展相关关键词
- 支持排序方式：最多点赞、最多收藏、最多评论、最新发布
- 支持发布时间：一天内、一周内、一个月内、一年内

### 📥 小红书图片下载
- 在小红书页面自动显示下载按钮
- 支持批量下载笔记中的所有图片
- 自动注入下载按钮到发现页和详情页

### 🔐 激活码认证系统
- 支持激活码认证，解锁高级功能
- 每日使用次数限制
- 设备码绑定机制
- 支持永久有效和限时激活码
- 灵活的权限配置（不同功能可独立配置限制）

## 🚀 快速开始

### 安装方法

#### 1. 下载插件
```bash
git clone https://github.com/q10myhsg/xhs_helper_browser_extension.git
cd xhs_helper_browser_extension
```

#### 2. 安装到浏览器
1. 打开 Chrome/Edge 浏览器
2. 地址栏输入 `chrome://extensions/`
3. 开启右上角「开发者模式」
4. 点击「加载已解压的扩展程序」
5. 选择项目根目录

#### 3. 配置认证（可选）
1. 点击插件图标 → 「管理提示词」→ 「认证」标签页
2. 输入激活码 → 点击「保存」

### 使用方法

#### 提示词功能
1. 点击插件图标 → 「管理提示词」
2. 输入提示词名称和内容 → 点击「添加」
3. 访问支持的 AI 平台（豆包/文心一言/DeepSeek）
4. 点击插件图标 → 选择提示词 → 自动插入

#### 小红书搜索优化
1. 访问小红书搜索页面（包含 `keyword=` 参数）
2. 点击插件图标：
   - 「筛选高价值笔记」：隐藏低赞笔记
   - 「关键词拓展」：批量获取相关关键词
3. 在设置页面配置：
   - 点赞数阈值（默认 30）
   - 排序方式
   - 发布时间范围

#### 图片下载
1. 访问小红书页面
2. 图片右上角会显示「↓ 下载」按钮
3. 点击即可下载笔记中的所有图片

## 📂 项目结构

```
xhs_helper_browser_extension/
├── manifest.json              # 插件配置文件
├── background.js              # 后台服务脚本
├── content.js                 # 内容脚本（核心功能实现）
├── popup.html                 # 弹出页面 UI
├── popup.js                   # 弹出页面逻辑
├── options.html               # 设置页面 UI
├── options.js                 # 设置页面逻辑
├── auth.js                    # 认证模块（激活码验证、权限管理）
├── keyword_expansion_script.js # 关键词拓展脚本
├── usageCounter.js            # 使用次数计数器
├── images/                    # 插件图标资源
└── README.md                  # 项目说明文档
```

## 🌐 支持的网站

| 网站 | 提示词插入 | 其他功能 |
|------|-----------|---------|
| 小红书 (xiaohongshu.com) | - | 搜索优化、图片下载 |
| 豆包 (doubao.com) | ✅ | - |
| 文心一言 (wenxin.baidu.com) | ✅ | - |
| DeepSeek (chat.deepseek.com) | ✅ | - |

## 🔑 权限说明

| 权限 | 用途 |
|------|------|
| `storage` | 存储提示词、设置、认证信息 |
| `activeTab` | 访问当前标签页 |
| `scripting` | 注入内容脚本到页面 |
| `downloads` | 下载小红书图片 |
| `identity` | 设备标识（用于激活码绑定） |

## ⚙️ 配置项

### 下载设置
- `enableDownload`: 是否启用图片下载功能
- `downloadPath`: 默认下载路径

### 搜索设置
- `sortBy`: 排序方式（most-liked/most-collected/most-commented/latest）
- `publishTime`: 发布时间（day/week/month/year/all）
- `enableLikeFilter`: 是否启用点赞数过滤
- `likeThreshold`: 点赞数阈值（默认 30）

### 认证设置
- `activationCode`: 激活码
- `deviceId`: 设备唯一标识
- `dailyLimits`: 各功能每日使用限制

## 🔌 API 接口

插件与后端服务通信，用于激活码验证和权限管理：

| 接口 | 方法 | 用途 |
|------|------|------|
| `/auth/verify` | POST | 激活码验证 |
| `/device/info` | GET | 获取设备信息和权限配置 |
| `/usage/report` | POST | 上报使用记录 |

后端服务项目：[activation-api](https://github.com/q10myhsg/activation-api)

管理后台项目：[activation-admin](https://github.com/q10myhsg/activation-admin)

## 🛠️ 开发指南

### 本地开发
1. 修改代码后，在 `chrome://extensions/` 点击刷新按钮
2. 查看控制台日志：插件图标右键 → 「检查」弹出窗口
3. 内容脚本日志：在对应页面按 F12 打开开发者工具

### 调试技巧
- 弹出页面：右键插件图标 → 「检查」
- 后台脚本：在扩展管理页点击「Service Worker」
- 内容脚本：在目标页面打开开发者工具 Console

## 📋 更新日志

### v1.1.0
- ✨ 新增关键词拓展功能
- ✨ 新增高价值笔记筛选
- 🔧 优化激活码认证系统
- 🔌 支持多 AI 平台提示词插入
- 📱 优化 UI 交互体验

### v1.0.0
- 🎉 初始版本发布
- 📝 基础提示词管理
- 📥 小红书图片下载
- 🔐 激活码认证系统

## 🤝 相关项目

- [activation-api](https://github.com/q10myhsg/activation-api) - 激活码验证服务端
- [activation-admin](https://github.com/q10myhsg/activation-admin) - 激活码管理后台

## 📄 许可证

MIT License
