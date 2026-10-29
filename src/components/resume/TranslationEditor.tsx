"use client";

import type { Dispatch, SetStateAction } from "react";
import { Field, TextArea, TextInput } from "@/components/ui/Field";
import { SectionCard } from "@/components/ui/SectionCard";
import type { Resume } from "@/lib/types";

type Props = {
  resume: Resume;
  onChange: Dispatch<SetStateAction<Resume>>;
};

/**
 * 英文内容覆盖层编辑器：只在英文 / 双语模式下出现。
 * 英文留空时预览与 ATS 自动回退中文，不要求逐条翻译。
 */
export function TranslationEditor({ resume, onChange }: Props) {
  if (resume.language === "zh") return null;
  const translation = resume.translation;

  const updateBasic = (patch: Partial<Resume["translation"]["basic"]>) =>
    onChange((prev) => ({
      ...prev,
      translation: {
        ...prev.translation,
        basic: { ...prev.translation.basic, ...patch },
      },
    }));

  const updateIntent = (patch: Partial<Resume["translation"]["intent"]>) =>
    onChange((prev) => ({
      ...prev,
      translation: {
        ...prev.translation,
        intent: { ...prev.translation.intent, ...patch },
      },
    }));

  const updateExperience = (
    id: string,
    patch: Partial<Resume["translation"]["experiences"][string]>,
  ) =>
    onChange((prev) => {
      const current = prev.translation.experiences[id] ?? {
        company: "",
        role: "",
        description: "",
      };
      return {
        ...prev,
        translation: {
          ...prev.translation,
          experiences: {
            ...prev.translation.experiences,
            [id]: { ...current, ...patch },
          },
        },
      };
    });

  const updateProject = (
    id: string,
    patch: Partial<Resume["translation"]["projects"][string]>,
  ) =>
    onChange((prev) => {
      const current = prev.translation.projects[id] ?? {
        name: "",
        role: "",
        description: "",
      };
      return {
        ...prev,
        translation: {
          ...prev.translation,
          projects: {
            ...prev.translation.projects,
            [id]: { ...current, ...patch },
          },
        },
      };
    });

  const updateEducation = (
    id: string,
    patch: Partial<Resume["translation"]["educations"][string]>,
  ) =>
    onChange((prev) => {
      const current = prev.translation.educations[id] ?? {
        school: "",
        major: "",
        degree: "",
        courses: "",
        honors: "",
      };
      return {
        ...prev,
        translation: {
          ...prev.translation,
          educations: {
            ...prev.translation.educations,
            [id]: { ...current, ...patch },
          },
        },
      };
    });

  const updateCustomSection = (
    id: string,
    patch: Partial<Resume["translation"]["customSections"][string]>,
  ) =>
    onChange((prev) => {
      const current = prev.translation.customSections[id] ?? {
        title: "",
        items: {},
      };
      return {
        ...prev,
        translation: {
          ...prev.translation,
          customSections: {
            ...prev.translation.customSections,
            [id]: { ...current, ...patch },
          },
        },
      };
    });

  const updateCustomItem = (
    sectionId: string,
    itemId: string,
    patch: Partial<
      Resume["translation"]["customSections"][string]["items"][string]
    >,
  ) =>
    onChange((prev) => {
      const section = prev.translation.customSections[sectionId] ?? {
        title: "",
        items: {},
      };
      const item = section.items[itemId] ?? {
        title: "",
        subtitle: "",
        description: "",
      };
      return {
        ...prev,
        translation: {
          ...prev.translation,
          customSections: {
            ...prev.translation.customSections,
            [sectionId]: {
              ...section,
              items: { ...section.items, [itemId]: { ...item, ...patch } },
            },
          },
        },
      };
    });

  const updateSkill = (name: string, value: string) =>
    onChange((prev) => ({
      ...prev,
      translation: {
        ...prev.translation,
        skills: { ...prev.translation.skills, [name]: value },
      },
    }));

  const updateSkillGroup = (name: string, value: string) =>
    onChange((prev) => ({
      ...prev,
      translation: {
        ...prev.translation,
        skillGroups: { ...prev.translation.skillGroups, [name]: value },
      },
    }));

  return (
    <SectionCard
      title="英文内容（选填）"
      description="用于英文 / 双语简历；留空时自动回退中文原文。"
    >
      <div className="space-y-5">
        <div>
          <h3 className="mb-2 text-[12px] font-semibold text-zinc-700">
            基本信息
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="姓名">
              <TextInput
                data-qa="translation-name"
                value={translation.basic.name}
                onChange={(event) => updateBasic({ name: event.target.value })}
                placeholder="Lin Yi"
              />
            </Field>
            <Field label="头衔">
              <TextInput
                data-qa="translation-headline"
                value={translation.basic.headline}
                onChange={(event) =>
                  updateBasic({ headline: event.target.value })
                }
                placeholder="Frontend Engineer"
              />
            </Field>
            <Field label="城市（联系方式）">
              <TextInput
                data-qa="translation-city"
                value={translation.basic.city}
                onChange={(event) => updateBasic({ city: event.target.value })}
                placeholder="Shanghai"
              />
            </Field>
          </div>
          <Field label="个人简介" className="mt-3">
            <TextArea
              data-qa="translation-summary"
              value={translation.basic.summary}
              onChange={(event) => updateBasic({ summary: event.target.value })}
              placeholder="Frontend engineer with 4 years of experience…"
            />
          </Field>
        </div>

        <div>
          <h3 className="mb-2 text-[12px] font-semibold text-zinc-700">
            求职意向
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="目标岗位">
              <TextInput
                data-qa="translation-intent-role"
                value={translation.intent.targetRole}
                onChange={(event) =>
                  updateIntent({ targetRole: event.target.value })
                }
                placeholder="Frontend Engineer"
              />
            </Field>
            <Field label="期望城市">
              <TextInput
                data-qa="translation-intent-city"
                value={translation.intent.targetCity}
                onChange={(event) =>
                  updateIntent({ targetCity: event.target.value })
                }
                placeholder="Shanghai"
              />
            </Field>
            <Field label="工作类型">
              <TextInput
                data-qa="translation-intent-job-type"
                value={translation.intent.jobType}
                onChange={(event) =>
                  updateIntent({ jobType: event.target.value })
                }
                placeholder="Full-time"
              />
            </Field>
            <Field label="工作年限">
              <TextInput
                data-qa="translation-intent-experience"
                value={translation.intent.experience}
                onChange={(event) =>
                  updateIntent({ experience: event.target.value })
                }
                placeholder="3–5 years"
              />
            </Field>
          </div>
        </div>

        {resume.experiences.length > 0 ? (
          <div>
            <h3 className="mb-2 text-[12px] font-semibold text-zinc-700">
              工作经历
            </h3>
            <div className="space-y-4">
              {resume.experiences.map((item, index) => {
                const value = translation.experiences[item.id] ?? {
                  company: "",
                  role: "",
                  description: "",
                };
                return (
                  <div
                    key={item.id}
                    className="rounded-xl border border-zinc-100 bg-zinc-50/60 p-3"
                  >
                    <p className="mb-2 truncate text-[11px] text-zinc-400">
                      #{index + 1} {item.company || item.role || "未命名经历"}
                    </p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field label="公司">
                        <TextInput
                          data-qa="translation-exp-company"
                          value={value.company}
                          onChange={(event) =>
                            updateExperience(item.id, {
                              company: event.target.value,
                            })
                          }
                          placeholder="Company"
                        />
                      </Field>
                      <Field label="职位">
                        <TextInput
                          data-qa="translation-exp-role"
                          value={value.role}
                          onChange={(event) =>
                            updateExperience(item.id, {
                              role: event.target.value,
                            })
                          }
                          placeholder="Role"
                        />
                      </Field>
                    </div>
                    <Field label="工作描述" className="mt-3">
                      <TextArea
                        data-qa="translation-exp-description"
                        value={value.description}
                        onChange={(event) =>
                          updateExperience(item.id, {
                            description: event.target.value,
                          })
                        }
                        placeholder="One achievement per line…"
                      />
                    </Field>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}

        {resume.projects.length > 0 ? (
          <div>
            <h3 className="mb-2 text-[12px] font-semibold text-zinc-700">
              项目经历
            </h3>
            <div className="space-y-4">
              {resume.projects.map((item, index) => {
                const value = translation.projects[item.id] ?? {
                  name: "",
                  role: "",
                  description: "",
                };
                return (
                  <div
                    key={item.id}
                    className="rounded-xl border border-zinc-100 bg-zinc-50/60 p-3"
                  >
                    <p className="mb-2 truncate text-[11px] text-zinc-400">
                      #{index + 1} {item.name || item.role || "未命名项目"}
                    </p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field label="项目名称">
                        <TextInput
                          data-qa="translation-project-name"
                          value={value.name}
                          onChange={(event) =>
                            updateProject(item.id, {
                              name: event.target.value,
                            })
                          }
                          placeholder="Project"
                        />
                      </Field>
                      <Field label="角色">
                        <TextInput
                          data-qa="translation-project-role"
                          value={value.role}
                          onChange={(event) =>
                            updateProject(item.id, {
                              role: event.target.value,
                            })
                          }
                          placeholder="Role"
                        />
                      </Field>
                    </div>
                    <Field label="项目描述" className="mt-3">
                      <TextArea
                        data-qa="translation-project-description"
                        value={value.description}
                        onChange={(event) =>
                          updateProject(item.id, {
                            description: event.target.value,
                          })
                        }
                        placeholder="One achievement per line…"
                      />
                    </Field>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}

        {resume.educations.length > 0 ? (
          <div>
            <h3 className="mb-2 text-[12px] font-semibold text-zinc-700">
              教育经历
            </h3>
            <div className="space-y-4">
              {resume.educations.map((item, index) => {
                const value = translation.educations[item.id] ?? {
                  school: "",
                  major: "",
                  degree: "",
                  courses: "",
                  honors: "",
                };
                return (
                  <div
                    key={item.id}
                    className="rounded-xl border border-zinc-100 bg-zinc-50/60 p-3"
                  >
                    <p className="mb-2 truncate text-[11px] text-zinc-400">
                      #{index + 1} {item.school || "未命名学校"}
                    </p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field label="学校">
                        <TextInput
                          data-qa="translation-edu-school"
                          value={value.school}
                          onChange={(event) =>
                            updateEducation(item.id, {
                              school: event.target.value,
                            })
                          }
                          placeholder="University"
                        />
                      </Field>
                      <Field label="专业">
                        <TextInput
                          data-qa="translation-edu-major"
                          value={value.major}
                          onChange={(event) =>
                            updateEducation(item.id, {
                              major: event.target.value,
                            })
                          }
                          placeholder="Computer Science"
                        />
                      </Field>
                      <Field label="学历">
                        <TextInput
                          data-qa="translation-edu-degree"
                          value={value.degree}
                          onChange={(event) =>
                            updateEducation(item.id, {
                              degree: event.target.value,
                            })
                          }
                          placeholder="Bachelor"
                        />
                      </Field>
                      <Field label="排名">
                        <TextInput
                          data-qa="translation-edu-ranking"
                          value={value.ranking}
                          onChange={(event) =>
                            updateEducation(item.id, {
                              ranking: event.target.value,
                            })
                          }
                          placeholder="Top 10%"
                        />
                      </Field>
                    </div>
                    <Field label="主修课程" className="mt-3">
                      <TextArea
                        data-qa="translation-edu-courses"
                        value={value.courses}
                        onChange={(event) =>
                          updateEducation(item.id, {
                            courses: event.target.value,
                          })
                        }
                        className="min-h-[64px]"
                        placeholder="Data Structures, Operating Systems…"
                      />
                    </Field>
                    <Field label="荣誉" className="mt-3">
                      <TextArea
                        data-qa="translation-edu-honors"
                        value={value.honors}
                        onChange={(event) =>
                          updateEducation(item.id, {
                            honors: event.target.value,
                          })
                        }
                        className="min-h-[64px]"
                        placeholder="Scholarships, awards…"
                      />
                    </Field>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}

        {resume.skills.length > 0 || resume.skillGroups.length > 0 ? (
          <div>
            <h3 className="mb-2 text-[12px] font-semibold text-zinc-700">
              技能
            </h3>
            <p className="mb-2 text-[11px] text-zinc-400">
              技能名与分组名只影响展示；匹配和 AI 仍使用中文技能名。
            </p>
            {resume.skillGroups.length > 0 ? (
              <div className="mb-3 grid gap-3 sm:grid-cols-2">
                {resume.skillGroups.map((group) => (
                  <Field key={group} label={`分组：${group}`}>
                    <TextInput
                      data-qa="translation-skill-group"
                      value={translation.skillGroups[group] ?? ""}
                      onChange={(event) =>
                        updateSkillGroup(group, event.target.value)
                      }
                      placeholder="Frontend"
                    />
                  </Field>
                ))}
              </div>
            ) : null}
            <div className="grid gap-3 sm:grid-cols-2">
              {resume.skills.map((skill) => (
                <Field key={skill} label={skill}>
                  <TextInput
                    data-qa="translation-skill"
                    value={translation.skills[skill] ?? ""}
                    onChange={(event) =>
                      updateSkill(skill, event.target.value)
                    }
                    placeholder={skill}
                  />
                </Field>
              ))}
            </div>
          </div>
        ) : null}

        {resume.customSections.length > 0 ? (
          <div>
            <h3 className="mb-2 text-[12px] font-semibold text-zinc-700">
              自定义板块
            </h3>
            <div className="space-y-4">
              {resume.customSections.map((section) => {
                const value = translation.customSections[section.id] ?? {
                  title: "",
                  items: {},
                };
                return (
                  <div
                    key={section.id}
                    className="rounded-xl border border-zinc-100 bg-zinc-50/60 p-3"
                  >
                    <Field label="板块标题">
                      <TextInput
                        data-qa="translation-custom-title"
                        value={value.title}
                        onChange={(event) =>
                          updateCustomSection(section.id, {
                            title: event.target.value,
                          })
                        }
                        placeholder={section.title || "Certificates"}
                      />
                    </Field>
                    <div className="mt-3 space-y-3">
                      {section.items.map((item) => {
                        const itemValue = value.items[item.id] ?? {
                          title: "",
                          subtitle: "",
                          description: "",
                        };
                        return (
                          <div
                            key={item.id}
                            className="rounded-lg border border-zinc-100 bg-white p-3"
                          >
                            <div className="grid gap-3 sm:grid-cols-2">
                              <Field label="条目标题">
                                <TextInput
                                  data-qa="translation-custom-item-title"
                                  value={itemValue.title}
                                  onChange={(event) =>
                                    updateCustomItem(section.id, item.id, {
                                      title: event.target.value,
                                    })
                                  }
                                  placeholder={item.title || "Award"}
                                />
                              </Field>
                              <Field label="补充信息">
                                <TextInput
                                  data-qa="translation-custom-item-subtitle"
                                  value={itemValue.subtitle}
                                  onChange={(event) =>
                                    updateCustomItem(section.id, item.id, {
                                      subtitle: event.target.value,
                                    })
                                  }
                                  placeholder={item.subtitle || "Issuer"}
                                />
                              </Field>
                            </div>
                            <Field label="描述" className="mt-3">
                              <TextArea
                                data-qa="translation-custom-item-description"
                                value={itemValue.description}
                                onChange={(event) =>
                                  updateCustomItem(section.id, item.id, {
                                    description: event.target.value,
                                  })
                                }
                                className="min-h-[64px]"
                              />
                            </Field>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}

        <p className="text-[11px] leading-5 text-zinc-400">
          提示：语言切换在右侧预览工具栏。双语的板块标题会并列显示，正文按中文 /
          英文顺序排列。
        </p>
      </div>
    </SectionCard>
  );
}
