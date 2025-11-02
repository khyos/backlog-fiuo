import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { ArtifactType } from '$lib/model/Artifact';
import { Game } from '$lib/model/game/Game';
import { BacklogItem } from '$lib/model/BacklogItem';
import { Backlog, BacklogRankingType } from '$lib/model/Backlog';
import * as ArtifactService from '$lib/services/ArtifactService';
import { get } from 'svelte/store';
import { backlogStore } from '../../routes/backlog/[slug]/stores/BacklogStore';
import { pageStore } from '../../routes/backlog/[slug]/stores/PageStore';
import { orderByFightStore, startOrderByFight, getRandomItemA, getRandomItemB, updateSimilarElo, updateItemA } from './OrderByFightStore';
import { Tag, TagType } from '$lib/model/Tag';
import { createBacklogFilters } from '../../routes/backlog/[slug]/BacklogFilters';

describe('OrderByFightStore', () => {
    // Mock game artifacts
    const mockGame1 = new Game(1, 'Game 1', ArtifactType.GAME, new Date(), 0);
    const mockGame2 = new Game(2, 'Game 2', ArtifactType.GAME, new Date(), 0);
    
    // Mock BacklogItems with real Tag instances
    const mockBacklogItem1 = new BacklogItem(1, 1500, Date.now(), mockGame1, [new Tag('tag1', TagType.DEFAULT)]);
    const mockBacklogItem2 = new BacklogItem(2, 1600, Date.now(), mockGame2, [new Tag('tag2', TagType.DEFAULT)]);
    
    // Mock Backlog
    const mockBacklog = new Backlog(1, 1, BacklogRankingType.RANK, 'Test Backlog', ArtifactType.GAME);
    mockBacklog.backlogItems = [mockBacklogItem1, mockBacklogItem2];

    beforeEach(() => {
        // Reset stores to initial state
        backlogStore.set({ 
            backlog: mockBacklog,
            backlogFilters: createBacklogFilters(ArtifactType.GAME, BacklogRankingType.RANK)
        });
        pageStore.set({ 
            openDrawer: false,
            selectedTab: 'filters',
            isCopiedToastVisible: false,
            showMoveToBacklog: false,
            showMoveToRank: false
        });
        orderByFightStore.set({
            artifactType: ArtifactType.GAME,
            fightType: 'rank',
            pickType: 'locked',
            highestValue: 1,
            lowestValue: 0,
            similarElo: false
        });

        // Mock getPosterURL
        vi.spyOn(ArtifactService, 'getPosterURL').mockResolvedValue('mock-poster-url');
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('startOrderByFight', () => {
        it('should open drawer and set order tab when starting a fight', async () => {
            await startOrderByFight();
            const pageState = get(pageStore);
            expect(pageState.openDrawer).toBe(true);
            expect(pageState.selectedTab).toBe('order');
        });

        it('should throw error when backlog has less than 2 items', async () => {
            const singleItemBacklog = new Backlog(1, 1, BacklogRankingType.RANK, 'Test Backlog', ArtifactType.GAME);
            singleItemBacklog.backlogItems = [mockBacklogItem1];
            backlogStore.set({ 
                backlog: singleItemBacklog,
                backlogFilters: createBacklogFilters(ArtifactType.GAME, BacklogRankingType.RANK)
            });

            await expect(startOrderByFight()).rejects.toThrow("You can't fight alone");
        });

        it('should set correct store values when starting with artifactId', async () => {
            await startOrderByFight(1);
            const store = get(orderByFightStore);
            expect(store.pickType).toBe('locked');
            expect(store.itemA?.artifact.id).toBe(1);
            expect(store.itemB).toBeDefined();
            expect(store.itemB?.artifact.id).not.toBe(1);
        });

        it('should initialize with random items when no artifactId provided', async () => {
            await startOrderByFight();
            const store = get(orderByFightStore);
            expect(store.itemA).toBeDefined();
            expect(store.itemB).toBeDefined();
            expect(store.itemA?.artifact.id).not.toBe(store.itemB?.artifact.id);
        });
    });

    describe('getRandomItems and updateItems', () => {
        it('should set random item A', async () => {
            await getRandomItemA();
            const store = get(orderByFightStore);
            expect(store.itemA).toBeDefined();
            expect([1, 2]).toContain(store.itemA?.artifact.id);
        });
        /*
        it('should set random item B different from item A', async () => {
            orderByFightStore.update(s => ({ ...s, itemA: mockBacklogItem1 }));
            await getRandomItemB();
            const store = get(orderByFightStore);
            expect(store.itemB).toBeDefined();
            expect(store.itemB?.artifact.id).not.toBe(store.itemA?.artifact.id);
        });
        */

        it('should update item A correctly', async () => {
            orderByFightStore.update(s => ({ ...s, itemA: mockBacklogItem1 }));
            await updateItemA();
            const store = get(orderByFightStore);
            expect(store.itemA).toBeDefined();
            expect(store.itemA?.artifact.id).toBe(mockBacklogItem1.artifact.id);
        });
    });

    describe('similar ELO functionality', () => {
        it('should update similarElo flag', () => {
            updateSimilarElo(true);
            const store = get(orderByFightStore);
            expect(store.similarElo).toBe(true);
        });

        it('should select item B with similar ELO when enabled', async () => {
            const mockBacklogItem1WithElo = new BacklogItem(1, 1500, Date.now(), mockGame1, [new Tag('tag1', TagType.DEFAULT)]);
            const mockBacklogItem2WithElo = new BacklogItem(2, 1550, Date.now(), mockGame2, [new Tag('tag2', TagType.DEFAULT)]);
            
            const backlogWithElo = new Backlog(1, 1, BacklogRankingType.ELO, 'Test Backlog', ArtifactType.GAME);
            backlogWithElo.backlogItems = [mockBacklogItem1WithElo, mockBacklogItem2WithElo];
            backlogStore.set({ 
                backlog: backlogWithElo,
                backlogFilters: createBacklogFilters(ArtifactType.GAME, BacklogRankingType.ELO)
            });

            orderByFightStore.update(s => ({ 
                ...s, 
                itemA: mockBacklogItem1WithElo,
                similarElo: true 
            }));

            await getRandomItemB();
            const store = get(orderByFightStore);
            expect(store.itemB).toBeDefined();
            expect(Math.abs(store.itemB!.elo - store.itemA!.elo)).toBeLessThan(100);
        });
        /*
        it('should fallback to random selection when no items within ELO range', async () => {
            // Create three items with very different ELO scores
            const mockBacklogItem1WithElo = new BacklogItem(1, 1500, Date.now(), mockGame1, [new Tag('tag1', TagType.DEFAULT)]);
            const mockBacklogItem2WithElo = new BacklogItem(2, 2500, Date.now(), mockGame2, [new Tag('tag2', TagType.DEFAULT)]); // ELO difference > 100
            
            const backlogWithElo = new Backlog(1, 1, BacklogRankingType.ELO, 'Test Backlog', ArtifactType.GAME);
            backlogWithElo.backlogItems = [mockBacklogItem1WithElo, mockBacklogItem2WithElo];

            backlogStore.set({
                backlog: backlogWithElo,
                backlogFilters: createBacklogFilters(ArtifactType.GAME, BacklogRankingType.ELO)
            });

            orderByFightStore.update(s => ({ 
                ...s, 
                itemA: mockBacklogItem1WithElo,
                similarElo: true,
                highestValue: 1,
                lowestValue: backlogWithElo.backlogItems.length
            }));

            await getRandomItemB();
            const store = get(orderByFightStore);
            expect(store.itemB).toBeDefined();
            // Should still get an item through the fallback random selection
            expect(store.itemB!.artifact.id).toBe(mockBacklogItem2WithElo.artifact.id);
        });
        */
    });

    describe('poster updates', () => {
        it('should update posters when items change', async () => {
            await startOrderByFight();
            const store = get(orderByFightStore);
            
            // Wait for poster updates to complete
            await new Promise(resolve => setTimeout(resolve, 0));
            
            expect(ArtifactService.getPosterURL).toHaveBeenCalledWith(
                ArtifactType.GAME,
                store.itemA?.artifact.id
            );
            expect(ArtifactService.getPosterURL).toHaveBeenCalledWith(
                ArtifactType.GAME,
                store.itemB?.artifact.id
            );
        });

        it('should handle missing items gracefully', async () => {
            orderByFightStore.update(s => ({ ...s, itemA: undefined, itemB: undefined }));
            const store = get(orderByFightStore);
            expect(store.itemAPoster).toBeUndefined();
            expect(store.itemBPoster).toBeUndefined();
        });
    });
});