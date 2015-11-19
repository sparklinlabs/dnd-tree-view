/// <reference path="../typings/tsd.d.ts" />
/// <reference path="../lib/TreeView.d.ts" />

import { EventEmitter } from "events";

class TreeView extends EventEmitter {

  treeRoot: HTMLOListElement;
  selectedNodes: HTMLLIElement[];
  dropCallback: TreeView.DropCallback;
  multipleSelection: boolean;

  _firstSelectedNode: HTMLLIElement;
  _hasDraggedOverAfterLeaving: boolean;

  constructor(container: HTMLDivElement, options?: { dropCallback?: TreeView.DropCallback, multipleSelection?: boolean }) {
    super();
    
    if (options == null) options = {};

    this.multipleSelection = (options.multipleSelection != null) ? options.multipleSelection : true;
    this.dropCallback =  options.dropCallback;
    this.treeRoot = document.createElement("ol");
    this.treeRoot.tabIndex = 0;
    this.treeRoot.classList.add("tree");
    container.appendChild(this.treeRoot);

    this.selectedNodes = [];
    this._firstSelectedNode = null;

    this.treeRoot.addEventListener("click", this._onClick);
    this.treeRoot.addEventListener("dblclick", this._onDoubleClick);
    this.treeRoot.addEventListener("keydown", this._onKeyDown);
    container.addEventListener("keydown", (event) => {
      if (event.keyCode === 37 || event.keyCode === 39) event.preventDefault();
    });
    
    if (this.dropCallback != null) {
      this.treeRoot.addEventListener("dragstart", this._onDragStart);
      this.treeRoot.addEventListener("dragover", this._onDragOver);
      this.treeRoot.addEventListener("dragleave", this._onDragLeave);
      this.treeRoot.addEventListener("drop", this._onDrop);
    }
  }

  clearSelection() {
    for (let selectedNode of this.selectedNodes) selectedNode.classList.remove("selected");
    this.selectedNodes.length = 0;
    this._firstSelectedNode = null;
  }

  addToSelection(element: HTMLLIElement) {
    if (this.selectedNodes.indexOf(element) !== -1) return;

    this.selectedNodes.push(element);
    element.classList.add("selected");

    if (this.selectedNodes.length === 1) this._firstSelectedNode = element;
  }
  
  scrollIntoView(element: HTMLLIElement) {
    let elementRect = element.getBoundingClientRect();
    let containerRect = this.treeRoot.parentElement.getBoundingClientRect();

    if (elementRect.top < containerRect.top) element.scrollIntoView(true);
    else if (elementRect.bottom > containerRect.bottom) element.scrollIntoView(false); 
  }

  append(element: HTMLLIElement, type: string, parentGroupElement: HTMLLIElement) {
    if (type !== "item" && type !== "group") throw new Error("Invalid type");

    let childrenElt: HTMLOListElement;
    let siblingsElt: HTMLOListElement;

    if (parentGroupElement != null) {
      if (parentGroupElement.tagName !== "LI" || !parentGroupElement.classList.contains("group")) throw new Error("Invalid parent group");
      siblingsElt = <HTMLOListElement>parentGroupElement.nextSibling;
    } else {
      siblingsElt = this.treeRoot;
    }

    if (!element.classList.contains(type)) {
      element.classList.add(type);
      if (this.dropCallback != null) element.draggable = true;

      if (type === "group") {
        let toggleElt = document.createElement("div");
        toggleElt.classList.add("toggle");
        element.insertBefore(toggleElt, element.firstChild);

        childrenElt = document.createElement("ol");
        childrenElt.classList.add("children");
      }
    } else if (type === "group") {
      childrenElt = <HTMLOListElement>element.nextSibling;
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
      if (this.dropCallback != null) element.draggable = true;

      if (type === "group") {
        let toggleElt = document.createElement("div");
        toggleElt.classList.add("toggle");
        element.insertBefore(toggleElt, element.firstChild);

        childrenElt = document.createElement("ol");
        childrenElt.classList.add("children");
      }
    } else if (type === "group") {
      childrenElt = <HTMLOListElement>element.nextSibling;
    }

    referenceElement.parentElement.insertBefore(element, referenceElement);
    if (childrenElt != null) referenceElement.parentElement.insertBefore(childrenElt, element.nextSibling);

    return element;
  }

