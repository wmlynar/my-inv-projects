/**
 * @typedef {Object} Robot
 * @property {string} id
 * @property {string} ip
 * @property {string|null} currentStation
 * @property {string|null} lastStation
 * @property {{x:number,y:number,angle:number}|null} pose
 * @property {number|null} battery
 * @property {boolean} blocked
 * @property {string|null} taskId
 */

/**
 * @typedef {Object} Location
 * @property {string} id
 * @property {'ActionPoint'|'ParkPoint'|'ChargePoint'} type
 * @property {{x:number,y:number}} pos
 */

/**
 * @typedef {Object} Worksite
 * @property {string} id
 * @property {string} group
 * @property {string} point
 * @property {{x:number,y:number}|null} pos
 * @property {boolean} filled
 * @property {boolean} blocked
 */

/**
 * @typedef {Object} Task
 * @property {string} id
 * @property {string} robotId
 * @property {string} pickId
 * @property {string} dropId
 * @property {'in_progress'|'completed'|'failed'} status
 * @property {'to_pick'|'to_drop'|'to_park'} phase
 * @property {string} targetId
 * @property {string|null} robotTaskId
 * @property {number} createdAt
 * @property {number} updatedAt
 * @property {number|null} completedAt
 */

/**
 * @typedef {Object} StreamDefinition
 * @property {string} id
 * @property {string} pick_group
 * @property {string[]} drop_group_order
 */

/**
 * @typedef {Object} Assignment
 * @property {string[]} parkPoints
 * @property {string[]} chargePoints
 * @property {string|null} initialPosition
 */

/**
 * @typedef {Object} Action
 * @property {'go_target'} type
 * @property {string} robotId
 * @property {string} targetId
 * @property {string|null} taskId
 * @property {string|null} nextPhase
 */

module.exports = {};
