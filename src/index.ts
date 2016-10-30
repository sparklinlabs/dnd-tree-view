import { EventEmitter } from "events";

interface DragStartCallback {
  (event: DragEvent, nodeElt: HTMLLIElement): boolean;
}

interface DropLocation {
  target: HTMLLIElement|HTMLOListElement;
  where: string; // "above", "inside" or "below"
}

interface DropCallback {
  (event: DragEvent,
  dropLocation: DropLocation,
  orderedNodes: HTMLLIElement[]): boolean;
}

class TreeView extends EventEmitter {
  treeRoot: HTMLOListElement;
  selectedNodes: HTMLLIElement[];

  private dragStartCallback: DragStartCallback;
  private dropCallback: DropCallback;
  private multipleSelection: boolean;

  private firstSelectedNode: HTMLLIElement;
  private hasDraggedOverAfterLeaving: boolean;
  private isDraggingNodes: boolean;

  constructor(container: HTMLDivElement, options?: { dragStartCallback?: DragStartCallback, dropCallback?: DropCallback, multipleSelection?: boolean }) {
    super();

    if (options == null) options = {};

    this.multipleSelection = (options.multipleSelection != null) ? options.multipleSelection : true;
    this.dragStartCallback =  options.dragStartCallback;
    this.dropCallback =  options.dropCallback;
    this.treeRoot = document.createElement("ol");
    this.treeRoot.tabIndex = 0;
    this.treeRoot.classList.add("tree");
    container.appendChild(this.treeRoot);

    this.selectedNodes = [];
    this.firstSelectedNode = null;

    this.treeRoot.addEventListener("click", this.onClick);
    this.treeRoot.addEventListener("dblclick", this.onDoubleClick);
    this.treeRoot.addEventListener("keydown", this.onKeyDown);
    container.addEventListener("keydown", (event) => {
      if (event.keyCode === 37 || event.keyCode === 39) event.preventDefault();
    });

    if (this.dragStartCallback != null) {
      this.treeRoot.addEventListener("dragstart", this.onDragStart);
      this.treeRoot.addEventListener("dragend", this.onDragEnd);
    }

    if (this.dropCallback != null) {
      this.treeRoot.addEventListener("dragover", this.onDragOver);
      this.treeRoot.addEventListener("dragleave", this.onDragLeave);
      this.treeRoot.addEventListener("drop", this.onDrop);
    }
  }

  clearSelection() {
    for (const selectedNode of this.selectedNodes) selectedNode.classList.remove("selected");
    this.selectedNodes.length = 0;
    this.firstSelectedNode = null;
  }

  addToSelection(element: HTMLLIElement) {
    if (this.selectedNodes.indexOf(element) !== -1) return;

    this.selectedNodes.push(element);
    element.classList.add("selected");

    if (this.selectedNodes.length === 1) this.firstSelectedNode = element;
  }

  scrollIntoView(element: HTMLLIElement) {
    let ancestor = element.parentElement;
    while (ancestor != null && ancestor.className === "children") {
      ancestor.previousElementSibling.classList.remove("collapsed");
      ancestor = ancestor.parentElement;
    }

    const elementRect = element.getBoundingClientRect();
    const containerRect = this.treeRoot.parentElement.getBoundingClientRect();

    if (elementRect.top < containerRect.top) element.scrollIntoView(true);
    else if (elementRect.bottom > containerRect.bottom) element.scrollIntoView(false);
  }

  clear() {
    this.treeRoot.innerHTML = "";
    this.selectedNodes.length = 0;
    this.firstSelectedNode = null;
    this.hasDraggedOverAfterLeaving = false;
    this.isDraggingNodes = false;
  }

