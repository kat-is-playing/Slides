# SlideTemplate — 使用說明

## 基本資訊

- **Canvas 尺寸**：1920 × 1080 px（16:9 講座投影片）
- **Preview 縮放**：50%，在瀏覽器顯示為 960 × 540
- **設計系統**：載入 `../../tokens.css`（品牌 token）+ `./slide.css`（排版與元件）

---

## 檔案結構

```
100_Todo/projects/slides/
├── template/            本資料夾
│   ├── template.html    所有 layout 範例（含 light/dark 雙版本）
│   ├── slide.css        所有樣式
│   └── CLAUDE.md        本說明文件
├── topic-a/             投影片專案範例
│   ├── slides.html
│   └── assets/
└── topic-b/
    └── slides.html
```

製作新投影片時，在 `100_Todo/projects/slides/` 下建立新子資料夾，HTML 引入：
```html
<link rel="stylesheet" href="../../tokens.css" />
<link rel="stylesheet" href="../template/slide.css" />
```

---

## Layout 一覽

| # | Layout | 淺色 | 深色 | 圖片樣式 |
|---|--------|------|------|---------|
| 1 | Cover | — | ✓ | — |
| 2 | Section Divider | ✓ | ✓ | — |
| 3 | Agenda | ✓ | ✓ | — |
| 4 | Cards（3欄） | ✓ | ✓ | — |
| 5 | Pie Chart | ✓ | ✓ | — |
| 6 | Image + Text | ✓ | ✓ | plain / browser |
| 7 | Image Only | ✓ | ✓ | plain / browser |
| 8 | List | ✓ | ✓ | — |
| 9 | Quote | ✓ | ✓ | — |
| 10 | Compare | ✓ | ✓ | — |
| 11 | Process | ✓ | ✓ | — |

---

## Slide 基本結構

```html
<div class="slide-wrap">
  <div class="slide slide--light on-light">   <!-- 或 slide--dark on-dark -->
    <div class="inner">
      <!-- Page Header（Cover / Section Divider 除外） -->
      <div class="page-header">
        <span class="t-page-label">01</span>
        <h2 class="t-page-title on-light">投影片標題</h2>
      </div>
      <!-- Layout 內容 -->
    </div>
  </div>
</div>
```

`.slide--light` → 背景 `gold-100`  
`.slide--dark` → 背景 `gold-900`

---

## 顏色規則（on-light / on-dark）

文字顏色由修飾符決定，加在**每個文字元素**上：

| 類別 | on-light | on-dark |
|------|----------|---------|
| `t-page-title` | gray-900 | gold-100 |
| `t-body` | gray-500 | gold-200 |
| `t-quote` | gold-700 | gold-300 |
| `t-page-label` | — | — （固定 gold-500）|
| `t-card-tag` | — | — （固定 gold-500）|

結構性顏色（卡片邊框、分隔線、連接線）由**容器上的 on-light / on-dark** 自動套用。

---

## 圖片 Wrapper 用法

### 純圖片（img-wrap--plain）
```html
<div class="img-wrap img-wrap--plain">
  <!-- 放 <img> 或預留 placeholder -->
  <div class="img-placeholder">
    <span class="t-caption on-light">圖片放這裡</span>
  </div>
</div>
```

### 瀏覽器外框（img-wrap--browser）
```html
<div class="img-wrap img-wrap--browser">
  <div class="browser-chrome">
    <div class="browser-dots">
      <div class="browser-dot browser-dot--r"></div>
      <div class="browser-dot browser-dot--y"></div>
      <div class="browser-dot browser-dot--g"></div>
    </div>
    <div class="browser-bar"></div>
  </div>
  <div class="browser-body">
    <!-- 放 <img> 或 placeholder -->
  </div>
</div>
```

---

## Pie Chart 用法

用 CSS custom properties 設定各段落的累積百分比：

```html
<!-- --p1、--p2 為累積值（例：45% → 72% → 100%） -->
<div class="pie-chart" style="--p1: 45%; --p2: 72%; --p3: 100%;"></div>
```

色票：
- **on-light**：段 1 = gold-500，段 2 = gold-300，段 3 = gold-700
- **on-dark**：段 1 = gold-400，段 2 = gold-600，段 3 = gold-200

---

## 字型對應

| 類別 | 字型 |
|------|------|
| 大標（Cover / Section）| Noto Serif TC 700 |
| 頁面標題（t-page-title）| Noto Serif TC 700 |
| 引言（t-quote）| Noto Serif TC 500 |
| 內文（t-body）| Noto Sans TC 400 |
| 標籤（t-card-tag / t-page-label）| Noto Sans TC 500 uppercase |
| 裝飾數字（t-num / t-section-num）| Instrument Serif 400 |
| Handle（t-handle）| Instrument Serif 400 |
