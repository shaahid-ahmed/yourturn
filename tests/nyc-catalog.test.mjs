import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  searchEvents,
  searchVenues,
  getEventDetail,
  getVenueDetail,
  getCatalogMeta,
  suggestToPod,
  listTags,
  listDietaryOptions,
} from '../services/api/src/catalog.mjs';

describe('catalog fixture', () => {
  it('is marked synthetic', () => {
    const meta = getCatalogMeta();
    assert.equal(meta.synthetic, true);
    assert.ok(meta.notice.length > 0, 'notice must be non-empty');
    assert.ok(meta.version, 'version must be present');
  });
});

describe('searchEvents', () => {
  it('returns all events when no filters applied', () => {
    const results = searchEvents();
    assert.ok(results.length >= 8, 'expect at least 8 seeded events');
  });

  it('each result has venue embedded', () => {
    const results = searchEvents();
    for (const r of results) {
      assert.ok(r.venue, `event ${r.eventId} must have embedded venue`);
      assert.equal(r.venue.venueId, r.venueId);
    }
  });

  it('filters by tag — active', () => {
    const results = searchEvents({ tags: ['active'] });
    assert.ok(results.length > 0, 'expect at least one active event');
    for (const r of results) {
      assert.ok(r.tags.includes('active'), `event ${r.eventId} must include active tag`);
    }
  });

  it('filters by dietary — vegan events only', () => {
    const results = searchEvents({ dietary: ['vegan'] });
    assert.ok(results.length > 0, 'expect at least one vegan event');
    for (const r of results) {
      assert.ok(r.dietaryOptions.includes('vegan'), `event ${r.eventId} must include vegan`);
    }
  });

  it('filters by maxCents', () => {
    const results = searchEvents({ maxCents: 2000 });
    for (const r of results) {
      assert.ok(r.estCostPerPersonCents <= 2000, `event ${r.eventId} cost exceeds cap`);
    }
  });

  it('zero-cost event is included below any positive cap', () => {
    const results = searchEvents({ maxCents: 100 });
    assert.ok(results.some(r => r.estCostPerPersonCents === 0), 'free event must appear');
  });

  it('filters by borough', () => {
    const results = searchEvents({ borough: 'Brooklyn' });
    assert.ok(results.length > 0, 'expect Brooklyn events');
    for (const r of results) {
      assert.equal(r.venue.borough, 'Brooklyn');
    }
  });

  it('filters by dow — fri returns events at open venues', () => {
    const results = searchEvents({ dow: 'fri' });
    assert.ok(results.length > 0, 'expect Friday events');
    for (const r of results) {
      assert.ok(r.venue.hours.fri, `venue ${r.venueId} must be open on fri`);
    }
  });

  it('filters by dow — mon closed venue excluded', () => {
    // Brooklyn Bowl is closed mon/tue; this confirms a venue closed on mon is excluded
    const results = searchEvents({ dow: 'mon' });
    const bowlEvent = results.find(r => r.venueId === 'v-brooklyn-bowl');
    assert.equal(bowlEvent, undefined, 'Brooklyn Bowl (closed mon) must not appear');
  });

  it('filters by groupSize', () => {
    const results = searchEvents({ groupSize: 7 });
    for (const r of results) {
      assert.ok(r.venue.maxGroupSize >= 7, `venue ${r.venueId} must fit 7`);
    }
  });

  it('groupSize above all maxes returns empty', () => {
    const results = searchEvents({ groupSize: 99 });
    assert.equal(results.length, 0);
  });

  it('combined filter: vegan + outdoor + fri', () => {
    const results = searchEvents({ dietary: ['vegan'], tags: ['outdoor'], dow: 'fri' });
    for (const r of results) {
      assert.ok(r.dietaryOptions.includes('vegan'));
      assert.ok(r.tags.includes('outdoor'));
      assert.ok(r.venue.hours.fri);
    }
  });

  it('no matching filter returns empty array', () => {
    const results = searchEvents({ tags: ['nonexistent-tag-xyz'] });
    assert.equal(results.length, 0);
  });
});

describe('searchVenues', () => {
  it('returns all venues when no filters', () => {
    const results = searchVenues();
    assert.ok(results.length >= 8, 'expect at least 8 seeded venues');
  });

  it('filters by tag', () => {
    const results = searchVenues({ tags: ['food'] });
    assert.ok(results.length > 0, 'expect food venues');
    for (const v of results) {
      assert.ok(v.tags.includes('food'));
    }
  });

  it('filters by dietary all-required', () => {
    const results = searchVenues({ dietary: ['vegan', 'gluten-free'] });
    for (const v of results) {
      assert.ok(v.dietaryOptions.includes('vegan'));
      assert.ok(v.dietaryOptions.includes('gluten-free'));
    }
  });

  it('filters by maxCentsPerPerson (upper bound of range)', () => {
    const results = searchVenues({ maxCentsPerPerson: 2000 });
    for (const v of results) {
      assert.ok(v.priceRangeCentsPerPerson[1] <= 2000);
    }
  });

  it('filters by borough Manhattan', () => {
    const results = searchVenues({ borough: 'Manhattan' });
    assert.ok(results.length > 0);
    for (const v of results) assert.equal(v.borough, 'Manhattan');
  });

  it('filters by groupSize', () => {
    const results = searchVenues({ groupSize: 7 });
    for (const v of results) assert.ok(v.maxGroupSize >= 7);
  });

  it('filters by dow — sat open only', () => {
    const results = searchVenues({ dow: 'sat' });
    for (const v of results) assert.ok(v.hours.sat);
  });
});

