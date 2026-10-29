import { describe, expect, it } from "vitest";
import {
  MAX_IMPORT_BYTES,
  normalizeResume,
  parseImportFile,
  parseResumeJSON,
} from "../storage";
import { RESUME_SCHEMA_VERSION } from "../schema";
import { createEmptyResume, DEFAULT_SECTION_ORDER } from "../types";

describe("normalizeResume", () => {
  it("非对象输入返回空白简历与默认主题", () => {
    for (const input of [null, undefined, "x", 42, []]) {
      const resume = normalizeResume(input);
      expect(resume.basic.name).toBe("");
      expect(resume.intent.jobType).toBe("全职");
      expect(resume.theme.accent).toBe("#1d4ed8");
      expect(resume.font).toBe("auto");
      expect(resume.skills).toEqual([]);
    }
  });

  it("字体搭配：保留合法值，旧数据与非法值回退 auto", () => {
    expect(normalizeResume({ basic: { name: "林一" } }).font).toBe("auto");
    expect(normalizeResume({ font: "serif" }).font).toBe("serif");
    expect(normalizeResume({ font: "editorial" }).font).toBe("editorial");
    expect(normalizeResume({ font: "comic-sans" }).font).toBe("auto");
    expect(normalizeResume({ font: 42 }).font).toBe("auto");
  });

  it("简历语言：保留合法值，旧数据回退中文，英文覆盖层只保留字符串", () => {
    const legacy = normalizeResume({ basic: { name: "林一" } });
    expect(legacy.language).toBe("zh");
    expect(legacy.translation.basic.name).toBe("");
    expect(normalizeResume({ language: "fr" }).language).toBe("zh");

    const english = normalizeResume({
      language: "en",
      translation: {
        basic: { name: "Lin Yi", headline: 42, summary: "Engineer" },
        experiences: {
          exp: { company: "Acme", role: null, description: "Built things" },
          broken: "not-an-object",
        },
        customSections: {
          custom: { title: "Certificates", items: { item: { title: "CET-6" } } },
        },
      },
    });
    expect(english.language).toBe("en");
    expect(english.translation.basic.name).toBe("Lin Yi");
    expect(english.translation.basic.headline).toBe("");
    expect(english.translation.basic.summary).toBe("Engineer");
    expect(english.translation.experiences.exp.company).toBe("Acme");
    expect(english.translation.experiences.exp.role).toBe("");
    expect(english.translation.experiences.broken).toBeUndefined();
    expect(english.translation.customSections.custom.title).toBe(
      "Certificates",
    );
    expect(english.translation.customSections.custom.items.item.title).toBe(
      "CET-6",
    );
  });

  it("收敛字段、丢弃非法条目并补齐 id", () => {
    const resume = normalizeResume({
      basic: {
        name: "林一",
        email: 123,
        photo: "data:image/jpeg;base64,AAAA",
        extra: "ignored",
      },
      intent: { targetRole: "前端工程师" },
      educations: [
        { id: "edu-1", school: "某大学", degree: "本科" },
        { school: 42 },
        "bad",
      ],
      experiences: [
        {
          company: "某公司",
          role: "前端",
          description: "做了很多事",
          pageBreakBefore: true,
        },
        { company: "另一家", pageBreakBefore: "yes" },
      ],
      projects: [{ name: "项目", link: "example.com" }],
      customSections: [
        {
          title: "证书",
          visible: false,
          items: [{ title: "CET-6", subtitle: 1 }, null],
        },
        null,
      ],
      skills: [" React ", "", 42, "TypeScript"],
      theme: { accent: "#BE123C" },
    });

    expect(resume.basic.name).toBe("林一");
    expect(resume.basic.email).toBe("");
    expect(resume.basic.photo).toBe("data:image/jpeg;base64,AAAA");
    expect(resume.intent.targetRole).toBe("前端工程师");
    expect(resume.intent.jobType).toBe("全职");

    expect(resume.educations).toHaveLength(2);
    expect(resume.educations[0]).toMatchObject({
      id: "edu-1",
      school: "某大学",
      degree: "本科",
    });
    expect(resume.educations[1].id).toBeTruthy();
    expect(resume.educations[1].school).toBe("");

    expect(resume.experiences).toHaveLength(2);
    expect(resume.experiences[0].id).toBeTruthy();
    expect(resume.experiences[0].pageBreakBefore).toBe(true);
    expect(resume.experiences[1].pageBreakBefore).toBeUndefined();

    expect(resume.projects).toHaveLength(1);
    expect(resume.projects[0].id).toBeTruthy();
    expect(resume.projects[0].link).toBe("example.com");

    expect(resume.customSections).toHaveLength(1);
    expect(resume.customSections[0]).toMatchObject({
      title: "证书",
      visible: false,
    });
    expect(resume.customSections[0].items).toHaveLength(1);
    expect(resume.customSections[0].items[0].subtitle).toBe("");

    expect(resume.skills).toEqual(["React", "TypeScript"]);
    expect(resume.theme.accent).toBe("#be123c");
  });

  it("旧数据没有版本号时补当前 schema 版本", () => {
    expect(normalizeResume({ basic: { name: "林一" } }).schemaVersion).toBe(
      RESUME_SCHEMA_VERSION,
    );
    expect(createEmptyResume().schemaVersion).toBe(RESUME_SCHEMA_VERSION);
  });

  it("旧数据没有技能分组字段时补空，且不改变扁平技能", () => {
    const resume = normalizeResume({
      basic: { name: "林一" },
      skills: ["React", "TypeScript"],
    });
    expect(resume.skills).toEqual(["React", "TypeScript"]);
    expect(resume.skillMeta).toEqual({});
    expect(resume.skillGroups).toEqual([]);
  });

  it("收敛技能分组与熟练度：去重、裁剪、丢弃无效值", () => {
    const resume = normalizeResume({
      basic: { name: "林一" },
      skills: ["React", "TypeScript", "Vue"],
      skillGroups: [" 前端 ", "前端", "", 42, "工程化"],
      skillMeta: {
        React: { level: "精通", group: " 前端 " },
        TypeScript: { level: "专家", group: "工程化" },
        Vue: { level: "了解", group: 123 },
        Removed: { level: "精通", group: "前端" },
        Bad: "oops",
      },
    });
    expect(resume.skillGroups).toEqual(["前端", "工程化"]);
    expect(resume.skillMeta).toEqual({
      React: { level: "精通", group: "前端" },
      TypeScript: { level: "", group: "工程化" },
      Vue: { level: "了解", group: "" },
    });
  });

  it("技能元数据里的新分组追加到 skillGroups 末尾", () => {
    const resume = normalizeResume({
      basic: { name: "林一" },
      skills: ["Docker"],
      skillGroups: ["前端"],
      skillMeta: { Docker: { level: "熟练", group: "运维" } },
    });
    expect(resume.skillGroups).toEqual(["前端", "运维"]);
  });

  it("拒绝非图片 Data URL 与超长照片", () => {
    const valid = createEmptyResume();
    valid.basic.photo = "data:image/jpeg;base64,AAAA";
    expect(normalizeResume(valid).basic.photo).toBe(valid.basic.photo);

    for (const photo of [
      "https://example.com/a.jpg",
      "data:text/html;base64,AAAA",
      `data:image/jpeg;base64,${"A".repeat(600_001)}`,
    ]) {
      expect(
        normalizeResume({ ...valid, basic: { ...valid.basic, photo } }).basic
          .photo,
      ).toBe("");
    }
  });

  it("缺失 visible 时默认显示，显式 false 才隐藏", () => {
    const resume = normalizeResume({
      customSections: [
        { title: "默认显示", items: [] },
        { title: "显式隐藏", visible: false, items: [] },
      ],
    });
    expect(resume.customSections.map((section) => section.visible)).toEqual([
      true,
      false,
    ]);
  });

  it("旧简历缺少 layout 时补齐默认顺序并显示全部板块", () => {
    const resume = normalizeResume({ basic: { name: "林一" } });
    expect(resume.layout.order).toEqual(DEFAULT_SECTION_ORDER);
    expect(resume.layout.hidden).toEqual([]);
  });

  it("收敛板块布局中的未知、重复与缺失项", () => {
    const resume = normalizeResume({
      basic: { name: "林一" },
      layout: {
        order: ["skills", "bogus", "skills"],
        hidden: ["projects", "nope", "projects"],
      },
    });
    expect(resume.layout.order[0]).toBe("skills");
    expect(new Set(resume.layout.order)).toEqual(
      new Set(DEFAULT_SECTION_ORDER),
    );
    expect(resume.layout.order).toHaveLength(DEFAULT_SECTION_ORDER.length);
    expect(resume.layout.hidden).toEqual(["projects"]);
  });
});

