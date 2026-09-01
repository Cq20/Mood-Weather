import { describe, expect, it, vi } from "vitest";
import { OpenMeteoProvider } from "./open-meteo";
import { classifyWeatherCode, buildMoodText } from "./types";

describe("classifyWeatherCode（WMO code → 中文）", () => {
  it("0 → 晴", () => {
    expect(classifyWeatherCode(0)).toEqual({ weather: "晴", description: "晴朗" });
  });

  it("61-67 → 雨", () => {
    expect(classifyWeatherCode(61).weather).toBe("雨");
    expect(classifyWeatherCode(67).weather).toBe("雨");
  });

  it("71-86 → 雪", () => {
    expect(classifyWeatherCode(71).weather).toBe("雪");
    expect(classifyWeatherCode(85).weather).toBe("雪");
  });

  it("95 → 雷暴", () => {
    expect(classifyWeatherCode(95).weather).toBe("雷暴");
  });

  it("未知 code 有兜底", () => {
    expect(classifyWeatherCode(999).weather).toBeDefined();
  });
});

describe("buildMoodText", () => {
  it("高湿度提示", () => {
    expect(
      buildMoodText({ humidity: 95, weather: "晴", pressure: 1010 }),
    ).toContain("湿度");
  });

  it("雨/阴提示", () => {
    expect(
      buildMoodText({ humidity: 50, weather: "雨", pressure: 1010 }),
    ).toContain("雨声");
  });

  it("低气压提示", () => {
    expect(
      buildMoodText({ humidity: 50, weather: "晴", pressure: 995 }),
    ).toContain("气压");
  });

  it("平稳兜底", () => {
    expect(
      buildMoodText({ humidity: 50, weather: "晴", pressure: 1013 }),
    ).toContain("平稳");
  });
});

describe("OpenMeteoProvider", () => {
  it("成功解析响应并向下取整", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          current: {
            temperature_2m: 28.6,
            relative_humidity_2m: 65.4,
            surface_pressure: 1002.8,
            weather_code: 2,
          },
        }),
      }),
    );

    const provider = new OpenMeteoProvider();
    const data = await provider.getCurrent(39.9, 116.4);

    expect(data).toMatchObject({
      temp: 29,
      humidity: 65,
      pressure: 1003,
      weather: "多云",
    });

    // 请求 URL 应包含坐标
    const url = vi.mocked(fetch).mock.calls[0][0] as string;
    expect(url).toContain("latitude=39.9");
    expect(url).toContain("longitude=116.4");

    vi.unstubAllGlobals();
  });

  it("HTTP 错误抛异常", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 502 }),
    );
    const provider = new OpenMeteoProvider();
    await expect(provider.getCurrent(1, 1)).rejects.toThrow(/502/);
    vi.unstubAllGlobals();
  });

  it("缺少 current 数据抛异常", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }));
    const provider = new OpenMeteoProvider();
    await expect(provider.getCurrent(1, 1)).rejects.toThrow(/current/);
    vi.unstubAllGlobals();
  });
});
