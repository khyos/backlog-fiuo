import { describe, it, expect, vi, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import { artifactItemStore, initializeStore, refreshArtifact, updateStatus, updateScore, updateDate, updateStartDate, updateEndDate } from './ArtifactItemStore';
import { ArtifactType } from '$lib/model/Artifact';
import { UserArtifactStatus } from '$lib/model/UserArtifact';
import * as ArtifactService from '$lib/services/ArtifactService';
import { Game } from '$lib/model/game/Game';

describe('ArtifactItemStore', () => {
    let mockArtifact: Game;
    let mockChildArtifact: Game;

    beforeEach(() => {
        // Create proper game instances
        mockArtifact = new Game(1, 'Test Artifact', ArtifactType.GAME, new Date(), 60);
        mockArtifact.genres = [];
        mockArtifact.ratings = [];
        mockArtifact.tags = [];
        mockArtifact.links = [];
        mockArtifact.platforms = [];
        vi.spyOn(mockArtifact, 'getArtifactById');
        vi.spyOn(mockArtifact, 'getArtifactIds');
        vi.spyOn(mockArtifact, 'updateUserStatus');
        vi.spyOn(mockArtifact, 'updateUserScore');
        vi.spyOn(mockArtifact, 'updateUserStartDate');
        vi.spyOn(mockArtifact, 'updateUserEndDate');
        vi.spyOn(mockArtifact, 'copyUserInfos');

        mockChildArtifact = new Game(2, 'Child Artifact', ArtifactType.GAME, new Date(), 30);
        mockChildArtifact.genres = [];
        mockChildArtifact.ratings = [];
        mockChildArtifact.tags = [];
        mockChildArtifact.links = [];
        mockChildArtifact.platforms = [];

        mockArtifact.children = [mockChildArtifact];

        // Mock all service functions
        vi.spyOn(ArtifactService, 'getArtifact').mockResolvedValue(mockArtifact);
        vi.spyOn(ArtifactService, 'updateStatus').mockResolvedValue();
        vi.spyOn(ArtifactService, 'updateScore').mockResolvedValue();
        vi.spyOn(ArtifactService, 'updateDate').mockResolvedValue();

        // Setup mock implementations
        (mockArtifact.getArtifactById as unknown as { mockReturnValue: (val: Game) => void }).mockReturnValue(mockArtifact);
        (mockArtifact.getArtifactIds as unknown as { mockReturnValue: (val: number[]) => void }).mockReturnValue([1, 2]);
    });

    describe('initializeStore', () => {
        it('should initialize the store with an artifact', () => {
            initializeStore(mockArtifact);
            const store = get(artifactItemStore);
            expect(store.artifact).toBe(mockArtifact);
        });
    });

    describe('refreshArtifact', () => {
        it('should refresh the artifact from the service', async () => {
            initializeStore(mockArtifact);
            await refreshArtifact();

            expect(ArtifactService.getArtifact).toHaveBeenCalledWith(ArtifactType.GAME, 1);
            expect(mockArtifact.copyUserInfos).toHaveBeenCalled();
            
            const store = get(artifactItemStore);
            expect(store.artifact).toBe(mockArtifact);
        });
    });

    describe('updateStatus', () => {
        beforeEach(() => {
            initializeStore(mockArtifact);
        });

        it('should update status for a single artifact', async () => {
            await updateStatus(1, UserArtifactStatus.ON_GOING);

            expect(ArtifactService.updateStatus).toHaveBeenCalledWith([1], UserArtifactStatus.ON_GOING);
            expect(mockArtifact.updateUserStatus).toHaveBeenCalledWith(UserArtifactStatus.ON_GOING);
        });

        it('should update status for all child artifacts when marking as finished', async () => {
            await updateStatus(1, UserArtifactStatus.FINISHED);

            expect(ArtifactService.updateStatus).toHaveBeenCalledWith([1, 2], UserArtifactStatus.FINISHED);
            expect(mockArtifact.updateUserStatus).toHaveBeenCalledWith(UserArtifactStatus.FINISHED);
        });

        it('should throw error when artifact is not found', async () => {
            vi.spyOn(mockArtifact, 'getArtifactById').mockReturnValue(null);

            await expect(updateStatus(999, UserArtifactStatus.ON_GOING))
                .rejects.toThrow('Artifact Not Found');
        });
    });

    describe('updateScore', () => {
        beforeEach(() => {
            initializeStore(mockArtifact);
        });

        it('should update the artifact score', async () => {
            const score = 8.5;
            await updateScore(score);

            expect(ArtifactService.updateScore).toHaveBeenCalledWith(1, score);
            expect(mockArtifact.updateUserScore).toHaveBeenCalledWith(score);
        });

        it('should handle null score', async () => {
            await updateScore(null);

            expect(ArtifactService.updateScore).toHaveBeenCalledWith(1, null);
            expect(mockArtifact.updateUserScore).toHaveBeenCalledWith(null);
        });
    });

    describe('date updates', () => {
        beforeEach(() => {
            initializeStore(mockArtifact);
        });

        it('should update both dates', async () => {
            const date = new Date();
            await updateDate(date);

            expect(ArtifactService.updateDate).toHaveBeenCalledWith(1, date, 'both');
            expect(mockArtifact.updateUserStartDate).toHaveBeenCalledWith(date);
            expect(mockArtifact.updateUserEndDate).toHaveBeenCalledWith(date);
        });

        it('should update start date only', async () => {
            const date = new Date();
            await updateStartDate(date);

            expect(ArtifactService.updateDate).toHaveBeenCalledWith(1, date, 'start');
            expect(mockArtifact.updateUserStartDate).toHaveBeenCalledWith(date);
        });

        it('should update end date only', async () => {
            const date = new Date();
            await updateEndDate(date);

            expect(ArtifactService.updateDate).toHaveBeenCalledWith(1, date, 'end');
            expect(mockArtifact.updateUserEndDate).toHaveBeenCalledWith(date);
        });
    });
});