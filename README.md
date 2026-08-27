# 公共管理热点面试助手

一个完全静态的个人复习网页。Codex 负责联网搜索、阅读用户补充链接、生成每日 10 条热点与公共管理分析；GitHub Pages 只负责展示，不需要 DeepSeek、Tavily、数据库或服务器。

## 最简工作流

```text
用户在本项目的 Codex 任务中说“更新今日热点”
→ Codex 搜索最近7天权威来源并读取补充链接
→ Codex 选择10条并生成六维分析
→ 写入并校验静态 JSON
→ Codex 提交、推送 origin/main
→ GitHub Actions 自动发布 GitHub Pages
```

项目级执行规则见 `AGENTS.md`，数据格式见 `docs/digest-template.json`。

## 每天如何使用

在 Codex 中打开这个项目，发送：

> 更新今日热点。请优先关注养老服务、基层数字治理、教育公平、算法与人工智能治理、未成年人保护和公共数据治理；完成验证后直接推送发布。

如有希望纳入的材料，直接追加链接：

> 另外请阅读这两个链接，如符合条件优先纳入：
>
> https://……
>
> https://……

Codex 会自行完成搜索、原文核验、历史去重、JSON 写入、构建和推送。若找不到 10 条合格内容，会保留上一期而不是凑数。

## 数据文件

```text
public/data/dates.json        最近30期日期索引
public/data/YYYY-MM-DD.json   每日历史
```

发布前执行：

```bash
npm run validate:digest
npm run typecheck
npm run build
```

验证器会检查条数、地区比例、日期范围、链接格式、必填分析字段和自然周去重。

## GitHub Pages

仓库每次向 `main` 推送后，`.github/workflows/deploy-pages.yml` 会自动校验数据、构建静态网页并发布。GitHub 仓库中只需在 **Settings → Pages → Build and deployment** 将 Source 设置为 **GitHub Actions**；不需要配置任何 Secret。

公网地址：

```text
https://huangjue04-design.github.io/public-policy-digest/
```

## 本地预览

需要 Node.js 22：

```bash
npm install
npm run dev
```
