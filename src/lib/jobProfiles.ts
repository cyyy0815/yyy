export type JobProfile = {
  id: string;
  title: string;
  aliases: string[];
  /** 岗位核心技能，缺一项都是明显短板 */
  core: string[];
  /** 加分技能 */
  bonus: string[];
  /** 在各招聘站搜索时推荐使用的关键词 */
  searchKeywords: string[];
};

export const JOB_PROFILES: JobProfile[] = [
  {
    id: "frontend",
    title: "前端工程师",
    aliases: ["前端", "web前端", "h5", "前端开发", "frontend", "react", "vue"],
    core: ["JavaScript", "TypeScript", "React", "Vue", "HTML", "CSS", "工程化", "浏览器"],
    bonus: [
      "Next.js",
      "Node.js",
      "Webpack",
      "Vite",
      "性能优化",
      "小程序",
      "ECharts",
      "Tailwind CSS",
      "可视化",
    ],
    searchKeywords: ["前端开发工程师", "Web前端", "React开发", "Vue开发", "H5开发"],
  },
  {
    id: "backend-java",
    title: "Java 后端工程师",
    aliases: ["java", "后端", "服务端", "后端开发", "backend"],
    core: ["Java", "Spring", "Spring Boot", "MySQL", "Redis", "微服务", "MyBatis"],
    bonus: ["Kafka", "RocketMQ", "Docker", "Kubernetes", "分布式", "高并发", "Linux"],
    searchKeywords: ["Java开发工程师", "Java后端", "后端开发", "服务端开发"],
  },
  {
    id: "backend-python",
    title: "Python 工程师",
    aliases: ["python", "django", "flask", "fastapi", "爬虫"],
    core: ["Python", "Django", "Flask", "FastAPI", "MySQL", "Redis", "Linux"],
    bonus: ["微服务", "Docker", "Celery", "爬虫", "数据分析", "异步"],
    searchKeywords: ["Python开发工程师", "Python后端", "后端开发", "爬虫工程师"],
  },
  {
    id: "fullstack",
    title: "全栈工程师",
    aliases: ["全栈", "fullstack", "full-stack"],
    core: ["JavaScript", "TypeScript", "React", "Node.js", "MySQL", "Redis"],
    bonus: ["Next.js", "Docker", "微服务", "工程化", "云服务", "Vue"],
    searchKeywords: ["全栈工程师", "全栈开发", "Web全栈", "Node.js开发"],
  },
  {
    id: "product",
    title: "产品经理",
    aliases: ["产品经理", "产品", "pm", "产品设计", "产品运营"],
    core: ["需求分析", "产品设计", "原型", "PRD", "用户研究", "数据分析", "项目管理"],
    bonus: ["Axure", "Figma", "SQL", "增长", "A/B测试", "商业化", "B端", "C端"],
    searchKeywords: ["产品经理", "B端产品经理", "C端产品经理", "高级产品经理"],
  },
  {
    id: "design",
    title: "UI/UX 设计师",
    aliases: ["ui", "ux", "设计师", "交互设计", "视觉设计", "用户体验"],
    core: ["Figma", "Sketch", "交互设计", "视觉设计", "用户研究", "设计规范", "原型"],
    bonus: ["动效", "插画", "前端", "Design System", "可用性测试", "3D"],
    searchKeywords: ["UI设计师", "UX设计师", "交互设计师", "视觉设计师"],
  },
  {
    id: "data",
    title: "数据分析师",
    aliases: ["数据分析", "数据", "商业分析", "bi", "数据运营"],
    core: ["SQL", "Excel", "Python", "数据分析", "数据可视化", "指标体系", "BI"],
    bonus: ["Tableau", "Power BI", "统计学", "A/B测试", "机器学习", "Hive"],
    searchKeywords: ["数据分析师", "商业分析师", "BI分析师", "数据运营"],
  },
  {
    id: "qa",
    title: "测试工程师",
    aliases: ["测试", "qa", "测开", "质量"],
    core: ["测试用例", "Python", "Java", "Selenium", "接口测试", "自动化测试", "SQL"],
    bonus: ["性能测试", "JMeter", "CI/CD", "Docker", "安全测试", "Appium"],
    searchKeywords: ["测试工程师", "自动化测试", "测试开发", "QA工程师"],
  },
  {
    id: "algorithm",
    title: "算法工程师",
    aliases: ["算法", "机器学习", "深度学习", "nlp", "cv", "人工智能", "ai"],
    core: ["Python", "机器学习", "深度学习", "PyTorch", "TensorFlow", "数学", "统计"],
    bonus: ["NLP", "计算机视觉", "推荐系统", "大模型", "LLM", "论文", "Kaggle"],
    searchKeywords: ["算法工程师", "机器学习工程师", "NLP算法", "推荐算法"],
  },
  {
    id: "operations",
    title: "运营",
    aliases: ["运营", "用户运营", "内容运营", "活动运营", "新媒体"],
    core: ["内容运营", "用户运营", "活动策划", "数据分析", "社群", "增长"],
    bonus: ["短视频", "直播", "私域", "SEO", "投放", "文案"],
    searchKeywords: ["运营专员", "用户运营", "内容运营", "活动运营", "新媒体运营"],
  },
  {
    id: "mobile",
    title: "移动端工程师",
    aliases: ["android", "ios", "移动端", "客户端", "app开发"],
    core: ["Android", "iOS", "Swift", "Kotlin", "Java", "性能优化", "网络"],
    bonus: ["Flutter", "React Native", "跨端", "组件化", "音视频"],
    searchKeywords: ["Android开发", "iOS开发", "移动端开发", "客户端开发"],
  },
  {
    id: "devops",
    title: "运维 / DevOps",
    aliases: ["运维", "devops", "sre", "云计算", "云原生"],
    core: ["Linux", "Docker", "Kubernetes", "Shell", "CI/CD", "监控", "网络"],
    bonus: ["AWS", "阿里云", "Terraform", "自动化", "数据库", "安全"],
    searchKeywords: ["运维工程师", "DevOps工程师", "SRE", "云原生工程师"],
  },
];
