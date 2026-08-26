# 国家税务总局政策监测网页版（无需 Python）

这是一个可以部署到 GitHub Pages 的纯网页应用。  
部署完成后，你平时只需要打开网页，不需要安装 Python，也不需要每天手工更新。

## 第一次部署（约 5 个操作）

1. 登录 GitHub，新建一个仓库，例如 `tax-policy-monitor`。
2. 把这个 ZIP 解压后的**全部文件和文件夹**上传到仓库，并提交到 `main` 分支。
3. 打开仓库：`Settings` → `Pages`。
4. 在 `Build and deployment` 的 `Source` 中选择 **GitHub Actions**。
5. 打开仓库的 `Actions` 页面，选择 `Daily Tax Policy Monitor`，点击 `Run workflow` 首次运行。

首次运行成功后，`Settings → Pages` 会显示你的网页地址。

## 以后怎么用？

以后什么都不用操作。GitHub Actions 会在北京时间每天约 08:15：
- 检查国家税务总局首页“政策发布”
- 判断是否有新增政策
- 读取政策正文
- 下载页面附件
- 自动生成结构化摘要
- 更新网页

你也可以进入 `Actions` 手动点击 `Run workflow`，立即检查一次。

## 网页功能
- 查看全部已监测政策
- 查看发布日期和文号
- 自动摘要
- 打开国家税务总局政策原文
- 下载归档附件
- 关键词搜索
- 年份筛选

> 提醒：自动摘要用于快速浏览，正式税务处理应以国家税务总局政策原文为准。
