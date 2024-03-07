
// const _ = require('lodash');
function cartesianProduct(array1, array2) {
    return array1.map(elementFromArray1 => 
      array2.map(elementFromArray2 => [elementFromArray1, elementFromArray2])
    ).flat();
  }

function repeatArray(array, times) {
  return Array(times).fill(array).flat();
}

class Trial {
  constructor(condition){
    this.condition = condition;
  }
}

class Experiment{
  constructor(TrialClass, manipulations, numberPerCondition){
    this.TrialClass = TrialClass;
    this.manipulations=manipulations
    this.numberPerCondition=numberPerCondition;
    this.generateShuffledConditions();
    this.generateTrials();
  }

  generateShuffledConditions(){
    this.variableNames = this.manipulations.map(variable=>variable.name);
    this.variableLevels = this.manipulations.map(variable=>variable.levels);
    const uniqueConditions = cartesianProduct(...this.variableLevels);
    const namedUniqueConditions = uniqueConditions.map(
      levels=>_.zipObject(this.variableNames, levels)
    );
    this.repeatedNamedConditions=repeatArray(namedUniqueConditions,
                                            this.numberPerCondition
                                            );
    this.shuffledConditions = _.shuffle(this.repeatedNamedConditions);
  }

  generateTrials(){
    this.trials = this.shuffledConditions.map(condition=>new this.TrialClass(condition));
  }

  run(){
    // const allPhases = of(...this.trials);
    const allPhases = of(...this.trials);
    const runningAllPhase$ = allPhases.pipe(
        concatMap(phase => phase.run())
    );
    runningAllPhase$.subscribe({
      next: value => console.log("moving to the next trial"),
      complete: () => console.log("experiment end !")
    })
  }
}

// manipulations=[
//     {name:'set size', levels:[2, 3, 4]},
//     {name:'shape', levels:['circle', 'shape']}
// ]
// numberPerCondition = 3;
// let experiment = new Experiment(Trial, manipulations, numberPerCondition);
// experiment.generateShuffledConditions();
// experiment.generateTrials();
