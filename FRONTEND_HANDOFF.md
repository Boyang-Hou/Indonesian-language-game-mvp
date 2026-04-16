# MicroSkin AI — 前端对接手册

> **文档版本：** v1.0 | **更新日期：** 2026-04-15 | **后端状态：** 全部模块已完成，集成测试通过

---

## 一、项目简介：你需要知道的背景

MicroSkin AI 是一个面向皮肤科医生的 AI 辅助诊断系统。后端基于 **FastAPI (Python)** 构建，已经实现完毕，你的工作是用 **iOS SwiftUI** 对接这套 REST API。

核心业务流程就一条链路，前端需要把这条链路串起来：

```
医生注册/登录 → 上传皮肤照片 → AI 分析病灶 → 查看成分建议 → 生成诊断报告 → 提交反馈 → 查看历史记录
```

**几个关键设计约束，前端必须遵守：**

1. **所有受保护接口都需要 JWT**：登录后拿到 token，之后每个请求的 Header 里带 `Authorization: Bearer <token>`，token 有效期 24 小时，过期需要重新登录。
2. **跨账号隔离**：医生 A 看不到医生 B 的任何数据，后端会返回 403，前端做好错误提示就行。
3. **图片不走公开 URL**：所有图片通过后端生成的预签名 URL 访问，有效期 1 小时，过期需要重新请求。
4. **AI 输出必须带免责声明**：每份报告都有 `disclaimer` 字段，前端必须展示，这是伦理要求。
5. **低置信度要醒目提醒**：当 `confidence_level` 为 `"LOW"` 时，前端需要用视觉手段（颜色、图标等）提醒医生谨慎对待，并引导线下检查。

---

## 二、技术栈与通信约定

| 项目 | 说明 |
|------|------|
| 后端框架 | FastAPI (Python 3.11+) |
| 数据库 | MySQL (Railway 托管) |
| 对象存储 | Cloudflare R2（私有 bucket，S3 兼容） |
| AI 模型 | HuggingFace ViT (`0xnu/skincare-detection`) |
| LLM | OpenAI GPT 或 DeepSeek（可切换） |
| 认证 | JWT (PyJWT) + bcrypt |
| 通信协议 | HTTPS REST，JSON body |
| 图片上传 | `multipart/form-data` |
| 字符编码 | UTF-8 |
| 时间格式 | ISO 8601（如 `2026-04-15T10:30:00`） |

---

## 三、统一错误响应格式

后端所有错误响应统一使用以下 JSON 结构，前端可以统一解析：

```json
{
  "detail": "错误描述信息（中文或英文）"
}
```

**HTTP 状态码速查表：**

| 状态码 | 含义 | 前端处理建议 |
|--------|------|-------------|
| 400 | 请求参数有误（文件格式不对、文件太大等） | 提示用户修正输入 |
| 401 | 未认证（token 缺失/无效/过期，或登录密码错误） | 跳转登录页 |
| 403 | 无权限（账号待审核、跨账号访问） | 提示"无权限"或"账号待审核" |
| 404 | 资源不存在 | 提示"未找到" |
| 409 | 冲突（邮箱已注册） | 提示"该邮箱已被注册" |
| 422 | 字段校验失败（缺字段、枚举值非法、分页参数非正整数） | 提示具体缺失/错误字段 |
| 502 | 外部服务故障（R2/HuggingFace/LLM 挂了） | 提示"服务暂时不可用，请稍后重试" |

---

## 四、认证机制

### 认证流程

```
1. POST /auth/register → 注册（返回成功，但账号状态为 pending_verification）
2. [等待后台审核，status 变为 active]
3. POST /auth/login → 登录（返回 JWT token）
4. 后续所有请求 Header 加上: Authorization: Bearer <token>
```

### Token 存储建议

- iOS 端建议将 token 存入 Keychain
- token 有效期 24 小时，前端需处理 401 响应并引导重新登录
- token payload 里有 `sub`（doctor_id）和 `email`，但前端不需要自己解码，登录响应里会直接返回医生信息

---

## 五、全部 API 接口详情

### 5.1 POST /auth/register — 医生注册

**认证：** 不需要

**Request Body (`application/json`)：**

