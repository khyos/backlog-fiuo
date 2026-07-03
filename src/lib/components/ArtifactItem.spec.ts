/**
 * Contract tests for ArtifactItem.svelte
 *
 * These tests validate the external contract of ArtifactItem — what sections
 * appear or are hidden depending on the `userConnected` and `canEdit` props —
 * without relying on any implementation detail.
 *
 * Rendering is done via Svelte 5's SSR render() so no DOM is required.
 * All external I/O (fetch, ArtifactService) is mocked before the component
 * is imported so that side-effects never reach the network.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Module mocks — must be declared before any component import
// ---------------------------------------------------------------------------

// ArtifactService.getAsyncInfo is called in onMount; in SSR it never fires,
// but mocking it keeps the import graph clean.
vi.mock('$lib/services/ArtifactService', () => ({
    getAsyncInfo: vi.fn().mockResolvedValue({ description: null, poster: null }),
    getArtifact: vi.fn(),
    updateStatus: vi.fn().mockResolvedValue(undefined),
    updateScore: vi.fn().mockResolvedValue(undefined),
    updateDate: vi.fn().mockResolvedValue(undefined),
    addOwnership: vi.fn().mockResolvedValue(1),
    updateOwnership: vi.fn().mockResolvedValue(undefined),
    deleteOwnership: vi.fn().mockResolvedValue(undefined),
    linkArtifactToSubscription: vi.fn().mockResolvedValue(undefined),
    unlinkArtifactFromSubscription: vi.fn().mockResolvedValue(undefined),
}));

// LinkService.openLink is used inside ArtifactLinkManager
vi.mock('$lib/services/LinkService', () => ({
    openLink: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import { render } from 'svelte/server';
import { ArtifactType } from '$lib/model/Artifact';
import { Game } from '$lib/model/game/Game';
import { Genre } from '$lib/model/Genre';
import { Rating, RatingType } from '$lib/model/Rating';
import { initializeStore } from '$lib/stores/ArtifactItemStore';
import ArtifactItem from './ArtifactItem.svelte';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build a minimal but valid Game artifact and populate the store, then
 * render ArtifactItem with the given props.  Returns the HTML string output.
 */
function renderArtifactItem(props: { userConnected: boolean; canEdit: boolean }): string {
    const artifact = new Game(42, 'Half-Life 3', ArtifactType.GAME, new Date('2025-01-01'), 720);
    artifact.genres = [new Genre(1, 'FPS')];
    artifact.ratings = [new Rating(RatingType.METACRITIC, 95)];
    artifact.tags = [];
    artifact.links = [];
    artifact.platforms = [];
    artifact.userInfo = null;

    initializeStore(artifact);

    // render() returns { body, head }
    const { body } = render(ArtifactItem, { props });
    return body;
}

// ---------------------------------------------------------------------------
// Contract: prop surface — only userConnected and canEdit are accepted
// ---------------------------------------------------------------------------

// Validates that the component compiles and renders without crashing when
// only the declared props (userConnected, canEdit) are passed.
describe('ArtifactItem prop surface', () => {
    it('renders without throwing when only required props are supplied', () => {
        expect(() => renderArtifactItem({ userConnected: false, canEdit: false })).not.toThrow();
    });
});

// ---------------------------------------------------------------------------
// Contract: header section — always visible regardless of props
// ---------------------------------------------------------------------------

// The artifact title, type badge, genres, and ratings must always appear.
// They are part of the public "overview" and are never gated by user/edit status.
describe('ArtifactItem header (always visible)', () => {
    it('renders the artifact title', () => {
        const html = renderArtifactItem({ userConnected: false, canEdit: false });
        expect(html).toContain('Half-Life 3');
    });

    it('renders the artifact type badge', () => {
        const html = renderArtifactItem({ userConnected: false, canEdit: false });
        // The type value "game" must appear somewhere in the rendered output
        expect(html.toLowerCase()).toContain('game');
    });

    it('renders genre badges', () => {
        const html = renderArtifactItem({ userConnected: false, canEdit: false });
        expect(html).toContain('FPS');
    });

    it('renders the Ratings section heading', () => {
        const html = renderArtifactItem({ userConnected: false, canEdit: false });
        expect(html).toContain('Ratings');
    });

    it('renders individual rating values', () => {
        const html = renderArtifactItem({ userConnected: false, canEdit: false });
        expect(html).toContain('95');
    });
});