  insertAt(element: HTMLLIElement, type: string, index: number, parentElement: HTMLLIElement) {
    let referenceElt: HTMLLIElement;

    if (index != null) {
      referenceElt =
        (parentElement != null)
          ? <HTMLLIElement>(<HTMLOListElement>parentElement.nextSibling).querySelector(`:scope > li:nth-of-type(${index + 1})`)
          : <HTMLLIElement>this.treeRoot.querySelector(`:scope > li:nth-of-type(${index + 1})`);
    }

    if (referenceElt != null) this.insertBefore(element, type, referenceElt);
    else this.append(element, type, parentElement);
  }

  remove(element: HTMLLIElement) {
    let selectedIndex = this.selectedNodes.indexOf(element);
    if (selectedIndex !== -1) this.selectedNodes.splice(selectedIndex, 1 );
    if (this._firstSelectedNode === element) this._firstSelectedNode = this.selectedNodes[0];

    if (element.classList.contains("group")) {
      let childrenElement = <HTMLElement>element.nextSibling;

      let removedSelectedNodes: HTMLLIElement[] = [];
      for (let selectedNode of this.selectedNodes) {
        if (childrenElement.contains(selectedNode)) {
          removedSelectedNodes.push(selectedNode);
        }
      }

      for (let removedSelectedNode of removedSelectedNodes) {
        this.selectedNodes.splice(this.selectedNodes.indexOf(removedSelectedNode), 1);
        if (this._firstSelectedNode === removedSelectedNode) this._firstSelectedNode = this.selectedNodes[0];
      }

      element.parentElement.removeChild(childrenElement);
    }

    element.parentElement.removeChild(element);
  }

  _onClick = (event: MouseEvent) => {
    // Toggle groups
    let element = <HTMLElement>event.target;

    if (element.className === "toggle") {
      if (element.parentElement.tagName === "LI" && element.parentElement.classList.contains("group")) {
        element.parentElement.classList.toggle("collapsed");
        return;
      }
    }

    // Update selection
    if (this._updateSelection(event)) this.emit("selectionChange");
  };

  // Returns whether the selection changed
  _updateSelection(event: MouseEvent) {
    let selectionChanged = false;

    if ((!this.multipleSelection || (!event.shiftKey && !event.ctrlKey)) && this.selectedNodes.length > 0) {
      this.clearSelection();
      selectionChanged = true;
    }

    let ancestorElement = <HTMLElement>event.target;
    while (ancestorElement.tagName !== "LI" || (!ancestorElement.classList.contains("item") && !ancestorElement.classList.contains("group"))) {
      if (ancestorElement === this.treeRoot) return selectionChanged;
      ancestorElement = ancestorElement.parentElement;
    }
    
    let element = <HTMLLIElement>ancestorElement;

    if (this.selectedNodes.length > 0 && this.selectedNodes[0].parentElement !== element.parentElement) {
      return selectionChanged;
    }

    if (this.multipleSelection && event.shiftKey && this.selectedNodes.length > 0) {
      let startElement = this._firstSelectedNode;
      let elements: HTMLLIElement[] = [];
      let inside = false;

      for (let i = 0; i < element.parentElement.children.length; i++) {
        let child = <HTMLElement>element.parentElement.children[i];

        if (child === startElement || child === element) {
          if (inside || startElement === element ) {
            elements.push(<HTMLLIElement>child);
            break;
          }
          inside = true;
        }

        if (inside && child.tagName === "LI") elements.push(<HTMLLIElement>child);
      }

      this.clearSelection();
      this.selectedNodes = elements;
      this._firstSelectedNode = startElement;
      for (let selectedNode of this.selectedNodes) selectedNode.classList.add("selected");

      return true;
    }

    let index: number;
    if (event.ctrlKey && (index = this.selectedNodes.indexOf(element)) !== -1) {
      this.selectedNodes.splice(index, 1);
      element.classList.remove("selected");

      if (this._firstSelectedNode === element) {
        this._firstSelectedNode = this.selectedNodes[0];
      }

      return true;
    }

    this.addToSelection(element);
    return true;
  }

  _onDoubleClick = (event: MouseEvent) => {
    if (this.selectedNodes.length !== 1) return;

    let element = <HTMLElement>event.target;
    if (element.className === "toggle") return;

    this.emit("activate");
  };
  
  _onKeyDown = (event: KeyboardEvent) => {
    if (document.activeElement !== this.treeRoot) return;
    
    if (this._firstSelectedNode == null) {
      // TODO: Remove once we have this._focusedNode
      if (event.keyCode === 40) {
        this.addToSelection(<HTMLLIElement>this.treeRoot.firstElementChild);
        this.emit("selectionChange");
        event.preventDefault();
      }
      return;
    }

    switch (event.keyCode) {
      case 38: // up
      case 40: // down
        this._moveVertically(event.keyCode === 40 ? 1 : -1);
        event.preventDefault();
        break;
      
      case 37: // left
      case 39: // right
        this._moveHorizontally(event.keyCode == 39 ? 1 : -1);
        event.preventDefault();
        break;
        
      case 13:
        if (this.selectedNodes.length !== 1) return;
        this.emit("activate");
        event.preventDefault();
        break;
    }
  }
  
