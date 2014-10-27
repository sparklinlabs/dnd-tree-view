module.exports = class TreeView

  constructor: (container, dropCallback) ->
    @treeRoot = document.createElement 'ol'
    @treeRoot.classList.add 'tree'
    container.appendChild @treeRoot

    @selectedItems = []
    # TODO: Implement dragging of multiple items
    @draggedItem = null

    @treeRoot.addEventListener 'click', @_onClick
    @treeRoot.addEventListener 'dragstart', @_onDragStart
    @treeRoot.addEventListener 'dragover', @_onDragOver
    @treeRoot.addEventListener 'dragleave', @_onDragLeave
    @treeRoot.addEventListener 'drop', @_onDrop

  clearSelection: ->
    selectedItem.classList.remove 'selected' for selectedItem in @selectedItems
    @selectedItems.length = 0
    return

  addToSelection: (itemElement) ->
    return if @selectedItems.indexOf(itemElement) != -1

    @selectedItems.push itemElement
    itemElement.classList.add 'selected'
    return

  append: (element, type, parentGroupElement) ->
    throw new Error 'Invalid type' if type not in [ 'item', 'group' ]
    
    if parentGroupElement?
      throw new Error 'Invalid parent group' if parentGroupElement.tagName != 'LI' or ! parentGroupElement.classList.contains 'group'
      parentGroupElement = parentGroupElement.nextSibling
    else
      parentGroupElement = @treeRoot

    element.classList.add type
    element.draggable = true

    if type == 'group'
      toggleElt = document.createElement('div')
      toggleElt.classList.add 'toggle'
      element.insertBefore toggleElt, element.firstChild

      childrenElt = document.createElement 'ol'
      childrenElt.classList.add 'children'

    parentGroupElement.appendChild element
    parentGroupElement.appendChild childrenElt if childrenElt?

    element

  insertBefore: (element, type, referenceElement) ->
    throw new Error 'Invalid type' if type not in [ 'item', 'group' ]
    throw new Error 'A reference element is required' if ! referenceElement?
    throw new Error 'Invalid reference element' if referenceElement.tagName != 'LI'

    element.classList.add type
    element.draggable = true

    if type == 'group'
      toggleElt = document.createElement('div')
      toggleElt.classList.add 'toggle'
      element.insertBefore toggleElt, element.firstChild

      childrenElt = document.createElement 'ol'
      childrenElt.classList.add 'children'

    referenceElement.parentElement.insertBefore element, referenceElement.nextSibling
    referenceElement.parentElement.insertBefore childrenElt, element if childrenElt?
    
    element

  remove: (element) ->
    @draggedItem = null if @draggedItem == element

    selectedIndex = @selectedItems.indexOf element
    @selectedItems.splice selectedIndex, 1 if selectedIndex != -1

    if element.classList.contains 'group'
      childrenElement = element.nextSibling

      removedSelectedItems = []
      for selectedItem in @selectedItems
        if childrenElement.contains selectedItem
          removedSelectedItems.push selectedItem

      while removedSelectedItems.length > 0
        removedSelectedItem = removedSelectedItems[removedSelectedItems.length - 1]
        @selectedItems.splice @selectedItems.indexOf(removedSelectedItem), 1

      element.parentElement.removeChild childrenElement

    element.parentElement.removeChild element
    return

  _onClick: (event) =>
    # Toggle groups
    if event.target.className == 'toggle'
      if event.target.parentElement.tagName == 'LI' and event.target.parentElement.classList.contains('group')
        event.target.parentElement.classList.toggle 'collapsed'
        return

    keepSelection = event.shiftKey or event.ctrlKey
    @clearSelection() if ! keepSelection

    # Set selection
    element = event.target
    while element.tagName != 'LI' or (! element.classList.contains('item') and ! element.classList.contains('group'))
      return if element == @treeRoot
      element = element.parentElement

    if @selectedItems.length > 0
      return if @selectedItems[0].parentElement != element.parentElement

    if event.shiftKey and @selectedItems.length > 0
      startElement = @selectedItems[0]
      elements = []
      inside = false

      for child in element.parentElement.children
        if child == startElement or child == element
          if inside or startElement == element
            elements.push child
            break
          inside = true

        elements.push child if inside

      if elements[elements.length - 1] == startElement
        # Ensure the start point is still at the start
        elements.splice 0, 0, elements.splice(elements.length - 1, 1)[0]

      @clearSelection()
      @selectedItems = elements
      selectedItem.classList.add 'selected' for selectedItem in @selectedItems
    else
      @addToSelection element
    return

  _onDragStart: (event) =>
    return false if event.target.tagName not in [ 'LI', 'OL' ] or (! event.target.classList.contains('item') and ! event.target.classList.contains('group'))
    
    # NOTE: Required for Firefox to start the actual dragging
    # "try" is required for IE11 to not raise an exception
    try
      event.dataTransfer.setData 'text/plain', null

    @draggedItem = event.target
    @clearSelection()
    @addToSelection @draggedItem
    true

  _getDropInfo: (event) ->
    element = event.target

    return { target: element.lastChild, where: 'below' } if element == @treeRoot

    while element.tagName != 'LI' or (! element.classList.contains('item') and ! element.classList.contains('group'))
      return null if element == @treeRoot
      element = element.parentElement

    where = @_getInsertionPoint element, event.pageY
    if where == 'below' and element.classList.contains('item') and element.nextSibling?.tagName == 'LI'
      element = element.nextSibling
      where = 'above'

    { target: element, where: where }

  _getInsertionPoint: (element, y) ->
    rect = element.getBoundingClientRect()
    offset = y - rect.top

    if offset < rect.height / 4
      'above'
    else if offset > rect.height * 3 / 4
      if element.classList.contains('group')
        'inside'
      else
        'below'
    else
      if element.classList.contains('item')
        'below'
      else
        'inside'

  _onDragOver: (event) =>
    return false if ! @draggedItem?
    dropInfo = @_getDropInfo event

    # Prevent dropping onto null or descendant
    return false if ! dropInfo?
    return false if @draggedItem.classList.contains('group') and @draggedItem.nextSibling.contains(dropInfo.target)

    @_clearDropClasses()
    dropInfo.target.classList.add "drop-#{dropInfo.where}"
    event.preventDefault()

  _clearDropClasses: ->
    @treeRoot.querySelector('.drop-above')?.classList.remove('drop-above')
    @treeRoot.querySelector('.drop-inside')?.classList.remove('drop-inside')
    @treeRoot.querySelector('.drop-below')?.classList.remove('drop-below')
    return

  _onDragLeave: (event) =>
    dropInfo = @_getDropInfo event
    @_clearDropClasses()
    return

  _onDrop: (event) =>
    event.preventDefault()
    return if ! @draggedItem?

    dropInfo = @_getDropInfo event
    return if ! dropInfo?

    @_clearDropClasses()
    return if dropInfo.target == @draggedItem

    reparent = dropCallback?(@draggedItem, dropInfo) ? true
    return if ! reparent

    draggedChildren = @draggedItem.nextSibling if @draggedItem.classList.contains 'group'

    switch dropInfo.where
      when 'inside'
        return if ! dropInfo.target.classList.contains 'group'
        
        @draggedItem.parentElement.removeChild @draggedItem
        newParent = dropInfo.target.nextSibling
        newParent.insertBefore @draggedItem, newParent.firstChild

      when 'below'
        @draggedItem.parentElement.removeChild @draggedItem
        newParent = dropInfo.target.parentElement
        newParent.insertBefore @draggedItem, dropInfo.target.nextSibling

      when 'above'
        @draggedItem.parentElement.removeChild @draggedItem
        newParent = dropInfo.target.parentElement
        newParent.insertBefore @draggedItem, dropInfo.target

    if draggedChildren?
      draggedChildren.parentElement.removeChild draggedChildren
      newParent.insertBefore draggedChildren, @draggedItem.nextSibling

    return