  append(element: HTMLLIElement, type: string, parentGroupElement?: HTMLLIElement) {
    if (type !== "item" && type !== "group") throw new Error("Invalid type");

    let childrenElt: HTMLOListElement;
    let siblingsElt: HTMLOListElement;

    if (parentGroupElement != null) {
      if (parentGroupElement.tagName !== "LI" || !parentGroupElement.classList.contains("group")) throw new Error("Invalid parent group");
      siblingsElt = parentGroupElement.nextSibling as HTMLOListElement;
    } else {
      siblingsElt = this.treeRoot;
    }

    if (!element.classList.contains(type)) {
      element.classList.add(type);
      if (this.dragStartCallback != null) element.draggable = true;

      if (type === "group") {
        const toggleElt = document.createElement("div");
        toggleElt.classList.add("toggle");
        element.insertBefore(toggleElt, element.firstChild);

        childrenElt = document.createElement("ol");
        childrenElt.classList.add("children");
      }
    } else if (type === "group") {
      childrenElt = element.nextSibling as HTMLOListElement;
    }

    siblingsElt.appendChild(element);
    if (childrenElt != null) siblingsElt.appendChild(childrenElt);

    return element;
  }

  insertBefore(element: HTMLLIElement, type: string, referenceElement: HTMLLIElement) {
    if (type !== "item" && type !== "group") throw new Error("Invalid type");
    if (referenceElement == null) throw new Error("A reference element is required");
    if (referenceElement.tagName !== "LI") throw new Error("Invalid reference element");

    let childrenElt: HTMLOListElement;

    if (!element.classList.contains(type)) {
      element.classList.add(type);
      if (this.dragStartCallback != null) element.draggable = true;

      if (type === "group") {
        let toggleElt = document.createElement("div");
        toggleElt.classList.add("toggle");
        element.insertBefore(toggleElt, element.firstChild);

        childrenElt = document.createElement("ol");
        childrenElt.classList.add("children");
      }
    } else if (type === "group") {
      childrenElt = element.nextSibling as HTMLOListElement;
    }

    referenceElement.parentElement.insertBefore(element, referenceElement);
    if (childrenElt != null) referenceElement.parentElement.insertBefore(childrenElt, element.nextSibling);

    return element;
  }

  insertAt(element: HTMLLIElement, type: string, index: number, parentElement?: HTMLLIElement) {
    let referenceElt: HTMLLIElement;

    if (index != null) {
      referenceElt =
        (parentElement != null)
          ? (parentElement.nextSibling as HTMLOListElement).querySelector(`:scope > li:nth-of-type(${index + 1})`) as HTMLLIElement
          : this.treeRoot.querySelector(`:scope > li:nth-of-type(${index + 1})`) as HTMLLIElement;
    }

    if (referenceElt != null) this.insertBefore(element, type, referenceElt);
    else this.append(element, type, parentElement);
  }

  remove(element: HTMLLIElement) {
    const selectedIndex = this.selectedNodes.indexOf(element);
    if (selectedIndex !== -1) {
      element.classList.remove("selected");
      this.selectedNodes.splice(selectedIndex, 1);
    }
    if (this.firstSelectedNode === element) this.firstSelectedNode = this.selectedNodes[0];

    if (element.classList.contains("group")) {
      const childrenElement = element.nextSibling as HTMLElement;

      const removedSelectedNodes: HTMLLIElement[] = [];
      for (const selectedNode of this.selectedNodes) {
        if (childrenElement.contains(selectedNode)) {
          removedSelectedNodes.push(selectedNode);
        }
      }

      for (const removedSelectedNode of removedSelectedNodes) {
        removedSelectedNode.classList.remove("selected");
        this.selectedNodes.splice(this.selectedNodes.indexOf(removedSelectedNode), 1);
        if (this.firstSelectedNode === removedSelectedNode) this.firstSelectedNode = this.selectedNodes[0];
      }

      element.parentElement.removeChild(childrenElement);
    }

    element.parentElement.removeChild(element);
  }

  private onClick = (event: MouseEvent) => {
    // Toggle groups
    const element = event.target as HTMLElement;

    if (element.className === "toggle") {
      if (element.parentElement.tagName === "LI" && element.parentElement.classList.contains("group")) {
        element.parentElement.classList.toggle("collapsed");
        return;
      }
    }

    // Update selection
    if (element.tagName === "BUTTON" || element.tagName === "INPUT" || element.tagName === "SELECT") return;
    if (this.updateSelection(event)) this.emit("selectionChange");
  };

