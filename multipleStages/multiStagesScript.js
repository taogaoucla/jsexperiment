const { of, fromEvent, Subscription, Subject, concatMap, interval } = rxjs;
const {tap, scan, startWith, map, merge, withLatestFrom, filter, take } = rxjs.operators;


class PhaseBlock {
  constructor(name){
    this.name = name;
    this.subscriptions = new Subscription();
  };

  showOnlyCurrentPhase() {
    document.querySelectorAll('.stage').forEach(stage => stage.classList.add('hidden'));
    document.getElementById(this.name).classList.remove('hidden');
  }

  run(){
    this.showOnlyCurrentPhase();
  }

  cleanup(){
    this.subscriptions.unsubscribe();
  }
}


class InstructionPhase extends PhaseBlock{
  constructor(){
    super('instructionPhase');
    this.pages = [
      'Instruction Page 1: ...',
      'Instruction Page 2: ...',
      'Instruction Page 3: ...',
    ];
    this.instructionsContainer = document.getElementById('instructionsContainer');
  }

  run(){
    super.run();
    let prevButton = document.getElementById('prevButton');
    let nextButton = document.getElementById('nextButton');
    // Create observables for the Prev and Next button clicks
    const prevButtonClick$ = fromEvent(prevButton, 'click').pipe(map(() => -1));
    const nextButtonClick$ = fromEvent(nextButton, 'click').pipe(map(() => 1));

    // Combine both observables to manage the current page index
    const pageIndex$ = rxjs.merge(prevButtonClick$, nextButtonClick$).pipe(
      scan((acc, curr) => {
        let newIndex = acc + curr;
        // Prevent going out of bounds
        return Math.max(Math.min(newIndex, this.pages.length - 1), 0);
      }, 0),
      startWith(0) // Start with the first page
    );

    // Subscribe to pageIndex$ to update the instructions container content
    const showInstruction=pageIndex$.subscribe(index => {
      this.instructionsContainer.textContent = this.pages[index];
    });

    this.subscriptions.add(showInstruction);

    const stageRunning$ = nextButtonClick$.pipe(
        withLatestFrom(pageIndex$),
        filter(([_, pageIndex]) => pageIndex==this.pages.length-1),
        take(1)
    );

    const endPhaseSubscription = stageRunning$.subscribe({
        complete: () => {
        console.log("Last instruction page. Proceeding to cleanup");
        this.cleanup()
    }});

    this.subscriptions.add(endPhaseSubscription);

    return stageRunning$;
  }

}

class Item {
  constructor(shape, color) {
    this.size = 30; //for circle, the size is the diameter
    this.shape = shape;
    this.color = color;
  }

  setPosition(x, y){
    this.x=x;
    this.y=y;
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

function createRandomPoint(canvasWidth, canvasHeight) {
  const x = Math.random() * canvasWidth;
  const y = Math.random() * canvasHeight;
  return [x, y]
}

function isFarEnough(newPoint, existingPoints, minDistance) {
  return existingPoints.every(point => 
    Math.sqrt(Math.pow(point.x - newPoint.x, 2) + Math.pow(point.y - newPoint.y, 2)) > minDistance
  );
}

function samplePositions(ctx, numSamples) {
  const points = [];
  while (points.length < numSamples) {
    const newPoint = createRandomPoint(ctx.canvas.width, ctx.canvas.height);
    points.push(newPoint);
  }
  return points;
}

class ItemSelectionPhase extends PhaseBlock{
  constructor (canvasId){
    super('itemSelectionPhase');
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.items = [];
    this.continueButton = document.getElementById('continueButton')
  }

  addItems(items) {
    this.items = this.items.concat(items);
    this.setItemPositions();
  }

  setItemPositions(){
    const itemsPositions = samplePositions(this.ctx, this.items.length);
    itemsPositions.forEach((position, index) => {
      this.items[index].setPosition(...position);
    });
  } 
  

  clearCanvas(){
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height); // Clear canvas
  }

  render(hoveredItemId, clickedItemId) {
      this.clearCanvas();
      this.items.forEach((item, index) => {
        const isHovered = index === hoveredItemId;
        const isClicked = index === clickedItemId;
        item.render(this.ctx, isHovered, isClicked);
      });
    }
  
  run(){
    super.run();
    const mousePosition$ = fromEvent(document, 'mousemove').pipe(
        map(event => ({ x: event.clientX, y: event.clientY})),
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
    super.cleanup();
    this.subscriptions.unsubscribe();
    console.log("cleaning up the item click world!");
    this.clearCanvas();
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height); // Clear canvas
  };
}

function getHoveredItem(items, mousePos) {
  if (!mousePos) return null; // If no mouse position, return null

  const hoveredId = items.findIndex(item => item.isHovered(mousePos.x, mousePos.y));
  return hoveredId >= 0 ? hoveredId : null;
}
// Main execution function
class NumberShapeColorTrial extends Trial{
  constructor(condition){
    super(condition);
    this.itemSelectionPhase = new ItemSelectionPhase("myCanvas");
    this.instructionPhase = new InstructionPhase();
    this.generateStimuli();
    this.allPhases = of(this.instructionPhase, this.itemSelectionPhase)
  }

  generateStimuli(){
    const setSize = this.condition.setSize;
    // const color = this.condition.color;
    const shape = this.condition.shape;
    const items = Array.from({length: setSize}, () => new Item(shape, "red"));
    this.itemSelectionPhase.addItems(items)
  }

  run(){
    // const allPhases = of(this.instructionPhase, this.itemSelectionPhase, this.instructionTwo);
    const runningAllPhase$ = this.allPhases.pipe(
        concatMap(stage => stage.run())
    );
    runningAllPhase$.subscribe({
      next: value => console.log("moving to the next stage"),
      complete: () => console.log("trail end !")
    })
    return runningAllPhase$;
  }
}
function main() {

manipulations=[
    {name:'setSize', levels:[2, 4, 8]},
    {name:'shape', levels:['circle', 'square']},
]
numberPerCondition = 2;
let experiment = new Experiment(NumberShapeColorTrial, manipulations, numberPerCondition);
experiment.run()
  
}
// Execute main function when DOM is fully loaded
document.addEventListener('DOMContentLoaded', main);
