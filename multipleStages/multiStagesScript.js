const { of, fromEvent, Subscription, Subject, concatMap, interval } = rxjs;
const { scan, startWith, map, merge, withLatestFrom, filter, take } = rxjs.operators;

class InstructionStage {
    constructor(){
       this.instructionPages= [
      'Instruction Page 1: ...',
      'Instruction Page 2: ...',
      'Instruction Page 3: ...',
      // Add more instruction pages as needed
        ];
    this.subscriptions = new Subscription();
    this.stageCompleted = new Subject();

    this.instructionsContainer = document.getElementById('instructionsContainer');
    }

    run()
    {
        this.prevButton = document.getElementById('prevButton');
        this.nextButton = document.getElementById('nextButton');
        // Create observables for the Prev and Next button clicks
        const prevButtonClick$ = fromEvent(this.prevButton, 'click').pipe(map(() => -1));
        const nextButtonClick$ = fromEvent(this.nextButton, 'click').pipe(map(() => 1));

        // Combine both observables to manage the current page index
        const pageIndex$ = rxjs.merge(prevButtonClick$, nextButtonClick$).pipe(
          scan((acc, curr) => {
            let newIndex = acc + curr;
            // Prevent going out of bounds
            return Math.max(Math.min(newIndex, this.instructionPages.length - 1), 0);
          }, 0),
          startWith(0) // Start with the first page
        );

        // Subscribe to pageIndex$ to update the instructions container content
        const showInstruction=pageIndex$.subscribe(index => {
          this.instructionsContainer.textContent = this.instructionPages[index];
        });

        this.subscriptions.add(showInstruction);

        const stageRunning$ = nextButtonClick$.pipe(
            withLatestFrom(pageIndex$),
            filter(([_, pageIndex]) => pageIndex==this.instructionPages.length-1),
            take(1)
        );

        const endStageSubscription = stageRunning$.subscribe({
            complete: () => {
            console.log("Last instruction page. Proceeding to cleanup");
            this.cleanup()
        }});

        this.subscriptions.add(endStageSubscription);

        return stageRunning$;

        }
cleanup(){
    console.log("running cleaning up");
    this.subscriptions.unsubscribe();
}
}

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
    this.continueButton = document.getElementById('continueButton')
    this.subscriptions = new Subscription()
  }

addItem(itemOrItems) {
    if (Array.isArray(itemOrItems)) {
        this.items = this.items.concat(itemOrItems);
    } else {
        this.items.push(itemOrItems);
    }
}

clearDisplay(){
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height); // Clear canvas
}

render(hoveredItemId, clickedItemId) {
    this.clearDisplay();
    this.items.forEach((item, index) => {
      const isHovered = index === hoveredItemId;
      const isClicked = index === clickedItemId;
      item.render(this.ctx, isHovered, isClicked);
    });
  }

run(){
    const mousePosition$ = fromEvent(document, 'mousemove').pipe(
        map(event => ({ x: event.clientX, y: event.clientY })),
    );

    const mouseClick$ = fromEvent(document, 'click');

    const continueButtonClick$ = fromEvent(this.continueButton, 'click');

    // Emit null initially and then the index of the hovered item (if any)
    const hoveredItemId$ = mousePosition$.pipe(
        map(mousePos => getHoveredItem(this.items, mousePos)),
        startWith(null)
    );

    const clickOnHoveredItem$ = mouseClick$.pipe(
        withLatestFrom(hoveredItemId$),
        map(([clickEvent, hoveredItemId]) => hoveredItemId),
        filter(hoveredItemId => hoveredItemId !== null), // Only emit if an item is actually hovered
        startWith(null)
    );

    const continueButtonSubscription=clickOnHoveredItem$.subscribe(clickedItemId => {
        this.continueButton.style.display = clickedItemId !== null ? 'block' : 'none';
    })

    this.subscriptions.add(continueButtonSubscription);

    const updateFrequencyHz = 60;
    const updateInterval$ = interval(1000 / updateFrequencyHz);

    const canvasUpdate$ = updateInterval$.pipe(
      withLatestFrom(hoveredItemId$, clickOnHoveredItem$),
      map(([_, hoveredItemId, clickedItemId]) => ({ hoveredItemId, clickedItemId }))
    );

    const canvasRenderSubscription=canvasUpdate$.subscribe(({hoveredItemId, clickedItemId}) => {
     this.render(hoveredItemId, clickedItemId);
});
     this.subscriptions.add(canvasRenderSubscription);

    const running$=continueButtonClick$.pipe(
        withLatestFrom(clickOnHoveredItem$),
        filter(([_, clickedItemId]) => clickedItemId !== null),
        take(1)
     );

    const endSubscription = running$.subscribe({
        complete: () =>{
            this.cleanup()
        }
    })

    this.subscriptions.add(endSubscription);
    return running$;
}

    cleanup(){
        console.log("cleaning up the item click world!");
        this.clearDisplay();
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height); // Clear canvas
        this.subscriptions.unsubscribe();
    };
}

function getHoveredItem(items, mousePos) {
  if (!mousePos) return null; // If no mouse position, return null

  const hoveredId = items.findIndex(item => item.isHovered(mousePos.x, mousePos.y));
  return hoveredId >= 0 ? hoveredId : null;
}

// Main execution function
function main() {
    const instructionOne = new InstructionStage();
    const instructionTwo = new InstructionStage();

    const world = new World('myCanvas');
    const items = [
    new Item(100, 100, 30, 'circle', 'red'),
    new Item(200, 100, 40, 'square', 'blue'),
    new Item(300, 150, 50, 'circle', 'green'),
    new Item(400, 200, 60, 'square', 'purple'),
    ];
    world.addItem(items);

    const allStages = of(instructionOne, world, instructionTwo);

    runningAllStage$ = allStages.pipe(
        concatMap(stage => stage.run())
    );

    runningAllStage$.subscribe(value => console.log("moving to the next stage"));

}
// Execute main function when DOM is fully loaded
document.addEventListener('DOMContentLoaded', main);
