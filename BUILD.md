# 构建说明

## 前置要求

- Node.js >= 14.0.0
- npm 或 yarn

## 安装依赖

```bash
npm install
```

## 构建项目

```bash
npm run build
```

构建完成后，混淆后的压缩包会生成在 `release/` 目录下，文件名为 `xhs-helper-v{version}.zip`。

## 构建过程说明

1. 清理并创建临时目录 `.temp_build/`
2. 复制静态文件（HTML、图片、manifest.json）到临时目录
3. 混淆 JavaScript 文件
4. 将临时目录打包成 ZIP 文件
5. 清理临时目录

## JavaScript 混淆选项

构建脚本使用了 `javascript-obfuscator` 库，配置了以下混淆选项：

- 控制流扁平化
- 死代码注入
- 字符串数组编码（Base64）
- 标识符重命名为十六进制
- 数字转换为表达式
- 对象键转换
- 自我防御

## 注意事项

- `release/` 目录已添加到 `.gitignore`，不会提交到 Git
- 每次构建会覆盖旧的 ZIP 文件
- 混淆过程可能需要几秒钟时间
