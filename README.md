# 设计情报工作台（公网部署版）

这是一个可部署到 Vercel 的真实联网图片搜索项目，不包含示例图片，也不会伪造搜索结果。

## 已接入与未接入的平台

### 已实现 API 搜索
- **Openverse**：公开授权媒体搜索 API。按 API 返回结果展示图片缩略图、作者/许可（若有）和原始页面。
- **Wikimedia Commons**：使用官方 MediaWiki API 搜索文件并读取图片信息/许可元数据。

### 提供搜索入口，但没有抓取其站内结果
- 小红书、站酷、Behance、Pinterest、古田路9号、Pentawards、Red Dot、Google 图片。
- 这些入口会跳转到对应平台搜索/官网；不会绕过登录、验证码、反爬或访问权限。

### 可后续接入
- Unsplash 官方 API：需注册应用并配置 `UNSPLASH_ACCESS_KEY`（当前项目未接入此密钥）。
- 其他平台：需逐一确认官方 API、授权、数据条款与可用性。不能承诺全站抓取。

## 最简单的公网部署（需要你自己的账号）

1. 解压本项目 ZIP。
2. 注册/登录 GitHub，将整个文件夹上传为一个新仓库。
3. 登录 Vercel，选择 **Add New → Project**，导入该 GitHub 仓库。
4. Framework Preset 选择 **Other**，Build Command 留空，Output Directory 留空，点击 Deploy。
5. 部署成功后，Vercel 会提供 `https://项目名.vercel.app` 公网地址，电脑和手机均可访问。

项目不需要数据库、API Key 或构建步骤。前端调用同域 `/api/search`，由 Vercel Serverless Function 访问公开 API，避免浏览器直接跨域访问上游 API。

## 本地预览 / 测试

需要 Node.js 与 Vercel CLI：
```bash
npm install
npx vercel dev
```
打开终端显示的本地地址。不要直接双击 `index.html` 测试搜索，因为 `/api/search` 需要运行中的服务端函数。

## 注意事项
- 免费部署平台和上游 API 都可能限流或变更；错误会显示在界面状态中。
- “优先可商用许可”是按 API 提供的许可字段做初步筛选，不构成法律保证；商用前逐张打开来源页核实。
- 当前不会把图片下载/复制到服务器，也不会自动建立永久图库；图片结果由来源站点提供。
- 要启用 Unsplash 等需密钥的接口，应将密钥添加到 Vercel Project → Settings → Environment Variables，并在服务端函数读取，切勿把 Secret Key 放进前端 HTML。
