// @ts-nocheck
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { join, dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

/**
 * @returns {{ venues: any[], events: any[], synthetic: boolean, notice: string, version: string }}
 */
function loadCatalog() {
  const path = join(__dirname, '../../../tests/fixtures/nyc-catalog.json');
  return require(path);
}

const DOW_ORDER = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

/**
 * @param {object} opts
 * @param {string[]} [opts.tags]       filter by tag (any match)
 * @param {string[]} [opts.dietary]    all listed options must be present
 * @param {number}   [opts.maxCents]   upper bound on estCostPerPersonCents
 * @param {string}   [opts.borough]    exact borough match
 * @param {string}   [opts.dow]        day-of-week abbreviation: mon/tue/…/sun
 * @param {number}   [opts.groupSize]  must fit within venue maxGroupSize
 * @returns {any[]} matching events, each with venue embedded
 */
export function searchEvents(opts = {}) {
  const { tags, dietary, maxCents, borough, dow, groupSize } = opts;
  const catalog = loadCatalog();
  const venueMap = Object.fromEntries(
    catalog.venues.map((v) => [v.venueId, v]),
  );

  return catalog.events
    .filter((evt) => {
      const venue = venueMap[evt.venueId];
      if (!venue) return false;

      if (tags?.length && !tags.some((t) => evt.tags.includes(t))) return false;

      if (
        dietary?.length &&
        !dietary.every((d) => evt.dietaryOptions.includes(d))
      )
        return false;

      if (maxCents !== undefined && evt.estCostPerPersonCents > maxCents)
        return false;

      if (borough && venue.borough !== borough) return false;

      if (dow) {
        const slot = venue.hours[dow];
        if (!slot) return false;
      }

      if (groupSize !== undefined && groupSize > venue.maxGroupSize)
        return false;

      return true;
    })
    .map((evt) => ({ ...evt, venue: venueMap[evt.venueId] }));
}

/**
 * @param {object} opts
 * @param {string[]} [opts.tags]
 * @param {string[]} [opts.dietary]
 * @param {number}   [opts.maxCentsPerPerson]  upper bound on priceRangeCentsPerPerson[1]
 * @param {string}   [opts.borough]
 * @param {string}   [opts.dow]
 * @param {number}   [opts.groupSize]
 * @returns {any[]} matching venues
 */
export function searchVenues(opts = {}) {
  const { tags, dietary, maxCentsPerPerson, borough, dow, groupSize } = opts;
  const catalog = loadCatalog();

  return catalog.venues.filter((venue) => {
    if (tags?.length && !tags.some((t) => venue.tags.includes(t))) return false;

    if (
      dietary?.length &&
      !dietary.every((d) => venue.dietaryOptions.includes(d))
    )
      return false;

    if (
      maxCentsPerPerson !== undefined &&
      venue.priceRangeCentsPerPerson[1] > maxCentsPerPerson
    )
      return false;

    if (borough && venue.borough !== borough) return false;

    if (dow) {
      const slot = venue.hours[dow];
      if (!slot) return false;
    }

    if (groupSize !== undefined && groupSize > venue.maxGroupSize) return false;

    return true;
  });
}

/**
 * @param {string} eventId
 * @returns {any} event with venue embedded, or null
 */
export function getEventDetail(eventId) {
  const catalog = loadCatalog();
  const venue = Object.fromEntries(catalog.venues.map((v) => [v.venueId, v]));
  const evt = catalog.events.find((e) => e.eventId === eventId);
  if (!evt) return null;
  return { ...evt, venue: venue[evt.venueId] };
}

/**
 * @param {string} venueId
 * @returns {any} venue or null
 */
export function getVenueDetail(venueId) {
  const catalog = loadCatalog();
  return catalog.venues.find((v) => v.venueId === venueId) ?? null;
}

/**
 * Returns the catalog metadata.
 * @returns {{ synthetic: boolean, notice: string, version: string }}
 */
export function getCatalogMeta() {
  const { synthetic, notice, version } = loadCatalog();
  return { synthetic, notice, version };
}

/**
 * Suggests events to a pod. Applies pod constraints and returns up to `limit` options.
 *
 * @param {object} pod
 * @param {number}   pod.size          number of members
 * @param {string[]} pod.dietary       union of all dietary requirements across members
 * @param {number}   pod.budgetCents   per-person budget ceiling
 * @param {string}   [pod.dow]         preferred day-of-week
 * @param {string[]} [pod.tags]        activity preferences
 * @param {number}   [limit=3]
 * @returns {any[]} up to `limit` events with venue embedded, sorted by cost asc
 */
export function suggestToPod(pod, limit = 3) {
  const { size, dietary = [], budgetCents, dow, tags } = pod;

  const results = searchEvents({
    tags,
    dietary,
    maxCents: budgetCents,
    dow,
    groupSize: size,
  });

  results.sort((a, b) => a.estCostPerPersonCents - b.estCostPerPersonCents);

  return results.slice(0, limit);
}

/**
 * Returns all available tags across events and venues (deduplicated, sorted).
 * @returns {string[]}
 */
export function listTags() {
  const catalog = loadCatalog();
  const tagSet = new Set();
  for (const v of catalog.venues) v.tags.forEach((t) => tagSet.add(t));
  for (const e of catalog.events) e.tags.forEach((t) => tagSet.add(t));
  return [...tagSet].sort();
}

/**
 * Returns all available dietary options (deduplicated, sorted).
 * @returns {string[]}
 */
export function listDietaryOptions() {
  const catalog = loadCatalog();
  const dietSet = new Set();
  for (const v of catalog.venues)
    v.dietaryOptions.forEach((d) => dietSet.add(d));
  for (const e of catalog.events)
    e.dietaryOptions.forEach((d) => dietSet.add(d));
  return [...dietSet].sort();
}
