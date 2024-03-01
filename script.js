const { fromEvent, interval} = rxjs;
const { map, filter, withLatestFrom, startWith, tap} = rxjs.operators;

class Item {
  constructor(x, y, size, shape, color) {
    this.x = x;
    this.y = y;
    this.size = size; //for circle, the size is the diameter
    this.shape = shape;
    this.color = color;
  }


// Check if the item is being hovered over
  isHovered(mouseX, mouseY) {
      const distance = Math.sqrt((mouseX - this.x) ** 2 + (mouseY - this.y) ** 2);
      return distance < this.size; // For circle, size is treated as radius
  }

  render(ctx, isHovered, isClicked) {
    ctx.fillStyle = this.color;
    const finalSize = isHovered ? this.size * 1.3 : this.size; // Enlarge if hovered

    switch (this.shape) {
      case 'circle':
        ctx.beginPath();
        ctx.arc(this.x, this.y, finalSize/2, 0, Math.PI * 2);
        ctx.fill();
        break;
      case 'square':
        ctx.fillRect(this.x - finalSize/2, this.y - finalSize/2, finalSize, finalSize);
        break;
      // Add more shapes as needed
    }
      if (isClicked) {
          // Draw a dot in the center if clicked
          ctx.fillStyle = 'black'; // Dot color
          ctx.beginPath();
          ctx.arc(this.x, this.y, 5, 0, Math.PI * 2);
          ctx.fill();
      }
    }

}

class World {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.items = [];
  }

addItem(itemOrItems) {
    if (Array.isArray(itemOrItems)) {
        this.items = this.items.concat(itemOrItems);
    } else {
        this.items.push(itemOrItems);
    }
}

render(hoveredItemId, clickedItemId) {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height); // Clear canvas
    this.items.forEach((item, index) => {
      const isHovered = index === hoveredItemId;
      const isClicked = index === clickedItemId;
      item.render(this.ctx, isHovered, isClicked);
    });
  }
}

function getHoveredItem(items, mousePos) {
  if (!mousePos) return null; // If no mouse position, return null

  const hoveredId = items.findIndex(item => item.isHovered(mousePos.x, mousePos.y));
  return hoveredId >= 0 ? hoveredId : null;
}

// Main execution function
function main() {
  const world = new World('myCanvas');
  const items = [
    new Item(100, 100, 30, 'circle', 'red'),
    new Item(200, 100, 40, 'square', 'blue'),
    new Item(300, 150, 50, 'circle', 'green'),
    new Item(400, 200, 60, 'square', 'purple'),
  ];

  // Add items to the world
    world.addItem(items);
    world.render();

    const mousePosition$ = fromEvent(document, 'mousemove').pipe(
        map(event => ({ x: event.clientX, y: event.clientY })),
    );

    const mouseClick$ = fromEvent(document, 'click');

    // Emit null initially and then the index of the hovered item (if any)
    const hoveredItemId$ = mousePosition$.pipe(
      map(mousePos => getHoveredItem(items, mousePos)),
      startWith(null)
    );

    const clickOnHoveredItem$ = mouseClick$.pipe(
      withLatestFrom(hoveredItemId$),
      map(([clickEvent, hoveredItemId]) => hoveredItemId),
      filter(hoveredItemId => hoveredItemId !== null), // Only emit if an item is actually hovered
      startWith(null)
    );

    const updateFrequencyHz = 60;
    const updateInterval$ = interval(1000 / updateFrequencyHz);

    const canvasUpdate$ = updateInterval$.pipe(
      withLatestFrom(hoveredItemId$, clickOnHoveredItem$),
      map(([_, hoveredItemId, clickedItemId]) => ({ hoveredItemId, clickedItemId }))
    );

    canvasUpdate$.subscribe(({hoveredItemId, clickedItemId}) => {
     world.render(hoveredItemId, clickedItemId);
});
    //
}
// Execute main function when DOM is fully loaded
document.addEventListener('DOMContentLoaded', main);