  // Returns whether the selection changed
  private updateSelection(event: MouseEvent) {
    let selectionChanged = false;

    if ((!this.multipleSelection || (!event.shiftKey && !event.ctrlKey)) && this.selectedNodes.length > 0) {
      this.clearSelection();
      selectionChanged = true;
    }

    let ancestorElement = event.target as HTMLElement;
    while (ancestorElement.tagName !== "LI" || (!ancestorElement.classList.contains("item") && !ancestorElement.classList.contains("group"))) {
      if (ancestorElement === this.treeRoot) return selectionChanged;
      ancestorElement = ancestorElement.parentElement;
    }

    const element = ancestorElement as HTMLLIElement;

    if (this.selectedNodes.length > 0 && this.selectedNodes[0].parentElement !== element.parentElement) {
      return selectionChanged;
    }

    if (this.multipleSelection && event.shiftKey && this.selectedNodes.length > 0) {
      const startElement = this.firstSelectedNode;
      const elements: HTMLLIElement[] = [];
      let inside = false;

      for (let i = 0; i < element.parentElement.children.length; i++) {
        const child = element.parentElement.children[i] as HTMLElement;

        if (child === startElement || child === element) {
          if (inside || startElement === element ) {
            elements.push(child as HTMLLIElement);
            break;
          }
          inside = true;
        }

        if (inside && child.tagName === "LI") elements.push(child as HTMLLIElement);
      }

      this.clearSelection();
      this.selectedNodes = elements;
      this.firstSelectedNode = startElement;
      for (const selectedNode of this.selectedNodes) selectedNode.classList.add("selected");

      return true;
    }

    let index: number;
    if (event.ctrlKey && (index = this.selectedNodes.indexOf(element)) !== -1) {
      this.selectedNodes.splice(index, 1);
      element.classList.remove("selected");

      if (this.firstSelectedNode === element) {
        this.firstSelectedNode = this.selectedNodes[0];
      }

      return true;
    }

    this.addToSelection(element);
    return true;
  }

  private onDoubleClick = (event: MouseEvent) => {
    if (this.selectedNodes.length !== 1) return;

    let element = event.target as HTMLElement;
    if (element.tagName === "BUTTON" || element.tagName === "INPUT" || element.tagName === "SELECT") return;
    if (element.className === "toggle") return;

    this.emit("activate");
  };

  private onKeyDown = (event: KeyboardEvent) => {
    if (document.activeElement !== this.treeRoot) return;

    if (this.firstSelectedNode == null) {
      // TODO: Remove once we have this.focusedNode
      if (event.keyCode === 40) {
        this.addToSelection(this.treeRoot.firstElementChild as HTMLLIElement);
        this.emit("selectionChange");
        event.preventDefault();
      }
      return;
    }

    switch (event.keyCode) {
      case 38: // up
      case 40: // down
        this.moveVertically(event.keyCode === 40 ? 1 : -1);
        event.preventDefault();
        break;

      case 37: // left
      case 39: // right
        this.moveHorizontally(event.keyCode === 39 ? 1 : -1);
        event.preventDefault();
        break;

      case 13:
        if (this.selectedNodes.length !== 1) return;
        this.emit("activate");
        event.preventDefault();
        break;
    }
  };

