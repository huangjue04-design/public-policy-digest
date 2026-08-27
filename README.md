# 公共管理热点面试助手

个人使用的静态复习网页：每天从权威官网采集最近七日内容，用 DeepSeek 选出 8 条国内、2 条海外热点并生成适合 3–5 分钟口述的公共管理分析。

## 当前架构

```text
GitHub Actions 每日定时
→ 中国政府网/教育部/民政部/新华网/WHO/联合国新闻
→ 原文日期、域名和正文校验
→ 本周静态 JSON 去重
→ DeepSeek 第一阶段选题（仅候选ID与主题）
→ DeepSeek 第二阶段逐条生成摘要与六维分析
→ public/data/*.json
→ GitHub Pages
```

不再需要 Tavily、OpenAI、Vercel、Neon 数据库或服务端 API。没有真实数据时，页面会显示明确标注的演示内容。

## 本地使用

需要 Node.js 22：

```bash
npm install
cp .env.example .env.local
npm run generate:digest
npm run dev
```

环境变量：

```env
DEEPSEEK_API_KEY=你的密钥
DEEPSEEK_MODEL=deepseek-chat
DEEPSEEK_BASE_URL=https://api.deepseek.com
```

密钥只允许放在 `.env.local` 或 GitHub Secrets，不能提交到仓库。

## 免费部署到 GitHub Pages

1. 在 GitHub 创建一个公开仓库，将本项目推送到默认分支。
2. 打开仓库 **Settings → Secrets and variables → Actions**。
3. 在 Secrets 新建 `DEEPSEEK_API_KEY`。
4. 如实际模型名或服务地址不同，在 Variables 新建 `DEEPSEEK_MODEL`、`DEEPSEEK_BASE_URL`；否则使用默认值。
5. 打开 **Settings → Pages**，将 Source 设置为 **GitHub Actions**。
6. 在 **Actions → 每日热点与网页发布 → Run workflow** 手动运行一次。

成功后公网地址通常为：

```text
https://你的GitHub用户名.github.io/仓库名/
```

工作流在北京时间每天 06:10 自动运行。GitHub 定时任务可能延迟；如果采集不足 10 条、DeepSeek 返回不合格内容或任一关键校验失败，工作流停止，线上继续保留上一完整批次。

DeepSeek 的选题调用和每条分析调用都最多自动尝试 3 次。JSON 解析失败或 Zod 字段校验失败时，下一次调用会附带精简的校验错误并要求重新输出；网络超时、限流和服务端错误也会指数退避后重试。只有 10 条内容全部通过校验后才写入 `public/data`。

## 数据与去重

```text
public/data/latest.json       最新完整批次
public/data/dates.json        最近30期日期索引
public/data/YYYY-MM-DD.json   每日历史
```

同一自然周通过规范化原文链接和标题指纹去重。模型只能返回采集器提供的 `candidateId`；标题、来源、日期和原文链接全部由代码从权威官网映射，避免模型编造链接。

## 调整来源

来源配置位于 `lib/official-sources.ts`。新增来源必须同时满足：

- 官方机构或明确认可的权威媒体；
- 页面公开访问且允许正常读取；
- 能从栏目页或文章 URL 提取发布日期；
- 原文页包含足够正文供事实核验。

采集器会跳过暂时不可访问的单个来源；只有国内至少 8 个、海外至少 2 个合格候选时才调用 DeepSeek。
