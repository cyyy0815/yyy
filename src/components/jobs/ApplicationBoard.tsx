"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Field, Select, TextArea, TextInput } from "@/components/ui/Field";
import { useApplications } from "@/hooks/useApplications";
import {
  APPLICATION_STATUSES,
  applicationStatusLabel,
  createEmptyApplication,
  sortApplications,
  type ApplicationStatus,
  type JobApplication,
} from "@/lib/applications";
import { JD_MAX_LENGTH, readSavedJd, saveJd } from "@/lib/jdStorage";

const STATUS_STYLES: Record<
  ApplicationStatus,
  { dot: string; chip: string; column: string }
> = {
  wishlist: {
    dot: "bg-zinc-400",
    chip: "border-zinc-200 bg-zinc-50 text-zinc-600",
    column: "border-zinc-200/80",
  },
  applied: {
    dot: "bg-blue-500",
    chip: "border-blue-200 bg-blue-50 text-blue-700",
    column: "border-blue-200/80",
  },
  interview: {
    dot: "bg-amber-500",
    chip: "border-amber-200 bg-amber-50 text-amber-700",
    column: "border-amber-200/80",
  },
  offer: {
    dot: "bg-emerald-500",
    chip: "border-emerald-200 bg-emerald-50 text-emerald-700",
    column: "border-emerald-200/80",
  },
  rejected: {
    dot: "bg-red-400",
    chip: "border-red-200 bg-red-50 text-red-600",
    column: "border-red-200/70",
  },
};

function applicationLabel(application: JobApplication): string {
  return (
    [application.company, application.role].filter(Boolean).join(" · ") ||
    "未命名投递"
  );
}

