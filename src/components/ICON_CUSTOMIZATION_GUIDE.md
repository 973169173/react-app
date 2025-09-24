# 图标自定义指南

## 如何替换卡片折叠状态下的属性图标

### 当前使用的图标
在 `OperatorPanel.js` 文件中，折叠状态下的四个属性使用了以下 Ant Design 图标：

- **Type**: `ApiOutlined` - API 接口图标
- **Model**: `RobotOutlined` - 机器人图标
- **Token**: `ThunderboltOutlined` - 闪电图标
- **Time**: `ClockCircleOutlined` - 时钟图标

### 方法1：使用其他 Ant Design 图标

1. 在文件顶部导入新的图标：
```javascript
import { 
  // 现有图标...
  YourNewIconOutlined,
  AnotherIconOutlined
} from '@ant-design/icons';
```

2. 替换折叠视图中的图标：
```javascript
<div className="field-icon-label">
  <YourNewIconOutlined className="field-icon" />
  <Text className="field-label">Type</Text>
</div>
```

### 方法2：使用自定义 SVG 图标

1. 创建自定义图标组件：
```javascript
import Icon from '@ant-design/icons';

const CustomTypeSvg = () => (
  <svg viewBox="0 0 1024 1024" width="1em" height="1em" fill="currentColor">
    {/* 您的 SVG 路径 */}
    <path d="M..." />
  </svg>
);

const CustomTypeIcon = (props) => <Icon component={CustomTypeSvg} {...props} />;
```

2. 在折叠视图中使用：
```javascript
<div className="field-icon-label">
  <CustomTypeIcon className="field-icon" />
  <Text className="field-label">Type</Text>
</div>
```

### 方法3：使用图片文件

1. 将图标图片放在 `public/icons/` 目录下
2. 使用 img 标签替换图标：
```javascript
<div className="field-icon-label">
  <img 
    src="/icons/type-icon.svg" 
    alt="Type" 
    className="field-icon field-icon-img"
  />
  <Text className="field-label">Type</Text>
</div>
```

3. 在 CSS 中添加图片图标样式：
```css
.field-icon-img {
  width: 14px;
  height: 14px;
  object-fit: contain;
}
```

### 推荐的图标选择

- **Type (算子类型)**: 
  - `SettingOutlined` (设置)
  - `FunctionOutlined` (函数)
  - `CodeOutlined` (代码)
  - `ApiOutlined` (API，当前使用)

- **Model (模型)**:
  - `RobotOutlined` (机器人，当前使用)
  - `BrainOutlined` (大脑)
  - `ProcessorOutlined` (处理器)
  - `CloudServerOutlined` (云服务器)

- **Token (令牌数量)**:
  - `ThunderboltOutlined` (闪电，当前使用)
  - `FireOutlined` (火焰)
  - `DashboardOutlined` (仪表盘)
  - `BarChartOutlined` (柱状图)

- **Time (执行时间)**:
  - `ClockCircleOutlined` (时钟，当前使用)
  - `HistoryOutlined` (历史)
  - `TimerOutlined` (计时器)
  - `FieldTimeOutlined` (时间字段)

### 样式自定义

您可以在 CSS 中自定义图标的样式：

```css
/* 调整图标大小 */
.operator-grid.collapsed .field-icon {
  font-size: 16px; /* 默认是 14px */
}

/* 更改图标颜色 */
.operator-grid.collapsed .field-icon {
  color: #52c41a; /* 绿色 */
}

/* 添加图标动画 */
.operator-grid.collapsed .field-icon {
  transition: transform 0.3s ease;
}

.operator-grid.collapsed .grid-item:hover .field-icon {
  transform: rotate(15deg) scale(1.2);
}
```

### 完整的自定义示例

假设您想为 Type 属性使用自定义的齿轮图标：

1. 在 `OperatorPanel.js` 中：
```javascript
// 导入图标
import { SettingOutlined } from '@ant-design/icons';

// 在折叠视图中替换
<div className="field-icon-label">
  <SettingOutlined className="field-icon" />
  <Text className="field-label">Type</Text>
</div>
```

2. 在 `OperatorPanel.css` 中添加特定样式：
```css
.field-icon.type-icon {
  color: #fa8c16;
  animation: rotate 2s linear infinite;
}

@keyframes rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
```

这样就完成了图标的自定义！