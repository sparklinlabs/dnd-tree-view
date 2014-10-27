module.exports = class TreeView

  constructor: (container, dropCallback) ->
    @_treeRoot = document.createElement 'ol'
    @_treeRoot.classList.add 'tree'
    container.appendChild @_treeRoot

    @selectedItems = []
    @_firstSelectedItem = null

    @_treeRoot.addEventListener 'click', @_onClick
    @_treeRoot.addEventListener 'dragstart', @_onDragStart
    @_treeRoot.addEventListener 'dragover', @_onDragOver
    @_treeRoot.addEventListener 'dragleave', @_onDragLeave
    @_treeRoot.addEventListener 'drop', @_onDrop

  clearSelection: ->
    selectedItem.classList.remove 'selected' for selectedItem in @selectedItems
    @selectedItems.length = 0
    @_firstSelectedItem = null
    return

  addToSelection: (itemElement) ->
    return if @selectedItems.indexOf(itemElement) != -1

    @selectedItems.push itemElement
    itemElement.classList.add 'selected'

    if @selectedItems.length == 1
      @_firstSelectedItem = itemElement
    return

  append: (element, type, parentGroupElement) ->
    throw new Error 'Invalid type' if type not in [ 'item', 'group' ]
    
    if parentGroupElement?
      throw new Error 'Invalid parent group' if parentGroupElement.tagName != 'LI' or ! parentGroupElement.classList.contains 'group'
      parentGroupElement = parentGroupElement.nextSibling
    else
      parentGroupElement = @_treeRoot

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
    selectedIndex = @selectedItems.indexOf element
    @selectedItems.splice selectedIndex, 1 if selectedIndex != -1
    if @_firstSelectedItem == element
        @_firstSelectedItem = @selectedItems[0]

    if element.classList.contains 'group'
      childrenElement = element.nextSibling

      removedSelectedItems = []
      for selectedItem in @selectedItems
        if childrenElement.contains selectedItem
          removedSelectedItems.push selectedItem

      while removedSelectedItems.length > 0
        removedSelectedItem = removedSelectedItems[removedSelectedItems.length - 1]
        @selectedItems.splice @selectedItems.indexOf(removedSelectedItem), 1
        if @_firstSelectedItem == removedSelectedItem
          @_firstSelectedItem = @selectedItems[0]

      element.parentElement.removeChild childrenElement

    element.parentElement.removeChild element
    return

  _onClick: (event) =>
    # Toggle groups
    if event.target.className == 'toggle'
      if event.target.parentElement.tagName == 'LI' and event.target.parentElement.classList.contains('group')
        event.target.parentElement.classList.toggle 'collapsed'
        return

    # Set selection
    @clearSelection() if ! event.shiftKey and ! event.ctrlKey

    element = event.target
    while element.tagName != 'LI' or (! element.classList.contains('item') and ! element.classList.contains('group'))
      return if element == @_treeRoot
      element = element.parentElement

    if @selectedItems.length > 0
      return if @selectedItems[0].parentElement != element.parentElement

    if event.shiftKey and @selectedItems.length > 0
      startElement = @_firstSelectedItem
      elements = []
      inside = false

      for child in element.parentElement.children
        if child == startElement or child == element
          if inside or startElement == element
            elements.push child
            break
          inside = true

        elements.push child if inside

      @clearSelection()
      @selectedItems = elements
      @_firstSelectedItem = startElement
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

    if @selectedItems.indexOf(event.target) == -1
      @clearSelection()
      @addToSelection event.target

    true

  _getDropInfo: (event) ->
    element = event.target

    return { target: element.lastChild, where: 'below' } if element == @_treeRoot

    while element.tagName != 'LI' or (! element.classList.contains('item') and ! element.classList.contains('group'))
      return null if element == @_treeRoot
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
    return false if @selectedItems.length == 0
    dropInfo = @_getDropInfo event

    # Prevent dropping onto null or descendant
    return false if ! dropInfo?
    return false if dropInfo.where == 'inside' and @selectedItems.indexOf(dropInfo.target) != -1

    for selectedItem in @selectedItems
      return false if selectedItem.classList.contains('group') and selectedItem.nextSibling.contains(dropInfo.target)

    @_clearDropClasses()
    dropInfo.target.classList.add "drop-#{dropInfo.where}"
    event.preventDefault()

  _clearDropClasses: ->
    @_treeRoot.querySelector('.drop-above')?.classList.remove('drop-above')
    @_treeRoot.querySelector('.drop-inside')?.classList.remove('drop-inside')
    @_treeRoot.querySelector('.drop-below')?.classList.remove('drop-below')
    return

  _onDragLeave: (event) =>
    dropInfo = @_getDropInfo event
    @_clearDropClasses()
    return

  _onDrop: (event) =>
    event.preventDefault()
    return if @selectedItems.length == 0

    dropInfo = @_getDropInfo event
    return if ! dropInfo?

    @_clearDropClasses()

    reparent = dropCallback?(dropInfo) ? true
    return if ! reparent

    switch dropInfo.where
      when 'inside'
        return if ! dropInfo.target.classList.contains 'group'
        
        newParent = dropInfo.target.nextSibling
        referenceElt = newParent.firstChild

      when 'below'
        newParent = dropInfo.target.parentElement
        referenceElt = dropInfo.target.nextSibling

      when 'above'
        newParent = dropInfo.target.parentElement
        referenceElt = dropInfo.target

    for selectedItem in @selectedItems
      if selectedItem.classList.contains 'group'
        draggedChildren = selectedItem.nextSibling
        draggedChildren.parentElement.removeChild draggedChildren

      if referenceElt == selectedItem
        referenceElt = selectedItem.nextSibling

      selectedItem.parentElement.removeChild selectedItem
      newParent.insertBefore selectedItem, referenceElt
      referenceElt = selectedItem.nextSibling

      if draggedChildren?
        newParent.insertBefore draggedChildren, referenceElt
        referenceElt = draggedChildren.nextSibling

    return
