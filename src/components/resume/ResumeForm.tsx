"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { analyzeResume } from "@/lib/matching";
import { fileToPhoto } from "@/lib/photo";
import {
  newId,
  type BasicInfo,
  type Education,
  type Experience,
  type JobIntent,
  type Project,
  type Resume,
} from "@/lib/types";
import { AiWriter } from "@/components/resume/AiWriter";
import { CustomSectionsEditor } from "@/components/resume/CustomSectionsEditor";
import {
  deleteTargetLabel,
  type DeleteTarget,
} from "@/components/resume/deleteTarget";
import { Button } from "@/components/ui/Button";
import { Field, Select, TextArea, TextInput } from "@/components/ui/Field";
import { SectionCard } from "@/components/ui/SectionCard";

type Props = {
  resume: Resume;
  onChange: Dispatch<SetStateAction<Resume>>;
};

type SectionProps = Props & {
  onDelete: (target: DeleteTarget) => void;
};

function moveById<T extends { id: string }>(
  list: T[],
  id: string,
  direction: -1 | 1,
): T[] {
  const index = list.findIndex((item) => item.id === id);
  const next = index + direction;
  if (index < 0 || next < 0 || next >= list.length) return list;
  const copy = [...list];
  [copy[index], copy[next]] = [copy[next], copy[index]];
  return copy;
}

function reorderById<T extends { id: string }>(
  list: T[],
  fromId: string,
  toId: string,
): T[] {
  const from = list.findIndex((item) => item.id === fromId);
  const to = list.findIndex((item) => item.id === toId);
  if (from < 0 || to < 0 || from === to) return list;
  const copy = [...list];
  const [moved] = copy.splice(from, 1);
  copy.splice(to, 0, moved);
  return copy;
}

function DragHandle({
  onStart,
  onEnd,
}: {
  onStart: () => void;
  onEnd: () => void;
}) {
  return (
    <span
      draggable
      onDragStart={() => onStart()}
      onDragEnd={onEnd}
      title="拖动排序"
      aria-hidden="true"
      className="cursor-grab select-none text-[14px] leading-none text-zinc-300 transition hover:text-zinc-500 active:cursor-grabbing"
    >
      ⠿
    </span>
  );
}

function ItemActions({
  index,
  length,
  onMove,
  onRemove,
  breakBefore,
  onToggleBreak,
}: {
  index: number;
  length: number;
  onMove: (direction: -1 | 1) => void;
  onRemove: () => void;
  breakBefore?: boolean;
  onToggleBreak?: () => void;
}) {
  return (
    <div className="flex items-center gap-0.5">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onMove(-1)}
        disabled={index === 0}
        aria-label="上移"
        title="上移"
        className="px-2"
      >
        ↑
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onMove(1)}
        disabled={index === length - 1}
        aria-label="下移"
        title="下移"
        className="px-2"
      >
        ↓
      </Button>
      {onToggleBreak ? (
        <Button
          variant={breakBefore ? "active" : "ghost"}
          size="sm"
          onClick={onToggleBreak}
          aria-pressed={Boolean(breakBefore)}
          aria-label={breakBefore ? "取消分页" : "从新的一页开始"}
          title={breakBefore ? "取消分页" : "从新的一页开始"}
          className="px-2"
        >
          分页
        </Button>
      ) : null}
      <Button
        variant="danger"
        size="sm"
        onClick={onRemove}
        aria-label="删除"
        title="删除"
        className="px-2"
      >
        删除
      </Button>
    </div>
  );
}

function EmptyBlock({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50/60 px-4 py-6 text-center text-[12px] text-zinc-400">
      {text}
    </div>
  );
}

