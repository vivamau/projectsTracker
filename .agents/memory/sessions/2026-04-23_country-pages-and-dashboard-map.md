# Session — 2026-04-23

## Tasks completed

### Country Pages (id: 293)
- Backend: `getProjectsByCountry` + `getCountriesWithProjects` in countryService.js
- Backend: `GET /countries/with-projects` + `GET /countries/:code/projects` routes (literal before param)
- Frontend: `pages/countries/index.jsx` (searchable list with project count badge)
- Frontend: `pages/countries/detail.jsx` (country header, projects list)
- Frontend: `entitiesApi.js` two new functions, `Sidebar.jsx` Countries entry, `App.jsx` two routes
- Frontend: `Map.jsx` ExternalLink icon on each country pill
- TDD: 25 country tests passing

### Dashboard Choropleth Map (id: 294)
- New component `ProjectsMap.jsx` in dashboard/components/
- Choropleth: linear RGB interpolation, country color intensity = project_count / max
- Hover tooltip (Leaflet bindTooltip), click → country detail page
- Color legend (6 swatches) + max value in card header
- Added to dashboard/index.jsx between KPI cards and People section
- 839 backend tests passing, frontend builds cleanly

## Lessons
- Express: literal routes (`/with-projects`) must come before param routes (`/:code`)
- react-leaflet: `onEachFeature` runs outside React — use refs for navigate and data
