type DraggableOptions = {
    canEdit: boolean;
    rank: number;
}

type DropzoneOptions = DraggableOptions & {
    onDrop: (srcRank: number, targetRank: number) => Promise<void>;
}

type DropzoneState = DropzoneOptions & {
    dropEffect: "move" | "none" | "copy" | "link";
    dragOverClass: string;
}

export function draggable(node: HTMLElement, options: DraggableOptions) {
    if (!options.canEdit) {
        return;
    }
    let state = {
        rank: options.rank
    };

    node.draggable = true;
    node.style.touchAction = 'pan-y';
    node.style.cursor = 'grab';

    const handleDragStart = (e: DragEvent) => {
        if (e.dataTransfer) {
            e.dataTransfer.setData('text/plain', JSON.stringify(state));
        }
    };
    node.addEventListener('dragstart', handleDragStart);

    return {
        update(options: DraggableOptions) {
            state = {
                rank: options.rank
            }
        },
        destroy() {
            node.removeEventListener('dragstart', handleDragStart);
        }
    }
}

export function dropzone(node: HTMLElement, options: DropzoneOptions) {
    if (!options.canEdit) {
        return;
    }
    const state: DropzoneState = {
        dropEffect: 'move',
        dragOverClass: 'droppable',
        ...options
    }

    const handleDragEnter = (e: DragEvent) => {
        if (e.target instanceof HTMLElement) {
            e.target.classList.add(state.dragOverClass);
        }
    };

    const handleDragLeave = (e: DragEvent) => {
        if (e.target instanceof HTMLElement) {
            e.target.classList.remove(state.dragOverClass);
        }
    };

    const handleDragOver = (e: DragEvent) => {
        e.preventDefault();
        if (e.dataTransfer) {
            e.dataTransfer.dropEffect = state.dropEffect;
        }
    };

    const handleDrop = (e: DragEvent) => {
        e.preventDefault();
        
        // Get data from dragged item
        if (!e.dataTransfer || !(e.currentTarget instanceof HTMLElement)) return;
        const srcData = JSON.parse(e.dataTransfer.getData('text/plain'));
        
        // Remove visual indication
        if (e.target instanceof HTMLElement) {
            e.target.classList.remove(state.dragOverClass);
        }

        // Calculate target rank based on drop position
        const targetHeight = e.currentTarget.getBoundingClientRect().height;
        let targetRank = state.rank;
        
        // If dropped in bottom half, increment target rank
        if (e.offsetY > targetHeight / 2) {
            targetRank += 1;
        }
        
        // Adjust for item removal position
        if (srcData.rank < targetRank) {
            targetRank -= 1;
        }
        
        // Call the provided onDrop callback
        state.onDrop(srcData.rank, targetRank);
    };

    node.addEventListener('dragenter', handleDragEnter);
    node.addEventListener('dragleave', handleDragLeave);
    node.addEventListener('dragover', handleDragOver);
    node.addEventListener('drop', handleDrop);
}