function ExperienceSection({
  resume,
  onChange,
  onDelete,
}: SectionProps) {
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const update = (id: string, patch: Partial<Experience>) => {
    onChange((prev) => ({
      ...prev,
      experiences: prev.experiences.map((item) =>
        item.id === id ? { ...item, ...patch } : item,
      ),
    }));
  };

  return (
    <SectionCard
      title="工作经历"
      description="从最近的一段写起，每行一条成果，尽量带数字"
    >
      <div className="space-y-3">
        {resume.experiences.length === 0 ? (
          <EmptyBlock text="还没有工作经历，点击下方按钮添加" />
        ) : null}

        {resume.experiences.map((item, index) => (
          <div
            key={item.id}
            onDragOver={(event) => {
              if (draggingId) event.preventDefault();
            }}
            onDrop={(event) => {
              event.preventDefault();
              if (draggingId) {
                onChange((prev) => ({
                  ...prev,
                  experiences: reorderById(prev.experiences, draggingId, item.id),
                }));
              }
              setDraggingId(null);
            }}
            className={`rounded-xl border bg-zinc-50/40 p-4 transition ${
              draggingId === item.id
                ? "border-blue-300 opacity-50 ring-1 ring-blue-200"
                : "border-zinc-200/80"
            }`}
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <DragHandle
                  onStart={() => setDraggingId(item.id)}
                  onEnd={() => setDraggingId(null)}
                />
                <span className="text-[11px] font-medium tracking-wide text-zinc-400">
                  经历 {String(index + 1).padStart(2, "0")}
                </span>
              </span>
              <ItemActions
                index={index}
                length={resume.experiences.length}
                breakBefore={index > 0 ? item.pageBreakBefore : undefined}
                onToggleBreak={
                  index > 0
                    ? () =>
                        update(item.id, {
                          pageBreakBefore: !item.pageBreakBefore,
                        })
                    : undefined
                }
                onMove={(direction) =>
                  onChange((prev) => ({
                    ...prev,
                    experiences: moveById(prev.experiences, item.id, direction),
                  }))
                }
                onRemove={() =>
                  onDelete({ kind: "experience", item, index })
                }
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="公司">
                <TextInput
                  value={item.company}
                  onChange={(event) => update(item.id, { company: event.target.value })}
                  placeholder="公司名称"
                />
              </Field>
              <Field label="职位">
                <TextInput
                  value={item.role}
                  onChange={(event) => update(item.id, { role: event.target.value })}
                  placeholder="如 高级前端工程师"
                />
              </Field>
              <Field label="开始时间">
                <TextInput
                  value={item.start}
                  onChange={(event) => update(item.id, { start: event.target.value })}
                  placeholder="2023.03"
                />
              </Field>
              <Field label="结束时间">
                <TextInput
                  value={item.end}
                  onChange={(event) => update(item.id, { end: event.target.value })}
                  placeholder="至今"
                />
              </Field>
              <Field
                label="工作内容"
                hint="每行一条"
                className="sm:col-span-2"
              >
                <TextArea
                  value={item.description}
                  onChange={(event) =>
                    update(item.id, { description: event.target.value })
                  }
                  placeholder={"主导 ……，性能提升 40%\n负责 ……，覆盖 10 条业务线"}
                  className="min-h-[104px]"
                />
              </Field>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3">
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            onChange((prev) => ({
              ...prev,
              experiences: [
                ...prev.experiences,
                {
                  id: newId(),
                  company: "",
                  role: "",
                  start: "",
                  end: "",
                  description: "",
                },
              ],
            }))
          }
        >
          + 添加工作经历
        </Button>
      </div>
    </SectionCard>
  );
}

function ProjectSection({ resume, onChange, onDelete }: SectionProps) {
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const update = (id: string, patch: Partial<Project>) => {
    onChange((prev) => ({
      ...prev,
      projects: prev.projects.map((item) =>
        item.id === id ? { ...item, ...patch } : item,
      ),
    }));
  };

  return (
    <SectionCard title="项目经历" description="挑与目标岗位最相关的 2~3 个项目">
      <div className="space-y-3">
        {resume.projects.length === 0 ? (
          <EmptyBlock text="还没有项目经历" />
        ) : null}

        {resume.projects.map((item, index) => (
          <div
            key={item.id}
            onDragOver={(event) => {
              if (draggingId) event.preventDefault();
            }}
            onDrop={(event) => {
              event.preventDefault();
              if (draggingId) {
                onChange((prev) => ({
                  ...prev,
                  projects: reorderById(prev.projects, draggingId, item.id),
                }));
              }
              setDraggingId(null);
            }}
            className={`rounded-xl border bg-zinc-50/40 p-4 transition ${
              draggingId === item.id
                ? "border-blue-300 opacity-50 ring-1 ring-blue-200"
                : "border-zinc-200/80"
            }`}
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <DragHandle
                  onStart={() => setDraggingId(item.id)}
                  onEnd={() => setDraggingId(null)}
                />
                <span className="text-[11px] font-medium tracking-wide text-zinc-400">
                  项目 {String(index + 1).padStart(2, "0")}
                </span>
              </span>
              <ItemActions
                index={index}
                length={resume.projects.length}
                breakBefore={index > 0 ? item.pageBreakBefore : undefined}
                onToggleBreak={
                  index > 0
                    ? () =>
                        update(item.id, {
                          pageBreakBefore: !item.pageBreakBefore,
                        })
                    : undefined
                }
                onMove={(direction) =>
                  onChange((prev) => ({
                    ...prev,
                    projects: moveById(prev.projects, item.id, direction),
                  }))
                }
                onRemove={() => onDelete({ kind: "project", item, index })}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="项目名称">
                <TextInput
                  value={item.name}
                  onChange={(event) => update(item.id, { name: event.target.value })}
                  placeholder="项目名称"
                />
              </Field>
              <Field label="担任角色">
                <TextInput
                  value={item.role}
                  onChange={(event) => update(item.id, { role: event.target.value })}
                  placeholder="如 技术负责人"
                />
              </Field>
              <Field label="项目链接" hint="选填" className="sm:col-span-2">
                <TextInput
                  value={item.link}
                  onChange={(event) => update(item.id, { link: event.target.value })}
                  placeholder="github.com/you/project"
                />
              </Field>
              <Field label="项目描述" className="sm:col-span-2">
                <TextArea
                  value={item.description}
                  onChange={(event) =>
                    update(item.id, { description: event.target.value })
                  }
                  placeholder="项目解决了什么问题、你做了什么、结果如何"
                />
              </Field>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3">
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            onChange((prev) => ({
              ...prev,
              projects: [
                ...prev.projects,
                { id: newId(), name: "", role: "", description: "", link: "" },
              ],
            }))
          }
        >
          + 添加项目经历
        </Button>
      </div>
    </SectionCard>
  );
}

function EducationSection({ resume, onChange, onDelete }: SectionProps) {
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const update = (id: string, patch: Partial<Education>) => {
    onChange((prev) => ({
      ...prev,
      educations: prev.educations.map((item) =>
        item.id === id ? { ...item, ...patch } : item,
      ),
    }));
  };

  return (
    <SectionCard title="教育经历">
      <div className="space-y-3">
        {resume.educations.length === 0 ? (
          <EmptyBlock text="还没有教育经历" />
        ) : null}

        {resume.educations.map((item, index) => (
          <div
            key={item.id}
            onDragOver={(event) => {
              if (draggingId) event.preventDefault();
            }}
            onDrop={(event) => {
              event.preventDefault();
              if (draggingId) {
                onChange((prev) => ({
                  ...prev,
                  educations: reorderById(prev.educations, draggingId, item.id),
                }));
              }
              setDraggingId(null);
            }}
            className={`rounded-xl border bg-zinc-50/40 p-4 transition ${
              draggingId === item.id
                ? "border-blue-300 opacity-50 ring-1 ring-blue-200"
                : "border-zinc-200/80"
            }`}
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <DragHandle
                  onStart={() => setDraggingId(item.id)}
                  onEnd={() => setDraggingId(null)}
                />
                <span className="text-[11px] font-medium tracking-wide text-zinc-400">
                  教育 {String(index + 1).padStart(2, "0")}
                </span>
              </span>
              <ItemActions
                index={index}
                length={resume.educations.length}
                onMove={(direction) =>
                  onChange((prev) => ({
                    ...prev,
                    educations: moveById(prev.educations, item.id, direction),
                  }))
                }
                onRemove={() =>
                  onDelete({ kind: "education", item, index })
                }
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="学校">
                <TextInput
                  value={item.school}
                  onChange={(event) => update(item.id, { school: event.target.value })}
                  placeholder="学校名称"
                />
              </Field>
              <Field label="专业">
                <TextInput
                  value={item.major}
                  onChange={(event) => update(item.id, { major: event.target.value })}
                  placeholder="专业"
                />
              </Field>
              <Field label="学历">
                <Select
                  value={item.degree}
                  onChange={(event) => update(item.id, { degree: event.target.value })}
                >
                  <option value="">请选择</option>
                  <option value="大专">大专</option>
                  <option value="本科">本科</option>
                  <option value="硕士">硕士</option>
                  <option value="博士">博士</option>
                  <option value="其他">其他</option>
                </Select>
              </Field>
              <div className="grid grid-cols-2 gap-2">
                <Field label="入学">
                  <TextInput
                    value={item.start}
                    onChange={(event) => update(item.id, { start: event.target.value })}
                    placeholder="2017.09"
                  />
                </Field>
                <Field label="毕业">
                  <TextInput
                    value={item.end}
                    onChange={(event) => update(item.id, { end: event.target.value })}
                    placeholder="2021.06"
                  />
                </Field>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3">
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            onChange((prev) => ({
              ...prev,
              educations: [
                ...prev.educations,
                {
                  id: newId(),
                  school: "",
                  major: "",
                  degree: "",
                  start: "",
                  end: "",
                },
              ],
            }))
          }
        >
          + 添加教育经历
        </Button>
      </div>
    </SectionCard>
  );
}

function SkillsSection({ resume, onChange }: Props) {
  const [draft, setDraft] = useState("");
  const analysis = analyzeResume(resume);

  const suggestions = analysis.profile
    ? [...analysis.missingCore, ...analysis.profile.bonus]
        .filter(
          (skill) =>
            !resume.skills.some(
              (existing) => existing.toLowerCase() === skill.toLowerCase(),
            ),
        )
        .slice(0, 8)
    : [];

  const addSkill = (value: string) => {
    const skill = value.trim();
    if (!skill) return;
    if (resume.skills.some((item) => item.toLowerCase() === skill.toLowerCase())) {
      setDraft("");
      return;
    }
    onChange((prev) => ({ ...prev, skills: [...prev.skills, skill] }));
    setDraft("");
  };

  return (
    <SectionCard
      title="技能标签"
      description="写具体的技术、工具或方法，推荐匹配会用到它们"
    >
      <div className="flex flex-wrap gap-1.5">
        {resume.skills.map((skill) => (
          <span
            key={skill}
            className="inline-flex items-center gap-1 rounded-full border border-zinc-200 bg-white py-1 pl-2.5 pr-1.5 text-[12px] text-zinc-700"
          >
            {skill}
            <button
              type="button"
              onClick={() =>
                onChange((prev) => ({
                  ...prev,
                  skills: prev.skills.filter((item) => item !== skill),
                }))
              }
              className="flex h-4 w-4 items-center justify-center rounded-full text-zinc-400 transition hover:bg-red-50 hover:text-red-600"
              aria-label={`删除技能 ${skill}`}
            >
              ×
            </button>
          </span>
        ))}
        {resume.skills.length === 0 ? (
          <span className="text-[12px] text-zinc-400">还没有技能标签</span>
        ) : null}
      </div>

      <div className="mt-3 flex gap-2">
        <TextInput
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === ",") {
              event.preventDefault();
              addSkill(draft);
            }
          }}
          placeholder="输入技能后按回车，如 React"
        />
        <Button variant="outline" onClick={() => addSkill(draft)}>
          添加
        </Button>
      </div>

      {suggestions.length > 0 ? (
        <div className="mt-4 border-t border-dashed border-zinc-200 pt-3">
          <p className="mb-2 text-[11px] text-zinc-400">
            目标岗位常要求、你还没填的技能（点击添加）
          </p>
          <div className="flex flex-wrap gap-1.5">
            {suggestions.map((skill) => (
              <button
                key={skill}
                type="button"
                onClick={() => addSkill(skill)}
                className="rounded-full border border-dashed border-blue-200 bg-blue-50/50 px-2.5 py-1 text-[12px] text-blue-700 transition hover:border-blue-300 hover:bg-blue-50"
              >
                + {skill}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </SectionCard>
  );
}

const UNDO_WINDOW_MS = 8000;

export function ResumeForm({ resume, onChange }: Props) {
  const [deleted, setDeleted] = useState<DeleteTarget | null>(null);
  const undoTimer = useRef<number | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoError, setPhotoError] = useState("");

  const clearUndo = useCallback(() => {
    if (undoTimer.current !== null) {
      window.clearTimeout(undoTimer.current);
      undoTimer.current = null;
    }
    setDeleted(null);
  }, []);

  useEffect(() => {
    return () => {
      if (undoTimer.current !== null) window.clearTimeout(undoTimer.current);
    };
  }, []);

  const handleDelete = useCallback(
    (target: DeleteTarget) => {
      onChange((prev) => {
        switch (target.kind) {
          case "experience":
            return {
              ...prev,
              experiences: prev.experiences.filter(
                (item) => item.id !== target.item.id,
              ),
            };
          case "project":
            return {
              ...prev,
              projects: prev.projects.filter(
                (item) => item.id !== target.item.id,
              ),
            };
          case "education":
            return {
              ...prev,
              educations: prev.educations.filter(
                (item) => item.id !== target.item.id,
              ),
            };
          case "customSection":
            return {
              ...prev,
              customSections: prev.customSections.filter(
                (section) => section.id !== target.section.id,
              ),
            };
          case "customItem":
            return {
              ...prev,
              customSections: prev.customSections.map((section) =>
                section.id === target.sectionId
                  ? {
                      ...section,
                      items: section.items.filter(
                        (item) => item.id !== target.item.id,
                      ),
                    }
                  : section,
              ),
            };
        }
      });
      setDeleted(target);
      if (undoTimer.current !== null) window.clearTimeout(undoTimer.current);
      undoTimer.current = window.setTimeout(() => {
        undoTimer.current = null;
        setDeleted(null);
      }, UNDO_WINDOW_MS);
    },
    [onChange],
  );

  const handleUndoDelete = useCallback(() => {
    if (!deleted) return;
    onChange((prev) => {
      switch (deleted.kind) {
        case "experience": {
          if (prev.experiences.some((item) => item.id === deleted.item.id)) {
            return prev;
          }
          const list = [...prev.experiences];
          list.splice(Math.min(deleted.index, list.length), 0, deleted.item);
          return { ...prev, experiences: list };
        }
        case "project": {
          if (prev.projects.some((item) => item.id === deleted.item.id)) {
            return prev;
          }
          const list = [...prev.projects];
          list.splice(Math.min(deleted.index, list.length), 0, deleted.item);
          return { ...prev, projects: list };
        }
        case "education": {
          if (prev.educations.some((item) => item.id === deleted.item.id)) {
            return prev;
          }
          const list = [...prev.educations];
          list.splice(Math.min(deleted.index, list.length), 0, deleted.item);
          return { ...prev, educations: list };
        }
        case "customSection": {
          if (
            prev.customSections.some(
              (section) => section.id === deleted.section.id,
            )
          ) {
            return prev;
          }
          const list = [...prev.customSections];
          list.splice(
            Math.min(deleted.index, list.length),
            0,
            deleted.section,
          );
          return { ...prev, customSections: list };
        }
        case "customItem": {
          return {
            ...prev,
            customSections: prev.customSections.map((section) => {
              if (section.id !== deleted.sectionId) return section;
              if (
                section.items.some((item) => item.id === deleted.item.id)
              ) {
                return section;
              }
              const list = [...section.items];
              list.splice(
                Math.min(deleted.index, list.length),
                0,
                deleted.item,
              );
              return { ...section, items: list };
            }),
          };
        }
      }
    });
    clearUndo();
  }, [deleted, onChange, clearUndo]);

  const deletedLabel = deleteTargetLabel(deleted);

  const updateBasic = (patch: Partial<BasicInfo>) =>
    onChange((prev) => ({ ...prev, basic: { ...prev.basic, ...patch } }));

  const handlePhoto = async (file: File) => {
    setPhotoError("");
    setPhotoBusy(true);
    try {
      updateBasic({ photo: await fileToPhoto(file) });
    } catch (error) {
      setPhotoError(
        error instanceof Error ? error.message : "图片处理失败，请换一张试试",
      );
    } finally {
      setPhotoBusy(false);
    }
  };

  const updateIntent = (patch: Partial<JobIntent>) =>
    onChange((prev) => ({ ...prev, intent: { ...prev.intent, ...patch } }));

  return (
    <div className="space-y-4">
      <AiWriter resume={resume} onChange={onChange} />

      <SectionCard title="基本信息" description="让 HR 第一眼知道你是谁">
        <div className="mb-4 flex items-center gap-4 rounded-xl border border-zinc-100 bg-zinc-50/70 p-3">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-zinc-200 bg-white text-[10px] tracking-wide text-zinc-300">
            {resume.basic.photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={resume.basic.photo}
                alt="证件照预览"
                className="h-full w-full object-cover"
              />
            ) : (
              "照片"
            )}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={photoBusy}
                onClick={() => photoInputRef.current?.click()}
              >
                {photoBusy
                  ? "处理中…"
                  : resume.basic.photo
                    ? "更换照片"
                    : "上传照片"}
              </Button>
              {resume.basic.photo ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setPhotoError("");
                    updateBasic({ photo: "" });
                  }}
                >
                  移除
                </Button>
              ) : null}
            </div>
            <p className="mt-1 text-[11px] leading-5 text-zinc-400">
              选填。自动居中裁成正方形并压缩，只保存在本机。
            </p>
            {photoError ? (
              <p role="alert" className="mt-1 text-[11px] text-red-600">
                {photoError}
              </p>
            ) : null}
          </div>
          <input
            ref={photoInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            aria-label="选择证件照文件"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) void handlePhoto(file);
            }}
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="姓名">
            <TextInput
              value={resume.basic.name}
              onChange={(event) => updateBasic({ name: event.target.value })}
              placeholder="你的名字"
            />
          </Field>
          <Field label="求职头衔">
            <TextInput
              value={resume.basic.headline}
              onChange={(event) => updateBasic({ headline: event.target.value })}
              placeholder="如 前端工程师"
            />
          </Field>
          <Field label="手机">
            <TextInput
              value={resume.basic.phone}
              onChange={(event) => updateBasic({ phone: event.target.value })}
              placeholder="138-0000-0000"
            />
          </Field>
          <Field label="邮箱">
            <TextInput
              type="email"
              value={resume.basic.email}
              onChange={(event) => updateBasic({ email: event.target.value })}
              placeholder="you@example.com"
            />
          </Field>
          <Field label="所在城市">
            <TextInput
              value={resume.basic.city}
              onChange={(event) => updateBasic({ city: event.target.value })}
              placeholder="如 上海"
            />
          </Field>
          <Field label="个人网站" hint="选填">
            <TextInput
              value={resume.basic.website}
              onChange={(event) => updateBasic({ website: event.target.value })}
              placeholder="your.site"
            />
          </Field>
          <Field label="GitHub" hint="选填" className="sm:col-span-2">
            <TextInput
              value={resume.basic.github}
              onChange={(event) => updateBasic({ github: event.target.value })}
              placeholder="github.com/yourname"
            />
          </Field>
          <Field
            label="个人简介"
            hint="建议 3~4 行"
            className="sm:col-span-2"
          >
            <TextArea
              value={resume.basic.summary}
              onChange={(event) => updateBasic({ summary: event.target.value })}
              placeholder="年限 + 技术栈 + 代表性成果，例如：4 年前端经验，主导过……"
            />
          </Field>
        </div>
      </SectionCard>

      <SectionCard
        title="求职意向"
        description="决定推荐哪些岗位、在哪些城市搜索"
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="期望岗位">
            <TextInput
              value={resume.intent.targetRole}
              onChange={(event) => updateIntent({ targetRole: event.target.value })}
              placeholder="如 前端工程师"
            />
          </Field>
          <Field label="期望城市">
            <TextInput
              value={resume.intent.targetCity}
              onChange={(event) => updateIntent({ targetCity: event.target.value })}
              placeholder="如 上海"
            />
          </Field>
          <Field label="期望月薪（最低）" hint="单位：K">
            <TextInput
              type="number"
              min={0}
              value={resume.intent.salaryMin}
              onChange={(event) => updateIntent({ salaryMin: event.target.value })}
              placeholder="20"
            />
          </Field>
          <Field label="期望月薪（最高）" hint="单位：K">
            <TextInput
              type="number"
              min={0}
              value={resume.intent.salaryMax}
              onChange={(event) => updateIntent({ salaryMax: event.target.value })}
              placeholder="30"
            />
          </Field>
          <Field label="工作类型">
            <Select
              value={resume.intent.jobType}
              onChange={(event) => updateIntent({ jobType: event.target.value })}
            >
              <option value="全职">全职</option>
              <option value="实习">实习</option>
              <option value="兼职">兼职</option>
              <option value="合同">合同</option>
            </Select>
          </Field>
          <Field label="工作经验">
            <Select
              value={resume.intent.experience}
              onChange={(event) => updateIntent({ experience: event.target.value })}
            >
              <option value="">请选择</option>
              <option value="应届生">应届生</option>
              <option value="1年以内">1 年以内</option>
              <option value="1-3年">1~3 年</option>
              <option value="3-5年">3~5 年</option>
              <option value="5-10年">5~10 年</option>
              <option value="10年以上">10 年以上</option>
            </Select>
          </Field>
        </div>
      </SectionCard>

      <ExperienceSection
        resume={resume}
        onChange={onChange}
        onDelete={handleDelete}
      />
      <ProjectSection
        resume={resume}
        onChange={onChange}
        onDelete={handleDelete}
      />
      <EducationSection
        resume={resume}
        onChange={onChange}
        onDelete={handleDelete}
      />
      <CustomSectionsEditor
        sections={resume.customSections}
        onChange={onChange}
        onDelete={handleDelete}
      />
      <SkillsSection resume={resume} onChange={onChange} />

      {deleted ? (
        <div
          role="status"
          className="print-hide fixed bottom-20 left-1/2 z-[60] flex -translate-x-1/2 items-center gap-3 whitespace-nowrap rounded-full bg-zinc-900 px-4 py-2 text-[12px] text-white shadow-lg"
        >
          <span>已删除{deletedLabel}</span>
          <button
            type="button"
            onClick={handleUndoDelete}
            className="rounded-full px-2 py-0.5 font-medium text-amber-300 transition hover:bg-white/10 hover:text-amber-200"
          >
            撤销
          </button>
        </div>
      ) : null}
    </div>
  );
}
