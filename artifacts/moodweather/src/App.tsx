import { useState } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";

const queryClient = new QueryClient();

function Router({
  currentCity,
  setCurrentCity,
}: {
  currentCity: string;
  setCurrentCity: (city: string) => void;
}) {
  return (
    <Switch>
      <Route path="/">
        <Home currentCity={currentCity} setCurrentCity={setCurrentCity} />
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [currentCity, setCurrentCity] = useState("深圳");

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router currentCity={currentCity} setCurrentCity={setCurrentCity} />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
