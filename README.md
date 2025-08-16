# DepthCut Frontend - 纯前端深度图像切分工具

## 🚀 项目简介

DepthCut Frontend 是一个纯前端的深度图像切分工具，能够将图片按深度信息切分成多个透明PNG层级。与服务器版本不同，这个版本完全在浏览器中运行，无需后端服务器，保护用户隐私。

## ✨ 主要特性

- 🌐 **纯前端处理** - 无需服务器，完全在浏览器中运行
- 🤖 **AI深度图生成** - 基于Replicate API自动生成深度图
- 🎨 **多层级切分** - 支持1-32层可配置切分
- 🔒 **隐私保护** - 图片处理完全在本地进行
- 📱 **响应式设计** - 支持桌面和移动设备
- 💾 **批量下载** - 支持单个文件和ZIP打包下载
- ⚡ **高性能** - 使用Canvas API进行图像处理

## 🛠️ 技术栈

- **前端**: HTML5 + CSS3 + Vanilla JavaScript
- **图像处理**: Canvas API
- **AI模型**: Replicate depth-anything-v2
- **打包下载**: JSZip (可选)
- **部署**: 静态网站托管

## 📋 使用要求

### 浏览器支持
- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

### API要求
- Replicate API Token（用于自动模式深度图生成）

## 🚀 快速开始

### 1. 获取代码
```bash
# 克隆项目
git clone <repository-url>
cd DepthCut/web-frontend
```

### 2. 本地运行
由于是纯前端项目，可以直接在浏览器中打开：

```bash
# 方法1: 直接打开文件
open index.html

# 方法2: 使用本地服务器（推荐）
# Python 3
python -m http.server 8000

# Node.js
npx serve .

# 然后访问 http://localhost:8000
```

### 3. 配置API Token
1. 访问 [Replicate API Tokens页面](https://replicate.com/account/api-tokens)
2. 登录或注册Replicate账户
3. 创建新的API Token
4. 在应用中输入Token

### 4. 开始使用
1. 选择处理模式（自动/手动）
2. 上传图片文件
3. 设置层级数量
4. 点击开始处理
5. 下载生成的层级文件

## 📁 项目结构

```
web-frontend/
├── index.html              # 主页面
├── css/
│   └── style.css           # 样式文件
├── js/
│   ├── app.js              # 主应用逻辑
│   ├── depth-generator.js  # 深度图生成器
│   ├── image-processor.js  # 图像处理器
│   └── depth-cutter.js     # 深度切分器
├── assets/                 # 静态资源（可选）
└── README.md              # 说明文档
```

## 🌐 部署指南

### Vercel部署
1. 将代码推送到GitHub
2. 在Vercel中导入项目
3. 设置构建配置：
   - Framework Preset: Other
   - Root Directory: web-frontend
   - Build Command: 留空
   - Output Directory: .
4. 部署完成

### Netlify部署
1. 将代码推送到GitHub
2. 在Netlify中连接仓库
3. 设置构建配置：
   - Base directory: web-frontend
   - Build command: 留空
   - Publish directory: .
4. 部署完成

### GitHub Pages部署
1. 将web-frontend内容推送到gh-pages分支
2. 在仓库设置中启用GitHub Pages
3. 选择gh-pages分支作为源
4. 访问生成的URL

### 其他静态托管服务
- **Cloudflare Pages**: 直接连接GitHub仓库
- **Firebase Hosting**: 使用Firebase CLI部署
- **Surge.sh**: 使用surge命令行工具

## 🔧 配置选项

### API配置
- **Replicate API Token**: 用于深度图生成的API密钥
- **模型版本**: 默认使用depth-anything-v2模型

### 处理设置
- **层级数量**: 1-32层可选
- **文件格式**: 输出PNG格式（带透明通道）
- **质量设置**: 默认90%质量

## 🔒 隐私说明

- ✅ API Token仅存储在浏览器本地
- ✅ 图片处理完全在浏览器中进行
- ✅ 只有深度图生成需要调用外部API
- ✅ 不会上传任何数据到我们的服务器
- ✅ 支持离线使用（手动模式）

## 💰 费用说明

- **应用使用**: 完全免费
- **Replicate API**: 按使用量计费，深度图生成约$0.01-0.05/次
- **部署托管**: 大多数静态托管服务提供免费额度

## 🐛 故障排除

### 常见问题

**Q: API Token验证失败**
A: 请检查Token是否正确，确保有足够的API额度

**Q: 图片上传失败**
A: 检查文件格式（支持JPG/PNG/BMP/WebP）和大小（<10MB）

**Q: 处理速度慢**
A: 大图片处理需要更多时间，建议使用较小的图片或减少层级数量

**Q: 下载失败**
A: 检查浏览器是否阻止了下载，允许多文件下载

### 浏览器兼容性问题

**Canvas API支持**:
- 确保浏览器支持Canvas 2D Context
- 检查是否启用了JavaScript

**文件API支持**:
- 确保浏览器支持FileReader API
- 检查文件访问权限

## 🤝 贡献指南

1. Fork项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建Pull Request

## 📄 开源协议

本项目采用MIT协议 - 查看 [LICENSE](../LICENSE) 文件了解详情

## 🔗 相关链接

- [Replicate API文档](https://replicate.com/docs)
- [Canvas API文档](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API)
- [项目GitHub仓库](https://github.com/your-repo/DepthCut)

## 📞 支持

如果您遇到问题或有建议，请：
- 创建GitHub Issue
- 发送邮件到 support@example.com
- 查看在线文档

---

© 2024 DepthCut Frontend - 让深度图像处理更简单