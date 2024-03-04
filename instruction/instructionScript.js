const { fromEvent, Subscription, Subject } = rxjs;
const { scan, startWith, map, merge, withLatestFrom, filter } = rxjs.operators;

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
    this.prevButton = document.getElementById('prevButton');
    this.nextButton = document.getElementById('nextButton');
    }

    run()
    {
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
    const showInstructionSubscription=pageIndex$.subscribe(index => {
      this.instructionsContainer.textContent = this.instructionPages[index];
    });

    this.subscriptions.add(showInstructionSubscription);

    const checkEndSubscription = nextButtonClick$.pipe(
        withLatestFrom(pageIndex$),
        filter(([_, pageIndex]) => pageIndex==this.instructionPages.length-1)
    ).subscribe(() => {
        console.log("Last instruction page. Proceeding to cleanup")
        this.cleanup()
    })

    this.subscriptions.add(checkEndSubscription);

    }
    cleanup(){
        this.subscriptions.unsubscribe();
        document.body.innerHTML = "";
    }
}

const instructionStage = new InstructionStage();
instructionStage.run()


// // Get DOM elements
// const instructionsContainer = document.getElementById('instructionsContainer');
// const prevButton = document.getElementById('prevButton');
// const nextButton = document.getElementById('nextButton');

// // Create observables for the Prev and Next button clicks
// const prevButtonClick$ = fromEvent(prevButton, 'click').pipe(map(() => -1));
// const nextButtonClick$ = fromEvent(nextButton, 'click').pipe(map(() => 1));

// // Combine both observables to manage the current page index
// const pageIndex$ = rxjs.merge(prevButtonClick$, nextButtonClick$).pipe(
//   scan((acc, curr) => {
//     let newIndex = acc + curr;
//     // Prevent going out of bounds
//     return Math.max(Math.min(newIndex, instructionPages.length - 1), 0);
//   }, 0),
//   startWith(0) // Start with the first page
// );

// // Subscribe to pageIndex$ to update the instructions container content
// pageIndex$.subscribe(index => {
//   instructionsContainer.textContent = instructionPages[index];
// });

