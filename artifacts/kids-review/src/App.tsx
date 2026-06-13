import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

import Home from "./pages/home";
import Subjects from "./pages/subjects";
import AddLearning from "./pages/add";
import CalendarPage from "./pages/calendar";
import History from "./pages/history";
import Weekly from "./pages/weekly";
import Goals from "./pages/goals";
import ExcludedDays from "./pages/excluded-days";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/subjects" component={Subjects} />
      <Route path="/add" component={AddLearning} />
      <Route path="/calendar" component={CalendarPage} />
      <Route path="/history" component={History} />
      <Route path="/weekly" component={Weekly} />
      <Route path="/goals" component={Goals} />
      <Route path="/excluded-days" component={ExcludedDays} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