  moveVertically(offset: number) {
    // TODO: this.focusedNode;
    let node = this.firstSelectedNode;

    if (offset === -1) {
      if (node.previousElementSibling != null) {
        let target = node.previousElementSibling as HTMLElement;

        while (target.classList.contains("children")) {
          if (!target.previousElementSibling.classList.contains("collapsed") && target.childElementCount > 0) target = target.lastElementChild as HTMLElement;
          else target = target.previousElementSibling as HTMLElement;
        }
        node = target as HTMLLIElement;
      } else if (node.parentElement.classList.contains("children")) node = node.parentElement.previousElementSibling as HTMLLIElement;
      else return;
    } else {
      let walkUp = false;
      if (node.classList.contains("group")) {
        if (!node.classList.contains("collapsed") && node.nextElementSibling.childElementCount > 0) node = node.nextElementSibling.firstElementChild as HTMLLIElement;
        else if (node.nextElementSibling.nextElementSibling != null) node = node.nextElementSibling.nextElementSibling as HTMLLIElement;
        else walkUp = true;
      } else {
        if (node.nextElementSibling != null) node = node.nextElementSibling as HTMLLIElement;
        else walkUp = true;
      }

      if (walkUp) {
        if (node.parentElement.classList.contains("children")) {
          let target = node.parentElement as HTMLElement;
          while (target.nextElementSibling == null) {
            target = target.parentElement;
            if (!target.classList.contains("children")) return;
          }
          node = target.nextElementSibling as HTMLLIElement;
        } else return;
      }
    }

    if (node == null) return;

    this.clearSelection();
    this.addToSelection(node);
    this.scrollIntoView(node);
    this.emit("selectionChange");
  };

  moveHorizontally = (offset: number) => {
    // TODO: this.focusedNode;
    let node = this.firstSelectedNode;

    if (offset === -1) {
      if (!node.classList.contains("group") || node.classList.contains("collapsed")) {
        if (!node.parentElement.classList.contains("children")) return;
        node = node.parentElement.previousElementSibling as HTMLLIElement;
      } else if (node.classList.contains("group")) {
        node.classList.add("collapsed");
      }
    } else {
      if (node.classList.contains("group")) {
        if (node.classList.contains("collapsed")) node.classList.remove("collapsed");
        else node = node.nextSibling.firstChild as HTMLLIElement;
      }
    }

    if (node == null) return;

    this.clearSelection();
    this.addToSelection(node);
    this.scrollIntoView(node);
    this.emit("selectionChange");
  };

  private onDragStart = (event: DragEvent) => {
    const element = event.target as HTMLLIElement;
    if (element.tagName !== "LI") return false;
    if (!element.classList.contains("item") && !element.classList.contains("group")) return false;

    if (this.selectedNodes.indexOf(element) === -1) {
      this.clearSelection();
      this.addToSelection(element);
      this.emit("selectionChange");
    }

    if (this.dragStartCallback != null && !this.dragStartCallback(event, element)) return false;

    this.isDraggingNodes = true;

    return true;
  };

  private onDragEnd = (event: DragEvent) => {
    this.isDraggingNodes = false;
  };

  private getDropLocation(event: DragEvent): DropLocation {
    let element = event.target as HTMLElement;

    if (element.tagName === "OL" && element.classList.contains("children")) {
      element = element.parentElement;
    }

    if (element === this.treeRoot) {
      element = element.lastChild as HTMLElement;
      if (element == null) return { target: this.treeRoot, where: "inside" };
      if (element.tagName === "OL") element = element.previousSibling as HTMLElement;
      return { target: element as HTMLLIElement, where: "below" };
    }

    while (element.tagName !== "LI" || (!element.classList.contains("item") && !element.classList.contains("group"))) {
      if (element === this.treeRoot) return null;
      element = element.parentElement;
    }

    let where = this.getInsertionPoint(element, event.pageY);
    if (where === "below") {
      if (element.classList.contains("item") && element.nextSibling != null && (element.nextSibling as HTMLElement).tagName === "LI") {
        element = element.nextSibling as HTMLElement;
        where = "above";
      } else if (element.classList.contains("group") && element.nextSibling.nextSibling != null && (element.nextSibling.nextSibling as HTMLElement).tagName === "LI") {
        element = element.nextSibling.nextSibling as HTMLElement;
        where = "above";
      }
    }

    return { target: element as HTMLLIElement, where };
  }

  private getInsertionPoint(element: HTMLElement, y: number) {
    const rect = element.getBoundingClientRect();
    const offset = y - rect.top;

    if (offset < rect.height / 4) return "above";
    if (offset > rect.height * 3 / 4) return (element.classList.contains("group") && (element.nextSibling as HTMLElement).childElementCount > 0) ? "inside" : "below";
    return element.classList.contains("item") ? "below" : "inside";
  }

