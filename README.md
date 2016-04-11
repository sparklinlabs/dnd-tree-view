# dnd-tree-view

Robust, stylable tree view widget for HTML5 apps.  
Features multiple item selection, keyboard navigation and cancellable drag'n'drop, suitable for networked apps.

## How to install

    npm install dnd-tree-view

## Usage

Check out the [live demo](http://sparklinlabs.github.io/dnd-tree-view/) and its [source code](https://github.com/sparklinlabs/dnd-tree-view/blob/master/src/index.jade).

 * Include `TreeView.js` in your page.
 * Create a container element, call `treeView = new TreeView(container)`.
 * Create a list item element (`<li>`), put whatever you want inside.
 * Use `treeView.append(listItem, type, optionalParent)` or `treeView.insertBefore(listItem, type, referenceListItem)` with `type` one of `'item'` or `'group'`.

The `TreeView` constructor takes an optional second `options` parameter. It supports the following keys:

 * `dragStartCallback` and `dropCallback` for handling drag'n'drop operations. 
 * `multipleSelection` is a boolean indicating whether to enable multiple item selection or not.

If `dragStartCallback` is not `null`, then dragging elements will be enabled.
It must return a boolean indicating whether to start the drag operation or cancel it.
You can use [`event.dataTransfer.setData(...)`](https://developer.mozilla.org/en-US/docs/Web/Guide/HTML/Drag_operations) to setup drag'n'drop metadata.

If `dropCallback` is not `null`, then dropping will be enabled.
It must return a boolean indicating whether to proceed with the reparenting/reordering or not.

See [index.d.ts](https://github.com/sparklinlabs/dnd-tree-view/blob/master/index.d.ts) for the full API and arguments.

## Building from source

 * Make sure you have a recent version of [Node.js](http://nodejs.org/) installed.
 * Clone the repository from `https://github.com/sparklinlabs/dnd-tree-view` and run `npm install` once
 * Run `npm run build` to build once or `npm run watch` to start a watcher that will rebuild when changes are detected