// ---------------------------------------------------------------------------
// Contract: userConnected=false — user-facing sections must NOT appear
// ---------------------------------------------------------------------------

// When no user is logged in, the user info panel (status select, score input,
// date pickers) and the ownership section must be absent.
describe('ArtifactItem with userConnected=false', () => {
    let html: string;

    beforeEach(() => {
        html = renderArtifactItem({ userConnected: false, canEdit: false });
    });

    it('does not render the user status selector', () => {
        // The status section label "Status" is inside the userConnected block
        expect(html).not.toContain('Select Status');
    });

    it('does not render the user rating input', () => {
        expect(html).not.toContain('Rate from 0-100');
    });

    it('does not render the ownership section ("Your copies")', () => {
        expect(html).not.toContain('Your copies');
    });
});

// ---------------------------------------------------------------------------
// Contract: canEdit=false — admin-only sections must NOT appear
// ---------------------------------------------------------------------------

// Link CRUD controls (Add / Refresh buttons) and the Subscription manage
// button are only visible to editors.
describe('ArtifactItem with canEdit=false', () => {
    it('does not render subscription Manage button', () => {
        const html = renderArtifactItem({ userConnected: true, canEdit: false });
        // The Manage button is inside the {#if canEdit} block in ArtifactSubscriptionManager
        expect(html).not.toContain('Manage');
    });

    it('does not render link Add/Refresh admin buttons', () => {
        const html = renderArtifactItem({ userConnected: true, canEdit: false });
        // Add and Refresh are inside {#if canEdit} blocks in ArtifactLinkManager
        // The links section heading "Links" is still rendered (it's outside the guard)
        // but the Add button text should not be present
        expect(html).not.toContain('>Add<');
        expect(html).not.toContain('>Refresh<');
    });
});

// ---------------------------------------------------------------------------
// Contract: userConnected=true — user-facing sections must appear
// ---------------------------------------------------------------------------

// The user info panel (status, score, date) and ownership section must
// be present when a user is connected.
describe('ArtifactItem with userConnected=true', () => {
    let html: string;

    beforeEach(() => {
        html = renderArtifactItem({ userConnected: true, canEdit: false });
    });

    it('renders the user status selector placeholder', () => {
        expect(html).toContain('Select Status');
    });

    it('renders the user rating input placeholder', () => {
        expect(html).toContain('Rate from 0-100');
    });

    it('renders the ownership section', () => {
        expect(html).toContain('Your copies');
    });
});

// ---------------------------------------------------------------------------
// Contract: userConnected=true, canEdit=true — all sections visible
// ---------------------------------------------------------------------------

// Every section must be present when both flags are true.
describe('ArtifactItem with userConnected=true and canEdit=true', () => {
    let html: string;

    beforeEach(() => {
        html = renderArtifactItem({ userConnected: true, canEdit: true });
    });

    it('renders user info panel', () => {
        expect(html).toContain('Select Status');
    });

    it('renders ownership section', () => {
        expect(html).toContain('Your copies');
    });

    it('renders subscription Manage button', () => {
        expect(html).toContain('Manage');
    });

    it('renders the Subscriptions section heading', () => {
        expect(html).toContain('Subscriptions');
    });

    it('renders link Add button', () => {
        expect(html).toContain('Add');
    });

    it('renders link Refresh button', () => {
        expect(html).toContain('Refresh');
    });
});
