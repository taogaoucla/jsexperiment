// Ensure RxJS is loaded
const { fromEvent, Subscription } = rxjs;

// Function to draw a box on the canvas
function drawBox() {
    const canvas = document.getElementById('myCanvas');
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'red';
    ctx.fillRect(10, 10, 100, 100); // Draw a simple box
}

// Immediate drawing upon load
drawBox();

// Setup button click observable
const clearButton = document.getElementById('clearButton');
const clearButtonClick$ = fromEvent(clearButton, 'click');

// Subscription object to manage subscriptions
const allSubscriptions = new Subscription();

// Subscribe to the clear button click event
const clearSubscription = clearButtonClick$.subscribe(() => {
    const canvas = document.getElementById('myCanvas');
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear the canvas

    // Unsubscribe from all active subscriptions
    allSubscriptions.unsubscribe();
});

// Add the clear subscription to the subscription object
allSubscriptions.add(clearSubscription);

