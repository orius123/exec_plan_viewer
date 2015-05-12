(function () {

    var sys = arbor.ParticleSystem(20, 800, 0);

    sys.renderer = Renderer("#viewport");

    var executionSteps;

    //noinspection LocalVariableNamingConventionJS
    const
        EXECUTION_PLAN_TYPE = "com.hp.score.api.ExecutionPlan",
        EXECUTION_STEP_TYPE = "com.hp.score.api.ExecutionStep",
        CONTROL_ACTION_METADATA_TYPE = "com.hp.score.api.ControlActionMetadata",
        TRANSITION_TYPE = 'com.hp.oo.afl.sdk.execution.transition.Transition',

        JAVA_HASHMAP_TYPE = "java.util.HashMap",
        JAVA_LONG_TYPE = 'java.lang.Long',
        JAVA_ARRAY_LIST_TYPE = 'java.util.ArrayList',

        NEXT_STEP_NAV = 'nextStep',
        TRANSITION_NAV = "transition",
        BRANCH_START_NAV = 'branchStart',
        FINAL_STEP_NAV = 'finalStep';



    $(document).ready(function () {

        sys.renderer.onClk(function (node) {
            var step = _.find(executionSteps, function (step) {
                return step[EXECUTION_STEP_TYPE].execStepId == node.name;
            });
            $("#sysOut").text(JSON.stringify(step[EXECUTION_STEP_TYPE], null, 4));
        });

        $('#execution-plan-input').on('change', function (evt) {
            sys.prune();
            var file = evt.target.files[0];
            var reader = new FileReader();
            reader.readAsText(file, 'UTF-8');
            reader.onload = loaded;
        });

        function loaded(evt) {
            var inputValue = $.parseJSON(evt.target.result);

            executionSteps = inputValue[EXECUTION_PLAN_TYPE].steps[JAVA_HASHMAP_TYPE];
            var beginStep = inputValue[EXECUTION_PLAN_TYPE].beginStep;

            $("#flow_name").text(inputValue[EXECUTION_PLAN_TYPE].name);

            function parseExecutionPlan() {
                return _(executionSteps).map(function (step) {
                    var executionStep = step[EXECUTION_STEP_TYPE];
                    var returnStep = {
                        id : executionStep.execStepId.toString(),
                        name : executionStep.action[CONTROL_ACTION_METADATA_TYPE].methodName,
                        edges : [],
                        startStep : executionStep.execStepId == beginStep
                    };
                    var nextStep = executionStep.navigationData[JAVA_HASHMAP_TYPE].next;
                    if (nextStep) {
                        returnStep.edges.push({
                            value : nextStep[JAVA_LONG_TYPE].toString(),
                            type : NEXT_STEP_NAV
                        });
                    }
//                    var finalStep = executionStep.navigationData[JAVA_HASHMAP_TYPE].finalStepId;
//                    if (finalStep) {
//                        returnStep.edges.push({
//                            value : finalStep[JAVA_LONG_TYPE].toString(),
//                            type : FINAL_STEP_NAV
//                        });
//                    }
                    var transitions = executionStep.navigationData[JAVA_HASHMAP_TYPE].transitions;
                    if (transitions) {
                        _(transitions[JAVA_ARRAY_LIST_TYPE]).each(function (transition) {
                            if (transition[TRANSITION_TYPE].name != 'EXCEPTION') {
                                returnStep.edges.push({
                                    value : transition[TRANSITION_TYPE].nextStepId,
                                    type : TRANSITION_NAV
                                })
                            }
                        });
                    }
                    if (executionStep.splitStep) {
                        var actionData = executionStep.actionData[JAVA_HASHMAP_TYPE];
                        if (actionData.subFlowUuid) {
                            console.log("actionData.subFlowUuid")
                        } else if (actionData.childMIStartPosition) {
                            var position = actionData.childMIStartPosition;
                            returnStep.edges.push({
                                value : position[JAVA_LONG_TYPE].toString(),
                                type : BRANCH_START_NAV
                            });
                        } else if (actionData.branchesStartPositions) {
                            var branchesStartPositions = actionData.branchesStartPositions[JAVA_ARRAY_LIST_TYPE];
                            _(branchesStartPositions).each(function (position) {
                                returnStep.edges.push({
                                    value : position[JAVA_LONG_TYPE].toString(),
                                    type : BRANCH_START_NAV
                                });
                            });
                        } else {
                            console.log(executionStep);
                        }

                    }
                    return returnStep;
                });
            }

            function prepGraphData(steps) {
                var graphData = {'nodes' : {}, 'edges' : {}};
                _(steps).each(function (step) {
                    if (step.id == '0') {
                        return;
                    }
                    var color = 'blue';
                    if (step.startStep) {
                        color = 'red';
                    }
                    graphData.nodes[step.id] = {'color' : color, 'shape' : 'dot1', 'label' : step.id + " " + step.name};
                });
                _(steps).each(function (step) {
                    var stepEdges = {};
                    _(step.edges).each(function (edge) {
                        var stepEdge = {};
                        if (edge.type == BRANCH_START_NAV) {
                            stepEdge.color = 'blue';
                        } else if (edge.type == TRANSITION_NAV) {
                            stepEdge.color = 'red';
                        } else if (edge.type == FINAL_STEP_NAV) {
                            stepEdge.color = 'white';
                        }
                        stepEdges[edge.value] = stepEdge;
                    });
                    graphData.edges[step.id] = stepEdges;
                });
                sys.graft(graphData);
            }

            var steps = parseExecutionPlan();

            prepGraphData(steps);
        }
    });
})();
