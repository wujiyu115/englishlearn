# 英语学习 App — Web 重设计文档

日期：2026-04-17

> 本文档为原 Flutter 方案的 Web 重设计，采用方案 A（精简核心版），去掉硬件依赖功能，保留六大纯内容模块。

---

## 概述

一款面向成人自学者（职场人士、碎片化时间）的英语学习 Web App。桌面浏览器为主，移动端响应式适配。UI 风格参考 Vercel 设计系统——极简黑白双主题、shadow-as-border、Geist 字体体系。

---

## 一、技术架构

### 前端

| 层面 | 技术 |
|------|------|
| 框架 | React + TypeScript |
| 组件库 | ShadcnUI |
| CSS | Tailwind v4 |
| 构建 | RSBuild |
| 路由 | React Router v7 |
| 包管理 | Bun |
| 数据请求 | @tanstack/query |
| 状态管理 | Zustand（全局：用户 / XP / 连签） |
| 表单校验 | Zod |
| 代码质量 | ESLint v9 (flat config) + Prettier |

### 后端

| 层面 | 技术 |
|------|------|
| API | FastAPI |
| ORM | SQLAlchemy |
| 数据库 | SQLite（开发）/ MySQL（生产） |
| 鉴权 | JWT（httpOnly Cookie）+ bcrypt |
| 大模型 | Claude API（场景对话生成） |

### 数据流

```
浏览器
  └── React Query（缓存 + 请求）
        └── FastAPI RESTful
              └── SQLAlchemy → SQLite / MySQL
```

- 无本地离线存储，全部走服务端，React Query 提供请求级缓存
- JWT 存于 httpOnly Cookie，防止 XSS

---

## 二、UI 设计语言（Vercel 风格）

### 双主题颜色系统

| CSS 变量 | 浅色值 | 暗色值 |
|----------|--------|--------|
| `--bg` | `#ffffff` | `#000000` |
| `--bg-surface` | `#fafafa` | `#0a0a0a` |
| `--bg-card` | `#ffffff` | `#111111` |
| `--text-primary` | `#171717` | `#ededed` |
| `--text-secondary` | `#4d4d4d` | `#888888` |
| `--text-muted` | `#808080` | `#555555` |
| `--border-shadow` | `rgba(0,0,0,0.08) 0 0 0 1px` | `rgba(255,255,255,0.08) 0 0 0 1px` |
| `--border-light` | `rgb(235,235,235) 0 0 0 1px` | `rgb(30,30,30) 0 0 0 1px` |
| `--card-inner-ring` | `#fafafa` | `#1a1a1a` |

### Accent 色（双主题通用）

| 角色 | 颜色 | 用途 |
|------|------|------|
| 熟练 / XP | `#0a72ef` | 进度条高值、经验值数字 |
| 待复习 / 警示 | `#ff5b4f` | 低熟练度词、待复习提醒 |
| 联赛 / 段位 | `#de1d8d` | 排行榜高亮、段位徽章 |
| 焦点环 | `hsla(212,100%,48%,1)` | 键盘导航无障碍，双主题一致 |

### 字体

- **Geist Sans**：主字体，标题 letter-spacing -2.4px（48px）→ -0.96px（24px）→ normal（14px）
- **Geist Mono**：音标、XP 数字、技术标签，启用 OpenType `"liga"` + `"tnum"`
- 权重：400（阅读）/ 500（交互）/ 600（标题），不使用 700

### 组件规范

```css
/* 标准卡片（浅色） */
background: #ffffff;
border-radius: 8px;
box-shadow: rgba(0,0,0,0.08) 0px 0px 0px 1px,
            rgba(0,0,0,0.04) 0px 2px 2px,
            #fafafa 0px 0px 0px 1px;

/* 标准卡片（暗色） */
background: #111111;
border-radius: 8px;
box-shadow: rgba(255,255,255,0.08) 0px 0px 0px 1px,
            rgba(255,255,255,0.03) 0px 2px 2px,
            #1a1a1a 0px 0px 0px 1px;

/* 主要按钮 */
background: #171717; color: #ffffff;
padding: 8px 16px; border-radius: 6px;

/* 次要按钮 */
background: #ffffff; color: #171717;
box-shadow: rgb(235,235,235) 0px 0px 0px 1px;
border-radius: 6px;

/* 段位 / 状态 pill */
border-radius: 9999px; padding: 0 10px;
font-size: 12px; font-weight: 500;
```

### 间距

- 基础单位 8px；节间距 80–120px；卡片内 16–32px
- 跳跃规律：16px → 32px，不使用 20px / 24px

### 主题切换

- Tailwind v4 `dark:` 变体 + `prefers-color-scheme` 默认
- 用户手动切换，存入 localStorage
- `<html class="dark">` 驱动 CSS 变量切换

---

## 三、导航结构 & 布局

### 整体布局

```
┌─────────────────────────────────────┐
│  Navbar（sticky top）               │
│  Logo · 主导航 · 主题切换 · 用户头像 │
├─────────────────────────────────────┤
│                                     │
│  主内容区（max-width: 1200px，居中） │
│                                     │
└─────────────────────────────────────┘
```

### 顶部导航

```
[WordFlow]  首页  单词本  对对碰  场景  阅读  联赛    [☀/☾]  [头像▾]
```

- 链接：Geist 14px weight 500，`var(--text-primary)`
- 活跃项：weight 600 + 2px 底部下划线
- 头像 dropdown：「我的资料 / 退出」
- 移动端：hamburger 折叠

### 页面路由

