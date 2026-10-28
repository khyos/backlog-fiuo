export type TierId = number | null;

type DraggableOptions = {
    canEdit: boolean;
    artifactId: number;
    sourceTierId: TierId;
    sourceIndex: number;
}

type DropzoneOptions = {
    canEdit: boolean;
    tierId: TierId;
    position: number;
    itemArtifactId?: number;
    horizontal?: boolean;
    onDrop: (artifactId: number, sourceTierId: TierId, targetTierId: TierId, targetPosition: number) => void | Promise<void>;
}

type DropzoneState = DropzoneOptions & {
    dropEffect: "move" | "none" | "copy" | "link";
    dragOverClass: string;
}

/**
 * Pure drop-position computation extracted from `handleDrop` so the exact
 * branches of the within-tier reorder fix can be unit-tested in isolation.
 *
 * - `basePosition` is the hovered item's (or container's) index.
 * - For horizontal item dropzones, hovering past the item's horizontal midpoint
 *   inserts AFTER it (`+1`).
 * - When the drag stays inside the same tier/pool (`sourceTierId === targetTierId`,
 *   where `null === null` is the Unranked pool) and the source sat BEFORE the
 *   insertion index, the index is decremented by 1 to account for the item being
 *   removed from its source first (so the value handed to `moveItem` is already
 *   the post-removal index it expects).
 *
 * This function must stay behaviourally identical to the inline logic in
 * `handleDrop`.
 */
export function computeTargetPosition(args: {
    basePosition: number;
    horizontal?: boolean;
    offsetX: number;
    targetWidth: number;
    sourceTierId: TierId;
    targetTierId: TierId;
    sourceIndex: number;
}): number {
    let targetPosition = args.basePosition;
    if (args.horizontal && args.offsetX > args.targetWidth / 2) {
        targetPosition += 1;
    }
    if (args.sourceTierId === args.targetTierId && args.sourceIndex < targetPosition) {
        targetPosition -= 1;
    }
    return targetPosition;
}

const INDICATOR_CLASSES = ['drop-before', 'drop-after', 'drop-end'];
const markedNodes = new Set<HTMLElement>();

function clearIndicators() {
    for (const node of markedNodes) {
        node.classList.remove(...INDICATOR_CLASSES);
    }
    markedNodes.clear();
}

function markIndicator(node: HTMLElement, className: string) {
    clearIndicators();
    node.classList.add(className);
    markedNodes.add(node);
}

export function draggable(node: HTMLElement, options: DraggableOptions) {
    if (!options.canEdit) {
        return;
    }
    let state = {
        artifactId: options.artifactId,
        sourceTierId: options.sourceTierId,
        sourceIndex: options.sourceIndex
    };

    node.draggable = true;
    node.style.touchAction = 'pan-y';
    node.style.cursor = 'grab';

    const handleDragStart = (e: DragEvent) => {
        if (e.dataTransfer) {
            e.dataTransfer.setData('text/plain', JSON.stringify(state));
        }
    };
    const handleDragEnd = () => {
        clearIndicators();
    };
    node.addEventListener('dragstart', handleDragStart);
    node.addEventListener('dragend', handleDragEnd);

    return {
        update(options: DraggableOptions) {
            state = {
                artifactId: options.artifactId,
                sourceTierId: options.sourceTierId,
                sourceIndex: options.sourceIndex
            }
        },
        destroy() {
            node.removeEventListener('dragstart', handleDragStart);
            node.removeEventListener('dragend', handleDragEnd);
        }
    }
}

export function dropzone(node: HTMLElement, options: DropzoneOptions) {
    if (!options.canEdit) {
        return;
    }
    let state: DropzoneState = {
        dropEffect: 'move',
        dragOverClass: 'droppable',
        ...options
    }

    const indicatorClassFor = (e: DragEvent, target: HTMLElement): string => {
        if (state.itemArtifactId !== undefined && state.horizontal) {
            const rect = target.getBoundingClientRect();
            // Measure against the item's own box (clientX - rect.left) rather
            // than e.offsetX, which is relative to whichever child (img/title)
            // the pointer is over and would be off by the item's padding.
            return e.clientX - rect.left > rect.width / 2 ? 'drop-after' : 'drop-before';
        }
        return 'drop-end';
    };

    const handleDragEnter = (e: DragEvent) => {
        if (e.currentTarget instanceof HTMLElement) {
            e.currentTarget.classList.add(state.dragOverClass);
        }
    };

    const handleDragLeave = (e: DragEvent) => {
        if (e.currentTarget instanceof HTMLElement) {
            e.currentTarget.classList.remove(state.dragOverClass);
        }
        clearIndicators();
    };

    const handleDragOver = (e: DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.dataTransfer) {
            e.dataTransfer.dropEffect = state.dropEffect;
        }
        if (e.currentTarget instanceof HTMLElement) {
            markIndicator(e.currentTarget, indicatorClassFor(e, e.currentTarget));
        }
    };

    const handleDrop = (e: DragEvent) => {
        e.preventDefault();
        e.stopPropagation();

        clearIndicators();
        if (e.currentTarget instanceof HTMLElement) {
            e.currentTarget.classList.remove(state.dragOverClass);
        }

        if (!e.dataTransfer || !(e.currentTarget instanceof HTMLElement)) return;
        const srcData = JSON.parse(e.dataTransfer.getData('text/plain'));

        if (state.itemArtifactId !== undefined && srcData.artifactId === state.itemArtifactId) {
            return;
        }

        const rect = e.currentTarget.getBoundingClientRect();
        const targetPosition = computeTargetPosition({
            basePosition: state.position,
            horizontal: state.horizontal,
            offsetX: e.clientX - rect.left,
            targetWidth: rect.width,
            sourceTierId: srcData.sourceTierId,
            targetTierId: state.tierId,
            sourceIndex: srcData.sourceIndex
        });

        state.onDrop(srcData.artifactId, srcData.sourceTierId, state.tierId, targetPosition);
    };

    node.addEventListener('dragenter', handleDragEnter);
    node.addEventListener('dragleave', handleDragLeave);
    node.addEventListener('dragover', handleDragOver);
    node.addEventListener('drop', handleDrop);

    return {
        update(options: DropzoneOptions) {
            state = {
                ...state,
                ...options
            };
        },
        destroy() {
            node.removeEventListener('dragenter', handleDragEnter);
            node.removeEventListener('dragleave', handleDragLeave);
            node.removeEventListener('dragover', handleDragOver);
            node.removeEventListener('drop', handleDrop);
        }
    };
}
