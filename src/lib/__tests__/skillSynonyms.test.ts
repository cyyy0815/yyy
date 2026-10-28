import { describe, expect, it } from "vitest";
import { analyzeJd } from "../jdMatch";
import { skillMatches, textHasSkill } from "../matching";
import {
  canonicalSkill,
  canonicalSkillKey,
  skillAliases,
} from "../skillSynonyms";
import { createEmptyResume } from "../types";

describe("技能同义词", () => {
  it("把常见缩写归一到规范写法", () => {
    expect(canonicalSkill("JS")).toBe("JavaScript");
    expect(canonicalSkill("TS")).toBe("TypeScript");
    expect(canonicalSkill("K8s")).toBe("Kubernetes");
    expect(canonicalSkill("Golang")).toBe("Go");
    expect(canonicalSkill("Postgres")).toBe("PostgreSQL");
    expect(canonicalSkill("SpringBoot")).toBe("Spring Boot");
    expect(canonicalSkill("CPP")).toBe("C++");
    expect(canonicalSkill("CSharp")).toBe("C#");
    expect(canonicalSkill("持续集成")).toBe("CI/CD");
    expect(canonicalSkill("Frontend")).toBe("前端");
    expect(canonicalSkill("未收录技能")).toBe("未收录技能");

    expect(canonicalSkillKey("NodeJS")).toBe(canonicalSkillKey("Node.js"));
    expect(skillAliases("K8s")).toContain("Kubernetes");
  });

  it("技能标签匹配支持别名，同时保留 C 系与 Java 的边界", () => {
    expect(skillMatches("JS", "JavaScript")).toBe(true);
    expect(skillMatches("TS", "TypeScript")).toBe(true);
    expect(skillMatches("K8s", "Kubernetes")).toBe(true);
    expect(skillMatches("Golang", "Go")).toBe(true);
    expect(skillMatches("Postgres", "PostgreSQL")).toBe(true);
    expect(skillMatches("SpringBoot", "Spring Boot")).toBe(true);
    expect(skillMatches("CPP", "C++")).toBe(true);
    expect(skillMatches("CSharp", "C#")).toBe(true);

    expect(skillMatches("Java", "JavaScript")).toBe(false);
    expect(skillMatches("C", "C++")).toBe(false);
    expect(skillMatches("C", "C#")).toBe(false);
    expect(skillMatches("C++", "C#")).toBe(false);
    expect(skillMatches("C", "C")).toBe(true);
  });

  it("正文扫描支持别名，不把 .js 或 C++ 误判成 JS / C", () => {
    const text = "熟悉 K8s 与 SpringBoot，使用 Golang 和 Postgres";
    expect(textHasSkill(text, "Kubernetes")).toBe(true);
    expect(textHasSkill(text, "Spring Boot")).toBe(true);
    expect(textHasSkill(text, "Go")).toBe(true);
    expect(textHasSkill(text, "PostgreSQL")).toBe(true);

    expect(textHasSkill("熟悉 JS、TS 与 CI/CD", "JavaScript")).toBe(true);
    expect(textHasSkill("熟悉 JS、TS 与 CI/CD", "TypeScript")).toBe(true);
    expect(textHasSkill("熟悉 JS、TS 与 CI/CD", "CI/CD")).toBe(true);
    expect(textHasSkill("参与持续集成", "CI/CD")).toBe(true);

    expect(textHasSkill("熟悉 Node.js 与 Next.js", "JavaScript")).toBe(false);
    expect(textHasSkill("熟悉 Node.js 与 Next.js", "Node.js")).toBe(true);
    expect(textHasSkill("熟悉 Node.js 与 Next.js", "Next.js")).toBe(true);

    expect(textHasSkill("使用 C++ 和 C#", "C")).toBe(false);
    expect(textHasSkill("使用 C++ 和 C#", "C++")).toBe(true);
    expect(textHasSkill("使用 C++ 和 C#", "C#")).toBe(true);
    expect(textHasSkill("使用 C 语言", "C")).toBe(true);
    expect(textHasSkill("使用 C++11 与 C# 8.0", "C++")).toBe(true);
    expect(textHasSkill("使用 C++11 与 C# 8.0", "C#")).toBe(true);
    expect(textHasSkill("使用 C++11 与 C# 8.0", "C")).toBe(false);
  });

  it("JD 关键词识别别名并按规范写法去重", () => {
    const resume = createEmptyResume();
    resume.skills = [
      "JavaScript",
      "TypeScript",
      "Kubernetes",
      "Go",
      "PostgreSQL",
      "Spring Boot",
      "CI/CD",
    ];

    const result = analyzeJd(
      "熟悉 JS/TS、K8s、Golang、Postgres 与 SpringBoot，了解 CI/CD。",
      resume,
    );

    expect(result.keywordCount).toBe(7);
    expect(result.matched).toEqual(
      expect.arrayContaining([
        "JavaScript",
        "TypeScript",
        "Kubernetes",
        "Go",
        "PostgreSQL",
        "Spring Boot",
        "CI/CD",
      ]),
    );
    expect(result.missing).toEqual([]);
    expect(result.score).toBe(100);
  });
});
