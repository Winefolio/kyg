import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { GlossaryProvider } from "@/contexts/GlossaryContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useDynamicViewportHeight } from "@/hooks/useDynamicViewportHeight";
import Gateway from "@/pages/Gateway";
import Landing from "@/pages/Landing";
import SessionJoin from "@/pages/SessionJoin";
import TastingSession from "@/pages/TastingSession";
import TastingCompletion from "@/pages/TastingCompletion";
import HostDashboard from "@/pages/HostDashboard";
import SommelierDashboard from "@/pages/SommelierDashboard";
import PackageEditor from "@/pages/PackageEditor";
import UserDashboard from "@/pages/UserDashboard";
import TastingDetailView from "@/pages/TastingDetailView";
import Login from "@/pages/Login";
import SoloDashboard from "@/pages/SoloDashboard";
import SoloTastingDetail from "@/pages/SoloTastingDetail";
import SoloTastingNew from "@/pages/SoloTastingNew";
import SoloProfile from "@/pages/SoloProfile";
import SoloLogin from "@/pages/SoloLogin";
import JourneyBrowser from "@/pages/JourneyBrowser";
import JourneyDetail from "@/pages/JourneyDetail";
import JourneyAdmin from "@/pages/JourneyAdmin";
// New unified home experience - Three Pillars (Solo, Group, Dashboard)
import HomeV2 from "@/pages/HomeV2";

import Profile from "@/pages/Profile";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/gateway" component={Gateway} /> {/* Keep old gateway accessible */}

      {/* New unified home experience - Three Pillars (Solo, Group, Dashboard) */}
      <Route path="/home" component={HomeV2} />
      <Route path="/home/group" component={HomeV2} />
      <Route path="/home/dashboard" component={HomeV2} />
      <Route path="/home/:rest*" component={HomeV2} />
      <Route path="/tasting/new">
        <SoloTastingNew returnPath="/home" />
      </Route>

      {/* Redirects from old routes to new unified home */}
      <Route path="/solo">
        <Redirect to="/home" />
      </Route>
      <Route path="/solo/journal">
        <Redirect to="/home" />
      </Route>
      <Route path="/solo/profile">
        <Redirect to="/home/profile" />
      </Route>
      <Route path="/journeys" component={JourneyBrowser} />

      {/* Keep solo tasting routes working (detail views) */}
      <Route path="/solo/login" component={SoloLogin} />
      <Route path="/solo/new">
        <SoloTastingNew />
      </Route>
      <Route path="/solo/tasting/:id" component={SoloTastingDetail} />

      {/* Journey detail (not in tabs) */}
      <Route path="/journeys/:id" component={JourneyDetail} />

      {/* Group session routes (unchanged) */}
      <Route path="/sommelier" component={SommelierDashboard} />
      <Route path="/editor/:code" component={PackageEditor} />
      <Route path="/profile" component={Profile} />
      <Route path="/dashboard/:email" component={UserDashboard} />
      <Route path="/dashboard/:email/tasting/:sessionId" component={TastingDetailView} />
      <Route path="/join" component={SessionJoin} />
      <Route path="/session/:packageCode" component={SessionJoin} />
      <Route path="/tasting/:sessionId/:participantId" component={TastingSession} />
      <Route path="/completion/:sessionId/:participantId" component={TastingCompletion} />
      <Route path="/host/:sessionId/:participantId" component={HostDashboard} />
      <Route path="/login" component={Login} />

      {/* Admin routes */}
      <Route path="/admin/journeys" component={JourneyAdmin} />

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  // Initialize dynamic viewport height for proper mobile layout
  useDynamicViewportHeight();
  
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <GlossaryProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </GlossaryProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
