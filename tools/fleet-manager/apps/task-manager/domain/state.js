const {
  buildWorksites,
  groupByGroup,
  findFallbackParkPoint
} = require('../lib/workflow_helpers');

class State {
  constructor({ graph, workflow, worksiteStore, taskStore, robots, assignments }) {
    this.graph = graph;
    this.workflow = workflow;
    this.worksiteStore = worksiteStore;
    this.taskStore = taskStore;
    this.robots = robots || [];
    this.assignments = assignments || {};

    this.worksites = buildWorksites(workflow);
    this.groupSites = groupByGroup(this.worksites);
    this.stream = (workflow.streams && workflow.streams[0]) || null;
    this.pickGroups = new Set((workflow.occupancy && workflow.occupancy.pick_groups) || []);
    this.dropGroups = new Set((workflow.occupancy && workflow.occupancy.drop_groups) || []);
    this.defaultParkPoint = findFallbackParkPoint(graph);

    this.nodesById = new Map();
    for (const node of graph.nodes || []) {
      this.nodesById.set(node.id, node);
    }

    this.tasks = taskStore.all();
  }

  getWorksiteState(id) {
    return this.worksiteStore.get(id);
  }

  setWorksiteState(id, updates) {
    this.worksiteStore.set(id, updates);
  }

  saveTasks(tasks) {
    this.taskStore.save(tasks);
    this.tasks = tasks;
  }
}

module.exports = {
  State
};
