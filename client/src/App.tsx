import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Gateway from "@/pages/Gateway";
import SessionJoin from "@/pages/SessionJoin";
import TastingSession from "@/pages/TastingSession";
import HostDashboard from "@/pages/HostDashboard";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Gateway} />
      <Route path="/session/:packageCode" component={SessionJoin} />
      <Route path="/tasting/:sessionId/:participantId" component={TastingSession} />
      <Route path="/host/:sessionId/:participantId" component={HostDashboard} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
