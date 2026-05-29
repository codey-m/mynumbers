// Explainer entry point
import { seedHistoryIfNeeded, bindPopstate } from './history';
import { initSampler } from './sampler';
import { initPerms } from './perms';
import { initCarousel } from './carousel';

// Run history seeding immediately (synchronous, before DOM ready)
seedHistoryIfNeeded();
bindPopstate();

// Initialize interactive slides and carousel
initSampler();
initPerms();
initCarousel();
