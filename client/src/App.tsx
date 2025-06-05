import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { GlossaryProvider } from "@/contexts/GlossaryContext";
import Gateway from "@/pages/Gateway";
import SessionJoin from "@/pages/SessionJoin";
import TastingSession from "@/pages/TastingSession";
import TastingCompletion from "@/pages/TastingCompletion";
import HostDashboard from "@/pages/HostDashboard";
import SommelierDashboard from "@/pages/SommelierDashboard";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Gateway} />
      <Route path="/sommelier" component={SommelierDashboard} />
      <Route path="/join" component={SessionJoin} />
      <Route path="/session/:packageCode" component={SessionJoin} />
      <Route path="/tasting/:sessionId/:participantId" component={TastingSession} />
      <Route path="/completion/:sessionId/:participantId" component={TastingCompletion} />
      <Route path="/host/:sessionId/:participantId" component={HostDashboard} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <GlossaryProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </GlossaryProvider>
    </QueryClientProvider>
  );
}

export default App;
