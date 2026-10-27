import type {
  CustomItem,
  CustomSection,
  Education,
  Experience,
  Project,
} from "@/lib/types";

export type DeleteTarget =
  | { kind: "experience"; item: Experience; index: number }
  | { kind: "project"; item: Project; index: number }
  | { kind: "education"; item: Education; index: number }
  | { kind: "customSection"; section: CustomSection; index: number }
  | {
      kind: "customItem";
      sectionId: string;
      item: CustomItem;
      index: number;
    };

export function deleteTargetLabel(target: DeleteTarget | null): string {
  switch (target?.kind) {
    case "experience":
      return "工作经历";
    case "project":
      return "项目";
    case "education":
      return "教育经历";
    case "customSection":
      return "自定义板块";
    case "customItem":
      return "自定义条目";
    default:
      return "";
  }
}
