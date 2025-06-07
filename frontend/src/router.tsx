import {
  createRouter,
  RootRoute,
  Route,
  Navigate,
} from "@tanstack/react-router";
import App from "./App";
import { getBasePath } from "./api/config";

// Import Admin views
import AdminLayout from "./views/admin/AdminLayout";
import AdminSeries from "./views/admin/Series";
import AdminTeams from "./views/admin/Teams";
import AdminCourses from "./views/admin/Courses";
import AdminCompetitions from "./views/admin/Competitions";
import AdminCompetitionTeeTimes from "./views/admin/CompetitionTeeTimes.tsx";

// Import Player views
import PlayerLayout from "./views/player/PlayerLayout";
import PlayerStandings from "./views/player/Standings";
import PlayerCompetitions from "./views/player/Competitions";
import CompetitionDetail from "./views/player/CompetitionDetail";
import CompetitionRound from "./views/player/CompetitionRound";

// Root route
const rootRoute = new RootRoute({
  component: App,
});

// Admin routes
const adminRoute = new Route({
  getParentRoute: () => rootRoute,
  path: "/admin",
  component: AdminLayout,
});

const adminSeriesRoute = new Route({
  getParentRoute: () => adminRoute,
  path: "/series",
  component: AdminSeries,
});

const adminTeamsRoute = new Route({
  getParentRoute: () => adminRoute,
  path: "/teams",
  component: AdminTeams,
});

const adminCoursesRoute = new Route({
  getParentRoute: () => adminRoute,
  path: "/courses",
  component: AdminCourses,
});

const adminCompetitionsRoute = new Route({
  getParentRoute: () => adminRoute,
  path: "/competitions",
  component: AdminCompetitions,
});

const adminCompetitionTeeTimesRoute = new Route({
  getParentRoute: () => adminRoute,
  path: "/competitions/$competitionId/tee-times",
  component: AdminCompetitionTeeTimes,
});

// Player routes
const playerRoute = new Route({
  getParentRoute: () => rootRoute,
  path: "/player",
  component: PlayerLayout,
});

const playerStandingsRoute = new Route({
  getParentRoute: () => playerRoute,
  path: "/standings",
  component: PlayerStandings,
});

const playerCompetitionsRoute = new Route({
  getParentRoute: () => playerRoute,
  path: "/competitions",
  component: PlayerCompetitions,
});

const competitionDetailRoute = new Route({
  getParentRoute: () => playerRoute,
  path: "/competitions/$competitionId",
  component: CompetitionDetail,
});

const teeTimeDetailRoute = new Route({
  getParentRoute: () => playerRoute,
  path: "/competitions/$competitionId/tee-times/$teeTimeId",
  component: CompetitionRound,
});

// Default redirect to player standings
const indexRoute = new Route({
  getParentRoute: () => rootRoute,
  path: "/",
  component: () => <Navigate to="/player/competitions" replace />,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  adminRoute.addChildren([
    adminSeriesRoute,
    adminTeamsRoute,
    adminCoursesRoute,
    adminCompetitionsRoute,
    adminCompetitionTeeTimesRoute,
  ]),
  playerRoute.addChildren([
    playerStandingsRoute,
    playerCompetitionsRoute,
    competitionDetailRoute,
    teeTimeDetailRoute,
  ]),
]);

const router = createRouter({
  routeTree,
  basepath: getBasePath(),
});

export default router;
