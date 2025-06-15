import {
  createRouter,
  RootRoute,
  Route,
  Navigate,
  lazyRouteComponent,
} from "@tanstack/react-router";
import App from "./App";
import { getBasePath } from "./api/config";
import { LoadingSpinner } from "./components/ui/LoadingSpinner";

// Import Admin views (keeping only non-lazy loaded ones)
import AdminSeries from "./views/admin/Series";
import AdminSeriesDetail from "./views/admin/SeriesDetail";
import AdminTeams from "./views/admin/Teams";
import AdminCourses from "./views/admin/Courses";
import AdminCompetitions from "./views/admin/Competitions";
import AdminCompetitionTeeTimes from "./views/admin/CompetitionTeeTimes.tsx";
import AdminManualScoreEntry from "./views/admin/AdminManualScoreEntry";

// Import Player views (keeping only non-lazy loaded ones)
import PlayerLayout from "./views/player/PlayerLayout";
import PlayerLanding from "./views/player/Landing";

import PlayerCompetitions from "./views/player/Competitions";
import PlayerSeries from "./views/player/Series";
import SeriesDetail from "./views/player/SeriesDetail";
import SeriesDocuments from "./views/player/SeriesDocuments";
import SeriesDocumentDetail from "./views/player/SeriesDocumentDetail";
import SeriesStandings from "./views/player/SeriesStandings";
import SeriesCompetitions from "./views/player/SeriesCompetitions";

// Root route
const rootRoute = new RootRoute({
  component: App,
});

// Admin routes
const adminRoute = new Route({
  getParentRoute: () => rootRoute,
  path: "/admin",
  pendingComponent: LoadingSpinner,
  component: lazyRouteComponent(() => import("./views/admin/AdminLayout")),
});

const adminSeriesRoute = new Route({
  getParentRoute: () => adminRoute,
  path: "/series",
  component: AdminSeries,
});

const adminSeriesDetailRoute = new Route({
  getParentRoute: () => adminRoute,
  path: "/series/$serieId",
  component: AdminSeriesDetail,
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

const adminManualScoreEntryRoute = new Route({
  getParentRoute: () => adminRoute,
  path: "/competitions/$competitionId/manual-scores",
  component: AdminManualScoreEntry,
});

// Player routes
const playerRoute = new Route({
  getParentRoute: () => rootRoute,
  path: "/player",
  component: PlayerLayout,
});

const playerLandingRoute = new Route({
  getParentRoute: () => playerRoute,
  path: "/",
  component: PlayerLanding,
});

const playerCompetitionsRoute = new Route({
  getParentRoute: () => playerRoute,
  path: "/competitions",
  component: PlayerCompetitions,
});

const playerSeriesRoute = new Route({
  getParentRoute: () => playerRoute,
  path: "/series",
  component: PlayerSeries,
});

const seriesDetailRoute = new Route({
  getParentRoute: () => playerRoute,
  path: "/series/$serieId",
  component: SeriesDetail,
});

// New Series Detail sub-routes
const seriesDocumentsRoute = new Route({
  getParentRoute: () => playerRoute,
  path: "/series/$serieId/documents",
  component: SeriesDocuments,
});

const seriesDocumentDetailRoute = new Route({
  getParentRoute: () => playerRoute,
  path: "/series/$serieId/documents/$documentId",
  component: SeriesDocumentDetail,
});

const seriesStandingsRoute = new Route({
  getParentRoute: () => playerRoute,
  path: "/series/$serieId/standings",
  component: SeriesStandings,
});

const seriesCompetitionsRoute = new Route({
  getParentRoute: () => playerRoute,
  path: "/series/$serieId/competitions",
  component: SeriesCompetitions,
});

const competitionDetailRoute = new Route({
  getParentRoute: () => playerRoute,
  path: "/competitions/$competitionId",
  pendingComponent: LoadingSpinner,
  component: lazyRouteComponent(
    () => import("./views/player/CompetitionDetail")
  ),
});

const teeTimeDetailRoute = new Route({
  getParentRoute: () => playerRoute,
  path: "/competitions/$competitionId/tee-times/$teeTimeId",
  pendingComponent: LoadingSpinner,
  component: lazyRouteComponent(
    () => import("./views/player/CompetitionRound")
  ),
});

// Default redirect to player landing page
const indexRoute = new Route({
  getParentRoute: () => rootRoute,
  path: "/",
  component: () => <Navigate to="/player" replace />,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  adminRoute.addChildren([
    adminSeriesRoute,
    adminSeriesDetailRoute,
    adminTeamsRoute,
    adminCoursesRoute,
    adminCompetitionsRoute,
    adminCompetitionTeeTimesRoute,
    adminManualScoreEntryRoute,
  ]),
  playerRoute.addChildren([
    playerLandingRoute,
    playerCompetitionsRoute,
    playerSeriesRoute,
    seriesDetailRoute,
    seriesDocumentsRoute,
    seriesDocumentDetailRoute,
    seriesStandingsRoute,
    seriesCompetitionsRoute,
    competitionDetailRoute,
    teeTimeDetailRoute,
  ]),
]);

const router = createRouter({
  routeTree,
  basepath: getBasePath(),
});

export default router;
