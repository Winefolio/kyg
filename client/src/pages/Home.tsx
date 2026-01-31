import { Route, Switch } from "wouter";
import { HomeLayout } from "@/components/layout/HomeLayout";
import HomeTastings from "./HomeTastings";
import HomeJourneys from "./HomeJourneys";
import HomeProfile from "./HomeProfile";

/**
 * Home - Unified home page with tabbed navigation
 *
 * Routes:
 * - /home (or /home/tastings) - Tastings tab (default)
 * - /home/journeys - Journeys tab
 * - /home/profile - Profile tab
 */
export default function Home() {
  return (
    <HomeLayout>
      <Switch>
        <Route path="/home/journeys" component={HomeJourneys} />
        <Route path="/home/profile" component={HomeProfile} />
        {/* Default to tastings tab */}
        <Route path="/home/:rest*" component={HomeTastings} />
        <Route path="/home" component={HomeTastings} />
      </Switch>
    </HomeLayout>
  );
}
