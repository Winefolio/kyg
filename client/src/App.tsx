import { lazy, Suspense } from "react";
import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { GlossaryProvider } from "@/contexts/GlossaryContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useDynamicViewportHeight } from "@/hooks/useDynamicViewportHeight";

// Static imports — always needed on first load
import Landing from "@/pages/Landing";
import NotFound from "@/pages/not-found";

// Lazy-loaded page components
const Gateway = lazy(() => import("@/pages/Gateway"));
const HomeV2 = lazy(() => import("@/pages/HomeV2"));
const Login = lazy(() => import("@/pages/Login"));
const SoloLogin = lazy(() => import("@/pages/SoloLogin"));
const Profile = lazy(() => import("@/pages/Profile"));
const SoloProfile = lazy(() => import("@/pages/SoloProfile"));
const SoloTastingNew = lazy(() => import("@/pages/SoloTastingNew"));
const SoloTastingDetail = lazy(() => import("@/pages/SoloTastingDetail"));
const SoloDashboard = lazy(() => import("@/pages/SoloDashboard"));
const JourneyBrowser = lazy(() => import("@/pages/JourneyBrowser"));
const JourneyDetail = lazy(() => import("@/pages/JourneyDetail"));
const JourneyAdmin = lazy(() => import("@/pages/JourneyAdmin"));
const SommelierDashboard = lazy(() => import("@/pages/SommelierDashboard"));
const PackageEditor = lazy(() => import("@/pages/PackageEditor"));
const UserDashboard = lazy(() => import("@/pages/UserDashboard"));
const TastingDetailView = lazy(() => import("@/pages/TastingDetailView"));
const SessionJoin = lazy(() => import("@/pages/SessionJoin"));
const TastingSession = lazy(() => import("@/pages/TastingSession"));
const TastingCompletion = lazy(() => import("@/pages/TastingCompletion"));
const HostDashboard = lazy(() => import("@/pages/HostDashboard"));

import { SommelierFAB } from "@/components/sommelier/SommelierFAB";

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
            <Suspense fallback={<div className="flex items-center justify-center h-screen"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>}>
              <Router />
            </Suspense>
            <SommelierFAB />
          </TooltipProvider>
        </GlossaryProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
