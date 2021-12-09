export class Queue {
    constructor(maxSize) {
       this.container = [];
     }
    isEmpty() {
       return this.container.length === 0;
    }
    enqueue(element) {
       this.container.push(element);
    }
    dequeue() {
       if (this.isEmpty()) {
          return null
       }
       return this.container.shift();
    }
    peek() {
       if (this.isEmpty()) {
          return null;
       }
       return this.container[0];
    }
    clear() {
       this.container = [];
    }
 }