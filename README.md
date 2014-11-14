# dnd-tree-view

Robust, stylable tree view widget for HTML5 apps.  
Features cancellable drag'n'drop, suitable for networked apps.

## How to install

(Not yet published)

```
npm install dnd-tree-view
```

## Usage

Check out the [live demo](http://sparklinlabs.bitbucket.org/dnd-tree-view/doc/demo/) and its [source code](https://bitbucket.org/sparklinlabs/dnd-tree-view/src/tip/src/demo/).

 * Include ``TreeView.js`` in your page.
 * Create a container element, call ``treeView = new TreeView(container)``.
 * Create a list item element (``<li>``), put whatever you want inside.
 * Use ``treeView.append(listItem, type, optionalParent)`` or ``treeView.insertBefore(listItem, type, referenceListItem)`` with ``type`` one of ``'item'`` or ``'group'``.

## Building from source

Make sure you have [Node.js](http://nodejs.org/) 0.10+ installed.

 * Clone the Mercurial repository from ``https://bitbucket.org/sparklinlabs/dnd-tree-view``
 * Run ``npm install`` once
 * Run ``gulp`` to build ``lib/TreeView.js`` from the CoffeeScript source.
 * Run ``gulp watch`` to start a watcher that will rebuild it anytime you make a change.
