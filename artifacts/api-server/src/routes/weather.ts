import { Router } from "express";
import { z } from "zod";
import { weatherProvider } from "../lib/weather";

const router = Router();

/** 内置城市坐标（后续可扩展为数据库/地理编码服务） */
const CITY_COORDS: Record<string, { latitude: number; longitude: number }> = {
  北京: { latitude: 39.9042, longitude: 116.4074 },
  上海: { latitude: 31.2304, longitude: 121.4737 },
  深圳: { latitude: 22.5431, longitude: 114.0579 },
  广州: { latitude: 23.1291, longitude: 113.2644 },
  杭州: { latitude: 30.2741, longitude: 120.1551 },
  成都: { latitude: 30.5728, longitude: 104.0668 },
  武汉: { latitude: 30.5928, longitude: 114.3055 },
  西安: { latitude: 34.3416, longitude: 108.9398 },
  南京: { latitude: 32.0603, longitude: 118.7969 },
  重庆: { latitude: 29.563, longitude: 106.5516 },
  天津: { latitude: 39.3434, longitude: 117.3616 },
  苏州: { latitude: 31.2989, longitude: 120.5853 },
  长沙: { latitude: 28.2282, longitude: 112.9388 },
  郑州: { latitude: 34.7466, longitude: 113.6254 },
  青岛: { latitude: 36.0671, longitude: 120.3826 },
  大连: { latitude: 38.914, longitude: 121.6147 },
  厦门: { latitude: 24.4798, longitude: 118.0894 },
  福州: { latitude: 26.0745, longitude: 119.2965 },
  昆明: { latitude: 25.0389, longitude: 102.7183 },
  贵阳: { latitude: 26.647, longitude: 106.6302 },
  南宁: { latitude: 22.817, longitude: 108.3665 },
  海口: { latitude: 20.0444, longitude: 110.1999 },
  三亚: { latitude: 18.2528, longitude: 109.5119 },
  哈尔滨: { latitude: 45.8038, longitude: 126.5349 },
  长春: { latitude: 43.8171, longitude: 125.3235 },
  沈阳: { latitude: 41.8057, longitude: 123.4315 },
  石家庄: { latitude: 38.0428, longitude: 114.5149 },
  太原: { latitude: 37.8706, longitude: 112.5489 },
  济南: { latitude: 36.6512, longitude: 117.1201 },
  合肥: { latitude: 31.8206, longitude: 117.2272 },
  南昌: { latitude: 28.682, longitude: 115.8579 },
  宁波: { latitude: 29.8683, longitude: 121.544 },
  无锡: { latitude: 31.4912, longitude: 120.3119 },
  佛山: { latitude: 23.0218, longitude: 113.1219 },
  东莞: { latitude: 23.0207, longitude: 113.7518 },
  珠海: { latitude: 22.271, longitude: 113.5767 },
  兰州: { latitude: 36.0611, longitude: 103.8343 },
  银川: { latitude: 38.4872, longitude: 106.2309 },
  乌鲁木齐: { latitude: 43.8256, longitude: 87.6168 },
  呼和浩特: { latitude: 40.8424, longitude: 111.749 },
  拉萨: { latitude: 29.652, longitude: 91.1721 },
  香港: { latitude: 22.3193, longitude: 114.1694 },
  澳门: { latitude: 22.1987, longitude: 113.5439 },
  台北: { latitude: 25.033, longitude: 121.5654 },
};

const coordQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90).optional(),
  lon: z.coerce.number().min(-180).max(180).optional(),
});

// GET /api/weather?city=北京  |  GET /api/weather?lat=..&lon=..
router.get("/", async (req, res, next) => {
  try {
    const city = typeof req.query.city === "string" ? req.query.city.trim() : "";

    if (city) {
      const coords = CITY_COORDS[city];
      if (!coords) {
        return res.status(404).json({ error: `未知城市：${city}` });
      }
      const data = await weatherProvider.getCurrent(coords.latitude, coords.longitude);
      return res.json({ city, ...data });
    }

    const parsed = coordQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ error: "缺少 city 参数或坐标不合法" });
    }
    if (parsed.data.lat === undefined || parsed.data.lon === undefined) {
      return res.status(400).json({ error: "缺少 city 参数或坐标不合法" });
    }

    const data = await weatherProvider.getCurrent(parsed.data.lat, parsed.data.lon);
    return res.json(data);
  } catch (err) {
    return next(err);
  }
});

export default router;
