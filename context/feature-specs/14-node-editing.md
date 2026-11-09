Add resizing and inline label editing to canvas nodes.

## Implementation

1. Add resizing.
   - selected nodes should show resize handles
   - prevent nodes from being resized below a minimum size
   - keep resize handles subtle and consistent with the dark canvas UI

2. Add inline label editing.
   - keep the node label centered inside the node
   - double-click the center/label area of a node to edit its label
   - show placeholder text in the same centered position when the label is empty
   - keep editing smooth without causing layout shifts
   - show a textarea directly over the label while editing
   - update the label as users type
   - close editing on blur or `Escape`
   - prevent text editing interactions from dragging or panning the canvas

3. Keep all node updates connected to the existing collaborative canvas state.

4. Add deletion.
    - delete selected node/edge on `Delete`
    - deleted node should also delete all edges connected to it

5. Add multiple selection of nodes.
    - holding the right mouse button shows a blue rectangle, similar to Windows Home
    - the nodes and edges that intersect with the selecting rectangle are now all selected
    - the selected nodes maintain their information and edges
    - the selected nodes should be able to function as a unit
        - moving one node moves all the selected nodes collectively
        - scaling one node scales all the selected nodes proportionally
        - deleting one node deletes all selected nodes and their edges
        - undo/redo acts on the unit, not on each node individually

## Scope Limits

- don't change shape rendering from the previous unit
- don't change the shape panel or drag preview
- don't change how dropped nodes are created
- keep this focused on resize, selection, deletion, and label editing only

## Check When Done

- Selected nodes show resize handles.
- Resizing updates node dimensions through the existing node state flow.
- Double-clicking a node opens inline label editing.
- Label editing updates node labels through the existing sync flow.
- Editing closes on blur or Escape.
- Text interactions do not trigger canvas drag or pan.
- `npm run build` passes without type errors.