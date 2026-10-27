"use client";

import { useState, type Dispatch, type SetStateAction } from "react";
import {
  newId,
  type CustomItem,
  type CustomSection,
  type Resume,
} from "@/lib/types";
import { validateUrl } from "@/lib/validate";
import { Button } from "@/components/ui/Button";
import { Field, TextArea, TextInput } from "@/components/ui/Field";
import { SectionCard } from "@/components/ui/SectionCard";
import type { DeleteTarget } from "./deleteTarget";

const PRESETS = ["证书", "获奖", "语言", "校园经历", "作品集"] as const;

function emptyItem(): CustomItem {
  return {
    id: newId(),
    title: "",
    subtitle: "",
    date: "",
    description: "",
    link: "",
  };
}

function move<T extends { id: string }>(
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

type Props = {
  sections: CustomSection[];
  onChange: Dispatch<SetStateAction<Resume>>;
  onDelete: (target: DeleteTarget) => void;
};

export function CustomSectionsEditor({ sections, onChange, onDelete }: Props) {
  const [touchedLinks, setTouchedLinks] = useState<Record<string, boolean>>({});
  const touchLink = (id: string) =>
    setTouchedLinks((prev) => (prev[id] ? prev : { ...prev, [id]: true }));

  const addSection = (rawTitle: string) => {
    const title = rawTitle.trim();
    if (!title) return;
    onChange((prev) => ({
      ...prev,
      customSections: [
        ...prev.customSections,
        { id: newId(), title, visible: true, items: [emptyItem()] },
      ],
    }));
  };

  const patchSection = (
    sectionId: string,
    patch: Partial<Pick<CustomSection, "title" | "visible">>,
  ) =>
    onChange((prev) => ({
      ...prev,
      customSections: prev.customSections.map((section) =>
        section.id === sectionId ? { ...section, ...patch } : section,
      ),
    }));

  const moveSection = (sectionId: string, direction: -1 | 1) =>
    onChange((prev) => ({
      ...prev,
      customSections: move(prev.customSections, sectionId, direction),
    }));

  const addItem = (sectionId: string) =>
    onChange((prev) => ({
      ...prev,
      customSections: prev.customSections.map((section) =>
        section.id === sectionId
          ? { ...section, items: [...section.items, emptyItem()] }
          : section,
      ),
    }));

  const patchItem = (
    sectionId: string,
    itemId: string,
    patch: Partial<CustomItem>,
  ) =>
    onChange((prev) => ({
      ...prev,
      customSections: prev.customSections.map((section) =>
        section.id === sectionId
          ? {
              ...section,
              items: section.items.map((item) =>
                item.id === itemId ? { ...item, ...patch } : item,
              ),
            }
          : section,
      ),
    }));

  const moveItem = (sectionId: string, itemId: string, direction: -1 | 1) =>
    onChange((prev) => ({
      ...prev,
      customSections: prev.customSections.map((section) =>
        section.id === sectionId
          ? { ...section, items: move(section.items, itemId, direction) }
          : section,
      ),
    }));

  return (
    <SectionCard
      title="自定义板块"
      description="证书、获奖、语言、校园经历、作品集等；可隐藏或调整顺序"
    >
      <div className="mb-3 flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-[11px] text-zinc-400">快速添加</span>
        {PRESETS.map((title) => {
          const exists = sections.some(
            (section) => section.title.trim() === title,
          );
          return (
            <Button
              key={title}
              variant="outline"
              size="sm"
              disabled={exists}
              title={exists ? "已添加" : undefined}
              onClick={() => addSection(title)}
            >
              {exists ? `${title} ✓` : `+ ${title}`}
            </Button>
          );
        })}
        <Button variant="ghost" size="sm" onClick={() => addSection("自定义板块")}>
          + 空白板块
        </Button>
      </div>

      {sections.length === 0 ? (
        <p className="rounded-xl border border-dashed border-zinc-200 px-4 py-5 text-center text-[12px] text-zinc-400">
          还没有自定义板块。证书、语言或作品集可以放在这里。
        </p>
      ) : (
        <div className="space-y-3">
          {sections.map((section, sectionIndex) => {
            const name = section.title.trim() || "未命名板块";
            return (
              <div
                key={section.id}
                data-custom-section="true"
                className={`overflow-hidden rounded-xl border border-zinc-200 ${
                  section.visible ? "" : "bg-zinc-50/60"
                }`}
              >
                <div className="flex flex-wrap items-center gap-1 border-b border-zinc-200 bg-zinc-50/70 px-2 py-2">
                  <TextInput
                    aria-label={`板块名称 ${sectionIndex + 1}`}
                    value={section.title}
                    maxLength={30}
                    placeholder="板块名称"
                    onChange={(event) =>
                      patchSection(section.id, { title: event.target.value })
                    }
                    className="h-8 min-w-[120px] flex-1 border-transparent bg-transparent px-1.5 text-[13px] font-semibold shadow-none focus:border-zinc-300 focus:ring-0"
                  />
                  <span className="px-1 text-[10.5px] text-zinc-400">
                    {section.items.length} 条
                  </span>
                  <Button
                    variant={section.visible ? "ghost" : "outline"}
                    size="sm"
                    aria-pressed={section.visible}
                    aria-label={`${section.visible ? "隐藏" : "显示"}板块 ${name}`}
                    title={section.visible ? "点击隐藏" : "点击显示"}
                    onClick={() =>
                      patchSection(section.id, {
                        visible: !section.visible,
                      })
                    }
                  >
                    {section.visible ? "显示中" : "已隐藏"}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="px-2"
                    disabled={sectionIndex === 0}
                    aria-label={`上移板块 ${name}`}
                    title="上移板块"
                    onClick={() => moveSection(section.id, -1)}
                  >
                    ↑
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="px-2"
                    disabled={sectionIndex === sections.length - 1}
                    aria-label={`下移板块 ${name}`}
                    title="下移板块"
                    onClick={() => moveSection(section.id, 1)}
                  >
                    ↓
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    aria-label={`删除板块 ${name}`}
                    onClick={() =>
                      onDelete({
                        kind: "customSection",
                        section,
                        index: sectionIndex,
                      })
                    }
                  >
                    删除
                  </Button>
                </div>

                <div className="space-y-3 p-3">
                  {section.items.length === 0 ? (
                    <p className="text-center text-[11.5px] text-zinc-400">
                      还没有条目，点下方按钮添加。
                    </p>
                  ) : null}

                  {section.items.map((item, itemIndex) => (
                    <div
                      key={item.id}
                      data-custom-item="true"
                      className="rounded-lg border border-zinc-200/80 bg-white p-3"
                    >
                      <div className="mb-2 flex items-center gap-1">
                        <span className="text-[11px] font-medium text-zinc-400">
                          条目 {itemIndex + 1}
                        </span>
                        <div className="ml-auto flex items-center gap-0.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="px-2"
                            disabled={itemIndex === 0}
                            aria-label="上移条目"
                            title="上移条目"
                            onClick={() =>
                              moveItem(section.id, item.id, -1)
                            }
                          >
                            ↑
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="px-2"
                            disabled={itemIndex === section.items.length - 1}
                            aria-label="下移条目"
                            title="下移条目"
                            onClick={() => moveItem(section.id, item.id, 1)}
                          >
                            ↓
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            aria-label="删除自定义条目"
                            onClick={() =>
                              onDelete({
                                kind: "customItem",
                                sectionId: section.id,
                                item,
                                index: itemIndex,
                              })
                            }
                          >
                            删除
                          </Button>
                        </div>
                      </div>

                      <div className="grid gap-2.5 sm:grid-cols-2">
                        <Field label="名称">
                          <TextInput
                            value={item.title}
                            maxLength={80}
                            placeholder="证书 / 奖项 / 语言 / 作品名称"
                            onChange={(event) =>
                              patchItem(section.id, item.id, {
                                title: event.target.value,
                              })
                            }
                          />
                        </Field>
                        <Field label="机构 / 角色" hint="选填">
                          <TextInput
                            value={item.subtitle}
                            maxLength={80}
                            placeholder="颁发机构或担任角色"
                            onChange={(event) =>
                              patchItem(section.id, item.id, {
                                subtitle: event.target.value,
                              })
                            }
                          />
                        </Field>
                        <Field label="时间" hint="选填">
                          <TextInput
                            value={item.date}
                            maxLength={30}
                            placeholder="2024.06"
                            onChange={(event) =>
                              patchItem(section.id, item.id, {
                                date: event.target.value,
                              })
                            }
                          />
                        </Field>
                        <Field
                          label="链接"
                          hint="选填"
                          error={
                            touchedLinks[item.id] ? validateUrl(item.link) : ""
                          }
                        >
                          <TextInput
                            value={item.link}
                            maxLength={300}
                            placeholder="https://..."
                            onBlur={() => touchLink(item.id)}
                            aria-invalid={
                              Boolean(validateUrl(item.link)) &&
                              Boolean(touchedLinks[item.id])
                            }
                            onChange={(event) =>
                              patchItem(section.id, item.id, {
                                link: event.target.value,
                              })
                            }
                          />
                        </Field>
                        <Field
                          label="补充说明"
                          hint="每行一条"
                          className="sm:col-span-2"
                        >
                          <TextArea
                            value={item.description}
                            className="min-h-[60px]"
                            placeholder="如：CET-6 560 分；或一段校园经历要点"
                            onChange={(event) =>
                              patchItem(section.id, item.id, {
                                description: event.target.value,
                              })
                            }
                          />
                        </Field>
                      </div>
                    </div>
                  ))}

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => addItem(section.id)}
                  >
                    + 添加条目
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </SectionCard>
  );
}