  private onDragOver = (event: DragEvent) => {
    const dropLocation = this.getDropLocation(event);

    // Prevent dropping onto null
    if (dropLocation == null) return false;

    // If we're dragging nodes from the current tree view
    // Prevent dropping into descendant
    if (this.isDraggingNodes) {
      if (dropLocation.where === "inside" && this.selectedNodes.indexOf(dropLocation.target as HTMLLIElement) !== -1) return false;

      for (const selectedNode of this.selectedNodes) {
        if (selectedNode.classList.contains("group") && (selectedNode.nextSibling as HTMLElement).contains(dropLocation.target)) return false;
      }
    }

    this.hasDraggedOverAfterLeaving = true;
    this.clearDropClasses();
    dropLocation.target.classList.add(`drop-${dropLocation.where}`);
    event.preventDefault();
  };

  private clearDropClasses() {
    const dropAbove = this.treeRoot.querySelector(".drop-above") as HTMLElement;
    if (dropAbove != null) dropAbove.classList.remove("drop-above");

    const dropInside = this.treeRoot.querySelector(".drop-inside") as HTMLElement;
    if (dropInside != null) dropInside.classList.remove("drop-inside");

    const dropBelow = this.treeRoot.querySelector(".drop-below") as HTMLElement;
    if (dropBelow != null) dropBelow.classList.remove("drop-below");

    // For the rare case where we're dropping a foreign item into an empty tree view
    this.treeRoot.classList.remove("drop-inside");
  }

  private onDragLeave = (event: DragEvent) => {
    this.hasDraggedOverAfterLeaving = false;
    setTimeout(() => { if (!this.hasDraggedOverAfterLeaving) this.clearDropClasses(); }, 300);
  };

  private onDrop = (event: DragEvent) => {
    event.preventDefault();
    const dropLocation = this.getDropLocation(event);
    if (dropLocation == null) return;

    this.clearDropClasses();

    if (!this.isDraggingNodes) {
      this.dropCallback(event, dropLocation, null);
      return false;
    }

    const children = this.selectedNodes[0].parentElement.children;
    const orderedNodes: HTMLLIElement[] = [];

    for (let i = 0; i < children.length; i++) {
      const child = children[i] as HTMLLIElement;
      if (this.selectedNodes.indexOf(child) !== -1) orderedNodes.push(child);
    }

    const reparent = (this.dropCallback != null) ? this.dropCallback(event, dropLocation, orderedNodes) : true;
    if (!reparent) return;

    let newParent: HTMLElement;
    let referenceElt: HTMLElement;

    switch (dropLocation.where) {
      case "inside":
        if (!dropLocation.target.classList.contains("group")) return;

        newParent = dropLocation.target.nextSibling as HTMLElement;
        referenceElt = null;
        break;

      case "below":
        newParent = dropLocation.target.parentElement;
        referenceElt = dropLocation.target.nextSibling as HTMLElement;
        if (referenceElt != null && referenceElt.tagName === "OL") referenceElt = referenceElt.nextSibling as HTMLElement;
        break;

      case "above":
        newParent = dropLocation.target.parentElement;
        referenceElt = dropLocation.target;
        break;
    }

    let draggedChildren: HTMLElement;

    for (const selectedNode of orderedNodes) {
      if (selectedNode.classList.contains("group")) {
        draggedChildren = selectedNode.nextSibling as HTMLElement;
        draggedChildren.parentElement.removeChild(draggedChildren);
      }

      if (referenceElt === selectedNode) {
        referenceElt = selectedNode.nextSibling as HTMLElement;
      }

      selectedNode.parentElement.removeChild(selectedNode);
      newParent.insertBefore(selectedNode, referenceElt);
      referenceElt = selectedNode.nextSibling as HTMLElement;

      if (draggedChildren != null) {
        newParent.insertBefore(draggedChildren, referenceElt);
        referenceElt = draggedChildren.nextSibling as HTMLElement;
      }
    }
  };
}

export = TreeView;
