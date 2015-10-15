# dnd-tree-view

Robust, stylable tree view widget for HTML5 apps.  
Features multiple item selection, keyboard navigation and cancellable drag'n'drop, suitable for networked apps.

## How to install

```
npm install dnd-tree-view
```

## Usage

Check out the [live demo](http://sparklinlabs.bitbucket.org/dnd-tree-view/doc/demo/) and its [source code](https://bitbucket.org/sparklinlabs/dnd-tree-view/src/tip/src/demo/).

 * Include ``TreeView.js`` in your page.
 * Create a container element, call ``treeView = new TreeView(container)``.
 * Create a list item element (``<li>``), put whatever you want inside.
 * Use ``treeView.append(listItem, type, optionalParent)`` or ``treeView.insertBefore(listItem, type, referenceListItem)`` with ``type`` one of ``'item'`` or ``'group'``.

The `TreeView` constructor takes an optional second `options` parameter. It supports the following keys:

 * `dropCallback` should be `null` or a function of the form `(dropInfo: { target: HTMLLIElement, where: string }, orderedNodes: HTMLElement[]) => boolean`. It'll be called when a drag'n'drop operation ends and must return whether to proceed with the reparenting/reordering or not.
 * `multipleSelection` is a boolean indicating whether to enable multiple item selection or not.

## Building from source

Make sure you have a recent version of [Node.js](http://nodejs.org/) installed.

 * Clone the Mercurial repository from ``https://bitbucket.org/sparklinlabs/dnd-tree-view``
 * Run ``npm install`` once
 * Run ``gulp`` to build ``lib/TreeView.js`` from the TypeScript source
