
window.treeView = (treeRoot, dropCallback) ->
  # TODO: Implement focus, multiple selection and toggling of children
  selected = []
  dragged = null

  onDragStart = (event) ->
    return false if event.target.tagName not in [ 'LI', 'OL' ] or (! event.target.classList.contains('item') and ! event.target.classList.contains('group'))
    
    # NOTE: Required for Firefox to start the actual dragging
    # "try" is required for IE11 to not raise an exception
    try
      event.dataTransfer.setData 'text/plain', null

    dragged = event.target
    true

  getDropInfo = (event) ->
    element = event.target

    return { target: element.lastChild, where: 'below' } if element == treeRoot

    while element.tagName != 'LI' or (! element.classList.contains('item') and ! element.classList.contains('group'))
      element = element.parentElement
      return null if element == treeRoot

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
    return false if dragged.classList.contains('group') and dragged.nextSibling.contains(dropInfo.target)

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
    return if dropInfo.target == dragged

    reparent = if dropCallback? then dropCallback(dragged, dropInfo.target) else true
    return if ! reparent

    draggedChildren = dragged.nextSibling if dragged.classList.contains 'group'

    switch dropInfo.where
      when 'inside'
        return if ! dropInfo.target.classList.contains 'group'
        
        dragged.parentElement.removeChild dragged
        newParent = dropInfo.target.nextSibling
        newParent.insertBefore dragged, newParent.firstChild

      when 'below'
        dragged.parentElement.removeChild dragged
        newParent = dropInfo.target.parentElement
        newParent.insertBefore dragged, dropInfo.target.nextSibling

      when 'above'
        dragged.parentElement.removeChild dragged
        newParent = dropInfo.target.parentElement
        newParent.insertBefore dragged, dropInfo.target

    if draggedChildren?
      draggedChildren.parentElement.removeChild draggedChildren
      newParent.insertBefore draggedChildren, dragged.nextSibling

    return
  
  treeRoot.addEventListener 'dragstart', onDragStart
  treeRoot.addEventListener 'dragover', onDragOver
  treeRoot.addEventListener 'dragleave', onDragLeave
  treeRoot.addEventListener 'drop', onDrop

  onClick = (event) ->
    return if event.target.className != 'icon'
    return if event.target.parentElement.tagName != 'LI' or ! event.target.parentElement.classList.contains('group')

    event.target.parentElement.classList.toggle 'collapsed'
    return

  treeRoot.addEventListener 'click', onClick

  return