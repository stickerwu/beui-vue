import type { MotionCopy } from './motion-copy.en'

/** Chinese copy of the Motion guide. Token names stay in code font as in the English page. */
export const motionCopyZh: MotionCopy = {
  header: {
    eyebrow: '动效指南',
    title: '让动效解释界面，而不是分散注意',
    intro: '一份实用指南：何时该让元素动起来，怎样选对 token，以及如何让动效保持快速、连贯、无障碍。',
  },
  sections: {
    decisionFramework: { eyebrow: '决策框架', title: '加动效前的四个问题', description: '最好的动画决定，往往在调时长或弹簧参数之前就已经做出。' },
    motionTokens: { eyebrow: '动效 token', title: '全站使用同一套语言', description: 'beui-vue 把刻意设计的动效收进共享 token。按用途选择，组件之间就会显得相关，又不会动得一模一样。' },
    timing: { eyebrow: '时长', title: '快到让人觉得即时', description: '时长取决于尺寸、距离和频率。下面的范围是起点，不是必须机械命中的目标。' },
    recipes: { eyebrow: '配方', title: '可以直接复制的模式', description: '每个配方都把一个用途对应到生产用的 token、减少动效时的状态，以及一个具体的反面例子。' },
    accessibility: { eyebrow: '无障碍', title: '减少动效也是一种设计状态', description: '不要删掉所有过渡。保留有助于理解的反馈，去掉可能引起不适的位移。' },
  },
  decisions: {
    frequency: { title: '看使用频率', body: '重复的操作应当几乎是即时的。把有表现力的动效留给用户偶尔才见到的时刻。', note: '一天 100 次的操作不要编排动画；少见的时刻可以多一点惊喜。' },
    purpose: { title: '说出用途', body: '动效应当解释空间、确认输入、显示状态或缓和变化。只是装饰还不够。', note: '如果说不出它为什么要动，就去掉这段位移。' },
    physics: { title: '选择物理特性', body: '入场用 ease-out，移动用 ease-in-out，进度用线性，手势用弹簧。', note: '曲线要匹配物体在做的事，而不是个人口味。' },
    fallback: { title: '设计降级状态', body: '减少动效时保留有用的透明度和颜色反馈，去掉位移、缩放和视差。', note: '无障碍是一种动效状态，不是事后补救。' },
  },
  timing: {
    interaction: '交互',
    range: '范围',
    desiredFeel: '想要的感觉',
    note: '界面动效默认低于 300ms。更长的动效属于讲解演示、刻意的手势和大范围的空间变化。',
    rows: {
      press: { use: '按压反馈', range: '100–160ms', feel: '即时、有实感' },
      tooltip: { use: '提示 / 浮层', range: '125–200ms', feel: '快速，能看出从哪里出来' },
      dropdown: { use: '下拉 / 选择器', range: '150–250ms', feel: '响应快，不用等' },
      modal: { use: '弹窗 / 抽屉', range: '200–500ms', feel: '有足够时间交代空间关系' },
      marketing: { use: '营销演示', range: '灵活', feel: '清楚比快更重要' },
    },
  },
  easing: {
    title: '对比曲线',
    subtitle: '同样的距离和时长，不同的用途。',
    easeOut: '入场和退场立即响应，然后安静地停下。',
    easeInOut: '已经在屏幕上的物体自然地加速、减速。',
    springPress: '用于按钮和其他可按压表面的快速、有重量感的反馈。',
    springLayout: '用于需要连续空间移动的共享表面和指示器。',
  },
  recipes: {
    purpose: '用途',
    avoid: '避免',
    viewRecipe: '查看代码',
    press: { title: '按压反馈', eyebrow: '反馈', description: '按压应当在操作完成之前就确认收到了输入。缩放幅度要小，响应要即时。', purpose: '确认界面听到了用户的操作。', avoid: '大幅缩放、缓慢回弹，或给每个子元素都加弹簧。' },
    icon: { title: '有含义的图标动效', eyebrow: '含义', description: '让图标模仿它真实的动作。铃铛从挂点摆动，下载箭头落向托盘。', purpose: '不加额外文字也能强化这个操作的作用。', avoid: '每个图标都用同一种通用弹跳，或在触屏的 hover 上加动效。' },
    reveal: { title: '内容浮现', eyebrow: '入场', description: '用短距离上移和克制的模糊让一个有意义的表面出现。动效要在它成为焦点之前结束。', purpose: '避免新内容像生硬的剪切一样突然出现。', avoid: '半秒长的界面入场，或给每个小元素都加长时间的错开。' },
    layout: { title: '布局连续', eyebrow: '移动', description: '在占位变化时让同一个表面始终可见。先移动形状，再引入文字。', purpose: '紧凑的控件展开时，保留它作为同一个物体的身份。', avoid: '直接对宽度做补间，或在表面腾出位置之前就显示文字。' },
    swap: { title: '内容切换', eyebrow: '状态变化', description: '小范围的视图变化里，让旧内容离开得比新内容进来更快。位移控制在几个像素。', purpose: '说明内容变了，而周围的上下文没动。', avoid: '在标签页、筛选器或经常切换的视图上使用整页式的大过渡。' },
  },
  accessibility: {
    title: '保留含义，去掉位移。',
    body: '保留透明度、颜色和即时的状态变化。去掉视差、大幅变换、重复缩放和弹簧过冲。',
  },
  demos: {
    replay: '重播',
    pressMe: '按我',
    hoverBell: '悬停铃铛',
    newSurface: '新表面',
    readyBeforeFocus: '在获得焦点前就绪。',
    expandPanel: '展开面板',
    collapsePanel: '收起面板',
    openPanel: '打开面板',
    exampleViews: '示例视图',
    preview: '预览',
    code: '代码',
    livePreview: '实时组件视图',
    copyReadySource: '可直接复制的源码',
  },
}
