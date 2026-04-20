import { useState } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import { useWeatherData } from "@/hooks/useWeatherData";

const queryClient = new QueryClient();

function Router({
  currentCity,
  setCurrentCity,
  cityData,
  isLoading,
  error,
}: {
  currentCity: string;
  setCurrentCity: (city: string) => void;
  cityData: ReturnType<typeof useWeatherData>["data"];
  isLoading: boolean;
  error: string | null;
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
        />
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [currentCity, setCurrentCity] = useState("深圳");
  const { data: cityData, isLoading, error } = useWeatherData(currentCity);

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
          />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
