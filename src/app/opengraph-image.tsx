import { ImageResponse } from "next/og";

export const alt =
  "Resume Workshop — local-first resume builder with 5 templates, JD matching and AI writing";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * 分享卡片刻意使用英文：ImageResponse 默认字体不含中文字形，
 * 直接渲染中文会出现方框。站点标题与描述仍以中文元数据为主。
 */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "stretch",
          background: "#faf9f7",
          padding: 72,
        }}
      >
        <div
          style={{
            width: 640,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            paddingRight: 56,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", alignItems: "center" }}>
              <div
                style={{
                  width: 52,
                  height: 52,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "#1d4ed8",
                  borderRadius: 12,
                  marginRight: 18,
                }}
              >
                <div
                  style={{
                    width: 24,
                    height: 30,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    background: "#ffffff",
                    borderRadius: 3,
                    padding: "0 4px",
                  }}
                >
                  <div
                    style={{
                      width: 16,
                      height: 3,
                      background: "#1d4ed8",
                      borderRadius: 2,
                      marginBottom: 4,
                    }}
                  />
                  <div
                    style={{
                      width: 16,
                      height: 3,
                      background: "#93b4f8",
                      borderRadius: 2,
                      marginBottom: 4,
                    }}
                  />
                  <div
                    style={{
                      width: 10,
                      height: 3,
                      background: "#93b4f8",
                      borderRadius: 2,
                    }}
                  />
                </div>
              </div>
              <div
                style={{
                  fontSize: 24,
                  fontWeight: 700,
                  letterSpacing: 4,
                  color: "#1d4ed8",
                }}
              >
                RESUME WORKSHOP
              </div>
            </div>

            <div
              style={{
                marginTop: 48,
                fontSize: 70,
                fontWeight: 800,
                lineHeight: 1.08,
                letterSpacing: -2,
                color: "#18181b",
              }}
            >
              Build a resume that fits the job.
            </div>
            <div
              style={{
                marginTop: 28,
                fontSize: 28,
                lineHeight: 1.45,
                color: "#52525b",
              }}
            >
              5 templates · JD matching · AI writing
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center" }}>
            {["Local-first", "A4 / PDF", "AI assisted"].map((label) => (
              <div
                key={label}
                style={{
                  display: "flex",
                  padding: "10px 18px",
                  marginRight: 12,
                  borderRadius: 999,
                  background: "#eef3ff",
                  color: "#1d4ed8",
                  fontSize: 20,
                  fontWeight: 600,
                }}
              >
                {label}
              </div>
            ))}
          </div>
        </div>

        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            background: "#ffffff",
            border: "1px solid #e4e4e7",
            borderRadius: 18,
            padding: 36,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              marginBottom: 26,
            }}
          >
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 28,
                background: "#eef3ff",
                marginRight: 18,
              }}
            />
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div
                style={{
                  width: 180,
                  height: 12,
                  borderRadius: 6,
                  background: "#18181b",
                  marginBottom: 10,
                }}
              />
              <div
                style={{
                  width: 120,
                  height: 9,
                  borderRadius: 5,
                  background: "#a1a1aa",
                }}
              />
            </div>
          </div>

          <div
            style={{
              width: 76,
              height: 9,
              borderRadius: 5,
              background: "#1d4ed8",
              marginBottom: 18,
            }}
          />
          {[100, 92, 84, 96].map((width) => (
            <div
              key={`summary-${width}`}
              style={{
                width: `${width}%`,
                height: 8,
                borderRadius: 4,
                background: "#e4e4e7",
                marginBottom: 10,
              }}
            />
          ))}

          <div
            style={{
              width: 76,
              height: 9,
              borderRadius: 5,
              background: "#1d4ed8",
              marginTop: 20,
              marginBottom: 18,
            }}
          />
          {[96, 88, 92].map((width) => (
            <div
              key={`experience-${width}`}
              style={{
                width: `${width}%`,
                height: 8,
                borderRadius: 4,
                background: "#e4e4e7",
                marginBottom: 10,
              }}
            />
          ))}

          <div style={{ display: "flex", marginTop: 22 }}>
            {[0, 1, 2, 3].map((index) => (
              <div
                key={index}
                style={{
                  width: 62,
                  height: 24,
                  borderRadius: 12,
                  background: index === 0 ? "#1d4ed8" : "#eef3ff",
                  marginRight: 10,
                }}
              />
            ))}
          </div>
        </div>
      </div>
    ),
    size,
  );
}
