# 实现计划：印尼语沉浸式学习平台 MVP Demo

## 概述

基于视觉小说式场景对话的纯前端 React 应用，数据 hardcode 在本地 `scenes.json`，部署至 Vercel。按 5 天开发计划分阶段实现，优先保证核心对话流程可用，再逐步完善交互细节与埋点。

---

## 任务列表

- [x] 1. 搭建项目基础结构与数据层
  - 使用 Vite + React 18 初始化项目，配置 Tailwind CSS v3
  - 创建 `src/data/scenes.json`，按数据模型填写全部 5 个场景的完整脚本内容（含 `vocab_hints`、`choices`、`ending`）
  - 确保 5 个场景 ID 按顺序：`jakarta_nightmarket_01`、`jakarta_market_02`、`jakarta_warung_03`、`jakarta_cny_04`、`jakarta_chinatown_05`
  - 确保高频词复现次数满足需求：`goreng` ≥ 6、`makan` ≥ 5、`berapa` ≥ 4、`enak` ≥ 4、`mau` ≥ 5
  - 在 `index.html` 中注入 Umami `<script>` 标签（`data-website-id` 占位，后续填入真实 ID）
  - _需求：1.1、1.4、8.1–8.6、9.1、10.1_

- [x] 2. 实现数据校验与 sessionStorage 工具函数
  - [x] 2.1 实现 `validateScene(scene)` 函数
    - 校验 `scene_id`、`chapter`、`background_style`、`dialogues` 四个必填字段
    - 字段缺失时 `console.error` 输出错误信息并返回 `false`
    - 对 `vocab_hints` 中的 `word` 字段进行去重处理（同一对话轮内重复词语只保留第一条），防止正则匹配产生重叠高亮
    - _需求：1.5、8.1_

  - [ ]* 2.2 为 `validateScene` 编写单元测试
    - 覆盖各必填字段缺失的场景
    - 覆盖 `vocab_hints` 重复词语去重逻辑
    - _需求：1.5_

  - [x] 2.3 实现 `getInitialSceneId(scenes)` 函数
    - 优先从 `sessionStorage.getItem('current_scene_id')` 读取，验证该 ID 在 scenes 中存在
    - `sessionStorage` 不可用或值无效时静默降级，返回 `scenes[0].scene_id`
    - _需求：9.4、9.6_

  - [ ]* 2.4 为 `getInitialSceneId` 编写单元测试
    - 覆盖 sessionStorage 有值/无值/无效值三种情况
    - _需求：9.4、9.6_

  - [x] 2.5 实现 `trackEvent(name, props)` Umami 埋点容错封装
    - 检查 `window.umami` 是否存在，不存在时静默跳过
    - 捕获异常并 `console.warn`，不向上抛出
    - _需求：10.1、10.5_

- [ ] 3. 检查点——工具函数验证
  - 确保所有测试通过，向用户确认数据校验与工具函数逻辑无误后继续。

