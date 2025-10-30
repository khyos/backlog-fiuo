import type { Artifact } from '$lib/model/Artifact';
import { ArtifactDB } from '$lib/server/model/ArtifactDB';
import { UserArtifactStatus } from '$lib/model/UserArtifact';

/**
 * Generic function to handle ongoing artifacts processing
 */
export async function processOngoingArtifacts<T extends Artifact>(
	userId: number,
	artifacts: T[]
): Promise<T[]> {
	// Extract all artifact IDs
	const allArtifactIds: number[] = [];
	artifacts.forEach(artifact => {
		allArtifactIds.push(...artifact.getArtifactIds());
	});

	// Get user infos for all artifacts
	const userInfos = await ArtifactDB.getUserInfos(userId, allArtifactIds);
	const userInfosMap = Object.fromEntries(
		userInfos.map(userInfo => [userInfo.artifactId, userInfo])
	);

	// Set user infos and compute ongoing status for each artifact
	artifacts.forEach(artifact => {
		artifact.setUserInfos(userInfosMap);
		artifact.computeLastAndNextOngoing();
	});

	// Sort artifacts by ongoing status and next release date
	artifacts.sort((a, b) => {
		// Prioritize ON_GOING status
		if (a.userInfo?.status !== b.userInfo?.status) {
			if (a.userInfo?.status === UserArtifactStatus.ON_GOING) {
				return -1;
			} else {
				return 1;
			}
		}

		// Sort by next release date
		const aNext = a.lastAndNextOngoing.next;
		const bNext = b.lastAndNextOngoing.next;
		
		if (aNext === null && bNext === null) {
			return a.title.localeCompare(b.title);
		} else if (aNext === null) {
			return 1;
		} else if (bNext === null) {
			return -1;
		}
		
		return aNext.releaseDate < bNext.releaseDate ? -1 : 1;
	});

	return artifacts;
}