function Card({
  application,
  expanded,
  onToggle,
  onEdit,
  onDelete,
  onStatus,
  onUseJd,
}: {
  application: JobApplication;
  expanded: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onStatus: (status: ApplicationStatus) => void;
  onUseJd: () => void;
}) {
  const style = STATUS_STYLES[application.status];
  const meta = [
    application.city,
    application.appliedAt ? `投于 ${application.appliedAt}` : "",
    application.resumeTitle ? `简历：${application.resumeTitle}` : "",
  ].filter(Boolean);

  return (
    <article
      data-qa="application-card"
      className="rounded-2xl border border-zinc-200/80 bg-white p-3.5 shadow-[0_1px_2px_rgba(0,0,0,0.03)]"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h4 className="truncate text-[13px] font-semibold text-zinc-900">
            {application.company || "未填写公司"}
          </h4>
          <p className="mt-0.5 truncate text-[12px] text-zinc-600">
            {application.role || "未填写岗位"}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] ${style.chip}`}
        >
          {applicationStatusLabel(application.status)}
        </span>
      </div>

      {meta.length > 0 ? (
        <p className="mt-2 text-[10.5px] leading-4 text-zinc-400">
          {meta.join(" · ")}
        </p>
      ) : null}

      {application.nextActionAt ? (
        <p className="mt-2 rounded-lg bg-zinc-50 px-2 py-1.5 text-[10.5px] text-zinc-600">
          下一步：{application.nextActionAt}
        </p>
      ) : null}

      {application.jd ? (
        <p className="mt-2 line-clamp-2 text-[11px] leading-5 text-zinc-500">
          {application.jd}
        </p>
      ) : null}

      {expanded ? (
        <div className="mt-3 space-y-3 border-t border-zinc-100 pt-3">
          <div>
            <p className="text-[10px] font-medium tracking-wide text-zinc-400">
              JD
            </p>
            <p className="mt-1 max-h-56 overflow-y-auto whitespace-pre-wrap text-[11.5px] leading-5 text-zinc-600">
              {application.jd || "未保存 JD"}
            </p>
            {application.jd ? (
              <Button
                variant="outline"
                size="sm"
                data-qa="application-use-jd"
                className="mt-2"
                onClick={onUseJd}
              >
                设为当前 JD
              </Button>
            ) : null}
          </div>
          {application.coverLetter ? (
            <div>
              <p className="text-[10px] font-medium tracking-wide text-zinc-400">
                求职信
              </p>
              <p className="mt-1 max-h-56 overflow-y-auto whitespace-pre-wrap text-[11.5px] leading-5 text-zinc-600">
                {application.coverLetter}
              </p>
            </div>
          ) : null}
          {application.note ? (
            <div>
              <p className="text-[10px] font-medium tracking-wide text-zinc-400">
                备注
              </p>
              <p className="mt-1 whitespace-pre-wrap text-[11.5px] leading-5 text-zinc-600">
                {application.note}
              </p>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <select
          data-qa="application-status-select"
          aria-label={`${applicationLabel(application)} 的投递状态`}
          value={application.status}
          onChange={(event) =>
            onStatus(event.target.value as ApplicationStatus)
          }
          className="h-7 rounded-lg border border-zinc-200 bg-white px-1.5 text-[11px] text-zinc-600 outline-none focus:border-blue-700"
        >
          {APPLICATION_STATUSES.map((status) => (
            <option key={status.id} value={status.id}>
              {status.label}
            </option>
          ))}
        </select>
        <Button
          variant="ghost"
          size="sm"
          data-qa="application-details"
          className="h-7 px-2 text-[11px]"
          onClick={onToggle}
        >
          {expanded ? "收起" : "详情"}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          data-qa="application-edit"
          className="h-7 px-2 text-[11px]"
          onClick={onEdit}
        >
          编辑
        </Button>
        <Button
          variant="danger"
          size="sm"
          data-qa="application-delete"
          className="ml-auto h-7 px-2 text-[11px]"
          onClick={onDelete}
        >
          删除
        </Button>
      </div>
    </article>
  );
}

export function ApplicationBoard({ resumeTitle }: { resumeTitle: string }) {
  const { applications, update, saveError } = useApplications();
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<JobApplication>(() =>
    createEmptyApplication(resumeTitle),
  );
  const [formError, setFormError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const columns = useMemo(
    () =>
      APPLICATION_STATUSES.map((status) => ({
        ...status,
        items: sortApplications(
          applications.filter((application) => application.status === status.id),
        ),
      })),
    [applications],
  );

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 3200);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const openCreate = () => {
    setDraft({
      ...createEmptyApplication(resumeTitle),
      jd: readSavedJd().trim().slice(0, JD_MAX_LENGTH),
    });
    setEditingId(null);
    setFormError(null);
    setFormOpen(true);
  };

  const openEdit = (application: JobApplication) => {
    setDraft({ ...application });
    setEditingId(application.id);
    setFormError(null);
    setFormOpen(true);
  };

  const saveDraft = () => {
    const company = draft.company.trim();
    const role = draft.role.trim();
    if (!company && !role) {
      setFormError("至少填写公司或岗位，方便在看板里识别");
      return;
    }
    const now = Date.now();
    const nextApplication: JobApplication = {
      ...draft,
      id: editingId ?? draft.id,
      company,
      role,
      createdAt: editingId ? draft.createdAt : now,
      updatedAt: now,
    };
    const next = editingId
      ? applications.map((application) =>
          application.id === editingId ? nextApplication : application,
        )
      : [nextApplication, ...applications];
    if (!update(next)) {
      setFormError("保存失败：浏览器存储不可用或空间已满");
      return;
    }
    setFormOpen(false);
    setNotice(editingId ? "投递记录已更新" : "已加入投递看板");
  };

  const changeStatus = (id: string, status: ApplicationStatus) => {
    update(
      applications.map((application) =>
        application.id === id
          ? { ...application, status, updatedAt: Date.now() }
          : application,
      ),
    );
  };

  const remove = (application: JobApplication) => {
    if (
      !window.confirm(`确定删除「${applicationLabel(application)}」这条投递记录吗？`)
    ) {
      return;
    }
    update(
      applications.filter((item) => item.id !== application.id),
    );
    setNotice("投递记录已删除");
  };

  const activateJd = (application: JobApplication) => {
    if (!application.jd.trim()) return;
    saveJd(application.jd.slice(0, JD_MAX_LENGTH));
    setNotice(
      `已把「${applicationLabel(application)}」的 JD 设为当前 JD，JD 匹配和求职信会使用它`,
    );
  };

  return (
    <>
      <section
        data-qa="application-board"
        className="rounded-3xl border border-zinc-200/80 bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.03)]"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-[14px] font-semibold tracking-tight text-zinc-900">
                投递看板
              </h3>
              <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10.5px] text-zinc-500">
                {applications.length} 条记录
              </span>
            </div>
            <p className="mt-1 max-w-2xl text-[12px] leading-6 text-zinc-500">
              记录每个岗位的 JD、投递状态与下一步；每条 JD
              独立保存，不会互相覆盖。全部数据只在本机。
            </p>
          </div>
          <Button
            variant="primary"
            size="sm"
            data-qa="application-create"
            onClick={openCreate}
          >
            ＋ 新建投递
          </Button>
        </div>

        {notice ? (
          <p
            role="status"
            data-qa="application-notice"
            className="mt-3 rounded-xl bg-zinc-50 px-3 py-2 text-[11.5px] text-zinc-600"
          >
            {notice}
          </p>
        ) : null}
        {saveError ? (
          <p
            role="alert"
            className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-[11.5px] text-red-700"
          >
            保存失败：浏览器存储不可用或空间已满，请先导出 JSON 备份。
          </p>
        ) : null}

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {columns.map((column) => (
            <div
              key={column.id}
              data-qa={`application-column-${column.id}`}
              className={`rounded-2xl border bg-zinc-50/50 p-2.5 ${STATUS_STYLES[column.id].column}`}
            >
              <div className="flex items-center justify-between gap-2 px-1 pb-2">
                <span className="flex items-center gap-1.5 text-[11.5px] font-medium text-zinc-700">
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${STATUS_STYLES[column.id].dot}`}
                  />
                  {column.label}
                </span>
                <span className="text-[10.5px] tabular-nums text-zinc-400">
                  {column.items.length}
                </span>
              </div>
              <div className="space-y-2">
                {column.items.length > 0 ? (
                  column.items.map((application) => (
                    <Card
                      key={application.id}
                      application={application}
                      expanded={expandedId === application.id}
                      onToggle={() =>
                        setExpandedId((current) =>
                          current === application.id ? null : application.id,
                        )
                      }
                      onEdit={() => openEdit(application)}
                      onDelete={() => remove(application)}
                      onStatus={(status) =>
                        changeStatus(application.id, status)
                      }
                      onUseJd={() => activateJd(application)}
                    />
                  ))
                ) : (
                  <p className="rounded-xl border border-dashed border-zinc-200 px-2 py-4 text-center text-[10.5px] text-zinc-400">
                    {column.hint}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>

        <p className="mt-4 text-[10.5px] leading-5 text-zinc-400">
          提示：在 AI 求职信面板生成内容后，可以复制到「编辑投递」的求职信字段，和岗位 JD 一起保存。
        </p>
      </section>

      {formOpen ? (
        <Dialog
          title={editingId ? "编辑投递" : "新建投递"}
          description="公司、岗位和 JD 只保存在本机浏览器"
          size="lg"
          dataQa="application-dialog"
          closeDataQa="application-close"
          onClose={() => setFormOpen(false)}
          footer={
            <div className="flex items-center justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                data-qa="application-cancel"
                onClick={() => setFormOpen(false)}
              >
                取消
              </Button>
              <Button
                variant="primary"
                size="sm"
                data-qa="application-save"
                onClick={saveDraft}
              >
                {editingId ? "保存修改" : "保存投递"}
              </Button>
            </div>
          }
        >
          <div data-qa="application-form" className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="公司" hint="至少填写公司或岗位">
                  <TextInput
                    autoFocus
                    data-qa="application-company"
                    value={draft.company}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        company: event.target.value,
                      }))
                    }
                    maxLength={100}
                    placeholder="如 某某科技"
                  />
                </Field>
                <Field label="岗位">
                  <TextInput
                    data-qa="application-role"
                    value={draft.role}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        role: event.target.value,
                      }))
                    }
                    maxLength={100}
                    placeholder="如 前端工程师"
                  />
                </Field>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="城市">
                  <TextInput
                    data-qa="application-city"
                    value={draft.city}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        city: event.target.value,
                      }))
                    }
                    maxLength={50}
                    placeholder="如 上海"
                  />
                </Field>
                <Field label="状态">
                  <Select
                    data-qa="application-status"
                    value={draft.status}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        status: event.target.value as ApplicationStatus,
                      }))
                    }
                  >
                    {APPLICATION_STATUSES.map((status) => (
                      <option key={status.id} value={status.id}>
                        {status.label}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="投递日期" hint="选填">
                  <TextInput
                    type="date"
                    data-qa="application-applied-at"
                    value={draft.appliedAt}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        appliedAt: event.target.value,
                      }))
                    }
                  />
                </Field>
                <Field label="下一步日期" hint="选填，用于跟进">
                  <TextInput
                    type="date"
                    data-qa="application-next-action"
                    value={draft.nextActionAt}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        nextActionAt: event.target.value,
                      }))
                    }
                  />
                </Field>
              </div>

              <Field label="关联简历" hint="记录投递时使用的版本">
                <TextInput
                  data-qa="application-resume-title"
                  value={draft.resumeTitle}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      resumeTitle: event.target.value,
                    }))
                  }
                  maxLength={60}
                  placeholder="如 前端工程师-主简历"
                />
              </Field>

              <Field
                label="岗位 JD"
                hint={`${draft.jd.length}/${JD_MAX_LENGTH} · 每个岗位独立保存`}
              >
                <TextArea
                  data-qa="application-jd"
                  value={draft.jd}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      jd: event.target.value,
                    }))
                  }
                  maxLength={JD_MAX_LENGTH}
                  className="min-h-[110px]"
                  placeholder="粘贴这个岗位的 JD，方便之后回看和生成求职信"
                />
              </Field>
              <div className="-mt-1 flex flex-wrap items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  data-qa="application-use-saved-jd"
                  onClick={() => {
                    const saved = readSavedJd().trim().slice(0, JD_MAX_LENGTH);
                    if (!saved) {
                      setFormError("当前还没有保存的 JD，可以先粘贴到上方");
                      return;
                    }
                    setDraft((current) => ({ ...current, jd: saved }));
                    setFormError(null);
                  }}
                >
                  填入当前 JD
                </Button>
                <span className="text-[10.5px] text-zinc-400">
                  「当前 JD」来自 JD 匹配面板
                </span>
              </div>

              <Field
                label="求职信"
                hint={`${draft.coverLetter.length}/12000 · 选填`}
              >
                <TextArea
                  data-qa="application-cover-letter"
                  value={draft.coverLetter}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      coverLetter: event.target.value,
                    }))
                  }
                  maxLength={12000}
                  className="min-h-[100px]"
                  placeholder="可粘贴 AI 求职信，和这条投递一起保存"
                />
              </Field>

              <Field label="备注" hint="面试时间、联系人、跟进记录等">
                <TextArea
                  data-qa="application-note"
                  value={draft.note}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      note: event.target.value,
                    }))
                  }
                  maxLength={4000}
                  className="min-h-[80px]"
                  placeholder="选填"
                />
              </Field>

              {formError ? (
                <p role="alert" className="text-[12px] text-red-600">
                  {formError}
                </p>
              ) : null}
          </div>
        </Dialog>
      ) : null}
    </>
  );
}