- [x] 4. 实现 `VocabHighlight` 组件
  - [x] 4.1 实现 `escapeRegex(str)` 辅助函数
    - 对正则特殊字符（`. * + ? ^ $ { } [ ] | ( ) \`）进行转义，确保含特殊字符的词语能被正确匹配
    - _需求：3.1、3.2_

  - [x] 4.2 实现 `splitTextWithHighlights(text, hints)` 纯函数
    - 使用 `escapeRegex` 构建大小写不敏感正则（`'gi'` 标志）
    - 找出所有 hint.word 在 text 中的匹配位置，按 start 排序并去除重叠
    - 生成 `{ type: 'text' | 'highlight', content, hint? }` 的 segments 数组
    - 所有 segments 的 content 拼接后必须与原始 text 完全相等
    - _需求：3.1、3.2、3.4、3.5_

  - [ ]* 4.3 为 `splitTextWithHighlights` 编写属性测试（Property 2）
    - **属性 2：高亮词拆分覆盖完整性**
    - 使用 fast-check，对任意文本和任意 hints 数组，验证 segments 拼接结果 === 原始文本
    - 最少运行 100 次迭代
    - **验证：需求 3.1、3.4、3.5**

  - [ ]* 4.4 为 `splitTextWithHighlights` 编写属性测试（Property 3）
    - **属性 3：高亮词大小写不敏感匹配**
    - 使用 fast-check，对任意包含 hint.word（任意大小写）的文本，验证输出中存在至少一个 `type === 'highlight'` 的 segment
    - 最少运行 100 次迭代
    - **验证：需求 3.2**

  - [x] 4.5 实现 `VocabHighlight.jsx` 组件
    - 调用 `splitTextWithHighlights` 生成 segments
    - 高亮词渲染为 `<span class="highlight">` 并绑定 `onClick={() => onWordClick(hint)}`
    - 普通文本渲染为普通 `<span>`
    - `vocab_hints` 为空时整段文本以普通样式渲染
    - _需求：3.1–3.5_

- [x] 5. 实现 `VocabPopup` 组件
  - 渲染词义（`meaning`）、词根拆解（`root`）、文化钩子（`culture_hook`）三项内容
  - `hint` 为 `null` 时返回 `null`，不渲染任何内容
  - 点击遮罩层（`popup-overlay`）触发 `onClose`
  - 点击弹窗内部（`popup-card`）调用 `e.stopPropagation()` 阻止冒泡
  - 渲染关闭按钮，点击触发 `onClose`
  - _需求：4.1–4.5_

- [x] 6. 实现 `DialogueBox` 组件
  - 渲染角色名、`VocabHighlight`（印尼语文本）、中文对照三个元素
  - 将 `onWordClick` 回调透传给 `VocabHighlight`
  - 使用深色半透明底色配白色文字，参考视觉小说风格（Tailwind CSS）
  - _需求：2.5、7.2、7.3_

- [x] 7. 实现 `ChoicePanel` 与 `EndingCard` 组件
  - [x] 7.1 实现 `ChoicePanel.jsx`
    - 渲染 `choices` 数组中的全部选项按钮，文本格式为"印尼语（中文注释）"
    - 每个按钮点击调用 `onNavigate(choice.next)`
    - _需求：5.1、5.3_

  - [x] 7.2 实现 `EndingCard.jsx`
    - 渲染 `ending.title`、`ending.text`、`ending.cta_text` 三项内容
    - CTA 按钮点击调用 `onRestart`
    - 视觉上与对话记录区域明确区分（Tailwind CSS）
    - _需求：6.1–6.5_

- [x] 8. 实现 `SceneView` 组件
  - 渲染场景 CSS 渐变背景（`scene.background_style` 作为内联 style）
  - 渲染 `visibleDialogues`（`scene.dialogues.slice(0, dialogueIndex)`）对应的 `DialogueBox` 列表
  - 根据 `isFinished`、`showChoices`、`showEnding` 三个派生状态控制底部区域渲染：
    - `!isFinished`：显示"继续"按钮
    - `showChoices`：渲染 `ChoicePanel`，隐藏"继续"按钮
    - `showEnding`：渲染 `EndingCard`，隐藏"继续"按钮和 `ChoicePanel`
  - 使用 `useEffect` 监听 `isFinished && showEnding` 变为 `true` 的时刻，调用 `onCompleteChapter` 上报 `complete_chapter_1` 埋点（**注意：埋点触发在此处，而非 `navigateTo` 中**）
  - _需求：1.2、1.3、2.1–2.4、5.4、5.5、6.1、6.5、7.1、10.3_

  - [ ]* 8.1 为场景结束状态互斥逻辑编写属性测试（Property 7）
    - **属性 7：场景结束状态互斥**
    - 使用 fast-check，对任意合法场景数据，验证 ChoicePanel、EndingCard、继续按钮三者在任意 dialogueIndex 下的互斥关系
    - 最少运行 100 次迭代
    - **验证：需求 2.4、5.4、5.5、6.1、6.5**

- [x] 9. 实现 `App.jsx` 根组件与全局状态
  - [x] 9.1 初始化全局状态与场景切换逻辑
    - 使用 `useState` 管理 `currentSceneId`、`dialogueIndex`、`activeHint`
    - 初始化时调用 `getInitialSceneId` 读取 sessionStorage，并上报 `enter_scene` 埋点
    - 实现 `navigateTo(sceneId)`：更新 `currentSceneId`、重置 `dialogueIndex` 为 0、写入 sessionStorage、上报 `enter_scene` 埋点
    - 实现 `handleAdvance`：`dialogueIndex` 加 1（不超过 `scene.dialogues.length`）
    - 实现 `handleRestart`：调用 `navigateTo('jakarta_nightmarket_01')`
    - 实现 `handleCompleteChapter`：调用 `trackEvent('complete_chapter_1')`（由 SceneView 的 useEffect 触发）
    - _需求：2.1、2.2、5.2、9.4、9.5、10.2、10.3_

  - [ ]* 9.2 为 `navigateTo` 编写属性测试（Property 5）
    - **属性 5：场景切换重置对话索引**
    - 使用 fast-check，对任意目标 scene_id，验证调用后 `currentSceneId === targetId` 且 `dialogueIndex === 0`
    - 最少运行 100 次迭代
    - **验证：需求 5.2**

  - [ ]* 9.3 为 `navigateTo` 编写属性测试（Property 6）
    - **属性 6：sessionStorage 与当前场景一致性**
    - 使用 fast-check，对任意场景切换操作序列，验证每次 `navigateTo` 后 `sessionStorage.getItem('current_scene_id') === currentSceneId`
    - 最少运行 100 次迭代
    - **验证：需求 9.4**

  - [ ]* 9.4 为 `handleAdvance` 编写属性测试（Property 1）
    - **属性 1：对话推进单调递增**
    - 使用 fast-check，对任意合法场景和任意初始 dialogueIndex（0 ≤ index < dialogues.length），验证每次 `handleAdvance` 后 dialogueIndex 恰好加 1
    - 最少运行 100 次迭代
    - **验证：需求 2.1、2.2、2.3**

  - [x] 9.5 实现 VocabPopup 单例管理
    - `handleWordClick(hint)` 设置 `activeHint`
    - `handlePopupClose()` 将 `activeHint` 置为 `null`
    - 将 `activeHint`、`handleWordClick`、`handlePopupClose` 传递给组件树
    - _需求：4.4_

  - [ ]* 9.6 为 VocabPopup 单例编写属性测试（Property 4）
    - **属性 4：生词弹窗单例不变量**
    - 使用 fast-check，对任意两个不同 VocabHint，依次点击后验证 `activeHint` 等于最后点击的那个，且任意时刻 `activeHint` 只能是 `null` 或单个对象
    - 最少运行 100 次迭代
    - **验证：需求 4.4**

  - [x] 9.7 在 App 中组装完整组件树
    - 将 `SceneView`、`VocabPopup` 组装，传入所有 props 和回调
    - 对 `scenes.json` 调用 `validateScene` 过滤无效场景
    - _需求：1.5_

- [ ] 10. 检查点——核心功能集成验证
  - 确保所有属性测试和单元测试通过，手动验证完整对话流程（进入场景 → 推进对话 → 选项跳转 → 到达结尾卡片 → 重置），向用户确认后继续。

- [ ] 11. 实现场景转场动画与地点标签（方案 6）
  - 在 `scenes.json` 各场景中新增 `location_label` 字段（可选，部分场景填写）
  - SceneView 顶部渲染地点标签（`location_label` 存在时显示，缺省时不渲染）
  - 场景切换时应用 CSS 淡入淡出过渡（0.5 秒，通过 `opacity` transition 或 key 变化触发重新挂载实现）
  - _需求：7.6、7.7_

- [ ] 12. 实现中文翻译点击揭示（方案 2）
  - App 层新增 `showTranslation` 状态（默认 `false`）
  - 全局 toggle 按钮（固定在右上角或顶部导航栏），点击切换 `showTranslation`
  - DialogueBox 接收 `showTranslation` prop；`showTranslation` 为 `false` 时中文对照以 `blur-sm` 样式隐藏，点击单条揭示（本地 `revealed` 状态）
  - _需求：7.8_

- [ ] 13. 实现选项回应与语言挑战（方案 1 + 3）
  - 更新 `scenes.json`：为部分 choice 添加 `response` 字段（方案 1），为场景 2、3 的选项添加 `type: "challenge"`、`correct`、`response` 字段（方案 3）
  - App 层新增 `lastChoiceResponse` 状态（`{ text, isCorrect } | null`）
  - `navigateTo` 接收可选 `response` 和 `isCorrect` 参数，切换场景时存入 `lastChoiceResponse` 状态
  - SceneView 在 `dialogueIndex === 0` 时渲染 ChoiceResponse 插入对话框：`isCorrect === true` 绿色点缀，`isCorrect === false` 橙色点缀，`isCorrect === null` 中性样式
  - 用户推进第一轮对话后清空 `lastChoiceResponse`（不重试、不卡关，两种情况均直接推进）
  - _需求：5.8、5.9、5.10、5.11_

- [ ] 14. 样式完善与响应式布局
  - 使用 Tailwind CSS 完善所有组件的视觉小说风格样式
  - 确保移动端（≥ 375px）和桌面端（≥ 1024px）布局可读可交互
  - 对话框使用深色半透明底色（如 `bg-black/70`）配白色文字
  - 高亮词使用下划线加强调色样式（如 `underline text-yellow-300 cursor-pointer`）
  - EndingCard 与对话记录区域视觉上明确区分
  - _需求：7.1–7.5_

- [ ] 15. 集成测试
  - [ ]* 15.1 编写集成测试：完整对话流程
    - 进入应用 → 看到第一轮对话
    - 点击"继续" × N → 看到 ChoicePanel
    - 点击选项 → 切换到下一场景，对话重置
    - _需求：2.1–2.4、5.1–5.3_

  - [ ]* 15.2 编写集成测试：第一章结尾流程
    - 完成场景 5 最后一轮对话 → 看到 EndingCard
    - 点击 EndingCard CTA → 重置到场景 1 第一轮对话
    - _需求：6.1–6.5_

  - [ ]* 15.3 编写集成测试：sessionStorage 恢复
    - 模拟 sessionStorage 中存有 `current_scene_id` → 刷新后从对应场景恢复
    - 模拟 sessionStorage 为空 → 从场景 1 开始
    - _需求：9.4、9.6_

- [ ] 16. Vercel 部署配置
  - 确认 `vite.config.js` 构建输出为静态产物（无服务端运行时依赖）
  - 在项目根目录添加 `vercel.json`（如需配置 SPA 路由重写规则）
  - 将 Umami `data-website-id` 替换为真实 ID
  - _需求：9.1、9.2、9.3、10.1_

- [ ] 17. 最终检查点——部署前全量验证
  - 确保所有测试通过，完成手动测试检查清单（移动端/桌面端布局、高亮词弹窗、sessionStorage 行为、Umami 埋点），向用户确认后提交部署。

---

## 备注

- 标有 `*` 的子任务为可选测试任务，可在 MVP 快速验证阶段跳过
- 每个任务均引用具体需求条款以保证可追溯性
- `complete_chapter_1` 埋点**必须**在 `SceneView` 的 `useEffect` 中监听 `isFinished && showEnding` 变为 `true` 时触发，不在 `navigateTo` 中触发
- `VocabHighlight` 的 `escapeRegex` 函数**必须**实现；`validateScene` 中**必须**对 `vocab_hints` 的 `word` 字段去重
- 属性测试使用 fast-check，每个属性最少运行 100 次迭代
- 单元测试和集成测试使用 Vitest + React Testing Library
