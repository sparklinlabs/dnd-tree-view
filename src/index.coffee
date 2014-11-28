{ EventEmitter } = require('events')

module.exports = class TreeView extends EventEmitter

  constructor: (container, @dropCallback) ->
    @treeRoot = document.createElement 'ol'
    @treeRoot.classList.add 'tree'
    container.appendChild @treeRoot

    @selectedNodes = []
    @_firstSelectedNode = null

    @treeRoot.addEventListener 'click', @_onClick
    @treeRoot.addEventListener 'dblclick', @_onDoubleClick
    @treeRoot.addEventListener 'dragstart', @_onDragStart
    @treeRoot.addEventListener 'dragover', @_onDragOver
    @treeRoot.addEventListener 'dragleave', @_onDragLeave
    @treeRoot.addEventListener 'drop', @_onDrop

  clearSelection: ->
    selectedNode.classList.remove 'selected' for selectedNode in @selectedNodes
    @selectedNodes.length = 0
    @_firstSelectedNode = null
    return

  addToSelection: (nodeElement) ->
    return if @selectedNodes.indexOf(nodeElement) != -1

    @selectedNodes.push nodeElement
    nodeElement.classList.add 'selected'

    if @selectedNodes.length == 1
      @_firstSelectedNode = nodeElement
    return

  append: (element, type, parentGroupElement) ->
    throw new Error 'Invalid type' if type not in [ 'item', 'group' ]
    
    if parentGroupElement?
      throw new Error 'Invalid parent group' if parentGroupElement.tagName != 'LI' or ! parentGroupElement.classList.contains 'group'
      parentGroupElement = parentGroupElement.nextSibling
    else
      parentGroupElement = @treeRoot

     if ! element.classList.contains type
      element.classList.add type
      element.draggable = true

      if type == 'group'
        toggleElt = document.createElement('div')
        toggleElt.classList.add 'toggle'
        element.insertBefore toggleElt, element.firstChild

        childrenElt = document.createElement 'ol'
        childrenElt.classList.add 'children'
    else if type == 'group'
      childrenElt = element.nextSibling

    parentGroupElement.appendChild element
    parentGroupElement.appendChild childrenElt if childrenElt?

    element

  insertBefore: (element, type, referenceElement) ->
    throw new Error 'Invalid type' if type not in [ 'item', 'group' ]
    throw new Error 'A reference element is required' if ! referenceElement?
    throw new Error 'Invalid reference element' if referenceElement.tagName != 'LI'

    if ! element.classList.contains type
      element.classList.add type
      element.draggable = true

      if type == 'group'
        toggleElt = document.createElement('div')
        toggleElt.classList.add 'toggle'
        element.insertBefore toggleElt, element.firstChild

        childrenElt = document.createElement 'ol'
        childrenElt.classList.add 'children'
    else if type == 'group'
      childrenElt = element.nextSibling

    referenceElement.parentElement.insertBefore element, referenceElement
    referenceElement.parentElement.insertBefore childrenElt, element.nextSibling if childrenElt?
    
    element

  insertAt: (element, type, index, parentElement) ->
    if index?
      referenceElt =
        if parentElement? then parentElement.nextSibling.querySelector(":scope > li:nth-of-type(#{index + 1})")
        else @treeRoot.querySelector(":scope > li:nth-of-type(#{index + 1})")

    if referenceElt? then @insertBefore element, type, referenceElt
    else @append element, type, parentElement

    return

  remove: (element) ->
    selectedIndex = @selectedNodes.indexOf element
    @selectedNodes.splice selectedIndex, 1 if selectedIndex != -1
    if @_firstSelectedNode == element
        @_firstSelectedNode = @selectedNodes[0]

    if element.classList.contains 'group'
      childrenElement = element.nextSibling

      removedSelectedNodes = []
      for selectedNode in @selectedNodes
        if childrenElement.contains selectedNode
          removedSelectedNodes.push selectedNode

      while removedSelectedNodes.length > 0
        removedSelectedNode = removedSelectedNodes[removedSelectedNodes.length - 1]
        @selectedNodes.splice @selectedNodes.indexOf(removedSelectedNode), 1
        if @_firstSelectedNode == removedSelectedNode
          @_firstSelectedNode = @selectedNodes[0]

      element.parentElement.removeChild childrenElement

    element.parentElement.removeChild element
    return

  _onClick: (event) =>
    # Toggle groups
    if event.target.className == 'toggle'
      if event.target.parentElement.tagName == 'LI' and event.target.parentElement.classList.contains('group')
        event.target.parentElement.classList.toggle 'collapsed'
        return

    # Update selection
    @emit 'selectionChange' if @_updateSelection event

    return

  # Returns whether the selection changed
  _updateSelection: (event) ->
    selectionChanged = false

    if ! event.shiftKey and ! event.ctrlKey and @selectedNodes.length > 0
      @clearSelection()
      selectionChanged = true

    element = event.target
    while element.tagName != 'LI' or (! element.classList.contains('item') and ! element.classList.contains('group'))
      return selectionChanged if element == @treeRoot
      element = element.parentElement

    if @selectedNodes.length > 0 and @selectedNodes[0].parentElement != element.parentElement
      return selectionChanged

    if event.shiftKey and @selectedNodes.length > 0
      startElement = @_firstSelectedNode
      elements = []
      inside = false

      for child in element.parentElement.children
        if child == startElement or child == element
          if inside or startElement == element
            elements.push child
            break
          inside = true

        elements.push child if inside and child.tagName == 'LI'

      @clearSelection()
      @selectedNodes = elements
      @_firstSelectedNode = startElement
      selectedNode.classList.add 'selected' for selectedNode in @selectedNodes

      return true

    if event.ctrlKey and (index = @selectedNodes.indexOf(element)) != -1
      @selectedNodes.splice index, 1
      element.classList.remove 'selected'

      if @_firstSelectedNode == element
        @_firstSelectedNode = @selectedNodes[0]

      return true

    @addToSelection element
    true

  _onDoubleClick: (event) =>
    return if @selectedNodes.length != 1
    @emit 'activate'
    return

  _onDragStart: (event) =>
    return false if event.target.tagName not in [ 'LI', 'OL' ] or (! event.target.classList.contains('item') and ! event.target.classList.contains('group'))
    
    # NOTE: Required for Firefox to start the actual dragging
    # "try" is required for IE11 to not raise an exception
    try
      event.dataTransfer.setData 'text/plain', null

    if @selectedNodes.indexOf(event.target) == -1
      @clearSelection()
      @addToSelection event.target

    true

  _getDropInfo: (event) ->
    element = event.target

    if element.tagName == 'OL' and element.classList.contains 'children'
      element = element.parentElement

    if element == @treeRoot
      element = element.lastChild
      element = element.previousSibling if element.tagName == 'OL'
      return { target: element, where: 'below' }

    while element.tagName != 'LI' or (! element.classList.contains('item') and ! element.classList.contains('group'))
      return null if element == @treeRoot
      element = element.parentElement

    where = @_getInsertionPoint element, event.pageY
    if where == 'below'
      if element.classList.contains('item') and element.nextSibling?.tagName == 'LI'
        element = element.nextSibling
        where = 'above'
      else if element.classList.contains('group') and element.nextSibling.nextSibling?.tagName == 'LI'
        element = element.nextSibling.nextSibling
        where = 'above'

    { target: element, where: where }

  _getInsertionPoint: (element, y) ->
    rect = element.getBoundingClientRect()
    offset = y - rect.top

    if offset < rect.height / 4
      'above'
    else if offset > rect.height * 3 / 4
      if element.classList.contains('group') and element.nextSibling.childElementCount > 0
        'inside'
      else
        'below'
    else
      if element.classList.contains('item')
        'below'
      else
        'inside'

  _onDragOver: (event) =>
    return false if @selectedNodes.length == 0
    dropInfo = @_getDropInfo event

    # Prevent dropping onto null or descendant
    return false if ! dropInfo?
    return false if dropInfo.where == 'inside' and @selectedNodes.indexOf(dropInfo.target) != -1

    for selectedNode in @selectedNodes
      return false if selectedNode.classList.contains('group') and selectedNode.nextSibling.contains(dropInfo.target)

    @hasDraggedOverAfterLeaving = true
    @_clearDropClasses()
    dropInfo.target.classList.add "drop-#{dropInfo.where}"
    event.preventDefault()

  _clearDropClasses: ->
    @treeRoot.querySelector('.drop-above')?.classList.remove('drop-above')
    @treeRoot.querySelector('.drop-inside')?.classList.remove('drop-inside')
    @treeRoot.querySelector('.drop-below')?.classList.remove('drop-below')
    return

  _onDragLeave: (event) =>
    @hasDraggedOverAfterLeaving = false
    setTimeout ( => @_clearDropClasses() if ! @hasDraggedOverAfterLeaving ), 300
    return

  _onDrop: (event) =>
    event.preventDefault()
    return if @selectedNodes.length == 0

    dropInfo = @_getDropInfo event
    return if ! dropInfo?

    @_clearDropClasses()

    children = @selectedNodes[0].parentElement.children
    orderedNodes = ( child for child in children when @selectedNodes.indexOf(child) != -1 )

    reparent = @dropCallback?(dropInfo, orderedNodes) ? true
    return if ! reparent

    switch dropInfo.where
      when 'inside'
        return if ! dropInfo.target.classList.contains 'group'
        
        newParent = dropInfo.target.nextSibling
        referenceElt = newParent.firstChild

      when 'below'
        newParent = dropInfo.target.parentElement
        referenceElt = dropInfo.target.nextSibling
        referenceElt = referenceElt.nextSibling if referenceElt?.tagName == 'OL'

      when 'above'
        newParent = dropInfo.target.parentElement
        referenceElt = dropInfo.target

    for selectedNode in orderedNodes
      if selectedNode.classList.contains 'group'
        draggedChildren = selectedNode.nextSibling
        draggedChildren.parentElement.removeChild draggedChildren

      if referenceElt == selectedNode
        referenceElt = selectedNode.nextSibling

      selectedNode.parentElement.removeChild selectedNode
      newParent.insertBefore selectedNode, referenceElt
      referenceElt = selectedNode.nextSibling

      if draggedChildren?
        newParent.insertBefore draggedChildren, referenceElt
        referenceElt = draggedChildren.nextSibling

    return
