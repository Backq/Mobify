import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { X, GripVertical, ChevronDown } from 'lucide-react';
import './Queue.css';

const SortableItem = ({ track, onRemove }) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: track.uniqueId || track.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 2 : 1,
        position: 'relative',
    };

    return (
        <div ref={setNodeRef} style={style} className={`queue-item ${isDragging ? 'dragging' : ''}`}>
            <div className="queue-drag-handle" {...attributes} {...listeners}>
                <GripVertical size={16} />
            </div>
            <div className="queue-item-info">
                <img src={track.thumbnail} alt="" className="queue-item-thumb" />
                <div className="queue-text">
                    <div className="queue-title">{track.title}</div>
                    <div className="queue-artist">{track.uploader}</div>
                </div>
            </div>
            <button className="queue-remove-btn" onClick={() => onRemove(track)}>
                <X size={16} />
            </button>
        </div>
    );
};

const Queue = ({ queue, isOpen, onReorder, onRemove, onClose }) => {
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8, // Prevent accidental drags
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = (event) => {
        const { active, over } = event;

        if (active.id !== over.id) {
            const oldIndex = queue.findIndex((t) => (t.uniqueId || t.id) === active.id);
            const newIndex = queue.findIndex((t) => (t.uniqueId || t.id) === over.id);

            // Pass the new order back to App
            onReorder(oldIndex, newIndex);
        }
    };

    if (!isOpen) return null;

    // We need unique IDs for drag and drop even if songs are duplicate.
    // Assuming 'uniqueId' might be added later, but for now fallback to 'id'.
    // NOTE: If duplicates exist in the queue, dnd-kit will glitch.
    // Ideally, App.jsx should ensure items have unique identifiers (e.g. random ID).
    // For now we assume typical usage.

    return (
        <div className="queue-container glass-panel">
            <div className="queue-header">
                <h3>Up Next</h3>
                <button className="queue-close-btn-mobile" onClick={onClose}>
                    <ChevronDown size={24} />
                </button>
            </div>
            <div className="queue-list">
                {queue.length === 0 ? (
                    <div className="queue-empty">Queue is empty</div>
                ) : (
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                    >
                        <SortableContext
                            items={queue.map(t => t.uniqueId || t.id)}
                            strategy={verticalListSortingStrategy}
                        >
                            {queue.map((track) => (
                                <SortableItem
                                    key={track.uniqueId || track.id}
                                    track={track}
                                    onRemove={onRemove}
                                />
                            ))}
                        </SortableContext>
                    </DndContext>
                )}
            </div>
            {/* Spacer */}
            <div style={{ height: '80px' }}></div>
        </div>
    );
};

export default Queue;