| 路由 | 页面 |
|------|------|
| `/` | 首页 Dashboard |
| `/words` | 单词本 |
| `/game` | 对对碰 |
| `/scenes` | 场景英语 |
| `/reading` | 沉浸式阅读 |
| `/league` | 联赛排行榜 |

### 首页 Dashboard 布局

```
┌─────────────────────────────────────────┐
│  🔥 连签第 N 天                          │
│  XP 进度条  Lv.X ──────────── Lv.X+1   │
├──────────────┬──────────────────────────┤
│ 每日目标进度  │  推荐复习单词（3–5 个）   │
│ ▓▓▓▓░░ 6/10 │  card · card · card      │
└──────────────┴──────────────────────────┘
```

---

## 四、功能模块详设

### 1. 单词本 `/words`

- 顶部：搜索框 + 来源筛选 pill（全部 / 手动 / 场景 / 阅读）
- 词卡列表：英文（Geist 16px 600）· 音标（Geist Mono 13px muted）· 中文释义 · 熟练度进度条
- 进度条色：低熟练度 `#ff5b4f` → 高熟练度 `#0a72ef`
- 展开词卡：例句 + Web Speech TTS 发音 + 删除
- 「+ 添加单词」：Zod 表单校验

### 2. 对对碰 `/game`

- 全屏双主题底色，2 列卡片网格（左英文 · 右中文），各 6 张
- 选中态：`#0a72ef` border-shadow 高亮
- 配对正确：卡片淡出 + XP 数字飞升（Geist Mono）
- 配对错误：shake 动画 + `#ff5b4f` 短暂高亮
- 顶部：倒计时 · 本局得分 · 连击数（Geist Mono）
- 局末弹窗：成绩卡片 + XP 获得 + 「再来一局」

### 3. 场景英语 `/scenes`

- 搜索框：命中预设 → 立即展示；无匹配 → 调用 Claude API 生成 8–12 条对话
- 预设快捷 pill（机场 · 餐厅 · 面试 · 购物…，50+ 预设）
- 对话列表：英文（16px 600）+ 中文（14px secondary）+ TTS 播放
- 点击单词 → Popover：音标 · 释义 · 「加入单词本」
- 收藏场景存服务端，离线缓存预设

### 4. 沉浸式阅读 `/reading`

- 文章列表：卡片展示标题 · 词数 · 未知词数 · 难度 pill · 完成状态
- 「+ 添加」：粘贴 URL 或原文，后端解析返回干净正文
- 阅读视图：max-width 680px 居中，Geist 18px line-height 1.56
- 点击单词 → Popover（同场景英语）
- 顶部阅读进度条，自动保存位置
- 读完全文 → 成就弹窗 + XP 奖励

### 5. 联赛排行榜 `/league`

- 当前段位 pill（`#de1d8d`）+ 本周 XP + 排名
- 排行榜列表：名次 · 头像 · 昵称 · 本周 XP，前 3 名加冠标
- 段位规则：前 3 晋升 / 后 5 降级，倒计时至周日结算
- 好友 tab：关注用户的连签数 + 排名

### 6. 奖励系统（全局）

- XP 来源：添加单词 / 对对碰配对 / 场景收藏 / 读完文章
- 连签：任意模块操作 ≥5 分钟计当日，火焰 icon + 天数（Geist Mono）
- 成就徽章：「7 天连签」「学会 100 词」等，首页 dashboard 展示
- 升级动画：全屏 confetti + Geist 48px 等级数字（weight 600，letter-spacing -2.4px）

---

## 五、数据模型

```
User
  id, email, nickname, avatar_url
  password_hash（bcrypt）
  level, total_xp, streak_count, last_study_date
  league_tier（bronze/silver/gold/platinum/diamond）
  created_at, updated_at

Word
  id, user_id
  english, phonetic, chinese, example_sentence
  source（manual | scene | reading）
  accuracy_rate（0.0–1.0）
  review_count, next_review_date
  created_at, updated_at

Scene
  id, user_id（null = 预设）
  name_cn, name_en, is_preset
  dialogues（JSON：[{english, chinese}]）
  created_at

UserFavoriteScene（多用户可收藏同一预设）
  id, user_id, scene_id, created_at

Article
  id, user_id
  title, source_url, content
  word_count, unknown_word_count
  last_read_position, is_finished
  created_at

LeagueWeek
  id, user_id, week_start_date
  tier, weekly_xp, rank
```

---

## 六、后端 API

```
# 鉴权
POST  /auth/register
POST  /auth/login          → JWT（httpOnly Cookie）
POST  /auth/refresh

# 用户
GET   /user/me
PUT   /user/xp             # 更新 XP + 检查升级
PUT   /user/streak         # 更新连签

# 单词本
GET   /words               # 列表，支持 source 筛选
POST  /words
PUT   /words/{id}/accuracy # 游戏结束后批量更新
DELETE /words/{id}

# 场景
GET   /scenes/presets
GET   /scenes/search?q=    # 无匹配触发 Claude API
POST  /scenes/{id}/favorite

# 文章
GET   /articles
POST  /articles            # 提交 URL 或原文，后端解析
PUT   /articles/{id}/progress
PUT   /articles/{id}/finish

# 联赛
GET   /league/current
GET   /league/friends
```

---

## 七、测试策略

- **单元测试**：XP 计算、熟练度权重算法、连签判断逻辑
- **组件测试**：对对碰游戏棋盘、单词卡展开交互、场景 Popover
- **集成测试**：鉴权流程、场景搜索 → Claude API → 缓存链路
- **手动测试**：每次发布前在 Chrome / Safari 走通各模块黄金路径，验证浅色 / 暗色主题切换