  _moveVertically(offset: number) {
    // TODO: this._focusedNode;
    let node = this._firstSelectedNode;

    if (offset === -1) {
      if (node.previousElementSibling != null) {
        let target = <HTMLElement>node.previousElementSibling;

        while (target.classList.contains("children")) {
          if (!target.previousElementSibling.classList.contains("collapsed") && target.childElementCount > 0) target = <HTMLElement>target.lastElementChild;
          else target = <HTMLElement>target.previousElementSibling;
        }
        node = <HTMLLIElement>target;
      } else if (node.parentElement.classList.contains("children")) node = <HTMLLIElement>node.parentElement.previousElementSibling;
      else return;
    } else {
      let walkUp = false;
      if (node.classList.contains("group")) {
        if (!node.classList.contains("collapsed") && node.nextElementSibling.childElementCount > 0) node = <HTMLLIElement>node.nextElementSibling.firstElementChild;
        else if (node.nextElementSibling.nextElementSibling != null) node = <HTMLLIElement>node.nextElementSibling.nextElementSibling;
        else walkUp = true;
      } else {
        if (node.nextElementSibling != null) node = <HTMLLIElement>node.nextElementSibling;
        else walkUp = true;
      }
      
      if (walkUp) {
        if (node.parentElement.classList.contains("children")) {
          let target = <HTMLElement>node.parentElement;
          while (target.nextElementSibling == null) {
            target = target.parentElement;
            if (!target.classList.contains("children")) return;
          }
          node = <HTMLLIElement>target.nextElementSibling;
        } else return;
      }
    }

    if (node == null) return;

    this.clearSelection();
    this.addToSelection(node);
    this.scrollIntoView(node);
    this.emit("selectionChange");
  };

  _moveHorizontally = (offset: number) => {
    // TODO: this._focusedNode;
    let node = this._firstSelectedNode;
    
    if (offset === -1) {
      if (!node.classList.contains("group") || node.classList.contains("collapsed")) {
        if (!node.parentElement.classList.contains("children")) return;
        node = <HTMLLIElement>node.parentElement.previousElementSibling;
      } else if (node.classList.contains("group")) {
        node.classList.add("collapsed");
      }
    } else {
      if (node.classList.contains("group")) {
        if (node.classList.contains("collapsed")) node.classList.remove("collapsed");
        else node = <HTMLLIElement>node.nextSibling.firstChild;
      }
    }

    if (node == null) return;

    this.clearSelection();
    this.addToSelection(node);
    this.scrollIntoView(node);
    this.emit("selectionChange");
  }

  _onDragStart = (event: DragEvent) => {
    let element = <HTMLLIElement>event.target;
    if (element.tagName !== "LI") return false;
    if (!element.classList.contains("item") && !element.classList.contains("group")) return false;

    // NOTE: Required for Firefox to start the actual dragging
    // "try" is required for IE11 to not raise an exception
    try {
      event.dataTransfer.setData("text/plain", (<any>element.dataset).dndText ? (<any>element.dataset).dndText : null);
    } catch(e) {}

    if (this.selectedNodes.indexOf(element) === -1) {
      this.clearSelection();
      this.addToSelection(element);
      this.emit("selectionChange");
    }

    return true;
  }

  _getDropInfo(event: DragEvent): { target: HTMLLIElement, where: string } {
    let element = <HTMLElement>event.target;

    if (element.tagName === "OL" && element.classList.contains("children")) {
      element = element.parentElement;
    }

    if (element === this.treeRoot) {
      element = <HTMLElement>element.lastChild;
      if (element.tagName === "OL") element = <HTMLElement>element.previousSibling;
      return { target: <HTMLLIElement>element, where: "below" };
    }

    while (element.tagName !== "LI" || (!element.classList.contains("item") && !element.classList.contains("group"))) {
      if (element === this.treeRoot) return null;
      element = element.parentElement;
    }

    let where = this._getInsertionPoint(element, event.pageY);
    if (where === "below") {
      if (element.classList.contains("item") && element.nextSibling != null && (<HTMLElement>element.nextSibling).tagName === "LI") {
        element = <HTMLElement>element.nextSibling;
        where = "above";
      } else if (element.classList.contains("group") && element.nextSibling.nextSibling != null && (<HTMLElement>element.nextSibling.nextSibling).tagName === "LI") {
        element = <HTMLElement>element.nextSibling.nextSibling;
        where = "above";
      }
    }

    return { target: <HTMLLIElement>element, where: where };
  }