describe("parseResumeJSON", () => {
  it("接受最小合法结构与合法模板", () => {
    const result = parseResumeJSON(
      JSON.stringify({ basic: { name: "林一" }, template: "classic" }),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.resume.basic.name).toBe("林一");
    expect(result.template).toBe("classic");
  });

  it("忽略未知模板", () => {
    const result = parseResumeJSON(
      JSON.stringify({ basic: { name: "林一" }, template: "unknown" }),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.template).toBeUndefined();
  });

  it.each([
    ["无法解析", "{oops"],
    ["不是对象", "null"],
    ["是数组", "[]"],
    ["缺少 basic", "{}"],
    ["basic 不是对象", '{"basic":"x"}'],
    ["basic 缺少已知字段", '{"basic":{"unknown":1}}'],
    ["教育不是数组", '{"basic":{"name":"x"},"educations":{}}'],
    ["经历包含非对象", '{"basic":{"name":"x"},"experiences":[1]}'],
    ["技能不是数组", '{"basic":{"name":"x"},"skills":"React"}'],
    ["技能包含非文本", '{"basic":{"name":"x"},"skills":["React",1]}'],
    [
      "技能分组不是数组",
      '{"basic":{"name":"x"},"skillGroups":"前端"}',
    ],
    [
      "技能分组包含非文本",
      '{"basic":{"name":"x"},"skillGroups":["前端",1]}',
    ],
    [
      "技能熟练度不是对象",
      '{"basic":{"name":"x"},"skillMeta":[]}',
    ],
    [
      "技能熟练度条目无效",
      '{"basic":{"name":"x"},"skillMeta":{"React":"精通"}}',
    ],
    [
      "技能熟练度等级无效",
      '{"basic":{"name":"x"},"skillMeta":{"React":{"level":"专家"}}}',
    ],
    [
      "技能分组名称不是文本",
      '{"basic":{"name":"x"},"skillMeta":{"React":{"group":1}}}',
    ],
    ["主题不是对象", '{"basic":{"name":"x"},"theme":"red"}'],
    ["布局不是对象", '{"basic":{"name":"x"},"layout":[]}'],
    [
      "布局顺序不是数组",
      '{"basic":{"name":"x"},"layout":{"order":"skills"}}',
    ],
    [
      "布局包含未知板块",
      '{"basic":{"name":"x"},"layout":{"hidden":["bogus"]}}',
    ],
  ])("拒绝 %s", (_label, text) => {
    expect(parseResumeJSON(text).ok).toBe(false);
  });

  it("拒绝来自更新 schema 的简历文件", () => {
    const result = parseResumeJSON(
      JSON.stringify({
        schemaVersion: RESUME_SCHEMA_VERSION + 1,
        basic: { name: "未来数据" },
      }),
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain("数据版本");
  });

  it("拒绝超过 5MB 的文本", () => {
    const result = parseResumeJSON(" ".repeat(MAX_IMPORT_BYTES + 1));
    expect(result).toEqual({
      ok: false,
      error: "文件过大（超过 5 MB），请检查是否选错了文件",
    });
  });
});

describe("parseImportFile", () => {
  it("旧版单份 JSON 仍按单份导入", () => {
    const result = parseImportFile(
      JSON.stringify({ basic: { name: "林一" }, template: "classic" }),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.kind).toBe("single");
    if (result.kind !== "single") return;
    expect(result.resume.basic.name).toBe("林一");
    expect(result.template).toBe("classic");
  });

  it("解析单份导出文件并保留标题与模板", () => {
    const result = parseImportFile(
      JSON.stringify({
        format: "resume-workshop-single",
        version: 1,
        title: "前端主简历",
        template: "sidebar",
        resume: {
          basic: { name: "林一" },
          skills: [" React "],
        },
      }),
    );
    expect(result.ok).toBe(true);
    if (!result.ok || result.kind !== "single") return;
    expect(result.title).toBe("前端主简历");
    expect(result.template).toBe("sidebar");
    expect(result.resume.basic.name).toBe("林一");
    expect(result.resume.skills).toEqual(["React"]);
  });

  it("单份导出文件缺少简历时给出明确错误", () => {
    const result = parseImportFile(
      JSON.stringify({ format: "resume-workshop-single", version: 1 }),
    );
    expect(result.ok).toBe(false);
  });

  it("解析全部简历备份并恢复当前文档", () => {
    const result = parseImportFile(
      JSON.stringify({
        format: "resume-workshop",
        version: 2,
        activeId: "b",
        documents: [
          {
            id: "a",
            title: "主简历",
            template: "sidebar",
            resume: { basic: { name: "林一" }, skills: [" React "] },
          },
          {
            id: "b",
            title: "备用",
            template: "unknown",
            resume: { basic: { name: "林二" } },
          },
        ],
      }),
    );
    expect(result.ok).toBe(true);
    if (!result.ok || result.kind !== "library") return;
    expect(result.activeId).toBe("b");
    expect(result.documents).toHaveLength(2);
    expect(result.documents[0]).toMatchObject({
      id: "a",
      title: "主简历",
      template: "sidebar",
    });
    expect(result.documents[0].resume.skills).toEqual(["React"]);
    expect(result.documents[1].template).toBe("modern");
    expect(result.applications).toEqual([]);
  });

  it("解析整库备份中的投递记录并收敛脏数据", () => {
    const result = parseImportFile(
      JSON.stringify({
        format: "resume-workshop",
        version: 3,
        activeId: "a",
        documents: [
          {
            id: "a",
            title: "主简历",
            template: "modern",
            resume: { basic: { name: "林一" } },
          },
        ],
        applications: [
          {
            id: "job-1",
            company: " 某某科技 ",
            role: "前端工程师",
            status: "interview",
            jd: "熟悉 React",
            appliedAt: "2026-10-01",
            updatedAt: 2000,
          },
          { company: "", role: "", jd: "", note: "" },
        ],
      }),
    );
    expect(result.ok).toBe(true);
    if (!result.ok || result.kind !== "library") return;
    expect(result.applications).toHaveLength(1);
    expect(result.applications[0]).toMatchObject({
      id: "job-1",
      company: "某某科技",
      status: "interview",
      appliedAt: "2026-10-01",
    });
  });

  it("拒绝更新版本的整库备份与单份备份", () => {
    const newer = RESUME_SCHEMA_VERSION + 1;
    const archive = parseImportFile(
      JSON.stringify({
        format: "resume-workshop",
        version: 3,
        schemaVersion: newer,
        documents: [
          {
            id: "a",
            title: "未来备份",
            template: "modern",
            resume: { basic: { name: "林一" } },
          },
        ],
      }),
    );
    expect(archive.ok).toBe(false);

    const document = parseImportFile(
      JSON.stringify({
        format: "resume-workshop",
        version: 3,
        activeId: "a",
        documents: [
          {
            id: "a",
            title: "未来备份",
            template: "modern",
            resume: { schemaVersion: newer, basic: { name: "林一" } },
          },
        ],
      }),
    );
    expect(document.ok).toBe(false);

    const single = parseImportFile(
      JSON.stringify({
        format: "resume-workshop-single",
        version: 1,
        schemaVersion: newer,
        title: "未来简历",
        template: "modern",
        resume: { basic: { name: "林一" } },
      }),
    );
    expect(single.ok).toBe(false);

    const archiveFormat = parseImportFile(
      JSON.stringify({ format: "resume-workshop", version: 99, documents: [] }),
    );
    expect(archiveFormat.ok).toBe(false);
  });

  it("activeId 缺失时回退到第一份，重复 id 会重新生成", () => {
    const result = parseImportFile(
      JSON.stringify({
        documents: [
          { id: "same", title: "", resume: { basic: { name: "A" } } },
          { id: "same", title: "第二份", resume: { basic: { name: "B" } } },
        ],
      }),
    );
    expect(result.ok).toBe(true);
    if (!result.ok || result.kind !== "library") return;
    expect(result.activeId).toBe("same");
    expect(result.documents[0].title).toBe("简历 1");
    expect(result.documents[0].id).not.toBe(result.documents[1].id);
  });

  it.each([
    ["没有简历", JSON.stringify({ documents: [] })],
    ["条目不是对象", JSON.stringify({ documents: [1] })],
    [
      "条目缺少简历结构",
      JSON.stringify({ documents: [{ title: "坏文件" }] }),
    ],
  ])("拒绝 %s 的备份", (_label, text) => {
    expect(parseImportFile(text).ok).toBe(false);
  });
});
