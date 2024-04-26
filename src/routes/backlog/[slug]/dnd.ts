export function draggable(node: any, options: { canEdit: boolean, rank: number }) {
    if (!options.canEdit) {
        return;
    }
    let state = {
        rank: options.rank
    }

    node.draggable = true;
    node.style.touchAction = 'pan-y';
    node.style.cursor = 'grab';

    const handleDragStart = (e: any) => {
        e.dataTransfer.setData('text/plain', JSON.stringify(state));
    };
    node.addEventListener('dragstart', handleDragStart);

    return {
        update(options: { canEdit: boolean, rank: number }) {
            state = {
                rank: options.rank
            }
        },
        destroy() {
            node.removeEventListener('dragstart', handleDragStart);
        }
    }
}

export function dropzone(node: any, options: any) {
    if (!options.canEdit) {
        return;
    }
    let state = {
        dropEffect: 'move',
        dragOverClass: 'droppable',
        ...options
    }

    const handleDragEnter = (e: any) => {
        e.target.classList.add(state.dragOverClass);
    }

    const handleDragLeave = (e: any) => {
        e.target.classList.remove(state.dragOverClass);
    }

    const handleDragOver = (e: any) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = state.dropEffect;
    }

    const handleDrop = (e: any) => {
        e.preventDefault();
        const srcData = JSON.parse(e.dataTransfer.getData('text/plain'));
        e.target.classList.remove(state.dragOverClass);

        const targetHeight = e.currentTarget.getBoundingClientRect().height;
        let targetRank = state.rank;
        if (e.offsetY > targetHeight / 2) {
            targetRank += 1;
        }
        if (srcData.rank < targetRank) {
            targetRank -= 1;
        }
        state.onDrop(srcData.rank, targetRank);
    }

    node.addEventListener('dragenter', handleDragEnter);
    node.addEventListener('dragleave', handleDragLeave);
    node.addEventListener('dragover', handleDragOver);
    node.addEventListener('drop', handleDrop);
}