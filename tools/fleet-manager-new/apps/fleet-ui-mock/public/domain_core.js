(() => {
  const root = (window.FleetDomain = window.FleetDomain || {});

  class InMemoryStore {
    constructor(initialState) {
      this.state = initialState || {};
      this.listeners = new Set();
    }

    getState() {
      return this.state;
    }

    update(updater, meta) {
      const next = updater(this.state, meta);
      if (!next || typeof next !== "object") {
        return this.state;
      }
      this.state = next;
      this.listeners.forEach((listener) => listener(this.state, meta));
      return this.state;
    }

    subscribe(listener) {
      this.listeners.add(listener);
      return () => {
        this.listeners.delete(listener);
      };
    }
  }

  const clone = (value) => {
    if (!value || typeof value !== "object") return value;
    return Array.isArray(value) ? value.map((item) => ({ ...item })) : { ...value };
  };

  class RobotRepository {
    constructor(store) {
      this.store = store;
    }

    list() {
      const state = this.store.getState();
      return clone(state.robots || []);
    }

    getById(id) {
      return this.list().find((robot) => robot.id === id) || null;
    }

    setAll(robots) {
      this.store.update((state) => ({
        ...state,
        robots: clone(robots || [])
      }));
      return this.list();
    }

    update(id, updates) {
      let updated = null;
      this.store.update((state) => {
        const robots = (state.robots || []).map((robot) => {
          if (robot.id !== id) return robot;
          updated = { ...robot, ...updates };
          return updated;
        });
        return { ...state, robots };
      });
      return updated;
    }
  }

  class TaskRepository {
    constructor(store) {
      this.store = store;
    }

    list() {
      const state = this.store.getState();
      return clone(state.tasks || []);
    }

    setAll(tasks) {
      this.store.update((state) => ({
        ...state,
        tasks: clone(tasks || [])
      }));
      return this.list();
    }

    add(task) {
      if (!task) return null;
      this.store.update((state) => ({
        ...state,
        tasks: [task, ...(state.tasks || [])]
      }));
      return task;
    }

    update(id, updates) {
      let updated = null;
      this.store.update((state) => {
        const tasks = (state.tasks || []).map((task) => {
          if (task.id !== id) return task;
          updated = { ...task, ...updates };
          return updated;
        });
        return { ...state, tasks };
      });
      return updated;
    }
  }

  const distance = (a, b) => {
    if (!a || !b) return Number.POSITIVE_INFINITY;
    return Math.hypot(a.x - b.x, a.y - b.y);
  };

  class RobotAllocator {
    constructor(strategy) {
      this.strategy = strategy || "nearest";
    }

    setStrategy(strategy) {
      if (typeof strategy === "string" && strategy.trim()) {
        this.strategy = strategy.trim();
      }
    }

    select(robots, context) {
      if (!Array.isArray(robots) || !robots.length) return null;
      const strategy = this.strategy || "nearest";
      if (strategy === "first") {
        return robots[0];
      }
      const targetPos = context?.targetPos || context?.pickPos || context?.dropPos || null;
      if (!targetPos) {
        return robots[0];
      }
      let best = null;
      let bestDist = Number.POSITIVE_INFINITY;
      robots.forEach((robot) => {
        if (!robot?.pos) return;
        const dist = distance(robot.pos, targetPos);
        if (dist < bestDist) {
          bestDist = dist;
          best = robot;
        }
      });
      return best || robots[0];
    }
  }

  root.InMemoryStore = InMemoryStore;
  root.RobotRepository = RobotRepository;
  root.TaskRepository = TaskRepository;
  root.RobotAllocator = RobotAllocator;
})();