describe('getEventDetail', () => {
  it('returns event with venue embedded for known id', () => {
    const detail = getEventDetail('evt-001');
    assert.ok(detail, 'expect evt-001 to exist');
    assert.equal(detail.eventId, 'evt-001');
    assert.ok(detail.venue, 'venue must be embedded');
  });

  it('returns null for unknown id', () => {
    assert.equal(getEventDetail('evt-does-not-exist'), null);
  });

  it('every seeded event is retrievable by id', () => {
    for (let i = 1; i <= 8; i++) {
      const id = `evt-00${i}`;
      const detail = getEventDetail(id);
      assert.ok(detail, `${id} must be retrievable`);
    }
  });
});

describe('getVenueDetail', () => {
  it('returns venue for known id', () => {
    const v = getVenueDetail('v-brooklyn-bowl');
    assert.ok(v);
    assert.equal(v.venueId, 'v-brooklyn-bowl');
  });

  it('returns null for unknown id', () => {
    assert.equal(getVenueDetail('v-does-not-exist'), null);
  });
});

describe('suggestToPod', () => {
  it('returns at most limit results (default 3)', () => {
    const results = suggestToPod({ size: 4, dietary: [], budgetCents: 10000 });
    assert.ok(results.length <= 3);
  });

  it('respects custom limit', () => {
    const results = suggestToPod({ size: 4, dietary: [], budgetCents: 10000 }, 2);
    assert.ok(results.length <= 2);
  });

  it('results sorted by cost ascending', () => {
    const results = suggestToPod({ size: 4, dietary: [], budgetCents: 10000 });
    for (let i = 1; i < results.length; i++) {
      assert.ok(
        results[i].estCostPerPersonCents >= results[i - 1].estCostPerPersonCents,
        'results must be sorted by cost asc',
      );
    }
  });

  it('filters out events exceeding pod budget', () => {
    const results = suggestToPod({ size: 4, dietary: [], budgetCents: 1000 });
    for (const r of results) {
      assert.ok(r.estCostPerPersonCents <= 1000, `cost ${r.estCostPerPersonCents} exceeds 1000`);
    }
  });

  it('filters by pod dietary needs', () => {
    const results = suggestToPod({ size: 4, dietary: ['vegan'], budgetCents: 10000 });
    for (const r of results) {
      assert.ok(r.dietaryOptions.includes('vegan'), `event ${r.eventId} must support vegan`);
    }
  });

  it('free event appears for tight budget pod', () => {
    const results = suggestToPod({ size: 4, dietary: [], budgetCents: 500 }, 10);
    assert.ok(results.some(r => r.estCostPerPersonCents === 0), 'free event must be suggested');
  });

  it('pod larger than max venue capacity returns no results', () => {
    const results = suggestToPod({ size: 99, dietary: [], budgetCents: 100000 }, 10);
    assert.equal(results.length, 0);
  });

  it('filters by dow preference', () => {
    const results = suggestToPod({ size: 2, dietary: [], budgetCents: 10000, dow: 'fri' });
    for (const r of results) {
      assert.ok(r.venue.hours.fri, `venue ${r.venueId} must be open fri`);
    }
  });

  it('filters by tag preference', () => {
    const results = suggestToPod({ size: 4, dietary: [], budgetCents: 10000, tags: ['outdoor'] });
    for (const r of results) {
      assert.ok(r.tags.includes('outdoor'), `event ${r.eventId} must have outdoor tag`);
    }
  });
});

describe('listTags', () => {
  it('returns a sorted deduplicated array', () => {
    const tags = listTags();
    assert.ok(Array.isArray(tags));
    assert.ok(tags.length > 0);
    for (let i = 1; i < tags.length; i++) {
      assert.ok(tags[i] >= tags[i - 1], 'tags must be sorted');
    }
    assert.equal(new Set(tags).size, tags.length, 'tags must be deduplicated');
  });

  it('contains expected tags from fixture', () => {
    const tags = listTags();
    for (const expected of ['active', 'food', 'outdoor', 'nightlife', 'cultural']) {
      assert.ok(tags.includes(expected), `expected tag ${expected} to be present`);
    }
  });
});

describe('listDietaryOptions', () => {
  it('returns a sorted deduplicated array', () => {
    const opts = listDietaryOptions();
    assert.ok(Array.isArray(opts));
    assert.ok(opts.length > 0);
    for (let i = 1; i < opts.length; i++) {
      assert.ok(opts[i] >= opts[i - 1], 'dietary options must be sorted');
    }
    assert.equal(new Set(opts).size, opts.length, 'must be deduplicated');
  });

  it('contains expected dietary options from fixture', () => {
    const opts = listDietaryOptions();
    for (const expected of ['vegan', 'vegetarian', 'gluten-free', 'halal', 'kosher']) {
      assert.ok(opts.includes(expected), `expected ${expected} in dietary options`);
    }
  });
});