```json
{
  "email": "doctor@example.com",
  "password": "securepass123",
  "name": "张医生",
  "hospital": "北京协和医院",
  "license_number": "110108199001011234"
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| email | string (email) | ✅ | 邮箱，系统唯一标识 |
| password | string | ✅ | 最少 8 位 |
| name | string | ✅ | 医生姓名 |
| hospital | string | ✅ | 所属医院 |
| license_number | string | ✅ | 执业资格证号 |

**Response 201：**

```json
{
  "success": true,
  "message": "注册成功，等待审核"
}
```

**错误响应：**

| 状态码 | 场景 |
|--------|------|
| 409 | email 已被注册 |
| 422 | 缺少必填字段或格式不合法 |

---

### 5.2 POST /auth/login — 医生登录

**认证：** 不需要

**Request Body (`application/json`)：**

```json
{
  "email": "doctor@example.com",
  "password": "securepass123"
}
```

**Response 200：**

```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "doctor": {
    "id": 1,
    "name": "张医生",
    "hospital": "北京协和医院"
  }
}
```

**错误响应：**

| 状态码 | 场景 |
|--------|------|
| 401 | email 不存在或密码错误 |
| 403 | 账号状态为 `pending_verification`（还没审核通过） |

**前端注意：** 登录成功后需要持久化 `token` 和 `doctor` 信息。`doctor.id` 在后续请求中不需要手动传——后端从 JWT 中自动解析。

---

### 5.3 POST /upload/image — 上传皮肤图片

**认证：** ✅ 需要 JWT

**Request：** `multipart/form-data`

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| file | binary | ✅ | 图片文件，支持 jpg/jpeg/png，最大 10MB |

**Response 200：**

```json
{
  "image_id": 42
}
```

**错误响应：**

| 状态码 | 场景 |
|--------|------|
| 400 | 文件格式不是 jpg/jpeg/png，或文件超过 10MB |
| 401 | JWT 无效 |
| 502 | Cloudflare R2 上传失败 |

**前端注意：**
- iOS 端可以支持"即时拍照"和"从图库选择"两种方式
- 拿到 `image_id` 后存起来，后续分析和报告生成都需要它
- 图片上传后状态为 `pending`，需要调分析接口后才变为 `analyzed`

---

### 5.4 GET /upload/image/{image_id}/url — 获取图片预签名 URL

**认证：** ✅ 需要 JWT

**Path 参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| image_id | int | 图片 ID |

**Response 200：**

```json
{
  "url": "https://r2.example.com/microskin-images/abc123.jpg?X-Amz-Signature=...",
  "expires_in": 3600
}
```

**错误响应：**

| 状态码 | 场景 |
|--------|------|
| 403 | 这张图不是你上传的（跨账号访问） |
| 404 | image_id 不存在 |

**前端注意：**
- 返回的 URL 有效期 1 小时（`expires_in` 单位是秒）
- 过期后需要重新调用此接口获取新 URL
- 如果图片已被删除（`r2_key` 为 NULL），后端可能返回错误或空 URL，前端需要做好降级展示（如显示占位图）

---

### 5.5 DELETE /upload/image/{image_id} — 删除已分析图片

**认证：** ✅ 需要 JWT

**Path 参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| image_id | int | 图片 ID |

**Response 200：**

```json
{
  "success": true
}
```

**错误响应：**

| 状态码 | 场景 |
|--------|------|
| 400 | 图片还没分析完（只有 `analyzed` 状态的图片才能删除） |
| 403 | 跨账号访问 |
| 404 | image_id 不存在 |

**前端注意：**
- 删除的是 R2 上的原始图片文件，分析结果仍然保留
- 删除后报告查看页的图片区域应显示"图片已删除"占位
- 建议前端在删除前加一个确认弹窗

---

### 5.6 POST /analysis/run — 运行 AI 皮肤病灶分析

**认证：** ✅ 需要 JWT

**Request Body (`application/json`)：**

```json
{
  "image_id": 42
}
```

**Response 200：**

```json
{
  "result_id": 7,
  "prediction": "acne",
  "confidence": 0.85,
  "confidence_level": "HIGH",
  "top5_scores": [
    { "label": "acne", "score": 0.85 },
    { "label": "eczema", "score": 0.07 },
    { "label": "psoriasis", "score": 0.04 },
    { "label": "rosacea", "score": 0.02 },
    { "label": "melanoma", "score": 0.01 }
  ]
}
```

**字段说明：**

| 字段 | 类型 | 说明 |
|------|------|------|
| result_id | int | 分析结果 ID |
| prediction | string | 最高置信度的病灶类型 |
| confidence | float | 最高置信度分数（保留两位小数，范围 0.00–1.00） |
| confidence_level | "HIGH" / "MEDIUM" / "LOW" | 置信度等级 |
| top5_scores | array | 前 5 个预测结果，按 score 降序 |

**置信度等级规则：**

| 等级 | 范围 | 前端建议展示 |
|------|------|-------------|
| HIGH | ≥ 0.70 | 绿色标识，正常展示 |
| MEDIUM | 0.40 – 0.69 | 黄色标识，提示"建议结合临床判断" |
| LOW | < 0.40 | 红色标识，强调"建议安排线下检查" |

**错误响应：**

| 状态码 | 场景 |
|--------|------|
| 403 | 跨账号访问 |
| 404 | image_id 不存在 |
| 502 | HuggingFace API 调用失败 |

**前端注意：**
- 分析可能需要几秒钟，建议显示 loading 动画
- 分析成功后图片状态变为 `analyzed`
- 如果 502，图片状态保持 `pending`，可以提示用户稍后重试

---

### 5.7 GET /ingredient/{prediction} — 查询循证成分建议

**认证：** ✅ 需要 JWT

**Path 参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| prediction | string | 病灶类型（来自分析结果的 `prediction` 字段） |

**Response 200：**

```json
{
  "items": [
    {
      "ingredient_name": "水杨酸",
      "mechanism": "角质溶解作用，疏通毛孔，减少粉刺形成",
      "evidence_level": "A",
      "contraindications": "对水杨酸过敏者禁用；孕妇慎用"
    },
    {
      "ingredient_name": "烟酰胺",
      "mechanism": "抗炎、调节皮脂分泌、改善皮肤屏障功能",
      "evidence_level": "B",
      "contraindications": null
    }
  ],
  "message": null
}
```

**当无匹配数据时：**

```json
{
  "items": [],
  "message": "暂无该病灶的成分数据"
}
```

**字段说明：**

| 字段 | 类型 | 说明 |
|------|------|------|
| items[].ingredient_name | string | 有效成分名称（不含品牌/药品名） |
| items[].mechanism | string | 作用机制 |
| items[].evidence_level | "A" / "B" / "C" | 循证等级，A 最强 |
| items[].contraindications | string / null | 禁忌信息 |
| message | string / null | 当无数据时包含提示文本 |

**前端建议：** 成分列表已按 evidence_level 排序（A 在前），前端可以用不同颜色或标签区分 A/B/C 等级。

---

### 5.8 POST /report/generate — 生成结构化诊断报告

**认证：** ✅ 需要 JWT

**Request Body (`application/json`)：**

```json
{
  "image_id": 42,
  "questionnaire_data": {
    "skin_type": "oily",
    "age": 25,
    "gender": "female",
    "medication_history": "近期使用过克林霉素凝胶",
    "lifestyle": "经常熬夜，饮食偏辣",
    "environment": "南方潮湿气候",
    "allergy_history": "无已知过敏",
    "symptom_duration": "3个月",
    "affected_area": "面部T区"
  }
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| image_id | int | ✅ | 已完成分析的图片 ID |
| questionnaire_data | object | ✅ | 患者问卷数据（格式灵活，key-value 形式） |

**`questionnaire_data` 建议字段（非强制，前端可自行设计问卷 UI）：**

| 建议字段 | 说明 |
|----------|------|
| skin_type | 皮肤类型（oily/dry/combination/sensitive/normal） |
| age | 年龄 |
| gender | 性别 |
| medication_history | 既往用药史 |
| lifestyle | 生活习惯 |
| environment | 居住环境 |
| allergy_history | 过敏史 |
| symptom_duration | 症状持续时间 |
| affected_area | 受影响部位 |

**Response 200：**

```json
{
  "report_id": 15,
  "report_text": "根据AI图像分析，该患者皮肤图像显示痤疮特征，置信度为85%（高置信度）...",
  "ingredient_suggestions": [
    {
      "ingredient_name": "水杨酸",
      "mechanism": "角质溶解作用，疏通毛孔",
      "evidence_level": "A",
      "contraindications": "对水杨酸过敏者禁用"
    }
  ],
  "confidence_level": "HIGH",
  "disclaimer": "本报告由 AI 辅助生成，仅供参考，不构成医疗诊断。最终诊断及治疗方案请由执业医师根据临床实际情况决定。"
}
```

**错误响应：**

| 状态码 | 场景 |
|--------|------|
| 404 | image_id 对应的分析结果不存在（需要先调 /analysis/run） |
| 502 | LLM API 调用失败（不会写入不完整的报告记录） |

**前端注意：**
- 报告生成依赖 LLM，耗时可能较长（5-15 秒），务必显示 loading
- `disclaimer` 字段必须在 UI 上展示，这是伦理合规要求
- 当 `confidence_level` 为 `"LOW"` 时，报告文本中会包含"建议安排线下检查"的提示，前端可以额外用 UI 元素强调

---

### 5.9 GET /report/{report_id} — 查看完整诊断报告

**认证：** ✅ 需要 JWT

**Path 参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| report_id | int | 报告 ID |

**Response 200：**

```json
{
  "report": {
    "report_id": 15,
    "report_text": "根据AI图像分析...",
    "ingredient_suggestions": [...],
    "confidence_level": "HIGH",
    "disclaimer": "本报告由 AI 辅助生成..."
  },
  "image_url": "https://r2.example.com/...?X-Amz-Signature=...",
  "analysis": {
    "result_id": 7,
    "prediction": "acne",
    "confidence": 0.85,
    "confidence_level": "HIGH",
    "top5_scores": [...]
  },
  "ingredient_suggestions": [...]
}
```

**字段说明：**

| 字段 | 类型 | 说明 |
|------|------|------|
| report | ReportResponse | 报告主体 |
| image_url | string / null | 图片预签名 URL（图片已删除时为 null） |
| analysis | AnalysisResponse | AI 分析结果 |
| ingredient_suggestions | array | 成分建议列表 |

**错误响应：**

| 状态码 | 场景 |
|--------|------|
| 403 | 这份报告不是你的（跨账号访问） |
| 404 | report_id 不存在 |

**前端注意：** `image_url` 可能为 `null`（医生已主动删除原图），此时需要显示占位图。

---

### 5.10 POST /report/{report_id}/feedback — 提交医生反馈

**认证：** ✅ 需要 JWT

**Path 参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| report_id | int | 报告 ID |

**Request Body (`application/json`)：**

```json
{
  "feedback_type": "effective",
  "notes": "建议的水杨酸方案患者使用两周后明显改善"
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| feedback_type | string | ✅ | 枚举值：`"effective"` / `"ineffective"` / `"side_effect"` |
| notes | string | ❌ | 补充说明（可选） |

**Response 200：**

```json
{
  "success": true,
  "message": "反馈已记录"
}
```

**错误响应：**

| 状态码 | 场景 |
|--------|------|
| 403 | 报告不属于当前医生 |
| 404 | report_id 不存在 |
| 422 | feedback_type 不是三个合法值之一 |

**前端建议：** 在报告查看页底部放三个按钮（有效 / 无效 / 有副作用），可选填备注文本框。提交后报告状态从 `pending_review` 变为 `reviewed`。

---

### 5.11 GET /history — 分页查询历史病例

**认证：** ✅ 需要 JWT

**Query 参数：**

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| page | int | ❌ | 1 | 页码，必须 ≥ 1 |
| page_size | int | ❌ | 10 | 每页条数，必须 ≥ 1 |

**Response 200：**

```json
{
  "total": 23,
  "page": 1,
  "cases": [
    {
      "report_id": 15,
      "prediction": "acne",
      "confidence_level": "HIGH",
      "created_at": "2026-04-15T10:30:00",
      "feedback_status": "effective"
    },
    {
      "report_id": 14,
      "prediction": "eczema",
      "confidence_level": "MEDIUM",
      "created_at": "2026-04-14T16:20:00",
      "feedback_status": null
    }
  ]
}
```

**字段说明：**

| 字段 | 类型 | 说明 |
|------|------|------|
| total | int | 该医生的报告总数 |
| page | int | 当前页码 |
| cases[].report_id | int | 报告 ID，点击可跳转到 GET /report/{report_id} |
| cases[].prediction | string | 病灶类型 |
| cases[].confidence_level | string | 置信度等级 |
| cases[].created_at | string (ISO 8601) | 创建时间 |
| cases[].feedback_status | string / null | 反馈状态，null 表示尚未反馈 |

**错误响应：**

| 状态码 | 场景 |
|--------|------|
| 422 | page 或 page_size 为 0 或负数 |

**前端注意：**
- 列表按 `created_at` 降序排列（最新在前）
- `feedback_status` 为 `null` 时可以显示"待反馈"标签，引导医生补充反馈
- 利用 `total` 和 `page_size` 计算总页数：`ceil(total / page_size)`

---

## 六、典型调用时序（完整链路）

下面是一个完整的业务场景，前端按此顺序依次调用：

```
┌─────────────────────────────────────────────────────────────┐
│  1. POST /auth/register        注册（只需一次）               │
│  2. POST /auth/login           登录，拿到 token               │
│  3. POST /upload/image         拍照/选图上传，拿到 image_id    │
│  4. POST /analysis/run         传 image_id，AI 分析           │
│  5. GET  /ingredient/{pred}    用 prediction 查成分建议       │
│  6. POST /report/generate      传 image_id + 问卷，生成报告   │
│  7. GET  /report/{report_id}   查看完整报告（含图、分析、成分） │
│  8. POST /report/{rid}/feedback  医生提交反馈                 │
│  9. GET  /history?page=1       查看历史病例列表               │
└─────────────────────────────────────────────────────────────┘
```

**注意：** 步骤 4 是步骤 6 的前置条件——图片必须先分析完成才能生成报告。步骤 5 可以在步骤 4 完成后与步骤 6 并行调用（成分建议页面可以独立展示）。

---

## 七、前端页面与接口映射建议

| 页面 | 涉及接口 | 说明 |
|------|----------|------|
| 注册页 | POST /auth/register | 表单：邮箱、密码、姓名、医院、执业证号 |
| 登录页 | POST /auth/login | 表单：邮箱、密码；成功后存 token |
| 首页/仪表盘 | GET /history | 显示最近病例列表 |
| 新建诊断 — 上传 | POST /upload/image | 拍照/选图，显示上传进度 |
| 新建诊断 — 分析中 | POST /analysis/run | loading 动画，等待分析完成 |
| 分析结果页 | (用 /analysis/run 的返回值) + GET /ingredient/{pred} | 展示 prediction、top5、置信度、成分建议 |
| 问卷填写页 | (前端收集，传给 /report/generate) | 收集皮肤类型、用药史等 |
| 报告生成中 | POST /report/generate | loading 动画，等待 LLM 生成 |
| 报告详情页 | GET /report/{report_id} + GET /upload/image/{id}/url | 展示完整报告、图片、分析、成分、免责声明 |
| 反馈提交 | POST /report/{report_id}/feedback | 三个按钮 + 备注输入框 |
| 历史病例列表 | GET /history | 分页列表，点击跳转报告详情 |

---

## 八、Base URL 与部署信息

| 环境 | Base URL | 说明 |
|------|----------|------|
| 本地开发 | `http://localhost:8000` | 后端本地运行（`uvicorn main:app`） |
| 演示环境 | 待定（Railway 部署后提供） | 黑客松现场演示用 |

后端启动后可以访问 `{BASE_URL}/docs` 查看 FastAPI 自动生成的 Swagger UI 文档，里面有所有接口的交互式测试界面，调试的时候可以直接用。

---

## 九、CORS 配置

后端已配置 CORS 中间件，允许跨域请求。如果 iOS 原生 App 直接调 API 则不涉及 CORS 问题。如果用 Web 端调试，确保后端 `main.py` 中的 `allow_origins` 包含你的开发服务器地址。

---

## 十、Q&A / 常见问题

**Q: `questionnaire_data` 的格式有强制要求吗？**
A: 没有。后端把它当 `dict` 存进 JSON 字段，原样传给 LLM 构建 prompt。你按建议字段设计问卷 UI 就好，字段名用英文 key，值可以是中文。

**Q: 图片上传用什么字段名？**
A: `file`。iOS 端用 `URLSession` 或 `Alamofire` 的 multipart upload，字段名设为 `file`。

**Q: 分析和报告生成大概要多久？**
A: 分析（HuggingFace ViT）通常 2-5 秒，报告生成（LLM）通常 5-15 秒。建议前端两个步骤都做 loading UI，不要设超短的超时时间。

**Q: token 过期了怎么办？**
A: 后端返回 401，前端检测到 401 后清掉本地存储的 token，跳转登录页。没有 refresh token 机制，直接重新登录。

**Q: 一张图可以多次分析/生成多份报告吗？**
A: 可以。一张图可以生成多份报告（比如不同问卷数据），每份报告有独立的 `report_id`。

---

*如有任何接口对接问题，找后端开发直接沟通。后端 Swagger 文档地址：`{BASE_URL}/docs`*
