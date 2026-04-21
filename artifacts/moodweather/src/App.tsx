import { useEffect, useState } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Palette from "@/pages/palette";
import Shredder from "@/pages/shredder";
import Bubble from "@/pages/bubble";
import Journal from "@/pages/journal";
import { useWeatherData } from "@/hooks/useWeatherData";

const queryClient = new QueryClient();

const CITY_COORDS = {
  北京: { latitude: 39.9042, longitude: 116.4074 },
  上海: { latitude: 31.2304, longitude: 121.4737 },
  深圳: { latitude: 22.5431, longitude: 114.0579 },
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
        <Shredder />
      </Route>
      <Route path="/bubble">
        <Bubble />
      </Route>
      <Route path="/journal">
        <Journal />
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [currentCity, setCurrentCity] = useState("深圳");
  const [locationStatus, setLocationStatus] = useState("正在尝试自动定位...");
  const { data: cityData, isLoading, error } = useWeatherData(currentCity);

  useEffect(() => {
    if (!("geolocation" in navigator)) {
      setLocationStatus("当前浏览器不支持定位，可手动选择城市。");
      return;
    }

    const fallbackTimer = window.setTimeout(() => {
      setLocationStatus((status) =>
        status === "正在尝试自动定位..." ? "定位暂未返回，当前使用深圳，可手动选择城市。" : status,
      );
    }, 5500);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        window.clearTimeout(fallbackTimer);
        const matchedCity = getNearestCity({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });

        setCurrentCity(matchedCity);
        setLocationStatus(`已根据当前位置匹配到${matchedCity}`);
      },
      () => {
        window.clearTimeout(fallbackTimer);
        setLocationStatus("未获取到定位，当前使用深圳，可手动选择城市。");
      },
      {
        enableHighAccuracy: false,
        maximumAge: 1000 * 60 * 10,
        timeout: 6000,
      },
    );

    return () => window.clearTimeout(fallbackTimer);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
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
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
