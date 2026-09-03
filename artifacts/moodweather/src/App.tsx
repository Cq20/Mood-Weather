import { useEffect, useState } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import ErrorBoundary from "@/components/ErrorBoundary";
import { AuthProvider, useAuth } from "@/lib/auth";
import { setRemoteSync } from "@/lib/tracker";
import { api } from "@/lib/api";
import { track } from "@/lib/analytics";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Palette from "@/pages/palette";
import Shredder from "@/pages/shredder";
import Bubble from "@/pages/bubble";
import Journal from "@/pages/journal";
import Privacy from "@/pages/privacy";
import PrivacyConsent from "@/components/PrivacyConsent";
import { useWeatherData } from "@/hooks/useWeatherData";

const queryClient = new QueryClient();

// 与后端天气城市库保持一致（定位匹配用，仅本地计算）
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

function getDistance(
  pointA: { latitude: number; longitude: number },
  pointB: { latitude: number; longitude: number },
) {
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const earthRadius = 6371;
  const latDelta = toRadians(pointB.latitude - pointA.latitude);
  const lonDelta = toRadians(pointB.longitude - pointA.longitude);
  const startLat = toRadians(pointA.latitude);
  const endLat = toRadians(pointB.latitude);
  const haversine =
    Math.sin(latDelta / 2) ** 2 +
    Math.cos(startLat) * Math.cos(endLat) * Math.sin(lonDelta / 2) ** 2;

  return 2 * earthRadius * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

function getNearestCity(coords: { latitude: number; longitude: number }) {
  return Object.entries(CITY_COORDS).reduce(
    (nearest, [city, cityCoords]) => {
      const distance = getDistance(coords, cityCoords);

      if (distance < nearest.distance) {
        return { city, distance };
      }

      return nearest;
    },
    { city: "深圳", distance: Number.POSITIVE_INFINITY },
  ).city;
}

function Router({
  currentCity,
  setCurrentCity,
  cityData,
  isLoading,
  error,
  locationStatus,
}: {
  currentCity: string;
  setCurrentCity: (city: string) => void;
  cityData: ReturnType<typeof useWeatherData>["data"];
  isLoading: boolean;
  error: string | null;
  locationStatus: string;
}) {
  return (
    <Switch>
      <Route path="/">
        <Home
          currentCity={currentCity}
          setCurrentCity={setCurrentCity}
          cityData={cityData}
          isLoading={isLoading}
          error={error}
          locationStatus={locationStatus}
        />
      </Route>
      <Route path="/palette">
        <Palette cityData={cityData} />
      </Route>
      <Route path="/shredder">
        <Shredder cityData={cityData} />
      </Route>
      <Route path="/bubble">
        <Bubble cityData={cityData} />
      </Route>
      <Route path="/journal">
        <Journal />
      </Route>
      <Route path="/privacy">
        <Privacy />
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function AppInner() {
  const [currentCity, setCurrentCity] = useState("深圳");
  const [locationStatus, setLocationStatus] = useState("正在尝试自动定位...");
  const { user } = useAuth();
  const { data: cityData, isLoading, error } = useWeatherData(currentCity);

  // 启动埋点：记录访问次数（用于区分新访客/回访）
  useEffect(() => {
    let count = 0;
    try {
      const raw = window.localStorage.getItem("moodweather_visit_count");
      count = raw ? Number(raw) || 0 : 0;
    } catch {
      count = 0;
    }
    count += 1;
    try {
      window.localStorage.setItem("moodweather_visit_count", String(count));
    } catch {
      // ignore
    }
    track("app_launch", { visitCount: count });
  }, []);

  // 登录后：情绪事件同步到服务端（本地记录仍保留作为兜底）
  useEffect(() => {
    if (!user) {
      setRemoteSync(null);
      return;
    }

    setRemoteSync((event) => {
      const payload: Record<string, unknown> = {};
      if (event.type === "palette") {
        if (event.dominantColor) payload.dominantColor = event.dominantColor;
        if (event.dominantLabel) payload.dominantLabel = event.dominantLabel;
        if (typeof event.ratio === "number") payload.ratio = event.ratio;
      } else if (event.type === "shredder") {
        if (event.emotion) payload.emotion = event.emotion;
        payload.length = event.length;
        if (event.content) payload.content = event.content;
      } else {
        payload.scene = event.scene;
        payload.rolesCount = event.rolesCount;
        if (event.roles) payload.roles = event.roles;
      }
      void api.createMoodEvent(event.type, event.ts, payload);
    });

    return () => setRemoteSync(null);
  }, [user]);

  useEffect(() => {
    let geoSupported = false;
    try {
      geoSupported = "geolocation" in navigator && Boolean(navigator.geolocation);
    } catch {
      geoSupported = false;
    }

    if (!geoSupported) {
      setLocationStatus("当前浏览器不支持定位，可手动选择城市。");
      return;
    }

    const fallbackTimer = window.setTimeout(() => {
      setLocationStatus((status) =>
        status === "正在尝试自动定位..." ? "定位暂未返回，当前使用深圳，可手动选择城市。" : status,
      );
    }, 5500);

    let settled = false;

    try {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          window.clearTimeout(fallbackTimer);
          if (settled) return;
          settled = true;
          const matchedCity = getNearestCity({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });

          setCurrentCity(matchedCity);
          setLocationStatus(`已根据当前位置匹配到${matchedCity}`);
        },
        () => {
          window.clearTimeout(fallbackTimer);
          if (settled) return;
          settled = true;
          setLocationStatus("未获取到定位，当前使用深圳，可手动选择城市。");
        },
        {
          enableHighAccuracy: false,
          maximumAge: 1000 * 60 * 10,
          timeout: 6000,
        },
      );
    } catch {
      // 定位 API 异常（权限策略/环境差异）时降级，不阻塞页面
      window.clearTimeout(fallbackTimer);
      if (!settled) {
        settled = true;
        setLocationStatus("未获取到定位，当前使用深圳，可手动选择城市。");
      }
    }

    return () => window.clearTimeout(fallbackTimer);
  }, []);

  return (
    <TooltipProvider>
      <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
        <Router
          currentCity={currentCity}
          setCurrentCity={setCurrentCity}
          cityData={cityData}
          isLoading={isLoading}
          error={error}
          locationStatus={locationStatus}
        />
      </WouterRouter>
      <Toaster />
      <PrivacyConsent />
    </TooltipProvider>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <AppInner />
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