  _getInsertionPoint(element: HTMLElement, y: number) {
    let rect = element.getBoundingClientRect();
    let offset = y - rect.top;

    if (offset < rect.height / 4) return "above";
    if (offset > rect.height * 3 / 4) return (element.classList.contains("group") && (<HTMLElement>element.nextSibling).childElementCount > 0) ? "inside" : "below";
    return element.classList.contains("item") ? "below" : "inside";
  }

  _onDragOver = (event: DragEvent) => {
    if (this.selectedNodes.length === 0) return false;
    let dropInfo = this._getDropInfo(event);

    // Prevent dropping onto null or descendant
    if (dropInfo == null) return false;
    if (dropInfo.where === "inside" && this.selectedNodes.indexOf(dropInfo.target) !== -1) return false;

    for (let selectedNode of this.selectedNodes) {
      if (selectedNode.classList.contains("group") && (<HTMLElement>selectedNode.nextSibling).contains(dropInfo.target)) return false;
    }

    this._hasDraggedOverAfterLeaving = true;
    this._clearDropClasses();
    dropInfo.target.classList.add(`drop-${dropInfo.where}`);
    event.preventDefault();
  };

  _clearDropClasses() {
    let dropAbove = <HTMLElement>this.treeRoot.querySelector(".drop-above");
    if (dropAbove != null) dropAbove.classList.remove("drop-above");

    let dropInside = <HTMLElement>this.treeRoot.querySelector(".drop-inside");
    if (dropInside != null) dropInside.classList.remove("drop-inside");

    let dropBelow = <HTMLElement>this.treeRoot.querySelector(".drop-below");
    if (dropBelow != null) dropBelow.classList.remove("drop-below");
  }

  _onDragLeave = (event: DragEvent) => {
    this._hasDraggedOverAfterLeaving = false;
    setTimeout(() => { if (!this._hasDraggedOverAfterLeaving) this._clearDropClasses(); }, 300);
  };

  _onDrop = (event: DragEvent) => {
    event.preventDefault();
    if (this.selectedNodes.length === 0) return;

    let dropInfo = this._getDropInfo(event);
    if (dropInfo == null) return;

    this._clearDropClasses();

    let children = this.selectedNodes[0].parentElement.children;
    let orderedNodes: HTMLLIElement[] = [];

    for (let i = 0; i < children.length; i++) {
      let child = <HTMLLIElement>children[i];
      if (this.selectedNodes.indexOf(child) !== -1) orderedNodes.push(child);
    }

    let reparent = (this.dropCallback != null) ? this.dropCallback(dropInfo, orderedNodes) : true;
    if (!reparent) return;

    let newParent: HTMLElement;
    let referenceElt: HTMLElement;

    switch (dropInfo.where) {
      case "inside":
        if (!dropInfo.target.classList.contains("group")) return;

        newParent = <HTMLElement>dropInfo.target.nextSibling;
        referenceElt = <HTMLElement>newParent.firstChild;
        break;

      case "below":
        newParent = dropInfo.target.parentElement;
        referenceElt = <HTMLElement>dropInfo.target.nextSibling;
        if (referenceElt != null && referenceElt.tagName === "OL") referenceElt = <HTMLElement>referenceElt.nextSibling;
        break;

      case "above":
        newParent = dropInfo.target.parentElement;
        referenceElt = dropInfo.target;
        break;
    }

    let draggedChildren: HTMLElement;

    for (let selectedNode of orderedNodes) {
      if (selectedNode.classList.contains("group")) {
        draggedChildren = <HTMLElement>selectedNode.nextSibling;
        draggedChildren.parentElement.removeChild(draggedChildren);
      }

      if (referenceElt === selectedNode) {
        referenceElt = <HTMLElement>selectedNode.nextSibling;
      }

      selectedNode.parentElement.removeChild(selectedNode);
      newParent.insertBefore(selectedNode, referenceElt);
      referenceElt = <HTMLElement>selectedNode.nextSibling;

      if (draggedChildren != null) {
        newParent.insertBefore(draggedChildren, referenceElt);
        referenceElt = <HTMLElement>draggedChildren.nextSibling;
      }
    }
  }
}

export = TreeView;
