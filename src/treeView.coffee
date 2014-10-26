# TODO:
# module.exports = class TreeView
# take a container as parameter and build the ol inside

window.treeView = (treeRoot, dropCallback) ->
  # TODO: Implement multiple selection
  selectedItems = []
  draggedItem = null

  clearSelection = ->
    selectedItem.classList.remove 'selected' for selectedItem in selectedItems
    selectedItems.length = 0
    return

  select = (itemElement) ->
    selectedItems.push itemElement
    itemElement.classList.add 'selected'
    return

  onClick = (event) ->
    # Toggle groups
    if event.target.className == 'icon'
      if event.target.parentElement.tagName == 'LI' and event.target.parentElement.classList.contains('group')
        event.target.parentElement.classList.toggle 'collapsed'
        return

    # Set selection
    element = event.target
    while element.tagName != 'LI' or (! element.classList.contains('item') and ! element.classList.contains('group'))
      return if element == treeRoot
      element = element.parentElement

    clearSelection() # if ! keepSelection
    select element
    return

  onDragStart = (event) ->
    return false if event.target.tagName not in [ 'LI', 'OL' ] or (! event.target.classList.contains('item') and ! event.target.classList.contains('group'))
    
    # NOTE: Required for Firefox to start the actual dragging
    # "try" is required for IE11 to not raise an exception
    try
      event.dataTransfer.setData 'text/plain', null

    draggedItem = event.target
    clearSelection()
    select draggedItem
    true

  getDropInfo = (event) ->
    element = event.target

    return { target: element.lastChild, where: 'below' } if element == treeRoot

    while element.tagName != 'LI' or (! element.classList.contains('item') and ! element.classList.contains('group'))
      return null if element == treeRoot
      element = element.parentElement

    where = getInsertionPoint element, event.pageY
    if where == 'below' and element.classList.contains('item') and element.nextSibling?.tagName == 'LI'
      element = element.nextSibling
      where = 'above'

    { target: element, where: where }

  getInsertionPoint = (element, y) ->
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

  onDragOver = (event) ->
    dropInfo = getDropInfo event

    # Prevent dropping onto null or descendant
    return false if ! dropInfo?
    return false if draggedItem.classList.contains('group') and draggedItem.nextSibling.contains(dropInfo.target)

    clearDropClasses()
    dropInfo.target.classList.add "drop-#{dropInfo.where}"
    event.preventDefault()

  clearDropClasses = ->
    treeRoot.querySelector('.drop-above')?.classList.remove('drop-above')
    treeRoot.querySelector('.drop-inside')?.classList.remove('drop-inside')
    treeRoot.querySelector('.drop-below')?.classList.remove('drop-below')
    return

  onDragLeave = (event) ->
    dropInfo = getDropInfo event
    clearDropClasses()
    return

  onDrop = (event) ->
    event.preventDefault()

    dropInfo = getDropInfo event
    return if ! dropInfo?

    clearDropClasses()
    return if dropInfo.target == draggedItem

    reparent = if dropCallback? then dropCallback(draggedItem, dropInfo.target) else true
    return if ! reparent

    draggedChildren = draggedItem.nextSibling if draggedItem.classList.contains 'group'

    switch dropInfo.where
      when 'inside'
        return if ! dropInfo.target.classList.contains 'group'
        
        draggedItem.parentElement.removeChild draggedItem
        newParent = dropInfo.target.nextSibling
        newParent.insertBefore draggedItem, newParent.firstChild

      when 'below'
        draggedItem.parentElement.removeChild draggedItem
        newParent = dropInfo.target.parentElement
        newParent.insertBefore draggedItem, dropInfo.target.nextSibling

      when 'above'
        draggedItem.parentElement.removeChild draggedItem
        newParent = dropInfo.target.parentElement
        newParent.insertBefore draggedItem, dropInfo.target

    if draggedChildren?
      draggedChildren.parentElement.removeChild draggedChildren
      newParent.insertBefore draggedChildren, draggedItem.nextSibling

    return


  treeRoot.addEventListener 'click', onClick
  treeRoot.addEventListener 'dragstart', onDragStart
  treeRoot.addEventListener 'dragover', onDragOver
  treeRoot.addEventListener 'dragleave', onDragLeave
  treeRoot.addEventListener 'drop', onDrop

  return
